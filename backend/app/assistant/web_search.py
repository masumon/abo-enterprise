"""Lightweight web lookup for assistant (DuckDuckGo Instant Answer — no API key)."""

import logging
import httpx

logger = logging.getLogger(__name__)


async def search_web(query: str, max_chars: int = 600) -> str | None:
    """Return a short summary from DuckDuckGo or None."""
    q = query.strip()
    if len(q) < 3:
        return None
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(
                "https://api.duckduckgo.com/",
                params={"q": q, "format": "json", "no_redirect": 1, "skip_disambig": 1},
            )
            r.raise_for_status()
            data = r.json()
            # Only trust a direct AbstractText. When DuckDuckGo has no single
            # answer it returns RelatedTopics as a disambiguation list instead
            # (e.g. "product" -> dot/cross/tensor product) — surfacing those
            # as if they were an answer reads as nonsense to a customer, so
            # we treat "no clear abstract" the same as "no result".
            abstract = data.get("AbstractText")
            if not abstract:
                return None
            text = str(abstract)
            return text[:max_chars] + ("…" if len(text) > max_chars else "")
    except Exception as exc:
        logger.debug("web_search failed: %s", exc)
        return None
