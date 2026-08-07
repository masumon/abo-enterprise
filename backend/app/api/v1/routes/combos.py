"""Combo (bundle) packs — public list + admin CRUD (manual_sql/030).

A combo groups several products and sells them at one `combo_price`. The price
is authoritative on the server; the order API re-derives it and never trusts a
client total (same rule as single-product pricing).
"""
import re
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.http_cache import etag_json_response
from app.core.security import require_admin, require_role
from app.models.models import Combo, ComboItem, Product, ActivityLog
from app.schemas.schemas import ApiResponse

router = APIRouter(prefix="/combos", tags=["combos"])


# ---------------------------------------------------------------------------
# Serialization
# ---------------------------------------------------------------------------
async def _products_map(db: AsyncSession, product_ids: list[uuid.UUID]) -> dict[uuid.UUID, Product]:
    if not product_ids:
        return {}
    rows = (await db.execute(select(Product).where(Product.id.in_(product_ids)))).scalars().all()
    return {p.id: p for p in rows}


def _serialize_combo(combo: Combo, pmap: dict[uuid.UUID, Product]) -> dict:
    items = []
    summed = 0.0
    for it in combo.items:
        p = pmap.get(it.product_id)
        if p is None:
            continue  # product hard-deleted; skip the orphan line
        summed += float(p.price) * it.quantity
        items.append({
            "product_id": str(it.product_id),
            "quantity": it.quantity,
            "name_en": p.name_en,
            "name_bn": p.name_bn,
            "slug": p.slug,
            "image_url": p.image_url,
            "price": float(p.price),
        })
    compare = float(combo.compare_at_price) if combo.compare_at_price is not None else (summed or None)
    return {
        "id": str(combo.id),
        "slug": combo.slug,
        "title_en": combo.title_en,
        "title_bn": combo.title_bn,
        "description_en": combo.description_en,
        "description_bn": combo.description_bn,
        "image_url": combo.image_url,
        "combo_price": float(combo.combo_price),
        "compare_at_price": compare,
        "badge_en": combo.badge_en,
        "badge_bn": combo.badge_bn,
        "free_delivery": combo.free_delivery,
        "sort_order": combo.sort_order,
        "is_active": combo.is_active,
        "starts_at": combo.starts_at.isoformat() if combo.starts_at else None,
        "ends_at": combo.ends_at.isoformat() if combo.ends_at else None,
        "items": items,
    }


async def _serialize_many(db: AsyncSession, combos: list[Combo]) -> list[dict]:
    ids: list[uuid.UUID] = []
    for c in combos:
        ids.extend(it.product_id for it in c.items)
    pmap = await _products_map(db, list(set(ids)))
    return [_serialize_combo(c, pmap) for c in combos]


def _slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return s or f"combo-{uuid.uuid4().hex[:8]}"


# ---------------------------------------------------------------------------
# Public
# ---------------------------------------------------------------------------
@router.get("", response_model=ApiResponse)
async def list_combos(request: Request, db: AsyncSession = Depends(get_db)) -> Response:
    """Active, in-window combos for the storefront."""
    now = datetime.now(timezone.utc)
    conditions = [
        Combo.is_deleted == False,  # noqa: E712
        Combo.is_active == True,  # noqa: E712
        or_(Combo.starts_at.is_(None), Combo.starts_at <= now),
        or_(Combo.ends_at.is_(None), Combo.ends_at > now),
    ]
    result = await db.execute(
        select(Combo).options(selectinload(Combo.items)).where(and_(*conditions))
        .order_by(Combo.sort_order.asc(), Combo.created_at.desc())
    )
    combos = result.scalars().all()
    data = await _serialize_many(db, combos)
    payload = ApiResponse(data=data, message="ok").model_dump(mode="json")
    return etag_json_response(request, payload, max_age=60)


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------
class ComboItemIn(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(1, ge=1)


class ComboIn(BaseModel):
    title_en: str
    title_bn: str
    description_en: str | None = None
    description_bn: str | None = None
    image_url: str | None = None
    combo_price: float = Field(..., ge=0)
    compare_at_price: float | None = Field(None, ge=0)
    badge_en: str | None = None
    badge_bn: str | None = None
    free_delivery: bool = False
    sort_order: int = 0
    is_active: bool = True
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    items: list[ComboItemIn] = []


@router.get("/admin/all", response_model=ApiResponse, dependencies=[Depends(require_admin)])
async def admin_list_combos(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Combo).options(selectinload(Combo.items))
        .where(Combo.is_deleted == False)  # noqa: E712
        .order_by(Combo.sort_order.asc(), Combo.created_at.desc())
    )
    combos = result.scalars().all()
    return ApiResponse(data=await _serialize_many(db, combos), message="ok")


async def _apply_items(db: AsyncSession, combo: Combo, items: list[ComboItemIn]) -> None:
    combo.items.clear()
    for i, it in enumerate(items):
        combo.items.append(ComboItem(product_id=it.product_id, quantity=it.quantity, sort_order=i))


@router.post("", response_model=ApiResponse, dependencies=[Depends(require_role("products.write"))])
async def create_combo(payload: ComboIn, db: AsyncSession = Depends(get_db)):
    combo = Combo(
        slug=_slugify(payload.title_en),
        title_en=payload.title_en, title_bn=payload.title_bn,
        description_en=payload.description_en, description_bn=payload.description_bn,
        image_url=payload.image_url, combo_price=payload.combo_price,
        compare_at_price=payload.compare_at_price,
        badge_en=payload.badge_en, badge_bn=payload.badge_bn,
        free_delivery=payload.free_delivery, sort_order=payload.sort_order,
        is_active=payload.is_active, starts_at=payload.starts_at, ends_at=payload.ends_at,
    )
    await _apply_items(db, combo, payload.items)
    db.add(combo)
    db.add(ActivityLog(action="combo.create", entity_type="combo", entity_id=combo.id))
    await db.commit()
    await db.refresh(combo, ["items"])
    pmap = await _products_map(db, [it.product_id for it in combo.items])
    return ApiResponse(data=_serialize_combo(combo, pmap), message="Combo created")


@router.put("/{combo_id}", response_model=ApiResponse, dependencies=[Depends(require_role("products.write"))])
async def update_combo(combo_id: uuid.UUID, payload: ComboIn, db: AsyncSession = Depends(get_db)):
    combo = (await db.execute(
        select(Combo).options(selectinload(Combo.items)).where(Combo.id == combo_id, Combo.is_deleted == False)  # noqa: E712
    )).scalar_one_or_none()
    if not combo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Combo not found")
    combo.title_en = payload.title_en
    combo.title_bn = payload.title_bn
    combo.description_en = payload.description_en
    combo.description_bn = payload.description_bn
    combo.image_url = payload.image_url
    combo.combo_price = payload.combo_price
    combo.compare_at_price = payload.compare_at_price
    combo.badge_en = payload.badge_en
    combo.badge_bn = payload.badge_bn
    combo.free_delivery = payload.free_delivery
    combo.sort_order = payload.sort_order
    combo.is_active = payload.is_active
    combo.starts_at = payload.starts_at
    combo.ends_at = payload.ends_at
    await _apply_items(db, combo, payload.items)
    db.add(ActivityLog(action="combo.update", entity_type="combo", entity_id=combo.id))
    await db.commit()
    await db.refresh(combo, ["items"])
    pmap = await _products_map(db, [it.product_id for it in combo.items])
    return ApiResponse(data=_serialize_combo(combo, pmap), message="Combo updated")


@router.delete("/{combo_id}", response_model=ApiResponse, dependencies=[Depends(require_role("products.delete"))])
async def delete_combo(combo_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    combo = (await db.execute(select(Combo).where(Combo.id == combo_id))).scalar_one_or_none()
    if not combo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Combo not found")
    combo.is_deleted = True
    combo.is_active = False
    db.add(ActivityLog(action="combo.delete", entity_type="combo", entity_id=combo.id))
    await db.commit()
    return ApiResponse(data={"id": str(combo_id)}, message="Combo deleted")
