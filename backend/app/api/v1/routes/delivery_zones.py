"""Delivery zones — admin-defined per-district/upazila charges & free rules
(manual_sql/031). Public list (checkout reads it) + admin CRUD.

When no zone matches a customer's district, the frontend falls back to the
legacy settings-based 3-tier charge, so existing behaviour is preserved.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.http_cache import etag_json_response
from app.core.security import require_admin, require_role
from app.models.models import DeliveryZone, ActivityLog
from app.schemas.schemas import ApiResponse

router = APIRouter(prefix="/delivery-zones", tags=["delivery-zones"])


def _serialize(z: DeliveryZone) -> dict:
    return {
        "id": str(z.id),
        "name_en": z.name_en,
        "name_bn": z.name_bn,
        "districts": z.districts or [],
        "upazilas": z.upazilas or [],
        "charge": float(z.charge or 0),
        "free_threshold": float(z.free_threshold) if z.free_threshold is not None else None,
        "sort_order": z.sort_order,
        "is_active": z.is_active,
    }


@router.get("", response_model=ApiResponse)
async def list_zones(request: Request, db: AsyncSession = Depends(get_db)) -> Response:
    rows = (await db.execute(
        select(DeliveryZone)
        .where(DeliveryZone.is_deleted == False, DeliveryZone.is_active == True)  # noqa: E712
        .order_by(DeliveryZone.sort_order.asc(), DeliveryZone.created_at.asc())
    )).scalars().all()
    payload = ApiResponse(data=[_serialize(z) for z in rows], message="ok").model_dump(mode="json")
    return etag_json_response(request, payload, max_age=60)


class ZoneIn(BaseModel):
    name_en: str
    name_bn: str
    districts: list[str] = []
    upazilas: list[str] = []
    charge: float = Field(0, ge=0)
    free_threshold: float | None = Field(None, ge=0)
    sort_order: int = 0
    is_active: bool = True


@router.get("/admin/all", response_model=ApiResponse, dependencies=[Depends(require_admin)])
async def admin_list_zones(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(
        select(DeliveryZone).where(DeliveryZone.is_deleted == False)  # noqa: E712
        .order_by(DeliveryZone.sort_order.asc(), DeliveryZone.created_at.asc())
    )).scalars().all()
    return ApiResponse(data=[_serialize(z) for z in rows], message="ok")


@router.post("", response_model=ApiResponse)
async def create_zone(
    payload: ZoneIn,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_role("settings.write")),
):
    z = DeliveryZone(
        name_en=payload.name_en, name_bn=payload.name_bn,
        districts=payload.districts, upazilas=payload.upazilas,
        charge=payload.charge, free_threshold=payload.free_threshold,
        sort_order=payload.sort_order, is_active=payload.is_active,
    )
    db.add(z)
    await db.flush()
    db.add(ActivityLog(admin_id=uuid.UUID(_admin), action="delivery_zone.create", entity_type="delivery_zone", entity_id=z.id))
    await db.commit()
    await db.refresh(z)
    return ApiResponse(data=_serialize(z), message="Zone created")


@router.put("/{zone_id}", response_model=ApiResponse)
async def update_zone(
    zone_id: uuid.UUID,
    payload: ZoneIn,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_role("settings.write")),
):
    z = (await db.execute(
        select(DeliveryZone).where(DeliveryZone.id == zone_id, DeliveryZone.is_deleted == False)  # noqa: E712
    )).scalar_one_or_none()
    if not z:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found")
    z.name_en = payload.name_en
    z.name_bn = payload.name_bn
    z.districts = payload.districts
    z.upazilas = payload.upazilas
    z.charge = payload.charge
    z.free_threshold = payload.free_threshold
    z.sort_order = payload.sort_order
    z.is_active = payload.is_active
    db.add(ActivityLog(admin_id=uuid.UUID(_admin), action="delivery_zone.update", entity_type="delivery_zone", entity_id=z.id))
    await db.commit()
    await db.refresh(z)
    return ApiResponse(data=_serialize(z), message="Zone updated")


@router.delete("/{zone_id}", response_model=ApiResponse)
async def delete_zone(
    zone_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_role("settings.write")),
):
    z = (await db.execute(select(DeliveryZone).where(DeliveryZone.id == zone_id))).scalar_one_or_none()
    if not z:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found")
    z.is_deleted = True
    z.is_active = False
    db.add(ActivityLog(admin_id=uuid.UUID(_admin), action="delivery_zone.delete", entity_type="delivery_zone", entity_id=z.id))
    await db.commit()
    return ApiResponse(data={"id": str(zone_id)}, message="Zone deleted")
