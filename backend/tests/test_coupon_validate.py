"""Coverage for the public coupon-validate endpoint (coupons.py) — the path
customers actually hit when typing a code into checkout. Mirrors the
mocked-DB convention in test_coupon_discount.py; no live database touched.
"""
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.api.v1.routes.coupons import CouponValidateRequest, validate_coupon


def _mock_db(coupon=None):
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = coupon
    db.execute.return_value = result
    return db


class TestValidateCoupon:
    @pytest.mark.asyncio
    async def test_unknown_code_raises_404(self):
        db = _mock_db(coupon=None)
        with pytest.raises(HTTPException) as exc:
            await validate_coupon(CouponValidateRequest(code="NOPE", subtotal=1000), db)
        assert exc.value.status_code == 404

    @pytest.mark.asyncio
    async def test_below_minimum_subtotal_raises_400(self):
        coupon = SimpleNamespace(code="WELCOME", min_subtotal=500, discount_percent=5)
        db = _mock_db(coupon=coupon)
        with pytest.raises(HTTPException) as exc:
            await validate_coupon(CouponValidateRequest(code="welcome", subtotal=100), db)
        assert exc.value.status_code == 400

    @pytest.mark.asyncio
    async def test_valid_code_returns_discount_breakdown(self):
        coupon = SimpleNamespace(code="ABO10", min_subtotal=0, discount_percent=10)
        db = _mock_db(coupon=coupon)
        resp = await validate_coupon(CouponValidateRequest(code="abo10", subtotal=1000), db)
        assert resp.data["code"] == "ABO10"
        assert resp.data["discount_percent"] == 10.0
        assert resp.data["discount_amount"] == 100
        assert resp.data["discount_rate"] == 0.1

    def test_code_is_normalized_to_uppercase_trimmed(self):
        # The request model itself upper-cases/trims — exercised directly
        # since it's the first line of defence against case-mismatch lookups.
        payload = CouponValidateRequest(code="  abo10  ", subtotal=0)
        assert payload.code == "ABO10"
