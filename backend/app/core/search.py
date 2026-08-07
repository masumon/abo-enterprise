"""Shared full-text-ish search for the public catalog.

Two goals the old per-column ``name.ilike('%q%')`` could not meet:

1. **"Search anything, get everything related."** A query is split into words and
   each word must appear in *some* searched column (AND across words, OR across
   columns) — so "usb cable" narrows, while "cable" alone still matches on name,
   description, category, brand or SKU.

2. **Bangla ⇄ English.** Catalog text is bilingual, but a shopper may type in the
   other script than the one a given field was filled in. Each token is expanded
   with a Bengali⇄Latin variant (a curated dictionary of common catalog words,
   plus a phonetic fallback) and those variants are searched too.

The transliteration is best-effort: the curated map carries the frequent real
queries reliably; the phonetic fallback only *widens* the net (it is OR-ed with
the raw term, never replaces it), which is exactly the "show me everything"
behaviour asked for.
"""
from __future__ import annotations

from sqlalchemy import and_, or_

# Curated Banglish ⇄ Bengali for the most common catalog words. Rule-based
# transliteration rarely reproduces the exact stored spelling, so real product
# words are mapped explicitly; the generic fallback handles the long tail.
_EN_BN: dict[str, str] = {
    "mobile": "মোবাইল", "phone": "ফোন", "smartphone": "স্মার্টফোন",
    "cover": "কভার", "case": "কেস", "cable": "ক্যাবল", "charger": "চার্জার",
    "charging": "চার্জিং", "adapter": "অ্যাডাপ্টার", "laptop": "ল্যাপটপ",
    "computer": "কম্পিউটার", "desktop": "ডেস্কটপ", "headphone": "হেডফোন",
    "earphone": "ইয়ারফোন", "earbuds": "ইয়ারবাড", "speaker": "স্পিকার",
    "powerbank": "পাওয়ার ব্যাংক", "power": "পাওয়ার", "battery": "ব্যাটারি",
    "screen": "স্ক্রিন", "protector": "প্রোটেক্টর", "glass": "গ্লাস",
    "tempered": "টেম্পার্ড", "watch": "ওয়াচ", "smartwatch": "স্মার্টওয়াচ",
    "printer": "প্রিন্টার", "print": "প্রিন্ট", "printing": "প্রিন্টিং",
    "software": "সফটওয়্যার", "website": "ওয়েবসাইট", "service": "সেবা",
    "gadget": "গ্যাজেট", "memory": "মেমরি", "card": "কার্ড",
    "pendrive": "পেনড্রাইভ", "keyboard": "কিবোর্ড", "mouse": "মাউস",
    "router": "রাউটার", "camera": "ক্যামেরা", "light": "লাইট", "fan": "ফ্যান",
    "led": "এলইডি", "holder": "হোল্ডার", "stand": "স্ট্যান্ড", "bag": "ব্যাগ",
}
_BN_EN: dict[str, str] = {v: k for k, v in _EN_BN.items()}

# Phonetic fallback (Avro-like), ordered longest-first so clusters win.
_CONS: list[tuple[str, str]] = [
    ("chh", "ছ"), ("sh", "শ"), ("gh", "ঘ"), ("kh", "খ"), ("jh", "ঝ"),
    ("bh", "ভ"), ("dh", "ধ"), ("th", "থ"), ("ph", "ফ"), ("ch", "চ"), ("ng", "ং"),
    ("k", "ক"), ("g", "গ"), ("c", "ক"), ("j", "জ"), ("t", "ট"), ("d", "ড"),
    ("n", "ন"), ("p", "প"), ("f", "ফ"), ("b", "ব"), ("v", "ভ"), ("m", "ম"),
    ("r", "র"), ("l", "ল"), ("s", "স"), ("h", "হ"), ("y", "য়"), ("w", "ও"),
    ("z", "জ"), ("q", "ক"), ("x", "ক্স"),
]
_VOW: list[tuple[str, str]] = [
    ("oo", "ঊ"), ("aa", "আ"), ("ee", "ঈ"), ("oi", "ঐ"), ("ou", "ঔ"),
    ("a", "আ"), ("i", "ই"), ("u", "উ"), ("e", "এ"), ("o", "অ"),
]
_KAR: dict[str, str] = {
    "oo": "ূ", "aa": "া", "ee": "ী", "oi": "ৈ", "ou": "ৌ",
    "a": "া", "i": "ি", "u": "ু", "e": "ে", "o": "",
}


def _rule_translit(tok: str) -> str:
    s = tok.lower()
    n = len(s)
    out: list[str] = []
    i = 0
    while i < n:
        for pat, beng in _CONS:
            if s.startswith(pat, i):
                out.append(beng)
                i += len(pat)
                for vp, _ in _VOW:  # optional trailing vowel → kar sign
                    if s.startswith(vp, i):
                        out.append(_KAR.get(vp, ""))
                        i += len(vp)
                        break
                break
        else:
            for vp, beng in _VOW:
                if s.startswith(vp, i):
                    out.append(beng)
                    i += len(vp)
                    break
            else:
                i += 1
    return "".join(out)


def _variants(tok: str) -> list[str]:
    """Extra terms to also match for a single token (never includes the raw)."""
    out: list[str] = []
    low = tok.lower()
    if low in _EN_BN:
        out.append(_EN_BN[low])
    if tok in _BN_EN:
        out.append(_BN_EN[tok])
    # Generic phonetic fallback for latin words we don't have a mapping for.
    if low.isascii() and low.isalpha() and low not in _EN_BN and len(low) >= 3:
        r = _rule_translit(low)
        if len(r) >= 2:
            out.append(r)
    return out


def build_search_condition(columns, query: str):
    """AND across query words, OR across ``columns`` and each word's variants.

    Returns a SQLAlchemy clause, or ``None`` when the query is blank so the
    caller can skip adding a filter.
    """
    tokens = [t for t in (query or "").split() if t]
    if not tokens:
        return None
    per_token = []
    for tok in tokens:
        ors = []
        for term in [tok, *_variants(tok)]:
            like = f"%{term}%"
            ors.extend(col.ilike(like) for col in columns)
        per_token.append(or_(*ors))
    return and_(*per_token)
