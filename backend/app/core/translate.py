"""Server-side Bangla↔English translation, shared by every admin module.

Several free providers are tried in turn, because any single one rate-limits
(HTTP 429) shared server IPs now and then:

1. Google "gtx" endpoint
2. Google "dict-chrome-ex" endpoint (a separate quota)
3. MyMemory (identified by the site email, which raises its daily limit)

A provider that was just rate-limited is skipped for a short cool-down, results
are cached, and the call raises only when every provider failed — so a caller
never writes a failed translation, or the source text, into the target field.
"""
import logging
import re
import threading
import time
from collections import OrderedDict

import httpx

logger = logging.getLogger(__name__)

_MAX_CHARS = 1500       # GET URL length limit for the Google endpoints
_MYMEMORY_MAX = 480     # MyMemory rejects longer queries
_COOLDOWN_SECONDS = 90
_CONTACT_EMAIL = "info@aboenterprise.com"
_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; ABO-Admin-Translate/1.0)"}

_lock = threading.Lock()
_cooldown_until: dict[str, float] = {}
_cache: "OrderedDict[tuple[str, str, str], str]" = OrderedDict()
_CACHE_MAX = 300


def _google_gtx(text: str, source: str, target: str) -> str:
    r = httpx.get(
        "https://translate.googleapis.com/translate_a/single",
        params={"client": "gtx", "sl": source or "auto", "tl": target, "dt": "t", "q": text},
        timeout=12, headers=_HEADERS,
    )
    r.raise_for_status()
    return "".join(seg[0] for seg in r.json()[0] if seg and seg[0])


def _google_chrome(text: str, source: str, target: str) -> str:
    r = httpx.get(
        "https://clients5.google.com/translate_a/t",
        params={"client": "dict-chrome-ex", "sl": source or "auto", "tl": target, "q": text},
        timeout=12, headers=_HEADERS,
    )
    r.raise_for_status()
    data = r.json()
    first = data[0] if isinstance(data, list) and data else data
    if isinstance(first, list):  # [translated, detected-language]
        first = first[0]
    return str(first or "")


def _mymemory(text: str, source: str, target: str) -> str:
    def call(piece: str) -> str:
        r = httpx.get(
            "https://api.mymemory.translated.net/get",
            params={"q": piece, "langpair": f"{source}|{target}", "de": _CONTACT_EMAIL},
            timeout=15, headers=_HEADERS,
        )
        r.raise_for_status()
        j = r.json()
        if str(j.get("responseStatus")) != "200" or j.get("quotaFinished"):
            raise ValueError(f"mymemory: {j.get('responseDetails') or j.get('responseStatus')}")
        return (j.get("responseData") or {}).get("translatedText") or ""

    if len(text) <= _MYMEMORY_MAX:
        return call(text)
    pieces, buf = [], ""
    for p in re.split(r"(?<=[।.!?])\s+", text):
        if len(buf) + len(p) + 1 > _MYMEMORY_MAX:
            if buf:
                pieces.append(buf)
            buf = p[:_MYMEMORY_MAX]
        else:
            buf = f"{buf} {p}".strip()
    if buf:
        pieces.append(buf)
    return " ".join(call(x) for x in pieces if x.strip())


_PROVIDERS = (("google_gtx", _google_gtx), ("google_chrome", _google_chrome), ("mymemory", _mymemory))


def _translate_piece(text: str, source: str, target: str) -> str:
    """One single-line chunk through the provider chain."""
    key = (source, target, text)
    with _lock:
        if key in _cache:
            _cache.move_to_end(key)
            return _cache[key]
    last: Exception | None = None
    now = time.monotonic()
    for name, fn in _PROVIDERS:
        if _cooldown_until.get(name, 0) > now:
            continue
        try:
            out = (fn(text, source, target) or "").strip()
            if not out:
                raise ValueError("empty result")
            with _lock:
                _cache[key] = out
                if len(_cache) > _CACHE_MAX:
                    _cache.popitem(last=False)
            return out
        except Exception as exc:  # noqa: BLE001 — try the next provider
            last = exc
            logger.warning("translate provider %s failed: %s", name, exc)
            if isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code in (429, 403, 503):
                _cooldown_until[name] = time.monotonic() + _COOLDOWN_SECONDS
    # Everything on cool-down or failing: one last pass ignoring cool-downs.
    for name, fn in _PROVIDERS:
        if _cooldown_until.get(name, 0) <= now:
            continue
        try:
            out = (fn(text, source, target) or "").strip()
            if out:
                return out
        except Exception as exc:  # noqa: BLE001
            last = exc
    raise RuntimeError(f"all translation providers failed: {last}")


def _split_long_line(line: str) -> list[str]:
    parts = re.split(r"(?<=[।.!?])\s+", line)
    buf, chunks = "", []
    for p in parts:
        if len(buf) + len(p) + 1 > _MAX_CHARS:
            if buf:
                chunks.append(buf)
            buf = p[:_MAX_CHARS]
        else:
            buf = f"{buf} {p}".strip()
    if buf:
        chunks.append(buf)
    return chunks


# Brand names must survive translation: "আপন" is also the ordinary word "your/own", so a plain
# translation turns "আপন ডাউনলোড করুন" into "Download your". Applied only to whole words.
_BN_WORD = r"(?<![ঀ-৿])%s(?![ঀ-৿])"
_GLOSSARY_BN_TO_EN = (
    (re.compile(_BN_WORD % "আপন"), "Apon"),
    (re.compile(r"এবিও\s*এন্টারপ্রাইজ"), "ABO Enterprise"),
)
_GLOSSARY_EN_TO_BN = (
    (re.compile(r"\bApon\b"), "আপন"),
)


def _apply_glossary(text: str, source: str, target: str) -> str:
    rules = _GLOSSARY_BN_TO_EN if (source, target) == ("bn", "en") else _GLOSSARY_EN_TO_BN if (source, target) == ("en", "bn") else ()
    for pattern, repl in rules:
        text = pattern.sub(repl, text)
    return text


def translate_text(text: str, source: str = "bn", target: str = "en") -> str:
    """Translate `text` from `source` to `target`. Empty in → empty out.
    Line breaks are preserved; very long lines are split on sentence ends."""
    text = (text or "").strip()
    if not text:
        return ""
    source = (source or "bn").lower()
    target = (target or "en").lower()
    if source == target:
        return text
    text = _apply_glossary(text, source, target)
    out: list[str] = []
    for line in text.split("\n"):
        if not line.strip():
            out.append("")
        elif len(line) <= _MAX_CHARS:
            out.append(_translate_piece(line.strip(), source, target))
        else:
            out.append(" ".join(_translate_piece(c, source, target) for c in _split_long_line(line)))
    return "\n".join(out)
