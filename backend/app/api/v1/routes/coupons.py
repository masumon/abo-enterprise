"""Coupons — real table (alembic/manual_sql 0023). Public validation +
admin CRUD. Replaces the old coupons_json Setting blob."""
import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role
from app.models.models import Coupon, ActivityLog
from app.schemas.schemas import ApiResponse
from app.core.rate_limit import rate_limit

logger = logging.getLogger(__name__)

router = APIRouter(tags=["coupons"])


class CouponValidateRequest(BaseModel):
    code: str
    subtotal: float = 0

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        return v.strip().upper()


class CouponUpsert(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    discount_percent: float = Field(..., ge=0, le=100)
    min_subtotal: float = Field(0, ge=0)
    is_active: bool = True

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        return v.strip().upper()


@router.post(
    "/public/coupons/validate",
    response_model=ApiResponse,
    dependencies=[Depends(rate_limit("coupon_validate", 20, 300))],
)
async def validate_coupon(payload: CouponValidateRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Coupon).where(
            Coupon.code == payload.code,
            Coupon.is_active == True,  # noqa: E712
            Coupon.is_deleted == False,  # noqa: E712
        )
    )
    coupon = result.scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid coupon code")

    min_subtotal = float(coupon.min_subtotal)
    if payload.subtotal < min_subtotal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum order ৳{min_subtotal:.0f} required for this coupon",
        )

    rate = float(coupon.discount_percent) / 100
    discount_amount = round(payload.subtotal * rate)

    return ApiResponse(
        data={
            "code": coupon.code,
            "discount_percent": float(coupon.discount_percent),
            "discount_amount": discount_amount,
            "discount_rate": rate,
        },
        message="Coupon applied",
    )


@router.get("/admin/coupons", response_model=ApiResponse, dependencies=[Depends(require_role("settings.read"))])
async def list_coupons(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Coupon).where(Coupon.is_deleted == False).order_by(Coupon.code)  # noqa: E712
    )
    coupons = result.scalars().all()
    return ApiResponse(data=[
        {
            "id": str(c.id),
            "code": c.code,
            "discount_percent": float(c.discount_percent),
            "min_subtotal": float(c.min_subtotal),
            "is_active": c.is_active,
        }
        for c in coupons
    ])


@router.post("/admin/coupons", response_model=ApiResponse)
async def create_coupon(
    payload: CouponUpsert,
    admin_id: str = Depends(require_role("settings.write")),
    db: AsyncSession = Depends(get_db),
):
    existing = (await db.execute(
        select(Coupon).where(Coupon.code == payload.code, Coupon.is_deleted == False)  # noqa: E712
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail=f"Coupon {payload.code} already exists")
    coupon = Coupon(
        id=uuid.uuid4(),
        code=payload.code,
        discount_percent=payload.discount_percent,
        min_subtotal=payload.min_subtotal,
        is_active=payload.is_active,
    )
    db.add(coupon)
    await db.flush()
    db.add(ActivityLog(
        admin_id=uuid.UUID(admin_id), action="create",
        entity_type="coupon", entity_id=coupon.id,
        new_values=payload.model_dump(mode="json"),
    ))
    await db.commit()
    return ApiResponse(data={"id": str(coupon.id)}, message="Coupon created")


def _parse_coupon_id(coupon_id: str) -> uuid.UUID:
    """A malformed id is a missing coupon, not a server error (was a 500)."""
    try:
        return uuid.UUID(coupon_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=404, detail="Coupon not found")


@router.put("/admin/coupons/{coupon_id}", response_model=ApiResponse)
async def update_coupon(
    coupon_id: str,
    payload: CouponUpsert,
    admin_id: str = Depends(require_role("settings.write")),
    db: AsyncSession = Depends(get_db),
):
    coupon = (await db.execute(select(Coupon).where(Coupon.id == _parse_coupon_id(coupon_id)))).scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    duplicate = (await db.execute(
        select(Coupon).where(
            Coupon.code == payload.code, Coupon.id != coupon.id, Coupon.is_deleted == False  # noqa: E712
        )
    )).scalar_one_or_none()
    if duplicate:
        raise HTTPException(status_code=400, detail=f"Coupon {payload.code} already exists")
    coupon.code = payload.code
    coupon.discount_percent = payload.discount_percent
    coupon.min_subtotal = payload.min_subtotal
    coupon.is_active = payload.is_active
    db.add(ActivityLog(
        admin_id=uuid.UUID(admin_id), action="update",
        entity_type="coupon", entity_id=coupon.id,
        new_values=payload.model_dump(mode="json"),
    ))
    await db.commit()
    return ApiResponse(data={"id": str(coupon.id)}, message="Coupon updated")


@router.delete("/admin/coupons/{coupon_id}", response_model=ApiResponse)
async def delete_coupon(
    coupon_id: str,
    admin_id: str = Depends(require_role("settings.write")),
    db: AsyncSession = Depends(get_db),
):
    coupon = (await db.execute(select(Coupon).where(Coupon.id == _parse_coupon_id(coupon_id)))).scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    coupon.is_deleted = True
    db.add(ActivityLog(
        admin_id=uuid.UUID(admin_id), action="delete",
        entity_type="coupon", entity_id=coupon.id,
    ))
    await db.commit()
    return ApiResponse(data={"id": str(coupon.id)}, message="Coupon removed")
