"""
ShopLens Backend API
Try before you buy — powered by Meta SAM 3.1 + Muse Image
"""
import base64
import logging
import os
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

from config import config
from meta_client import meta_client
from instagram import fetch_instagram_images, fetch_instagram_image

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)
logger = logging.getLogger("shoplens")

app = FastAPI(
    title="ShopLens API",
    description="Try before you buy on Instagram — SAM 3.1 + Muse Image",
    version="1.0.0"
)

# CORS — allow local dev + Vercel production frontend
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://*.vercel.app",
]

# Add custom frontend URL from env if set (set this in Render dashboard)
frontend_url = os.getenv("FRONTEND_URL", "")
if frontend_url:
    ALLOWED_ORIGINS.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ─── Models ───────────────────────────────────────────────────────────────────

class TryOnRequest(BaseModel):
    # Product — either Instagram URL or direct base64
    instagram_url: Optional[str] = None
    product_image_base64: Optional[str] = None

    # User photo — base64
    user_image_base64: str

    # User type
    user_type: str = "person"  # "person" or "room"

    @field_validator("user_type")
    @classmethod
    def validate_user_type(cls, v):
        if v not in ("person", "room"):
            raise ValueError("user_type must be 'person' or 'room'")
        return v


class TryOnResponse(BaseModel):
    result_image_base64: str
    product_name: str
    product_category: str
    product_description: str
    try_on_type: str
    # ── New fields ──────────────────────────
    fit_score: int = 0
    fit_verdict: str = ""
    fit_issues: list = []
    size_recommendation: str = ""
    style_note: str = ""
    fit_confidence: str = ""
    sam_segments: list = []


class FetchInstagramRequest(BaseModel):
    url: str


class AnalyzeProductRequest(BaseModel):
    image_base64: str


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "name": "ShopLens API",
        "status": "running",
        "version": "1.0.0",
        "models": {
            "vision":     config.VISION_MODEL,
            "wonder":     config.WONDER_MODEL,
            "image":      config.IMAGE_MODEL,
            "sam":        config.SAM_MODEL,
        }
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "api_configured": bool(config.META_API_KEY)
    }


@app.post("/fetch-instagram")
async def fetch_instagram(req: FetchInstagramRequest):
    """
    Fetch ALL images from an Instagram post (including carousels).
    Uses Instagram GraphQL API — returns all carousel images.
    """
    try:
        logger.info(f"Fetching Instagram post: {req.url}")
        images = await fetch_instagram_images(req.url)
        return {
            "images": images,
            "count": len(images),
            "is_carousel": len(images) > 1,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Instagram fetch failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Could not fetch Instagram image. Try uploading directly."
        )


@app.post("/analyze-product")
async def analyze_product(req: AnalyzeProductRequest):
    """
    Analyze a product image using Muse Spark Vision.
    Returns product name, category, description, placement info.
    """
    try:
        logger.info("Analyzing product image")
        result = await meta_client.segment_product(req.image_base64)
        return result
    except Exception as e:
        logger.error(f"Product analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/try-on", response_model=TryOnResponse)
async def try_on(req: TryOnRequest):
    """
    Full ShopLens pipeline:
    1. Muse Spark Vision  → analyze product (name, category, placement)
    2. SAM 3.1            → segment product, identify parts & colors
    3. Muse Image         → composite product onto user photo
    4. Muse Spark Vision  → analyze fit of the result
    Returns try-on image + fit score + size recommendation + style note
    """
    if not req.instagram_url and not req.product_image_base64:
        raise HTTPException(
            status_code=400,
            detail="Provide either instagram_url or product_image_base64"
        )

    try:
        # ── Step 1: Get product image ─────────────────────────────────────────
        product_b64 = req.product_image_base64
        if req.instagram_url and not product_b64:
            url = req.instagram_url
            if "instagram.com" in url:
                logger.info("Fetching product from Instagram")
                ig_result = await fetch_instagram_image(url)
                product_b64 = ig_result["image_base64"]
            else:
                # Any other URL — fetch directly (product from other websites)
                logger.info(f"Fetching product image from URL: {url[:80]}")
                import httpx as _httpx
                async with _httpx.AsyncClient(timeout=20, follow_redirects=True) as c:
                    r = await c.get(url, headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                    })
                    r.raise_for_status()
                    import base64 as _b64
                    product_b64 = _b64.b64encode(r.content).decode()
                    logger.info(f"Fetched product image: {len(product_b64)} chars")

        # ── Step 2: Muse Spark Vision — analyze product ───────────────────────
        logger.info("Step 2: Analyzing product with Muse Spark Vision")
        product_info = await meta_client.segment_product(product_b64)
        product_name = product_info.get("product_name", "Product")
        category     = product_info.get("category", "clothing")
        logger.info(f"Product: {product_name} | Category: {category}")

        # ── Step 3: SAM 3.1 — segment product parts ──────────────────────────
        logger.info("Step 3: Segmenting product with SAM 3.1")
        sam_result = await meta_client.sam_segment(product_b64, product_name)
        sam_labels  = sam_result.get("labels", [])

        # Enrich product description with SAM labels for better try-on
        if sam_labels:
            label_str = ", ".join(sam_labels[:8])
            product_info["description"] = (
                f"{product_info.get('description', '')}. "
                f"Key segments: {label_str}"
            ).strip(". ")
            logger.info(f"SAM enriched description with {len(sam_labels)} segments")

        # ── Step 4: Muse Image — generate try-on ─────────────────────────────
        logger.info("Step 4: Generating try-on with Muse Image")
        result_b64 = await meta_client.generate_tryon(
            product_info=product_info,
            user_image_base64=req.user_image_base64,
            user_type=req.user_type,
        )

        # ── Step 5: Fit Analysis — only for person try-on ────────────────────
        fit_data = {
            "fit_score": 0,
            "fit_verdict": "",
            "fit_issues": [],
            "size_recommendation": "",
            "style_note": "",
            "confidence": "",
        }
        if req.user_type == "person":
            logger.info("Step 5: Analyzing fit with Muse Spark Vision")
            try:
                fit_data = await meta_client.analyze_fit(
                    tryon_image_base64=result_b64,
                    product_name=product_name,
                    category=category,
                )
            except Exception as e:
                logger.warning(f"Fit analysis failed (non-critical): {e}")

        return TryOnResponse(
            result_image_base64=result_b64,
            product_name=product_name,
            product_category=category,
            product_description=product_info.get("description", ""),
            try_on_type=product_info.get("try_on_type", "wear_on_person"),
            fit_score=fit_data.get("fit_score", 0),
            fit_verdict=fit_data.get("fit_verdict", ""),
            fit_issues=fit_data.get("fit_issues", []),
            size_recommendation=fit_data.get("size_recommendation", ""),
            style_note=fit_data.get("style_note", ""),
            fit_confidence=fit_data.get("confidence", ""),
            sam_segments=sam_labels[:8],
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Try-on failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Try-on failed: {str(e)}"
        )


# ══════════════════════════════════════════════════════════════════════════════
# FEATURE ROUTES — 5 AI Features
# ══════════════════════════════════════════════════════════════════════════════

from features import (
    StylistChatRequest, StylistChatResponse, ai_stylist_chat,
    OutfitBuilderRequest, OutfitBuilderResponse, outfit_builder,
    SocialProofSubmit, social_proof_add, social_proof_get,
    SizePredictorRequest, SizePredictorResponse, ai_size_predictor,
    MoodBoardRequest, MoodBoardResponse, mood_board_match,
)


# ── 1. AI Stylist Chat ────────────────────────────────────────────────────────
@app.post("/stylist/chat", response_model=StylistChatResponse)
async def stylist_chat(req: StylistChatRequest):
    try:
        return await ai_stylist_chat(req)
    except Exception as e:
        logger.error(f"Stylist chat failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 2. Outfit Builder ─────────────────────────────────────────────────────────
@app.post("/outfit/build", response_model=OutfitBuilderResponse)
async def build_outfit(req: OutfitBuilderRequest):
    try:
        return await outfit_builder(req)
    except Exception as e:
        logger.error(f"Outfit builder failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 3. Social Proof Wall ──────────────────────────────────────────────────────
@app.post("/social-proof/add")
async def add_social_proof(req: SocialProofSubmit):
    try:
        return social_proof_add(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/social-proof/{product_id}")
async def get_social_proof(product_id: int):
    return social_proof_get(product_id)


# ── 4. Size Predictor ─────────────────────────────────────────────────────────
@app.post("/size/predict", response_model=SizePredictorResponse)
async def predict_size(req: SizePredictorRequest):
    try:
        return await ai_size_predictor(req)
    except Exception as e:
        logger.error(f"Size predictor failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── 5. Mood Board Shopping ────────────────────────────────────────────────────
@app.post("/mood-board/match", response_model=MoodBoardResponse)
async def match_mood_board(req: MoodBoardRequest):
    try:
        return await mood_board_match(req)
    except Exception as e:
        logger.error(f"Mood board failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ─── Entry ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    if not config.META_API_KEY:
        logger.warning("META_API_KEY not set!")
    else:
        logger.info(f"Meta API configured")
    logger.info(f"Starting ShopLens API on {config.HOST}:{config.PORT}")
    uvicorn.run("main:app", host=config.HOST, port=config.PORT, reload=True)
