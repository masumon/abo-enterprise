"""Server-side Bangla↔English translation, shared by every admin module.

Originally lived inside the blog router; extracted here so any admin form
(products, services, settings, …) can auto-fill its English fields from Bangla
without duplicating the logic or being gated behind blog-only permissions.

Google's free gtx endpoint is tried first (reliable from server IPs), MyMemory
is the fallback. Raises on total failure so a caller never writes a failed
translation — or the source Bangla — into an English field.
"""
import logging
import re

logger = logging.getLogger(__name__)

# The free gtx endpoint is a GET (URL length limited), so keep chunks small.
_TRANSLATE_MAX_CHARS = 1500


def translate_text(text: str, source: str = "bn", target: str = "en") -> str:
    """Translate `text` from `source` to `target`. Empty in → empty out."""
    import httpx
    from deep_translator import MyMemoryTranslator

    def _google_free(chunk: str) -> str:
        r = httpx.get(
            "https://translate.googleapis.com/translate_a/single",
            params={"client": "gtx", "sl": source or "auto", "tl": target, "dt": "t", "q": chunk},
            timeout=12,
            headers={"User-Agent": "Mozilla/5.0"},
        )
        r.raise_for_status()
        data = r.json()
        return "".join(seg[0] for seg in data[0] if seg and seg[0])

    def _mymemory(chunk: str) -> str:
        # MyMemory rejects requests over ~500 chars, so split on sentence
        # boundaries into <=480-char pieces.
        if len(chunk) <= 480:
            return MyMemoryTranslator(source=source, target=target).translate(chunk)
        pieces, buf = [], ""
        for p in re.split(r"(?<=[।.!?])\s+", chunk):
            if len(buf) + len(p) + 1 > 480:
                if buf:
                    pieces.append(buf)
                buf = p[:480]
            else:
                buf = f"{buf} {p}".strip()
        if buf:
            pieces.append(buf)
        return " ".join(MyMemoryTranslator(source=source, target=target).translate(x) for x in pieces if x.strip())

    def _one(chunk: str) -> str:
        try:
            out = _google_free(chunk)
            if out and out.strip():
                return out
            raise ValueError("empty result")
        except Exception as exc:  # noqa: BLE001 — fall back to MyMemory
            logger.warning("Google free translate failed (%s); trying MyMemory", exc)
            return _mymemory(chunk)

    text = text.strip()
    if not text:
        return ""
    if len(text) <= _TRANSLATE_MAX_CHARS:
        return _one(text)

    # Long content: preserve line breaks, translate non-blank lines (chunking
    # any single very long line on sentence boundaries).
    out: list[str] = []
    for line in text.split("\n"):
        if not line.strip():
            out.append("")
            continue
        if len(line) <= _TRANSLATE_MAX_CHARS:
            out.append(_one(line))
            continue
        parts = re.split(r"(?<=[।.!?])\s+", line)
        buf, chunks = "", []
        for p in parts:
            if len(buf) + len(p) + 1 > _TRANSLATE_MAX_CHARS:
                chunks.append(buf)
                buf = p
            else:
                buf = f"{buf} {p}".strip()
        if buf:
            chunks.append(buf)
        out.append(" ".join(_one(c) for c in chunks))
    return "\n".join(out)
