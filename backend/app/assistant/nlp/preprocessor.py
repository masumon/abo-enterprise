"""Text preprocessing for Bengali, English, and mixed-language input."""

import re
import unicodedata

# Common Bengali-English transliterations and typos
_BN_TO_LATIN = {
    "প্রোডাক্ট": "product",
    "পণ্য": "product",
    "দাম": "price",
    "মূল্য": "price",
    "স্টক": "stock",
    "অর্ডার": "order",
    "বুকিং": "booking",
    "সেবা": "service",
    "ডেলিভারি": "delivery",
    "ওয়ারেন্টি": "warranty",
    "রিটার্ন": "return",
    "পেমেন্ট": "payment",
    "ইনভয়েস": "invoice",
    "যোগাযোগ": "contact",
    "হ্যালো": "hello",
    "নমস্কার": "hello",
    "সালাম": "hello",
    "ধন্যবাদ": "thanks",
}

_ABBREVIATIONS = {
    "ord": "order",
    "del": "delivery",
    "qty": "quantity",
    "ph": "phone",
    "mob": "mobile",
    "bkash": "bkash",
    "nagad": "nagad",
    "abo": "abo",
}

_WHITESPACE_RE = re.compile(r"\s+")
_PHONE_RE = re.compile(r"(?:\+?88)?0[13-9]\d{8}")
_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
_ORDER_NUM_RE = re.compile(r"\bABO-\d{6}-[A-F0-9]{6}\b", re.IGNORECASE)
_INVOICE_NUM_RE = re.compile(r"\bINV-[A-Z0-9-]+\b", re.IGNORECASE)
_QUANTITY_RE = re.compile(r"\b(\d+)\s*(?:pcs|pc|piece|pieces|টা|টি|unit|units)?\b", re.IGNORECASE)
_PRICE_RE = re.compile(r"(?:৳|tk|taka|bdt)\s*([\d,]+(?:\.\d+)?)", re.IGNORECASE)


def detect_language(text: str) -> str:
    """Return 'bn', 'en', or 'mixed'."""
    if not text.strip():
        return "en"
    bn_chars = sum(1 for c in text if "\u0980" <= c <= "\u09FF")
    latin_chars = sum(1 for c in text if c.isascii() and c.isalpha())
    total = bn_chars + latin_chars
    if total == 0:
        return "en"
    ratio = bn_chars / total
    if ratio > 0.6:
        return "bn"
    if ratio > 0.15:
        return "mixed"
    return "en"


def _normalize_unicode(text: str) -> str:
    return unicodedata.normalize("NFKC", text)


def _expand_bn_tokens(text: str) -> str:
    lowered = text.lower()
    for bn, en in _BN_TO_LATIN.items():
        if bn in lowered:
            lowered = lowered.replace(bn, f"{bn} {en}")
    return lowered


def _expand_abbreviations(text: str) -> str:
    words = text.split()
    expanded = []
    for w in words:
        clean = re.sub(r"[^\w@.+-]", "", w.lower())
        expanded.append(_ABBREVIATIONS.get(clean, w))
    return " ".join(expanded)


def preprocess_text(text: str) -> dict:
    """Normalize user message and extract inline structured hints."""
    raw = text.strip()
    normalized = _normalize_unicode(raw)
    normalized = normalized.lower()
    normalized = _expand_bn_tokens(normalized)
    normalized = _expand_abbreviations(normalized)
    normalized = _WHITESPACE_RE.sub(" ", normalized).strip()

    phones = _PHONE_RE.findall(raw)
    emails = _EMAIL_RE.findall(raw)
    order_numbers = [m.upper() for m in _ORDER_NUM_RE.findall(raw)]
    invoice_numbers = [m.upper() for m in _INVOICE_NUM_RE.findall(raw)]

    quantities: list[int] = []
    for m in _QUANTITY_RE.finditer(raw):
        try:
            quantities.append(int(m.group(1)))
        except ValueError:
            pass

    prices: list[float] = []
    for m in _PRICE_RE.finditer(raw):
        try:
            prices.append(float(m.group(1).replace(",", "")))
        except ValueError:
            pass

    return {
        "raw": raw,
        "normalized": normalized,
        "language": detect_language(raw),
        "phones": phones,
        "emails": emails,
        "order_numbers": order_numbers,
        "invoice_numbers": invoice_numbers,
        "quantities": quantities,
        "prices": prices,
    }
