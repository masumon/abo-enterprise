"""Admin AI helpers for the catalog (Google Gemini, same key/cap as the chat
assistant). Nothing here writes to the database: drafts are returned to the
admin, who reviews/edits them and saves through the normal product API."""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.assistant import ai_catalog as ac
from app.assistant import ai_gemini
from app.core.database import get_db
from app.core.security import require_admin, require_role
from app.models.models import Category
from app.schemas.schemas import ApiResponse

router = APIRouter(prefix="/admin/ai-catalog", tags=["admin-ai"])

_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}


def _fail(exc: ai_gemini.AiUnavailable) -> HTTPException:
    return HTTPException(status_code=exc.status, detail=exc.message_bn)


@router.get("/status", response_model=ApiResponse)
async def ai_status(_admin: str = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Whether the AI buttons should be shown (a working key is saved and on)."""
    cfg = await ai_gemini.load_config(db)
    return ApiResponse(data={
        "available": bool(cfg["enabled"] and cfg["key"]),
        "used_today": ai_gemini.usage_today(),
        "daily_cap": cfg["daily_cap"],
    })


@router.post("/products-from-photos", response_model=ApiResponse)
async def products_from_photos(
    files: list[UploadFile] = File(...),
    margin_percent: float | None = Form(None),
    hint: str = Form(""),
    _admin: str = Depends(require_role("products.write")),
    db: AsyncSession = Depends(get_db),
):
    """1-10 product photos -> draft products (not saved). A selling price is only
    suggested from a printed cost price + the admin's margin rule."""
    if not files or len(files) > ac.MAX_IMAGES:
        raise HTTPException(status_code=400, detail=f"১ থেকে {ac.MAX_IMAGES}টি ছবি দিন।")
    images: list[tuple[str, bytes]] = []
    total = 0
    for f in files:
        mime = (f.content_type or "").lower()
        if mime not in _IMAGE_TYPES:
            raise HTTPException(status_code=400, detail=f"'{f.filename}' ছবি নয় — JPG/PNG/WEBP দিন।")
        data = await f.read()
        if not data or len(data) > ac.MAX_IMAGE_BYTES:
            raise HTTPException(status_code=400, detail=f"'{f.filename}' ৪ MB-এর বেশি বা খালি — ছোট ছবি দিন।")
        total += len(data)
        images.append((mime, data))
    if total > ac.MAX_TOTAL_BYTES:
        raise HTTPException(status_code=400, detail="সব ছবি মিলিয়ে ১৬ MB-এর বেশি — কম বা ছোট ছবি দিন।")
    if margin_percent is not None and not (0 <= margin_percent <= 1000):
        raise HTTPException(status_code=400, detail="লাভের হার ০–১০০০% এর মধ্যে দিন।")

    cats = (await db.execute(
        select(Category.slug, Category.name_en, Category.name_bn).where(Category.is_deleted == False, Category.is_active == True)  # noqa: E712
    )).all()
    cat_text = "; ".join(f"{c[0]}: {c[2] or c[1]}" for c in cats)[:4000] or "(none)"
    user = ac.PHOTO_USER.format(categories=cat_text, hint=f"Owner's hint: {hint[:300]}" if hint.strip() else "")
    try:
        raw = await ai_gemini.generate_json(db, ac.PHOTO_SYSTEM, user, images)
    except ai_gemini.AiUnavailable as exc:
        raise _fail(exc)
    drafts = ac.normalize_drafts(raw, {c[0] for c in cats}, len(images), margin_percent)
    if not drafts:
        raise HTTPException(status_code=422, detail="ছবি থেকে কোনো পণ্য চেনা যায়নি — আরও পরিষ্কার ছবি দিন।")
    return ApiResponse(data={"drafts": drafts}, message="AI drafts ready (not saved)")


class DescribeIn(BaseModel):
    kind: str = Field("product", pattern="^(product|service|software|showcase)$")
    name: str = Field(..., min_length=2, max_length=200)
    notes: str = Field("", max_length=1500)


@router.post("/describe", response_model=ApiResponse)
async def describe(payload: DescribeIn, _admin: str = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Name + short notes -> bn/en description, feature bullets and FAQ."""
    user = ac.DESCRIBE_USER.format(kind=payload.kind, name=payload.name.strip(),
                                   notes=ai_gemini._mask(payload.notes.strip()) or "(none)")
    try:
        raw = await ai_gemini.generate_json(db, ac.DESCRIBE_SYSTEM, user, max_tokens=4096)
    except ai_gemini.AiUnavailable as exc:
        raise _fail(exc)
    out = ac.normalize_description(raw)
    if not (out["description_bn"] or out["description_en"]):
        raise HTTPException(status_code=502, detail="AI বিবরণ লিখতে পারেনি — আবার চেষ্টা করুন।")
    return ApiResponse(data=out)


class BookingFieldsIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    notes: str = Field("", max_length=1500)


@router.post("/booking-fields", response_model=ApiResponse)
async def booking_fields(payload: BookingFieldsIn, _admin: str = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Service name + notes -> suggested booking-form questions (nothing is saved)."""
    user = ac.BOOKING_FIELDS_USER.format(name=payload.name.strip(), notes=ai_gemini._mask(payload.notes.strip()) or "(none)")
    try:
        raw = await ai_gemini.generate_json(db, ac.BOOKING_FIELDS_SYSTEM, user, max_tokens=4096)
    except ai_gemini.AiUnavailable as exc:
        raise _fail(exc)
    fields = ac.normalize_booking_fields(raw)
    if not fields:
        raise HTTPException(status_code=502, detail="AI প্রশ্ন প্রস্তাব করতে পারেনি — আবার চেষ্টা করুন।")
    return ApiResponse(data={"fields": fields})


class FromLinkIn(BaseModel):
    url: str = Field(..., min_length=8, max_length=1000)
    kind: str = Field("product", pattern="^(product|service)$")


@router.post("/from-link", response_model=ApiResponse)
async def from_link(payload: FromLinkIn, _admin: str = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Web link (supplier/maker page) -> product/service draft. Nothing is saved.
    Without AI the page's own title, description and image are still returned."""
    from app.assistant import link_import as li

    try:
        final_url, page = await li.fetch_page(payload.url)
    except li.LinkError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:  # noqa: BLE001 — network trouble
        raise HTTPException(status_code=502, detail="পাতাটি খোলা যায়নি — একটু পরে আবার চেষ্টা করুন বা অন্য লিংক দিন।")
    facts = li.extract(final_url, page)
    if not (facts["title"] or facts["text"]):
        raise HTTPException(status_code=422, detail="এই পাতায় কাজে লাগার মতো তথ্য পাওয়া যায়নি।")
    raw: dict = {}
    ai_used = False
    if await ai_gemini.is_available(db):
        user = "FACTS:\n" + "\n".join(f"{k}: {v}" for k, v in facts.items() if v and k != "image_url")
        try:
            raw = await ai_gemini.generate_json(db, li.LINK_SYSTEM.format(kind=payload.kind), ai_gemini._mask(user), max_tokens=4096)
            ai_used = True
        except ai_gemini.AiUnavailable:
            raw = {}
    return ApiResponse(data={**li.normalize_draft(raw, facts), "ai_used": ai_used})


class ServiceDetailsIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    notes: str = Field("", max_length=2000)
    parts: list[str] = Field(default_factory=lambda: list(ac.SERVICE_DETAILS_PARTS))


@router.post("/service-details", response_model=ApiResponse)
async def service_details(payload: ServiceDetailsIn, _admin: str = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """Service name + notes -> steps, benefits, requirements, documents, FAQ and/or packages (nothing saved)."""
    parts = [p for p in payload.parts if p in ac.SERVICE_DETAILS_PARTS] or list(ac.SERVICE_DETAILS_PARTS)
    user = f"Service: {payload.name.strip()}
Notes: {ai_gemini._mask(payload.notes.strip()) or '(none)'}
Write these parts: {', '.join(parts)}"
    try:
        raw = await ai_gemini.generate_json(db, ac.SERVICE_DETAILS_SYSTEM, user, max_tokens=8192)
    except ai_gemini.AiUnavailable as exc:
        raise _fail(exc)
    out = ac.normalize_service_details(raw, parts)
    if not any(out.values()):
        raise HTTPException(status_code=502, detail="AI লিখতে পারেনি — আবার চেষ্টা করুন।")
    return ApiResponse(data=out)
