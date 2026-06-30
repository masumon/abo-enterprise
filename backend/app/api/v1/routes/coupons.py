"""Public coupon validation — admin-configurable via coupons_json setting."""
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import Setting
from app.schemas.schemas import ApiResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/public/coupons", tags=["coupons"])

DEFAULT_COUPONS: dict[str, dict] = {
    "ABO10": {"discount_percent": 10, "min_subtotal": 0, "active": True},
    "WELCOME": {"discount_percent": 5, "min_subtotal": 500, "active": True},
}


class CouponValidateRequest(BaseModel):
    code: str
    subtotal: float = 0

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        return v.strip().upper()


async def _load_coupons(db: AsyncSession) -> dict[str, dict]:
    result = await db.execute(select(Setting).where(Setting.key == "coupons_json"))
    row = result.scalar_one_or_none()
    if not row or not row.value:
        return DEFAULT_COUPONS
    try:
        parsed = json.loads(row.value)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        logger.warning("Invalid coupons_json in settings — using defaults")
    return DEFAULT_COUPONS


@router.post("/validate", response_model=ApiResponse)
async def validate_coupon(payload: CouponValidateRequest, db: AsyncSession = Depends(get_db)):
    coupons = await _load_coupons(db)
    entry = coupons.get(payload.code)
    if not entry or not entry.get("active", True):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid coupon code")

    min_subtotal = float(entry.get("min_subtotal", 0))
    if payload.subtotal < min_subtotal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum order ৳{min_subtotal:.0f} required for this coupon",
        )

    discount_raw = entry.get("discount_percent", entry.get("discount_rate", 0))
    rate = float(discount_raw)
    if rate > 1:
        rate = rate / 100
    discount_amount = round(payload.subtotal * rate)

    return ApiResponse(
        data={
            "code": payload.code,
            "discount_percent": round(rate * 100, 2),
            "discount_amount": discount_amount,
            "discount_rate": rate,
        },
        message="Coupon applied",
    )
