"""AI helpers for the admin catalog: product drafts from photos and bilingual
descriptions from a name/notes. Pure prompt + normalising code (testable
without Google); the HTTP call lives in ai_gemini.generate_json.

Safety rules enforced HERE (not trusted to the model):
- A selling price is NEVER taken from the AI. It is only computed from a cost
  price printed on the photo/box, using the margin the admin chose.
- A suggested category must be one of the existing category slugs.
"""
from __future__ import annotations

import math
import re
from typing import Any

MAX_IMAGES = 10
MAX_IMAGE_BYTES = 4 * 1024 * 1024
MAX_TOTAL_BYTES = 16 * 1024 * 1024  # Gemini inline request limit is ~20 MB

PHOTO_SYSTEM = (
    "You are a careful catalog assistant for ABO Enterprise, an electronics/accessories shop in Sylhet, Bangladesh. "
    "You look at product photos (boxes, labels, the product itself) and write draft product listings. "
    "Only state facts you can read or clearly see. Never invent specifications, warranty, prices or brand names. "
    "Bangla must be natural Bangladeshi Bangla in Bengali script. Reply with JSON only."
)

PHOTO_USER = """Photos are numbered from 0 in the order given. Group photos that show the SAME product.
Return JSON: {{"products": [ {{
  "image_indexes": [0, 1],
  "name_bn": "...", "name_en": "...",
  "brand": "brand exactly as printed, or empty",
  "category_slug": "one slug from CATEGORIES or empty",
  "description_bn": ["short bullet", "..."], "description_en": ["short bullet", "..."],
  "specifications": {{"Key": "Value"}},
  "printed_cost_price": null,
  "notes": "anything unclear, in Bangla"
}} ] }}
Rules: 3-6 bullets each language; specifications only from visible text;
printed_cost_price = a purchase/dealer/cost price ONLY if it is clearly printed or handwritten as such (a number in BDT), else null.
Do NOT output any selling price.
CATEGORIES (slug: name): {categories}
{hint}"""

DESCRIBE_SYSTEM = (
    "You write clear, honest product/service copy for ABO Enterprise (Sylhet, Bangladesh). "
    "Use only the facts given; never invent prices, discounts, warranty terms, delivery times or specifications. "
    "Bangla must be natural Bangladeshi Bangla in Bengali script. Reply with JSON only."
)

DESCRIBE_USER = """Write website copy for this {kind}.
Name: {name}
Owner's notes: {notes}
Return JSON: {{"description_bn": "2-4 sentence paragraph", "description_en": "2-4 sentence paragraph",
"features_bn": ["3-6 short bullets"], "features_en": ["3-6 short bullets"],
"faq": [{{"q_bn": "", "a_bn": "", "q_en": "", "a_en": ""}}]}}
Give 2-4 FAQ items answerable from the facts only (else fewer)."""


def _s(v: Any, limit: int = 255) -> str:
    return re.sub(r"\s+", " ", str(v or "")).strip()[:limit]


def _bullets(v: Any) -> list[str]:
    if isinstance(v, str):
        v = [x for x in re.split(r"[\n•]+", v)]
    if not isinstance(v, list):
        return []
    out = []
    for x in v:
        t = _s(x, 300).lstrip("-•* ").strip()
        if t:
            out.append(t)
    return out[:8]


def bullets_text(items: list[str]) -> str:
    return "\n".join(f"• {b}" for b in items)


def _money(v: Any) -> float | None:
    if v is None or isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        n = float(v)
    else:
        digits = str(v).translate(str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789"))
        m = re.search(r"\d[\d,]*(?:\.\d+)?", digits)
        if not m:
            return None
        n = float(m.group(0).replace(",", ""))
    return n if 0 < n < 10_000_000 else None


def price_from_margin(cost: float | None, margin_percent: float | None) -> float | None:
    """Selling price = cost + margin%, rounded UP to the nearest 10 Taka. None
    when there is no printed cost or the admin chose no margin rule."""
    if cost is None or margin_percent is None or margin_percent < 0:
        return None
    return float(math.ceil(cost * (1 + margin_percent / 100) / 10) * 10)


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")[:120]


def normalize_drafts(raw: Any, category_slugs: set[str], image_count: int,
                     margin_percent: float | None) -> list[dict]:
    items = raw.get("products") if isinstance(raw, dict) else raw
    if not isinstance(items, list):
        return []
    drafts: list[dict] = []
    for it in items[:MAX_IMAGES]:
        if not isinstance(it, dict):
            continue
        name_en = _s(it.get("name_en"))
        name_bn = _s(it.get("name_bn"))
        if not (name_en or name_bn):
            continue
        idxs = [i for i in (it.get("image_indexes") or []) if isinstance(i, int) and 0 <= i < image_count]
        cat = _s(it.get("category_slug"), 120).lower()
        specs_in = it.get("specifications") if isinstance(it.get("specifications"), dict) else {}
        specs = {_s(k, 80): _s(v, 200) for k, v in specs_in.items() if _s(k, 80) and _s(v, 200)}
        cost = _money(it.get("printed_cost_price"))
        bn, en = _bullets(it.get("description_bn")), _bullets(it.get("description_en"))
        drafts.append({
            "name_bn": name_bn or name_en,
            "name_en": name_en or name_bn,
            "slug": slugify(name_en),
            "brand": _s(it.get("brand"), 100),
            "category": cat if cat in category_slugs else "",
            "description_bn": bullets_text(bn),
            "description_en": bullets_text(en),
            "specifications": dict(list(specs.items())[:20]),
            "cost_price": cost,
            # Never from the AI: only cost + the admin's margin rule.
            "price": price_from_margin(cost, margin_percent),
            "image_indexes": sorted(set(idxs)),
            "notes": _s(it.get("notes"), 400),
        })
    return drafts


def normalize_description(raw: Any) -> dict:
    raw = raw if isinstance(raw, dict) else {}
    faq = []
    for f in raw.get("faq") or []:
        if isinstance(f, dict) and (_s(f.get("q_bn")) or _s(f.get("q_en"))):
            faq.append({k: _s(f.get(k), 500) for k in ("q_bn", "a_bn", "q_en", "a_en")})
    return {
        "description_bn": _s(raw.get("description_bn"), 2000),
        "description_en": _s(raw.get("description_en"), 2000),
        "features_bn": _bullets(raw.get("features_bn")),
        "features_en": _bullets(raw.get("features_en")),
        "faq": faq[:6],
    }


# ── Booking-form questions for a service ────────────────────────────────────
BOOKING_FIELD_TYPES = ("text", "textarea", "number", "email", "phone", "url", "date", "datetime",
                       "select", "multiselect", "radio", "checkbox", "file")

BOOKING_FIELDS_SYSTEM = (
    "You design short, friendly booking/order request forms for ABO Enterprise, a shop in Beanibazar, Sylhet, "
    "Bangladesh. Given a service name and notes, propose the 3-8 questions the shop really needs to quote or do "
    "the job. Do NOT ask for name, phone, e-mail or address (the form already has them). Prefer choices "
    "(select/radio) over free text where the answers are predictable. Allowed field_type values: "
    + ", ".join(BOOKING_FIELD_TYPES) + ". Use 'file' when the customer must send a document or photo. "
    "Labels: natural Bangla (আপনি tone) and clear English. Options: short, in Bangla and English pairs. "
    'Reply as JSON: {"fields": [{"label_bn": "", "label_en": "", "field_type": "", "required": true, '
    '"placeholder_bn": "", "options": [{"bn": "", "en": ""}]}]}'
)

BOOKING_FIELDS_USER = "Service: {name}\nNotes: {notes}"


def normalize_booking_fields(raw: Any) -> list[dict]:
    """Model reply → safe field drafts the admin can review before saving."""
    items = raw.get("fields") if isinstance(raw, dict) else raw
    out: list[dict] = []
    seen: set[str] = set()
    for it in items if isinstance(items, list) else []:
        if not isinstance(it, dict):
            continue
        en = str(it.get("label_en") or "").strip()[:120]
        bn = str(it.get("label_bn") or "").strip()[:120]
        if not (en or bn) or (en or bn).lower() in seen:
            continue
        seen.add((en or bn).lower())
        ftype = str(it.get("field_type") or "text").strip().lower()
        if ftype not in BOOKING_FIELD_TYPES:
            ftype = "text"
        opts: list[dict] = []
        for o in it.get("options") or []:
            if isinstance(o, dict) and (o.get("en") or o.get("bn")):
                opts.append({"en": str(o.get("en") or o.get("bn")).strip()[:80], "bn": str(o.get("bn") or o.get("en")).strip()[:80]})
            elif isinstance(o, str) and o.strip():
                opts.append({"en": o.strip()[:80], "bn": o.strip()[:80]})
        if ftype in ("select", "multiselect", "radio") and len(opts) < 2:
            ftype, opts = "text", []
        out.append({
            "field_label_en": en or bn, "field_label_bn": bn or en, "field_type": ftype,
            "is_required": bool(it.get("required", False)),
            "placeholder": str(it.get("placeholder_bn") or "").strip()[:120] or None,
            "options": opts[:12],
        })
        if len(out) >= 10:
            break
    return out
