"""Regression coverage for the P0 checkout/booking crash: orders.py used to
import a `_load_coupons` helper from coupons.py that no longer existed after
coupons.py was refactored onto the real Coupon table, so ANY order or
booking submitted with a coupon_code raised an ImportError (500). The fix
re-derives the discount from the Coupon model directly — these tests pin
that behaviour and would fail again if the regression ever came back.

The DB session is mocked throughout (no live database touched): only the
branching logic of _server_side_discount is under test here, matching the
existing SimpleNamespace-fake-row convention used in test_booking_form.py.
"""
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.api.v1.routes.orders import _server_side_discount


def _mock_db(coupon=None):
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = coupon
    db.execute.return_value = result
    return db


class TestServerSideDiscount:
    @pytest.mark.asyncio
    async def test_no_coupon_code_returns_zero_without_querying_db(self):
        db = _mock_db()
        assert await _server_side_discount(db, None, 1000) == 0.0
        db.execute.assert_not_called()

    @pytest.mark.asyncio
    async def test_empty_coupon_code_returns_zero(self):
        db = _mock_db()
        assert await _server_side_discount(db, "", 1000) == 0.0

    @pytest.mark.asyncio
    async def test_unknown_coupon_returns_zero(self):
        db = _mock_db(coupon=None)
        assert await _server_side_discount(db, "NOPE10", 1000) == 0.0

    @pytest.mark.asyncio
    async def test_subtotal_below_minimum_returns_zero(self):
        coupon = SimpleNamespace(min_subtotal=500, discount_percent=10)
        db = _mock_db(coupon=coupon)
        assert await _server_side_discount(db, "WELCOME", 400) == 0.0

    @pytest.mark.asyncio
    async def test_valid_coupon_applies_percentage(self):
        coupon = SimpleNamespace(min_subtotal=0, discount_percent=10)
        db = _mock_db(coupon=coupon)
        assert await _server_side_discount(db, "abo10", 1000) == 100.0

    @pytest.mark.asyncio
    async def test_subtotal_exactly_at_minimum_is_allowed(self):
        coupon = SimpleNamespace(min_subtotal=500, discount_percent=5)
        db = _mock_db(coupon=coupon)
        assert await _server_side_discount(db, "WELCOME", 500) == 25.0

    @pytest.mark.asyncio
    async def test_discount_is_rounded(self):
        coupon = SimpleNamespace(min_subtotal=0, discount_percent=7)
        db = _mock_db(coupon=coupon)
        # 999 * 0.07 = 69.93 -> rounds to 70
        assert await _server_side_discount(db, "SEVEN", 999) == 70.0

    @pytest.mark.asyncio
    async def test_regression_completes_without_import_error(self):
        """P0 regression guard: the pre-fix code path raised ImportError on
        this exact call. Assert it now returns a plain float instead."""
        coupon = SimpleNamespace(min_subtotal=0, discount_percent=10)
        db = _mock_db(coupon=coupon)
        try:
            result = await _server_side_discount(db, "ABO10", 1000)
        except ImportError as exc:  # pragma: no cover - only fires on regression
            pytest.fail(f"_server_side_discount raised ImportError (P0 regression returned): {exc}")
        assert result == 100.0
        assert isinstance(result, float)
