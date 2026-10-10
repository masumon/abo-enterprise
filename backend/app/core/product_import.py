"""Bulk product import — parsing, column mapping, validation and category
matching. Kept separate from the route so it is unit-testable and never touches
the working single-product create/update endpoints.

Design:
- The canonical columns mirror the Product model / ProductCreate schema; the
  importer never invents a new data shape.
- Rows are validated (types + required) and matched to the existing category
  tree (by slug, name EN/BN, or a "A > B" path) — no new taxonomy is created.
- slug is the primary key: an existing slug updates, a new slug creates. SKU
  duplicates (in-file or against a different product) are surfaced as warnings.
- Validation is a pure dry-run (no DB writes); the caller commits separately.
"""
from __future__ import annotations

import csv
import io
import re
import unicodedata
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Category

# ── Column spec ──────────────────────────────────────────────────────────────
# type: str | int | float | bool | list ; required only for a *new* product.
FIELD_SPEC: dict[str, dict] = {
    "slug": {"type": "str", "required": True, "aliases": ["url", "handle"]},
    "name_en": {"type": "str", "required": True, "aliases": ["name", "name(english)", "nameen", "title", "title_en", "ইংরেজি নাম", "english name"]},
    "name_bn": {"type": "str", "required": True, "aliases": ["name(bangla)", "namebn", "title_bn", "bangla name", "নাম", "বাংলা নাম", "পণ্যের নাম"]},
    "category": {"type": "str", "required": True, "aliases": ["category_slug", "categoryname", "category name", "category_path", "categorypath", "ক্যাটাগরি", "ক্যাটেগরি", "ধরন"]},
    "price": {"type": "float", "required": True, "aliases": ["mrp", "sell price", "sellingprice", "দাম", "বিক্রয়মূল্য", "বিক্রয় মূল্য"]},
    "original_price": {"type": "float", "aliases": ["compare price", "compareatprice", "old price", "regular price", "আগের দাম"]},
    # PRIVATE purchase price — admin-only (never on public endpoints).
    "cost_price": {"type": "float", "aliases": ["purchase price", "buy price", "cost", "ক্রয়মূল্য"]},
    "category_name_bn": {"type": "str", "aliases": ["category bn", "ক্যাটাগরির নাম"]},
    "category_name_en": {"type": "str", "aliases": ["category en"]},
    "short_description_bn": {"type": "str", "aliases": ["short desc bn", "short_bn"]},
    "short_description_en": {"type": "str", "aliases": ["short desc en", "short_en", "short description"]},
    "specifications": {"type": "specs", "aliases": ["specs", "specification", "features table", "স্পেসিফিকেশন"]},
    "description_en": {"type": "str", "aliases": ["description", "desc_en", "details"]},
    "description_bn": {"type": "str", "aliases": ["desc_bn", "bangla description", "বিবরণ"]},
    "sku": {"type": "str", "aliases": ["product code", "code", "item code", "এসকেইউ", "কোড"]},
    "barcode": {"type": "str", "aliases": ["ean", "upc"]},
    "brand": {"type": "str", "aliases": ["manufacturer", "ব্র্যান্ড"]},
    "stock_quantity": {"type": "int", "aliases": ["stock", "qty", "quantity", "inventory", "স্টক", "পরিমাণ"]},
    "low_stock_threshold": {"type": "int", "aliases": ["low stock", "reorder level"]},
    "is_active": {"type": "bool", "aliases": ["active", "published", "status"]},
    "is_featured": {"type": "bool", "aliases": ["featured"]},
    "is_best_seller": {"type": "bool", "aliases": ["best seller", "bestseller"]},
    "badge": {"type": "str", "aliases": ["tag label", "ribbon", "ব্যাজ"]},
    "image_url": {"type": "str", "aliases": ["image", "main image", "thumbnail", "photo"]},
    "images": {"type": "list", "aliases": ["gallery", "additional images", "more images", "ছবির নাম", "ছবি"]},
    "tags": {"type": "list", "aliases": ["keywords", "labels"]},
    "sort_order": {"type": "int", "aliases": ["order", "position"]},
    "weight": {"type": "float", "aliases": ["weight(kg)", "kg"]},
    "delivery_charge": {"type": "float", "aliases": ["shipping", "delivery"]},
    "warranty_info": {"type": "str", "aliases": ["warranty"]},
    "seo_title": {"type": "str", "aliases": []},
    "seo_description": {"type": "str", "aliases": []},
    "seo_keywords": {"type": "str", "aliases": []},
}

# Header (normalised) -> canonical field, built from names + aliases.
def _norm(h: str) -> str:
    # NFC so a Bangla header typed with a decomposed letter still matches.
    return re.sub(r"[\s_\-()]+", "", unicodedata.normalize("NFC", (h or "").strip().lower()))


_HEADER_LOOKUP: dict[str, str] = {}
for _fname, _spec in FIELD_SPEC.items():
    _HEADER_LOOKUP[_norm(_fname)] = _fname
    for _al in _spec.get("aliases", []):
        _HEADER_LOOKUP.setdefault(_norm(_al), _fname)


def auto_map_headers(headers: list[str]) -> dict[str, str | None]:
    """Return {original_header: canonical_field_or_None} by name/alias match."""
    return {h: _HEADER_LOOKUP.get(_norm(h)) for h in headers}


def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return s or ""


# ── Value coercion ───────────────────────────────────────────────────────────
_TRUE = {"true", "1", "yes", "y", "on", "active", "published", "হ্যাঁ"}
_FALSE = {"false", "0", "no", "n", "off", "inactive", "draft", "না", ""}


def _coerce(field_name: str, raw: Any) -> tuple[Any, str | None]:
    """Coerce a raw cell to the field's type. Returns (value, error)."""
    spec = FIELD_SPEC[field_name]
    t = spec["type"]
    s = "" if raw is None else str(raw).strip()
    if s == "":
        return (None, None)
    try:
        if t == "str":
            return (s, None)
        if t == "int":
            return (int(float(_num_text(s))), None)  # tolerate "5.0" and Bangla digits
        if t == "float":
            return (float(_num_text(s)), None)
        if t == "bool":
            low = s.lower()
            if low in _TRUE:
                return (True, None)
            if low in _FALSE:
                return (False, None)
            return (None, f"'{s}' is not a yes/no value")
        if t == "list":
            parts = [p.strip() for p in re.split(r"[,\n|]+", s) if p.strip()]
            return (parts, None)
        if t == "specs":
            return (parse_specifications(s), None)
    except (ValueError, TypeError):
        return (None, f"'{s}' is not a valid {t}")
    return (s, None)


_BN_DIGITS = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")


def _num_text(s: str) -> str:
    """'১,২৯০ টাকা' / '৳1290' -> '1290' (Bangla digits, currency words, commas)."""
    s = s.translate(_BN_DIGITS)
    s = re.sub(r"(৳|টাকা|tk\.?|bdt)", "", s, flags=re.I)
    return s.replace(",", "").strip()


# Rough Bangla -> Latin transliteration, only for building a web address (slug)
# when a row has a Bangla name and no English one. Not shown to customers.
_BN_LATIN = {
    "অ": "o", "আ": "a", "ই": "i", "ঈ": "i", "উ": "u", "ঊ": "u", "ঋ": "ri", "এ": "e", "ঐ": "oi", "ও": "o", "ঔ": "ou",
    "া": "a", "ি": "i", "ী": "i", "ু": "u", "ূ": "u", "ৃ": "ri", "ে": "e", "ৈ": "oi", "ো": "o", "ৌ": "ou",
    "ক": "k", "খ": "kh", "গ": "g", "ঘ": "gh", "ঙ": "ng", "চ": "ch", "ছ": "chh", "জ": "j", "ঝ": "jh", "ঞ": "n",
    "ট": "t", "ঠ": "th", "ড": "d", "ঢ": "dh", "ণ": "n", "ত": "t", "থ": "th", "দ": "d", "ধ": "dh", "ন": "n",
    "প": "p", "ফ": "f", "ব": "b", "ভ": "bh", "ম": "m", "য": "j", "র": "r", "ল": "l", "শ": "sh", "ষ": "sh",
    "স": "s", "হ": "h", "ড়": "r", "ঢ়": "rh", "য়": "y", "ৎ": "t", "ং": "ng", "ঃ": "", "ঁ": "", "্": "", "়": "",
}
_BN_PAIRS = (("ড়", "r"), ("ঢ়", "rh"), ("য়", "y"))


def transliterate_bn(text: str) -> str:
    t = unicodedata.normalize("NFC", text or "").translate(_BN_DIGITS)
    for k, v in _BN_PAIRS:  # decomposed two-code-point forms first
        t = t.replace(k, v)
    return "".join(_BN_LATIN.get(ch, ch) for ch in t)


_HAS_BN = re.compile(r"[\u0980-\u09FF]")


def slug_from_any(text: str) -> str:
    """slugify, falling back to a transliteration for Bangla text."""
    return slugify(transliterate_bn(text)) if _HAS_BN.search(text or "") else slugify(text)


def apply_overrides(rows: list[dict[str, str]], mapping: dict[str, str | None],
                    overrides: dict | None) -> tuple[list[dict[str, str]], dict[str, str | None]]:
    """In-page fixes from the preview: {"<row number>": {"price": "1290", ...}}.
    Row numbers are the ones shown in the preview (header = row 1). A fixed
    field without a column in the file gets a synthetic column. Returns new
    rows/mapping; the inputs are not modified."""
    if not overrides:
        return rows, mapping
    mapping = dict(mapping)
    field_to_header: dict[str, str] = {}
    for h, f in mapping.items():
        if f and f not in field_to_header:
            field_to_header[f] = h
    rows = [dict(r) for r in rows]
    for key, fixes in overrides.items():
        try:
            idx = int(key) - 2
        except (TypeError, ValueError):
            continue
        if not (0 <= idx < len(rows)) or not isinstance(fixes, dict):
            continue
        for fname, value in fixes.items():
            if fname not in FIELD_SPEC:
                continue
            header = field_to_header.get(fname)
            if header is None:
                header = f"__fix_{fname}"
                field_to_header[fname] = header
                mapping[header] = fname
            rows[idx][header] = "" if value is None else str(value)
    return rows, mapping


def parse_specifications(text: str) -> dict[str, str]:
    """`Key: Value; Key: Value` (or one pair per line) -> ordered dict. A part
    without a colon is kept under a numbered "Note" key, never dropped."""
    out: dict[str, str] = {}
    for i, part in enumerate(re.split(r"[;\n]+", text or ""), start=1):
        part = part.strip()
        if not part:
            continue
        if ":" in part:
            k, v = part.split(":", 1)
            k, v = k.strip(), v.strip()
            if k:
                out[k] = v
                continue
        out[f"Note {i}"] = part
    return out


def _bi(bn: str, en: str) -> str:
    """Error/warning text for a non-technical admin: Bangla first, English in brackets."""
    return f"{bn} ({en})"


_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
_URL_RE = re.compile(r"^(https?:)?//", re.I)


def image_key(name: str) -> str:
    """Case-insensitive file-name key: 'images/Charger 1.JPG' -> 'charger 1.jpg'."""
    return re.split(r"[\\/]", (name or "").strip())[-1].strip().lower()


# ── Category matching ────────────────────────────────────────────────────────
@dataclass
class CategoryIndex:
    by_slug: dict[str, Category]
    by_name: dict[str, Category]
    by_id: dict[Any, Category]

    def resolve(self, value: str) -> Category | None:
        """Match a category cell to a node: slug, name (EN/BN), or 'A > B' path
        (the last path segment wins, matched by name or slug)."""
        v = (value or "").strip()
        if not v:
            return None
        if ">" in v or "/" in v or "»" in v:
            v = re.split(r"[>/»]", v)[-1].strip()
        key = v.lower()
        return self.by_slug.get(key) or self.by_name.get(key) or self.by_slug.get(slugify(v))


async def build_category_index(db: AsyncSession) -> CategoryIndex:
    cats = list((await db.execute(
        select(Category).where(Category.is_deleted == False)  # noqa: E712
    )).scalars().all())
    by_slug: dict[str, Category] = {}
    by_name: dict[str, Category] = {}
    by_id: dict[Any, Category] = {}
    for c in cats:
        by_id[c.id] = c
        if c.slug:
            by_slug[c.slug.lower()] = c
        if c.name_en:
            by_name.setdefault(c.name_en.strip().lower(), c)
        if c.name_bn:
            by_name.setdefault(c.name_bn.strip().lower(), c)
    return CategoryIndex(by_slug=by_slug, by_name=by_name, by_id=by_id)


def category_path(cat: Category, index: CategoryIndex) -> str:
    """Root-first 'A > B > C' label for a node."""
    chain: list[str] = []
    seen: set[Any] = set()
    cur: Category | None = cat
    while cur is not None and cur.id not in seen:
        seen.add(cur.id)
        chain.append(cur.name_en or cur.slug)
        cur = index.by_id.get(cur.parent_id) if cur.parent_id else None
    return " > ".join(reversed(chain))


# ── Parsing ──────────────────────────────────────────────────────────────────
def parse_file(filename: str, content: bytes) -> tuple[list[str], list[dict[str, str]]]:
    """Return (headers, rows) from a CSV or XLSX upload. Raises ValueError on a
    format we cannot read."""
    name = (filename or "").lower()
    if name.endswith(".xlsx") or name.endswith(".xlsm"):
        return _parse_xlsx(content)
    # default: CSV (also handles .txt / unknown as CSV)
    text = content.decode("utf-8-sig", errors="replace")
    reader = csv.reader(io.StringIO(text))
    all_rows = [r for r in reader]
    if not all_rows:
        return ([], [])
    headers = [h.strip() for h in all_rows[0]]
    rows: list[dict[str, str]] = []
    for r in all_rows[1:]:
        if not any((c or "").strip() for c in r):
            continue  # skip fully-blank lines
        if _is_comment(r):
            continue  # "# …" help / example rows in the template
        rows.append({headers[i]: (r[i] if i < len(r) else "") for i in range(len(headers))})
    return (headers, rows)


def _is_comment(cells) -> bool:
    """A row whose first non-empty cell starts with '#' is a help/example row."""
    for c in cells:
        c = (c or "").strip()
        if c:
            return c.startswith("#")
    return False


def _parse_xlsx(content: bytes) -> tuple[list[str], list[dict[str, str]]]:
    try:
        from openpyxl import load_workbook
    except ImportError as exc:  # pragma: no cover
        raise ValueError("Excel support is unavailable on the server (openpyxl not installed).") from exc
    wb = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    ws = wb.active
    rows_iter = ws.iter_rows(values_only=True)
    try:
        header_row = next(rows_iter)
    except StopIteration:
        return ([], [])
    headers = [str(h).strip() if h is not None else "" for h in header_row]
    rows: list[dict[str, str]] = []
    for r in rows_iter:
        if r is None or not any(c is not None and str(c).strip() for c in r):
            continue
        if _is_comment(["" if c is None else str(c) for c in r]):
            continue
        row: dict[str, str] = {}
        for i, h in enumerate(headers):
            if not h:
                continue
            val = r[i] if i < len(r) else None
            row[h] = "" if val is None else str(val).strip()
        rows.append(row)
    wb.close()
    return (headers, rows)


# ── Row validation ───────────────────────────────────────────────────────────
@dataclass
class RowResult:
    row_num: int
    data: dict[str, Any] = field(default_factory=dict)  # coerced canonical fields
    category_id: Any = None
    category_label: str = ""
    new_category: dict | None = None  # {"slug","name_en","name_bn"} when it will be created
    image_names: list[str] = field(default_factory=list)  # file names referenced (not URLs)
    missing_images: list[str] = field(default_factory=list)
    action: str = "skip"  # create | update | skip
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def to_preview(self) -> dict:
        return {
            "row": self.row_num,
            "slug": self.data.get("slug", ""),
            "name": self.data.get("name_en", ""),
            "name_bn": self.data.get("name_bn", ""),
            "sku": self.data.get("sku", ""),
            "brand": self.data.get("brand", ""),
            "price": self.data.get("price"),
            "cost_price": self.data.get("cost_price"),  # admin-only endpoint
            "stock_quantity": self.data.get("stock_quantity"),
            "category": self.category_label,
            "new_category": bool(self.new_category),
            "images": self.image_names,
            "missing_images": self.missing_images,
            "specifications": self.data.get("specifications") or {},
            "action": "skip" if self.errors else self.action,
            "errors": self.errors,
            "warnings": self.warnings,
        }


REQUIRED_NEW = ("slug", "name_en", "name_bn", "category", "price")
_REQ_BN = {"slug": "slug", "name_en": "ইংরেজি নাম", "name_bn": "বাংলা নাম", "category": "ক্যাটাগরি", "price": "বিক্রয়মূল্য"}
DEFAULT_NEW_STOCK = 10


def _collect_category_names(rows: list[dict[str, str]], field_to_header: dict[str, str]) -> dict[str, dict]:
    """{category_slug: {name_en, name_bn}} gathered from ANY row of the file, so
    the names only need to be written once per new category."""
    out: dict[str, dict] = {}
    hc, hbn, hen = (field_to_header.get(k) for k in ("category", "category_name_bn", "category_name_en"))
    if not hc or not (hbn or hen):
        return out
    for r in rows:
        slug = slugify(str(r.get(hc, "") or ""))
        if not slug:
            continue
        bn = str(r.get(hbn, "") or "").strip() if hbn else ""
        en = str(r.get(hen, "") or "").strip() if hen else ""
        cur = out.setdefault(slug, {"slug": slug, "name_en": "", "name_bn": ""})
        cur["name_bn"] = cur["name_bn"] or bn
        cur["name_en"] = cur["name_en"] or en
    return {k: v for k, v in out.items() if v["name_bn"] or v["name_en"]}


def validate_rows(
    rows: list[dict[str, str]],
    mapping: dict[str, str | None],
    cat_index: CategoryIndex,
    existing_slugs: set[str],
    existing_sku_to_slug: dict[str, str],
    on_existing: str = "update",
    on_new: str = "create",
    image_names: set[str] | None = None,
) -> list[RowResult]:
    """Pure validation. `mapping` is {original_header: canonical_field|None}.
    `existing_slugs`/`existing_sku_to_slug` come from the DB (case as stored).
    `image_names` = lower-cased file names the admin selected with the sheet
    (None = not checked, e.g. the old CSV-only flow)."""
    # Invert mapping: canonical_field -> original_header (first wins).
    field_to_header: dict[str, str] = {}
    for header, fieldname in mapping.items():
        if fieldname and fieldname not in field_to_header:
            field_to_header[fieldname] = header

    new_cat_names = _collect_category_names(rows, field_to_header)
    # Simple Bangla sheet (নাম, দাম, ক্যাটাগরি...): no English-name column at all.
    simple = "name_bn" in field_to_header and "name_en" not in field_to_header
    results: list[RowResult] = []
    seen_slugs: dict[str, int] = {}
    seen_skus: dict[str, int] = {}

    for idx, raw_row in enumerate(rows, start=2):  # row 1 = header
        res = RowResult(row_num=idx)
        data: dict[str, Any] = {}
        for fieldname, header in field_to_header.items():
            value, err = _coerce(fieldname, raw_row.get(header, ""))
            if err:
                res.errors.append(_bi(f"'{fieldname}' কলামের মান ঠিক নেই", f"{fieldname}: {err}"))
            elif value is not None:
                data[fieldname] = value

        if simple and data.get("name_bn") and not data.get("name_en"):
            if not data.get("slug"):
                data["slug"] = slug_from_any(str(data["name_bn"])) or ""
            data["name_en"] = data["name_bn"]
            res.warnings.append(_bi("ইংরেজি নাম নেই — আপাতত বাংলা নামই বসবে, পরে বদলাতে পারবেন", "no English name; Bangla name used"))

        # Slug: tidy a hand-typed one; derive from the English name if blank.
        slug_given = bool(data.get("slug")) and not simple
        if data.get("slug") and not _SLUG_RE.match(str(data["slug"])):
            data["slug"] = slugify(str(data["slug"]))
        if not data.get("slug") and data.get("name_en"):
            data["slug"] = slugify(data["name_en"])
        slug = (data.get("slug") or "").strip()

        # Match an existing product: by slug, or (when no slug was typed) by SKU.
        sku = (data.get("sku") or "").strip()
        is_update = slug in existing_slugs
        if not is_update and not slug_given and sku and existing_sku_to_slug.get(sku):
            slug = existing_sku_to_slug[sku]
            data["slug"] = slug
            is_update = True
            res.warnings.append(_bi(f"SKU '{sku}' মিলেছে — পুরনো পণ্য '{slug}' আপডেট হবে", f"matched existing product by SKU '{sku}'"))

        # Required fields (for a new product).
        for req in REQUIRED_NEW:
            if not is_update and (req not in data or data.get(req) in (None, "")):
                res.errors.append(_bi(f"{_REQ_BN[req]} দিতে হবে", f"{req} is required"))
        for money in ("price", "original_price", "cost_price"):
            if data.get(money) is not None and float(data[money]) < 0:
                res.errors.append(_bi("দাম ঋণাত্মক হতে পারে না", f"{money} cannot be negative"))
        if data.get("price") is not None and data.get("original_price") is not None and float(data["original_price"]) < float(data["price"]):
            res.warnings.append(_bi("আগের দাম বিক্রয়মূল্যের চেয়ে কম — কাটা দাম দেখানো হবে না", "original_price is below price"))
            data.pop("original_price", None)
        if data.get("price") and data.get("cost_price") is not None and float(data["cost_price"]) > float(data["price"]):
            res.warnings.append(_bi("ক্রয়মূল্য বিক্রয়মূল্যের চেয়ে বেশি — লোকসান হবে", "cost_price is above price"))
        if data.get("stock_quantity") is not None and int(data["stock_quantity"]) < 0:
            res.errors.append(_bi("স্টক ঋণাত্মক হতে পারে না", "stock_quantity cannot be negative"))
        if not is_update and data.get("stock_quantity") is None:
            data["stock_quantity"] = DEFAULT_NEW_STOCK

        # Length limits the storefront relies on (soft: trim + warn).
        if data.get("badge") and len(str(data["badge"])) > 20:
            data["badge"] = str(data["badge"])[:20]
            res.warnings.append(_bi("ব্যাজ ২০ অক্ষরে ছোট করা হয়েছে", "badge trimmed to 20 chars"))
        if data.get("seo_title") and len(str(data["seo_title"])) > 60:
            res.warnings.append(_bi("SEO শিরোনাম ৬০ অক্ষরের বেশি", "seo_title over 60 chars"))
        if data.get("seo_description") and len(str(data["seo_description"])) > 155:
            res.warnings.append(_bi("SEO বিবরণ ১৫৫ অক্ষরের বেশি", "seo_description over 155 chars"))

        # Short descriptions: the Product model has no short field, so they are
        # prepended to the full description (only when creating, or when the
        # row also carries a full description — never wipes an existing one).
        for lang in ("bn", "en"):
            short = (data.pop(f"short_description_{lang}", None) or "").strip()
            full = (data.get(f"description_{lang}") or "").strip()
            if short and (full or not is_update):
                data[f"description_{lang}"] = f"{short}\n\n{full}" if full else short

        # Category: existing node, or a new one when the file gives its name.
        cat_names = {"name_bn": data.pop("category_name_bn", None), "name_en": data.pop("category_name_en", None)}
        if data.get("category"):
            node = cat_index.resolve(str(data["category"]))
            if node is not None:
                res.category_id = node.id
                res.category_label = category_path(node, cat_index)
                data["category"] = node.slug  # canonical legacy string
            else:
                raw_cat = str(data["category"]).strip()
                cslug = slug_from_any(raw_cat) if simple else slugify(raw_cat)
                info = new_cat_names.get(cslug)
                if info is None and (cat_names["name_bn"] or cat_names["name_en"]):
                    info = {"slug": cslug, "name_bn": cat_names["name_bn"] or "", "name_en": cat_names["name_en"] or ""}
                if info is None and simple and cslug:
                    # Simple sheet: an unknown category name becomes a new category.
                    bn = raw_cat if _HAS_BN.search(raw_cat) else ""
                    info = {"slug": cslug, "name_bn": bn, "name_en": "" if bn else raw_cat}
                if not cslug or info is None:
                    res.errors.append(_bi(
                        f"ক্যাটাগরি '{data['category']}' পাওয়া যায়নি — নতুন হলে category_name_bn/category_name_en দিন",
                        f"category '{data['category']}' not found in the category tree",
                    ))
                elif len(cslug) > 50:
                    res.errors.append(_bi("ক্যাটাগরির slug ৫০ অক্ষরের বেশি", "category slug longer than 50 chars"))
                else:
                    name_en = info["name_en"] or info["name_bn"] or cslug.replace("-", " ").title()
                    res.new_category = {"slug": cslug, "name_en": name_en, "name_bn": info["name_bn"] or name_en}
                    res.category_label = f"{res.new_category['name_bn']} (নতুন)"
                    data["category"] = cslug

        # Images: file names are matched against the files chosen with the sheet;
        # full URLs are kept as-is.
        imgs = list(data.get("images") or [])
        if data.get("image_url"):
            imgs = [data["image_url"], *imgs]
        for name in imgs:
            if _URL_RE.match(name):
                continue
            res.image_names.append(name)
            if image_names is not None and image_key(name) not in image_names:
                res.missing_images.append(name)
        if res.missing_images:
            res.warnings.append(_bi(
                "এই ছবি বাছাই করা হয়নি: " + ", ".join(res.missing_images),
                "image file(s) not selected",
            ))

        # In-file duplicate slug.
        if slug:
            if slug in seen_slugs:
                res.errors.append(_bi(f"একই slug আগেও আছে (সারি {seen_slugs[slug]})", f"duplicate slug in file (also row {seen_slugs[slug]})"))
            else:
                seen_slugs[slug] = idx
            if len(slug) > 255:
                res.errors.append(_bi("slug অনেক লম্বা", "slug too long"))

        # SKU duplicate detection (warning, never blocks).
        if sku:
            if sku in seen_skus:
                res.warnings.append(_bi(f"SKU '{sku}' ফাইলে আবার আছে (সারি {seen_skus[sku]})", f"SKU '{sku}' repeats in file (row {seen_skus[sku]})"))
            else:
                seen_skus[sku] = idx
            owner = existing_sku_to_slug.get(sku)
            if owner and owner != slug:
                res.warnings.append(_bi(f"SKU '{sku}' অন্য পণ্যে ('{owner}') ব্যবহৃত", f"SKU '{sku}' already used by product '{owner}'"))

        # Action.
        if res.errors:
            res.action = "skip"
        elif is_update:
            res.action = "update" if on_existing == "update" else "skip"
        else:
            res.action = "create" if on_new == "create" else "skip"

        res.data = data
        results.append(res)

    return results


def new_categories(results: list[RowResult]) -> list[dict]:
    """Distinct categories that applying these rows will create."""
    seen: dict[str, dict] = {}
    for r in results:
        if r.new_category and not r.errors and r.action != "skip":
            seen.setdefault(r.new_category["slug"], r.new_category)
    return list(seen.values())


def apply_images(data: dict[str, Any], image_map: dict[str, str]) -> list[str]:
    """Replace image file names by uploaded URLs (in place). The first image
    becomes the main image. Returns the names that had no uploaded URL."""
    names: list[str] = []
    if data.get("image_url"):
        names.append(data.pop("image_url"))
    names.extend(data.pop("images", None) or [])
    if not names:
        return []
    urls: list[str] = []
    missing: list[str] = []
    for n in names:
        if _URL_RE.match(n):
            urls.append(n)
        elif image_map.get(image_key(n)):
            urls.append(image_map[image_key(n)])
        else:
            missing.append(n)
    if urls:
        data["image_url"] = urls[0]
        data["images"] = urls[1:]
    return missing
