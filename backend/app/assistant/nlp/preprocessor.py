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

# Romanized Bengali (Banglish) → English hint words. Matched on word
# boundaries only, and the original token is kept alongside the hint so
# catalog names written in Banglish still match.
_BANGLISH_TO_EN = {
    "dam": "price",
    "daam": "price",
    "mullo": "price",
    "koto": "how much",
    "kato": "how much",
    "kinbo": "buy",
    "kinte": "buy",
    "kena": "buy",
    "nibo": "buy",
    "nite": "buy",
    "korbo": "want",
    "chai": "want",
    "lagbe": "need",
    "ache": "available",
    "ase": "available",
    "asche": "available",
    "stok": "stock",
    "mojud": "stock",
    "kothay": "where",
    "kobe": "when",
    "kivabe": "how",
    "kemne": "how",
    "taka": "taka",
    "tk": "taka",
    "seba": "service",
    "porisheba": "service",
    "sheba": "service",
    "juktijukto": "contact",
    "jogajog": "contact",
    "thikana": "address",
    "help": "help",
    "shahajjo": "help",
    "sahajjo": "help",
    "obhijog": "complaint",
    "shomossha": "problem",
    "somossa": "problem",
    "dhonnobad": "thanks",
    "dhonnobaad": "thanks",
    "salam": "hello",
    "assalamualaikum": "hello",
    "bujhlam": "ok",
    "accha": "ok",
    "acha": "ok",
    "hae": "yes",
    "hain": "yes",
    "ji": "yes",
    "jee": "yes",
    "na": "no",
    "batil": "cancel",
    "bondho": "cancel",
    "ferot": "return",
    "chharh": "discount",
    "bikash": "bkash",
    "rocket": "rocket",
    "khoroch": "cost",
    "kharoch": "cost",
    "pathaben": "delivery",
    "pathabe": "delivery",
    "pouchabe": "delivery",
    "asbe": "delivery",
}

# Bengali numerals → ASCII digits, so phones/quantities typed in Bengali work.
_BN_DIGITS = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")

_WHITESPACE_RE = re.compile(r"\s+")
_PHONE_RE = re.compile(r"(?:\+?88)?0[13-9]\d{9}")
_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
_ORDER_NUM_RE = re.compile(r"\bABO-[A-Z0-9-]{4,20}\b", re.IGNORECASE)
_BOOKING_NUM_RE = re.compile(r"\bBK-\d{4}-\d{6}\b", re.IGNORECASE)
_LEAD_NUM_RE = re.compile(r"\bLF-\d{4}-\d{6}\b", re.IGNORECASE)
_INVOICE_NUM_RE = re.compile(r"\bINV-[A-Z0-9-]+\b", re.IGNORECASE)
_QUANTITY_RE = re.compile(r"\b(\d{1,4})\s*(?:pcs|pc|piece|pieces|টা|টি|unit|units)?\b", re.IGNORECASE)
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
    """Append English hints for Bengali words at the END of the text.

    Inline insertion used to split multi-word Bengali keyword phrases
    ("অর্ডার ট্র্যাক" became "অর্ডার order ট্র্যাক") and corrupt words when
    the match was a substring ("আসসালামু" → "আসসালাম helloু").
    """
    lowered = text.lower()
    hints = [en for bn, en in _BN_TO_LATIN.items() if bn in lowered]
    if hints:
        return lowered + " " + " ".join(dict.fromkeys(hints))
    return lowered


def _expand_abbreviations(text: str) -> str:
    words = text.split()
    expanded = []
    for w in words:
        clean = re.sub(r"[^\w@.+-]", "", w.lower())
        expanded.append(_ABBREVIATIONS.get(clean, w))
    return " ".join(expanded)


def _expand_banglish(text: str) -> str:
    """Append English hints for romanized-Bengali tokens at the END of the text."""
    hints: list[str] = []
    for w in text.split():
        clean = re.sub(r"[^\w]", "", w.lower())
        hint = _BANGLISH_TO_EN.get(clean)
        if hint and hint != clean:
            hints.append(hint)
    if hints:
        return text + " " + " ".join(dict.fromkeys(hints))
    return text


def preprocess_text(text: str) -> dict:
    """Normalize user message and extract inline structured hints."""
    raw = text.strip()
    # Bengali numerals → ASCII so phone/quantity/price extraction works.
    digits_normalized = raw.translate(_BN_DIGITS)
    normalized = _normalize_unicode(digits_normalized)
    normalized = normalized.lower()
    normalized = _expand_bn_tokens(normalized)
    normalized = _expand_abbreviations(normalized)
    normalized = _expand_banglish(normalized)
    normalized = _WHITESPACE_RE.sub(" ", normalized).strip()

    phones = _PHONE_RE.findall(digits_normalized)
    emails = _EMAIL_RE.findall(raw)
    order_numbers = [m.upper() for m in _ORDER_NUM_RE.findall(raw)]
    booking_numbers = [m.upper() for m in _BOOKING_NUM_RE.findall(raw)]
    lead_numbers = [m.upper() for m in _LEAD_NUM_RE.findall(raw)]
    invoice_numbers = [m.upper() for m in _INVOICE_NUM_RE.findall(raw)]

    # Strip phone numbers first so their digits are never read as quantities.
    qty_source = _PHONE_RE.sub(" ", digits_normalized)
    quantities: list[int] = []
    for m in _QUANTITY_RE.finditer(qty_source):
        try:
            quantities.append(int(m.group(1)))
        except ValueError:
            pass

    prices: list[float] = []
    for m in _PRICE_RE.finditer(digits_normalized):
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
        "booking_numbers": booking_numbers,
        "lead_numbers": lead_numbers,
        "invoice_numbers": invoice_numbers,
        "quantities": quantities,
        "prices": prices,
    }
