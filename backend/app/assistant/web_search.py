"""Lightweight web lookup for assistant (DuckDuckGo Instant Answer — no API key).

Free and key-less. Extraction tries, in order: direct Answer (calculations,
conversions, facts), AbstractText (encyclopedic summary), Definition, then
the first RelatedTopics entry (clearly framed as "related"). Anything
ambiguous returns None so the assistant never presents noise as an answer.
"""

import logging
import httpx

logger = logging.getLogger(__name__)


def _clean(text: str, max_chars: int) -> str:
    text = " ".join(str(text).split())
    return text[:max_chars] + ("…" if len(text) > max_chars else "")


async def search_web(query: str, max_chars: int = 600) -> str | None:
    """Return a short factual summary from DuckDuckGo or None."""
    q = query.strip()
    if len(q) < 3:
        return None
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(
                "https://api.duckduckgo.com/",
                params={"q": q, "format": "json", "no_redirect": 1, "skip_disambig": 1, "no_html": 1},
            )
            r.raise_for_status()
            data = r.json()

        answer = data.get("Answer")
        if answer and isinstance(answer, str):
            return _clean(answer, max_chars)

        abstract = data.get("AbstractText")
        if abstract:
            src = data.get("AbstractSource") or ""
            text = _clean(abstract, max_chars)
            return f"{text}\n(সূত্র/Source: {src})" if src else text

        definition = data.get("Definition")
        if definition:
            src = data.get("DefinitionSource") or ""
            text = _clean(definition, max_chars)
            return f"{text}\n(সূত্র/Source: {src})" if src else text

        related = data.get("RelatedTopics") or []
        for item in related[:1]:
            text = item.get("Text") if isinstance(item, dict) else None
            # Only surface a related topic when it clearly matches the query
            # words — otherwise DDG's disambiguation list reads as nonsense.
            if text and any(w in text.lower() for w in q.lower().split() if len(w) > 3):
                return _clean(text, max_chars)
        return None
    except Exception as exc:
        logger.debug("web_search failed: %s", exc)
        return None
