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
            parts: list[str] = []
            if data.get("AbstractText"):
                parts.append(str(data["AbstractText"]))
            for topic in (data.get("RelatedTopics") or [])[:3]:
                if isinstance(topic, dict) and topic.get("Text"):
                    parts.append(str(topic["Text"]))
            if not parts:
                return None
            text = " ".join(parts)
            return text[:max_chars] + ("…" if len(text) > max_chars else "")
    except Exception as exc:
        logger.debug("web_search failed: %s", exc)
        return None
