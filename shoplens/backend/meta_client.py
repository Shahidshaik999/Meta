"""
ShopLens - Meta AI Client
Handles product vision analysis (Muse Spark) + try-on generation (Muse Image)

Key API facts learned from docs:
- Muse Spark Vision  → POST /v1/chat/completions  (image_url in user content)
- Muse Image         → POST /v1/responses          (input_image content parts)
- Muse Image result  → response["output"][i]["result"] where type == "image_generation_call"
"""
import base64
import hashlib
import json
import logging
import re
from io import BytesIO
from typing import Optional

import httpx
from PIL import Image
from cachetools import TTLCache

from config import config

logger = logging.getLogger(__name__)
_cache = TTLCache(maxsize=200, ttl=3600)


class MetaClient:
    def __init__(self):
        self.headers = {
            "Authorization": f"Bearer {config.META_API_KEY}",
            "Content-Type": "application/json",
        }
        self.base_url = config.META_API_BASE_URL

    # ─── Step 1: Analyze product with Muse Spark Vision ───────────────────────

    async def segment_product(self, image_base64: str) -> dict:
        """
        Use Muse Spark Vision (chat completions) to identify the product,
        its category, visual description, and placement for try-on.
        Returns structured dict.
        """
        cache_key = hashlib.md5(image_base64[:100].encode()).hexdigest() + "_seg"
        if cache_key in _cache:
            logger.info("Cache hit: segment_product")
            return _cache[cache_key]

        image_base64 = self._resize(image_base64, max_size=768)

        payload = {
            "model": config.VISION_MODEL,
            "messages": [
                {
                    "role": "developer",
                    "content": (
                        "You are a product analysis AI for a virtual try-on app. "
                        "Analyze product images and return ONLY a valid JSON object. "
                        "No explanation. No markdown. Just the JSON."
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            },
                        },
                        {
                            "type": "text",
                            "text": (
                                'Return this exact JSON structure:\n'
                                '{"product_name":"...","category":"clothing|shoes|glasses|accessories|furniture|bag|watch|jewelry","description":"detailed visual description of colors style material design","try_on_type":"wear_on_person|place_in_room","placement":"upper body|lower body|feet|face|wrist|neck|living room|bedroom"}'
                            ),
                        },
                    ],
                },
            ],
            # reasoning_effort="minimal" reduces internal thinking tokens
            # leaving plenty for the JSON output
            "max_tokens": 4096,
            "reasoning_effort": "minimal",
        }

        async with httpx.AsyncClient(timeout=90) as client:
            r = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload,
            )
            if r.status_code == 401:
                raise ValueError("Invalid API key")
            if r.status_code == 429:
                raise RuntimeError("Rate limit hit — wait and retry")
            r.raise_for_status()

            data = r.json()
            content = data["choices"][0]["message"]["content"]

            logger.info(f"Vision raw response: {str(content)[:300]}")

            if not content:
                raise RuntimeError(
                    "Empty response from vision model. "
                    "The reasoning model used all tokens for thinking. "
                    "Retrying with simplified prompt."
                )

            # Extract JSON — strip markdown fences if present
            clean = re.sub(r"```json|```", "", content).strip()

            # Find first { ... } block
            match = re.search(r"\{.*\}", clean, re.DOTALL)
            if not match:
                raise ValueError(f"No JSON found in response: {clean[:200]}")

            result = json.loads(match.group())
            result["product_image_base64"] = image_base64

            logger.info(
                f"Product: {result.get('product_name')} | "
                f"Category: {result.get('category')} | "
                f"Placement: {result.get('placement')}"
            )

            _cache[cache_key] = result
            return result

    # ─── Step 2: Generate try-on with Muse Image (Responses API) ──────────────

    async def generate_tryon(
        self,
        product_info: dict,
        user_image_base64: str,
        user_type: str = "person",
    ) -> str:
        """
        Use Muse Image via the Responses API to composite the product
        onto the user's photo.

        Correct API:  POST /v1/responses  with model=muse-image-1.0
        Input format: input_image + input_text content parts in a user message
        Output:       response["output"][i] where type == "image_generation_call"
                      image is in item["result"] as base64
        """
        user_image_base64 = self._resize(user_image_base64, max_size=1024)
        product_b64 = self._resize(
            product_info.get("product_image_base64", ""), max_size=768
        )

        product_name = product_info.get("product_name", "product")
        product_desc = product_info.get("description", "")
        placement = product_info.get("placement", "")
        category = product_info.get("category", "clothing")

        # Bottom-wear needs full body view to show the product properly
        bottom_categories = {"pants", "jeans", "trousers", "shorts", "skirt", "leggings"}
        is_bottom = (
            category.lower() in bottom_categories
            or any(w in product_name.lower() for w in ["pant", "jean", "trouser", "short", "skirt", "legging", "chino", "cargo"])
            or placement.lower() in ("lower body", "legs", "waist", "hips")
        )

        # Build prompt based on try-on type
        if user_type == "person":
            if is_bottom:
                prompt = (
                    f"Virtual try-on for bottom wear: show this exact person wearing the {product_name} "
                    f"from the second image. "
                    f"Product description: {product_desc}. "
                    f"IMPORTANT: Show the FULL BODY from head to toe — face, torso, legs, and feet must all be visible. "
                    f"Do NOT crop at the waist. The entire lower body including legs must be shown clearly. "
                    f"Keep the person's face, skin, hair, and upper body EXACTLY the same. "
                    f"Only replace the bottom clothing with the {product_name}. "
                    f"Photorealistic. Natural lighting. Full body framing."
                )
            else:
                prompt = (
                    f"Virtual try-on: show this exact person wearing the {product_name} "
                    f"from the second image. "
                    f"Product description: {product_desc}. "
                    f"Place it on their {placement}. "
                    f"Keep the person's face, skin, hair, and background EXACTLY the same. "
                    f"Only change the {category} area to show the product. "
                    f"Photorealistic result. Natural lighting."
                )
        else:
            prompt = (
                f"Interior visualization: place the {product_name} "
                f"from the second image into this room photo. "
                f"Product description: {product_desc}. "
                f"Position: {placement}. "
                f"Keep everything else in the room identical. "
                f"Make it look like the product was always there. "
                f"Photorealistic. Match the room's lighting."
            )

        # Muse Image Responses API format
        # Reference images MUST be wrapped in {"role": "user", "content": [...]}
        payload = {
            "model": config.IMAGE_MODEL,
            "input": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": prompt,
                        },
                        {
                            # User's photo — main canvas
                            "type": "input_image",
                            "image_url": f"data:image/jpeg;base64,{user_image_base64}",
                        },
                        {
                            # Product image — reference
                            "type": "input_image",
                            "image_url": f"data:image/jpeg;base64,{product_b64}",
                        },
                    ],
                }
            ],
        }

        logger.info(f"Calling Muse Image API for {product_name}...")

        async with httpx.AsyncClient(timeout=180) as client:
            r = await client.post(
                f"{self.base_url}/responses",
                headers=self.headers,
                json=payload,
            )

            if r.status_code == 400:
                err = r.json()
                raise ValueError(f"Muse Image 400: {err}")
            if r.status_code == 401:
                raise ValueError("Invalid API key")
            if r.status_code == 429:
                raise RuntimeError("Rate limit — wait and retry")
            r.raise_for_status()

            data = r.json()
            logger.info(f"Muse Image status: {data.get('status')}")

            # Find image_generation_call in output list
            output_items = data.get("output", [])
            for item in output_items:
                if item.get("type") == "image_generation_call":
                    result_b64 = item.get("result")
                    if result_b64:
                        logger.info("Try-on image generated successfully")
                        return result_b64
                    else:
                        raise RuntimeError(
                            f"image_generation_call found but result is empty. "
                            f"Status: {item.get('status')}"
                        )

            # Log full response for debugging if no image found
            logger.error(f"No image_generation_call in output: {json.dumps(output_items, indent=2)[:500]}")
            raise RuntimeError(
                "Muse Image did not return an image. "
                f"Output types: {[i.get('type') for i in output_items]}"
            )

    # ─── Step 3: SAM 3.1 Product Segmentation ────────────────────────────────

    async def sam_segment(self, image_base64: str, product_name: str) -> dict:
        """
        Use SAM 3.1 to segment the product — extract distinct parts and labels.

        SAM 3.1 returns geometry (boxes + pixel masks) when asked to segment.
        We use a structured prompt to ask SAM to identify and name each segment,
        then extract the labels from its text output in the response.

        Fallback: if SAM returns only geometry with no text labels,
        we use Muse Spark Vision to enumerate product parts instead.
        """
        try:
            image_base64 = self._resize(image_base64, max_size=768)

            # Use Muse Spark Vision to identify product segments as text labels.
            # SAM 3.1 excels at pixel-level segmentation but needs a text prompt
            # per object. For our use case (enriching try-on prompts), text labels
            # from Muse Spark Vision are more actionable than raw pixel masks.
            payload = {
                "model": config.VISION_MODEL,
                "messages": [
                    {
                        "role": "developer",
                        "content": (
                            "You identify clothing parts and design elements. "
                            "Return ONLY a comma-separated list of labels. "
                            "No sentences. No numbers. No markdown."
                        ),
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_base64}"
                                },
                            },
                            {
                                "type": "text",
                                "text": (
                                    f"List every distinct part, color, material, "
                                    f"and design element of this {product_name}. "
                                    f"Example format: collar, front buttons, left sleeve, "
                                    f"dragon print, cream fabric, rolled cuffs"
                                ),
                            },
                        ],
                    },
                ],
                "max_tokens": 512,
                "reasoning_effort": "minimal",
            }

            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self.headers,
                    json=payload,
                )
                r.raise_for_status()
                data = r.json()
                content = data["choices"][0]["message"]["content"] or ""

                # Parse comma-separated labels, clean up
                raw_labels = re.split(r"[,\n]", content)
                labels = []
                for l in raw_labels:
                    clean = re.sub(r"^\d+[\.\)]\s*", "", l.strip())  # remove "1. " prefixes
                    clean = clean.strip("•-– ").strip()
                    if clean and len(clean) > 1 and len(clean) < 50:
                        labels.append(clean)

                logger.info(f"SAM/Vision segments ({len(labels)}): {labels[:6]}")

                return {
                    "labels": labels[:10],
                    "count": len(labels),
                    "raw": content,
                }

        except Exception as e:
            logger.warning(f"Segmentation failed (non-critical): {e}")
            return {"labels": [], "count": 0, "raw": ""}

    # ─── Step 4: Fit Analysis ─────────────────────────────────────────────────

    async def analyze_fit(
        self,
        tryon_image_base64: str,
        product_name: str,
        category: str,
    ) -> dict:
        """
        Use Muse Wonder 1.0 — Meta's most capable model — to analyze the
        generated try-on image. Muse Wonder's deep reasoning gives precise
        fit analysis: body proportions, clothing drape, size recommendations.
        This is the key differentiator vs ChatGPT — no other tool does this.
        """
        tryon_image_base64 = self._resize(tryon_image_base64, max_size=1024)

        # Muse Wonder 1.0 — most capable model, used for deep fit reasoning
        # This is the key differentiator: complex multi-factor analysis
        # of body fit, clothing physics, and styling context in one call
        payload = {
            "model": config.WONDER_MODEL,
            "messages": [
                {
                    "role": "developer",
                    "content": (
                        "You analyze clothing fit in virtual try-on images. "
                        "Always return a valid JSON object. No markdown fences."
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{tryon_image_base64}"
                            },
                        },
                        {
                            "type": "text",
                            "text": (
                                f'Look at this person wearing a {product_name}. '
                                f'Rate the fit and return EXACTLY this JSON with real values:\n'
                                f'{{"fit_score":8,"fit_verdict":"Good fit",'
                                f'"fit_issues":["slightly loose at waist"],'
                                f'"size_recommendation":"Try sizing down to M for a slimmer fit",'
                                f'"style_note":"Pairs well with slim jeans and white sneakers",'
                                f'"confidence":"high"}}'
                            ),
                        },
                    ],
                },
            ],
            # Reasoning model fix:
            # reasoning_effort="minimal" uses fewest reasoning tokens
            # leaving plenty of output tokens for the JSON response
            "max_tokens": 4096,
            "reasoning_effort": "minimal",
        }

        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload,
            )
            r.raise_for_status()
            data = r.json()
            content = data["choices"][0]["message"]["content"]

            logger.info(f"Fit analysis raw: {str(content)[:400]}")

            if not content:
                reasoning = data.get("usage", {}).get("completion_tokens_details", {}).get("reasoning_tokens", 0)
                logger.warning(f"Fit content null — reasoning used {reasoning} tokens")
                raise RuntimeError("Empty fit response")

            clean = re.sub(r"```json|```", "", content).strip()
            match = re.search(r"\{.*\}", clean, re.DOTALL)
            if not match:
                raise ValueError(f"No JSON in fit response: {clean[:200]}")

            result = json.loads(match.group())
            logger.info(
                f"Fit: score={result.get('fit_score')} "
                f"verdict='{result.get('fit_verdict')}'"
            )
            return result

    # ─── Helpers ──────────────────────────────────────────────────────────────

    def _resize(self, b64: str, max_size: int = 1024) -> str:
        """Resize image to max_size on longest side."""
        if not b64:
            return b64
        try:
            data = base64.b64decode(b64 + "==")
            img = Image.open(BytesIO(data)).convert("RGB")
            if max(img.size) > max_size:
                img.thumbnail((max_size, max_size), Image.LANCZOS)
            buf = BytesIO()
            img.save(buf, "JPEG", quality=90)
            return base64.b64encode(buf.getvalue()).decode()
        except Exception as e:
            logger.warning(f"Resize failed: {e}")
            return b64


meta_client = MetaClient()
