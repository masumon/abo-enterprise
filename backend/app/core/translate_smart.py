"""Professional-quality admin translation (bn <-> en).

1. Google Gemini (when the admin has switched AI on) translates the whole text
   in context, as a native copywriter would, for a Bangladeshi shop.
2. Otherwise — or if AI fails — the free providers in core/translate.py.

Either way the text is "protected" first: URLs, e-mails, phone/order numbers
and the rich-text marks the site understands (**bold**, {red}…{/red}, :phone:,
"# ", "• ", "1. ", "> ", [label](url) …) are swapped for ⟦n⟧ placeholders and
put back afterwards, so links never break, numbers never change, nothing
private reaches Google, and the formatting survives word-for-word.
"""
from __future__ import annotations

import logging
import re

from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.translate import _apply_glossary, translate_text

logger = logging.getLogger(__name__)

# Inline things that must come back unchanged.
_INLINE = re.compile(
    r"\]\((?:https?://|/)[^\s)]*\)"            # (url) part of [label](url) — label is translated
    r"|!\[[^\]]*\]\([^\s)]+\)"                 # images
    r"|(?:https?://|www\.)[^\s<]+"             # bare URLs
    r"|[\w.+-]+@[\w-]+\.[\w.]+"                # e-mails
    r"|\+?\d[\d\s\-]{5,}\d"                    # phone / order numbers
    r"|\{/?(?:red|green|blue|orange|purple|brand|gray|big|small|center)\}"  # colour/size tags
    r"|:[a-z]+:"                               # icons
    r"|\*\*|=="                                # bold / highlight marks
)
# Line-start marks (headings, bullets, numbered items, notes).
_PREFIX = re.compile(r"^(\s*(?:#{1,3}\s+|[•\-*✓✔▪●◦]\s+|[0-9০-৯]+[.)]\s+|>\s?))")
_PH = re.compile(r"⟦\s*(\d+)\s*⟧")


def protect(text: str) -> tuple[str, list[str]]:
    """Replace protected pieces with ⟦n⟧; returns (text, pieces)."""
    pieces: list[str] = []

    def keep(m: re.Match) -> str:
        pieces.append(m.group(0))
        return f"⟦{len(pieces) - 1}⟧"

    lines = []
    for line in text.split("\n"):
        pm = _PREFIX.match(line)
        prefix = ""
        if pm:
            prefix = keep(pm)
            line = line[pm.end():]
        lines.append(prefix + _INLINE.sub(keep, line))
    return "\n".join(lines), pieces


def restore(text: str, pieces: list[str]) -> str:
    """Put protected pieces back. Raises ValueError if any went missing."""
    seen: set[int] = set()

    def put(m: re.Match) -> str:
        i = int(m.group(1))
        if i >= len(pieces):
            return ""
        seen.add(i)
        return pieces[i]

    out = _PH.sub(put, text)
    if len(seen) != len(pieces):
        raise ValueError("translation lost a protected piece")
    # A line-start mark must stay glued to its line ("⟦0⟧ text" may gain a space).
    return re.sub(r"(^|\n)(\s*(?:#{1,3}|[•\-*✓✔▪●◦]|[0-9০-৯]+[.)]|>))\s+", r"\1\2 ", out)


_LANG = {"bn": "Bangla (Bengali, standard modern Bangladeshi চলিত style)", "en": "English (clear, natural, international)"}

SYSTEM = (
    "You are a senior professional translator and copywriter for ABO Enterprise, a mobile-accessories, "
    "electronics, printing and digital-services shop in Beanibazar, Sylhet, Bangladesh. "
    "Translate the user's text from {src} into {dst}. Rules:\n"
    "- Translate the MEANING naturally and fluently, the way a native speaker would write it for customers; "
    "never word-by-word. Keep the same tone (friendly, polite; in Bangla address customers as আপনি).\n"
    "- Use correct spelling and grammar. Keep common tech/product terms customers use as they are "
    "(e.g. USB, Type-C, PDF, A4, Wi-Fi, CCTV, SIM, bKash, Nagad, COD); keep model names, units and numbers exactly.\n"
    "- Brand names: 'ABO Enterprise' never changes; the app 'আপন' is 'Apon' in English and 'আপন' in Bangla.\n"
    "- Tokens like ⟦0⟧, ⟦1⟧ are placeholders for links, numbers or formatting: copy EVERY one exactly, "
    "in the matching position, and never add new ones.\n"
    "- Keep the same line breaks and the same number of lines; do not add explanations, quotes or notes.\n"
    'Reply as JSON: {{"translated": "..."}}'
)


async def _ai_translate(db: AsyncSession, text: str, source: str, target: str) -> str | None:
    from app.assistant import ai_gemini  # local import: optional feature

    if not await ai_gemini.is_available(db):
        return None
    system = SYSTEM.format(src=_LANG.get(source, source), dst=_LANG.get(target, target))
    raw = await ai_gemini.generate_json(db, system, text, max_tokens=max(1024, min(8192, len(text) * 4)))
    out = (raw or {}).get("translated") if isinstance(raw, dict) else None
    return out.strip() if isinstance(out, str) and out.strip() else None


async def smart_translate(db: AsyncSession | None, text: str, source: str = "bn", target: str = "en") -> str:
    """Best available translation; raises only when every provider failed."""
    text = (text or "").strip()
    source = (source or "bn").lower()
    target = (target or "en").lower()
    if not text or source == target:
        return text
    safe, pieces = protect(_apply_glossary(text, source, target))
    if db is not None:
        try:
            ai = await _ai_translate(db, safe, source, target)
            if ai:
                return _apply_glossary(restore(ai, pieces), source, target)
        except Exception as exc:  # noqa: BLE001 — fall back to the free providers
            logger.info("AI translation unavailable, using free providers: %s", exc)
    plain = await run_in_threadpool(translate_text, safe, source, target)
    try:
        return restore(plain, pieces)
    except ValueError:
        # A free provider mangled a placeholder: translate unprotected rather than fail.
        return await run_in_threadpool(translate_text, text, source, target)
