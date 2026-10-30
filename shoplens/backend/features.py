"""
MetaShop — 5 AI Feature Endpoints
1. AI Stylist Chat       — Muse Wonder
2. Outfit Builder        — Muse Image multi-item
3. Social Proof Wall     — in-memory store
4. AI Size Predictor     — Muse Wonder
5. Mood Board Shopping   — SAM 3.1 + Muse Spark Vision
"""
import base64
import json
import re
import logging
from typing import Optional
from io import BytesIO

import httpx
from PIL import Image
from pydantic import BaseModel

from config import config

logger = logging.getLogger("metashop.features")

HEADERS = {
    "Authorization": f"Bearer {config.META_API_KEY}",
    "Content-Type": "application/json",
}

# ── In-memory social proof store ───────────────────────────────────────────────
# { product_id: [ { image_base64, height, size, body_type, timestamp } ] }
social_proof_store: dict[int, list] = {}


# ══════════════════════════════════════════════════════════════════════════════
# 1. AI STYLIST CHAT
# ══════════════════════════════════════════════════════════════════════════════

class StylistChatRequest(BaseModel):
    message: str
    history: list = []          # [{ role, content }]
    profile: dict = {}          # { style_pref, budget, occasion, body_type }
    products: list = []         # available products in store


class StylistChatResponse(BaseModel):
    reply: str
    recommended_ids: list = []
    reasons: list = []


async def ai_stylist_chat(req: StylistChatRequest) -> StylistChatResponse:
    """Muse Wonder acts as a personal stylist — suggests products from the store."""

    # Build product context (titles + prices only, keep token count low)
    product_ctx = "\n".join([
        f"ID:{p['id']} | {p['title']} | ${p['price']} | {p.get('discount',{}).get('percentage',0)}% off"
        for p in req.products[:30]
    ])

    system_prompt = (
        "You are Aria, a warm and knowledgeable personal fashion stylist for MetaShop. "
        "You know every product in the store. You give personalized, friendly advice. "
        "When recommending products, ALWAYS include their exact IDs from the catalog. "
        "Keep responses conversational, under 120 words. Use emojis sparingly. "
        f"\n\nUser profile: {json.dumps(req.profile)}"
        f"\n\nStore catalog:\n{product_ctx}"
    )

    messages = [{"role": "developer", "content": system_prompt}]
    for h in req.history[-6:]:  # last 6 turns for context
        messages.append(h)
    messages.append({"role": "user", "content": req.message})

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            f"{config.META_API_BASE_URL}/chat/completions",
            headers=HEADERS,
            json={
                "model": config.WONDER_MODEL,
                "messages": messages,
                "max_tokens": 1024,
                "reasoning_effort": "minimal",
            },
        )
        r.raise_for_status()
        reply_text = r.json()["choices"][0]["message"]["content"] or ""

    # Extract product IDs mentioned in reply
    ids = [int(x) for x in re.findall(r"\bID:(\d+)\b", reply_text)]
    clean_reply = re.sub(r"\bID:\d+\b", "", reply_text).strip()

    # Build reasons list from reply
    reasons = []
    for line in clean_reply.split("\n"):
        line = line.strip("-•* ").strip()
        if line and len(line) > 10:
            reasons.append(line)

    return StylistChatResponse(
        reply=clean_reply,
        recommended_ids=ids[:3],
        reasons=reasons[:3],
    )


# ══════════════════════════════════════════════════════════════════════════════
# 2. OUTFIT BUILDER — Multi-item try-on
# ══════════════════════════════════════════════════════════════════════════════

class OutfitBuilderRequest(BaseModel):
    user_image_base64: str
    items: list   # [{ name, image_base64, category }]  max 3


class OutfitBuilderResponse(BaseModel):
    result_image_base64: str
    style_score: int
    style_verdict: str
    styling_tip: str


def _resize_b64(b64: str, max_size: int = 768) -> str:
    try:
        data = base64.b64decode(b64 + "==")
        img = Image.open(BytesIO(data)).convert("RGB")
        if max(img.size) > max_size:
            img.thumbnail((max_size, max_size), Image.LANCZOS)
        buf = BytesIO()
        img.save(buf, "JPEG", quality=88)
        return base64.b64encode(buf.getvalue()).decode()
    except Exception:
        return b64


async def outfit_builder(req: OutfitBuilderRequest) -> OutfitBuilderResponse:
    """Muse Image composites multiple clothing items onto the user photo."""

    user_b64 = _resize_b64(req.user_image_base64, 1024)
    items = req.items[:3]  # max 3 items

    # Build description of all items
    items_desc = ", ".join([f"{i.get('name','item')} ({i.get('category','clothing')})" for i in items])

    prompt = (
        f"Virtual outfit try-on: show this exact person wearing ALL of the following items simultaneously: {items_desc}. "
        f"Keep the person's face, skin, hair, and background EXACTLY the same. "
        f"Show the complete outfit head to toe. Photorealistic, natural lighting."
    )

    # Build content array with all reference images
    content = [{"type": "input_text", "text": prompt}]
    content.append({
        "type": "input_image",
        "image_url": f"data:image/jpeg;base64,{user_b64}",
    })
    for item in items:
        b64 = _resize_b64(item.get("image_base64", ""), 512)
        if b64:
            content.append({
                "type": "input_image",
                "image_url": f"data:image/jpeg;base64,{b64}",
            })

    async with httpx.AsyncClient(timeout=180) as client:
        r = await client.post(
            f"{config.META_API_BASE_URL}/responses",
            headers=HEADERS,
            json={
                "model": config.IMAGE_MODEL,
                "input": [{"role": "user", "content": content}],
            },
        )
        r.raise_for_status()
        data = r.json()

    result_b64 = ""
    for item in data.get("output", []):
        if item.get("type") == "image_generation_call":
            result_b64 = item.get("result", "")
            break

    if not result_b64:
        raise RuntimeError("Outfit generation failed")

    # Get style score from Muse Wonder
    score_data = await _score_outfit(result_b64, items_desc)

    return OutfitBuilderResponse(
        result_image_base64=result_b64,
        style_score=score_data.get("score", 7),
        style_verdict=score_data.get("verdict", "Great combination"),
        styling_tip=score_data.get("tip", ""),
    )


async def _score_outfit(image_b64: str, items_desc: str) -> dict:
    """Muse Wonder rates the outfit combination."""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"{config.META_API_BASE_URL}/chat/completions",
                headers=HEADERS,
                json={
                    "model": config.VISION_MODEL,
                    "messages": [
                        {"role": "developer", "content": "Rate outfit combinations. Return only valid JSON."},
                        {"role": "user", "content": [
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{_resize_b64(image_b64, 512)}"}},
                            {"type": "text", "text": f'Rate this outfit ({items_desc}). Return: {{"score":8,"verdict":"Great combo","tip":"Add a belt to complete the look"}}'}
                        ]}
                    ],
                    "max_tokens": 512,
                    "reasoning_effort": "minimal",
                },
            )
            r.raise_for_status()
            content = r.json()["choices"][0]["message"]["content"] or "{}"
            clean = re.sub(r"```json|```", "", content).strip()
            m = re.search(r"\{.*\}", clean, re.DOTALL)
            return json.loads(m.group()) if m else {}
    except Exception as e:
        logger.warning(f"Style score failed: {e}")
        return {"score": 7, "verdict": "Nice outfit", "tip": ""}


# ══════════════════════════════════════════════════════════════════════════════
# 3. SOCIAL PROOF WALL
# ══════════════════════════════════════════════════════════════════════════════

class SocialProofSubmit(BaseModel):
    product_id: int
    image_base64: str
    height: str = ""
    size: str = ""
    body_type: str = ""


class SocialProofGet(BaseModel):
    product_id: int


def social_proof_add(req: SocialProofSubmit) -> dict:
    """Add a try-on to the social proof wall."""
    from datetime import datetime
    entry = {
        "image_base64": req.image_base64,
        "height": req.height,
        "size": req.size,
        "body_type": req.body_type,
        "timestamp": datetime.now().strftime("%b %d"),
    }
    if req.product_id not in social_proof_store:
        social_proof_store[req.product_id] = []
    social_proof_store[req.product_id].insert(0, entry)
    # Keep max 20 per product
    social_proof_store[req.product_id] = social_proof_store[req.product_id][:20]
    return {"success": True, "count": len(social_proof_store[req.product_id])}


def social_proof_get(product_id: int) -> dict:
    """Get all try-ons for a product."""
    entries = social_proof_store.get(product_id, [])
    return {"product_id": product_id, "entries": entries, "count": len(entries)}


# ══════════════════════════════════════════════════════════════════════════════
# 4. AI SIZE PREDICTOR
# ══════════════════════════════════════════════════════════════════════════════

class SizePredictorRequest(BaseModel):
    height_cm: int
    weight_kg: int
    chest_cm: int
    waist_cm: int
    body_shape: str   # "slim", "athletic", "curvy", "plus"
    usual_size: str   # "XS","S","M","L","XL"
    product_name: str
    product_category: str


class SizePredictorResponse(BaseModel):
    recommended_size: str
    confidence: int
    fit_type: str
    note: str


async def ai_size_predictor(req: SizePredictorRequest) -> SizePredictorResponse:
    """Muse Wonder predicts the right size based on measurements."""

    prompt = (
        f"Predict the correct clothing size for:\n"
        f"- Height: {req.height_cm}cm, Weight: {req.weight_kg}kg\n"
        f"- Chest: {req.chest_cm}cm, Waist: {req.waist_cm}cm\n"
        f"- Body shape: {req.body_shape}, Usually wears: {req.usual_size}\n"
        f"- Product: {req.product_name} ({req.product_category})\n\n"
        f'Return exactly: {{"size":"M","confidence":87,"fit_type":"Regular fit","note":"Based on your measurements this should fit well across shoulders"}}'
    )

    async with httpx.AsyncClient(timeout=45) as client:
        r = await client.post(
            f"{config.META_API_BASE_URL}/chat/completions",
            headers=HEADERS,
            json={
                "model": config.WONDER_MODEL,
                "messages": [
                    {"role": "developer", "content": "You are a fashion sizing expert. Return only valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                "max_tokens": 512,
                "reasoning_effort": "minimal",
            },
        )
        r.raise_for_status()
        content = r.json()["choices"][0]["message"]["content"] or "{}"

    clean = re.sub(r"```json|```", "", content).strip()
    m = re.search(r"\{.*\}", clean, re.DOTALL)
    data = json.loads(m.group()) if m else {}

    return SizePredictorResponse(
        recommended_size=data.get("size", req.usual_size),
        confidence=data.get("confidence", 75),
        fit_type=data.get("fit_type", "Regular fit"),
        note=data.get("note", "Based on your measurements"),
    )


# ══════════════════════════════════════════════════════════════════════════════
# 5. MOOD BOARD SHOPPING
# ══════════════════════════════════════════════════════════════════════════════

class MoodBoardRequest(BaseModel):
    image_base64: str
    products: list   # store products to match against


class MoodBoardResponse(BaseModel):
    vibe: str
    style_tags: list
    matched_ids: list
    match_reasons: list
    color_palette: list


async def mood_board_match(req: MoodBoardRequest) -> MoodBoardResponse:
    """SAM 3.1 + Muse Spark Vision identifies style from inspiration image and matches products."""

    image_b64 = _resize_b64(req.image_base64, 768)

    # Step 1: Identify vibe + style tags from image
    product_ctx = "\n".join([
        f"ID:{p['id']} | {p['title']}"
        for p in req.products[:30]
    ])

    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            f"{config.META_API_BASE_URL}/chat/completions",
            headers=HEADERS,
            json={
                "model": config.VISION_MODEL,
                "messages": [
                    {
                        "role": "developer",
                        "content": (
                            "You are a fashion style analyst. "
                            "Analyze inspiration images and match them to products. "
                            "Return only valid JSON."
                        ),
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"},
                            },
                            {
                                "type": "text",
                                "text": (
                                    f"Analyze this fashion inspiration image. "
                                    f"Then match it to products from this catalog:\n{product_ctx}\n\n"
                                    f'Return exactly: {{"vibe":"boho casual","style_tags":["floral","lightweight","feminine"],'
                                    f'"matched_ids":[9,15,25],"match_reasons":["Floral pattern matches the vibe","Light fabric similar to inspiration","Color palette aligns"],'
                                    f'"color_palette":["#E8C4A0","#D4956A","#8B4513"]}}'
                                ),
                            },
                        ],
                    },
                ],
                "max_tokens": 1024,
                "reasoning_effort": "minimal",
            },
        )
        r.raise_for_status()
        content = r.json()["choices"][0]["message"]["content"] or "{}"

    clean = re.sub(r"```json|```", "", content).strip()
    m = re.search(r"\{.*\}", clean, re.DOTALL)
    data = json.loads(m.group()) if m else {}

    return MoodBoardResponse(
        vibe=data.get("vibe", "Casual chic"),
        style_tags=data.get("style_tags", []),
        matched_ids=data.get("matched_ids", [])[:6],
        match_reasons=data.get("match_reasons", []),
        color_palette=data.get("color_palette", []),
    )
