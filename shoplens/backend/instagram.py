"""
ShopLens - Instagram Image Fetcher

Reality check (2026):
- Instagram's GraphQL public endpoint is dead for posts
- Page HTML is JS-rendered, no image URLs in source
- oEmbed always returns image 1 regardless of img_index
- All methods require either auth OR residential proxy + TLS bypass

Working approach:
1. oEmbed with explicit img_index in URL (user controls which image)
2. Multiple fetches for different indices if user wants a specific one

For the hackathon demo: the cleanest UX is letting users pick the
image number they want, fetch it, and try it on.
"""
import re
import base64
import logging
import httpx
from typing import List
from urllib.parse import urlparse, parse_qs

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def _extract_shortcode(url: str) -> str:
    match = re.search(
        r"instagram\.com/(?:[A-Za-z0-9_.]+/)?(?:p|reel|reels|tv)/([A-Za-z0-9_-]+)",
        url
    )
    if not match:
        raise ValueError("Invalid Instagram URL.")
    return match.group(1)


def _extract_img_index(url: str) -> int:
    """Get explicit img_index from URL query string, default 1."""
    qs = parse_qs(urlparse(url).query)
    return int(qs.get("img_index", [1])[0])


async def _oembed_fetch(client: httpx.AsyncClient, shortcode: str, index: int) -> str | None:
    """Fetch thumbnail for a specific index via oEmbed."""
    url = f"https://www.instagram.com/p/{shortcode}/?img_index={index}"
    try:
        r = await client.get(
            f"https://www.instagram.com/api/v1/oembed/?url={url}&maxwidth=1080",
            headers=HEADERS,
            timeout=12,
        )
        if r.status_code == 200:
            return r.json().get("thumbnail_url")
    except Exception as e:
        logger.warning(f"oEmbed index={index} failed: {e}")
    return None


async def fetch_instagram_images(post_url: str) -> List[dict]:
    """
    Fetch images from an Instagram post.

    Strategy:
    - If URL has explicit img_index → fetch that specific image
    - If URL has no index → probe indices 1-10, stop when same image repeats
      (works for some posts, not all due to Instagram's 2026 restrictions)
    - Always returns at least image 1 as fallback
    """
    shortcode = _extract_shortcode(post_url)
    explicit_index = _extract_img_index(post_url)
    has_explicit = "img_index" in post_url

    logger.info(f"Shortcode: {shortcode} | explicit_index: {explicit_index} | has_explicit: {has_explicit}")

    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:

        if has_explicit:
            # User explicitly asked for a specific image — just fetch that one
            thumb = await _oembed_fetch(client, shortcode, explicit_index)
            if not thumb:
                raise RuntimeError("Could not fetch image. Upload directly.")
            r = await client.get(thumb, headers=HEADERS, timeout=20)
            r.raise_for_status()
            return [{
                "image_base64": base64.b64encode(r.content).decode(),
                "image_url": thumb,
                "index": explicit_index - 1,
            }]

        # No explicit index — probe 1 to 10 to detect carousel
        image_urls: List[str] = []
        seen_ids: set = set()

        for idx in range(1, 11):
            thumb = await _oembed_fetch(client, shortcode, idx)
            if not thumb:
                break

            # File ID fingerprint for dedup
            m = re.search(r"/(\d{8,})[_.]", thumb)
            fid = m.group(1) if m else thumb.split("?")[0][-20:]

            if fid in seen_ids:
                logger.info(f"Duplicate at index {idx} → carousel has {len(image_urls)} images")
                break

            seen_ids.add(fid)
            image_urls.append(thumb)
            logger.info(f"Found image {idx}: fid={fid}")

        if not image_urls:
            raise RuntimeError("Could not fetch from Instagram. Upload directly.")

        logger.info(f"Total images found: {len(image_urls)}")

        # Download all
        results = []
        for i, url in enumerate(image_urls):
            try:
                r = await client.get(url, headers=HEADERS, timeout=20)
                if r.status_code == 200:
                    results.append({
                        "image_base64": base64.b64encode(r.content).decode(),
                        "image_url": url,
                        "index": i,
                    })
            except Exception as e:
                logger.warning(f"Download failed for image {i+1}: {e}")

        if not results:
            raise RuntimeError("Downloaded 0 images. Upload directly.")

        return results


async def fetch_instagram_image(post_url: str) -> dict:
    images = await fetch_instagram_images(post_url)
    return images[0]
