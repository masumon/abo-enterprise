"""Coverage for orders._anti_abuse_guard — the COD fraud guard (name/address
sanity check, admin phone blocklist, per-phone pending-COD cap). DB session
is mocked; no live database touched.
"""
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.api.v1.routes.orders import _anti_abuse_guard
from app.schemas.schemas import OrderCreate, OrderItemCreate


def make_payload(**overrides) -> OrderCreate:
    base = dict(
        customer_name="Rahim Uddin",
        customer_phone="01712345678",
        delivery_address="House 12, Road 4, Beanibazar, Sylhet",
        payment_method="cod",
        items=[OrderItemCreate(product_id="p1", product_name="Item", product_price=100, quantity=1, subtotal=100)],
        subtotal=100,
        total=100,
    )
    base.update(overrides)
    return OrderCreate(**base)


def _mock_db(settings_rows=(), pending_count=0):
    db = AsyncMock()

    settings_result = MagicMock()
    settings_result.scalars.return_value.all.return_value = list(settings_rows)

    count_result = MagicMock()
    count_result.scalar.return_value = pending_count

    # First db.execute call fetches the settings rows, second counts
    # pending orders — mirrors the two queries _anti_abuse_guard issues.
    db.execute.side_effect = [settings_result, count_result]
    return db


class _Row:
    def __init__(self, key, value):
        self.key = key
        self.value = value


class TestNameAndAddressValidation:
    @pytest.mark.asyncio
    async def test_short_name_rejected_before_any_db_query(self):
        db = AsyncMock()
        payload = make_payload(customer_name="A")
        with pytest.raises(HTTPException) as exc:
            await _anti_abuse_guard(db, payload)
        assert exc.value.status_code == 400
        db.execute.assert_not_called()

    @pytest.mark.asyncio
    async def test_repeated_char_name_rejected(self):
        db = AsyncMock()
        payload = make_payload(customer_name="aaaa")
        with pytest.raises(HTTPException):
            await _anti_abuse_guard(db, payload)

    @pytest.mark.asyncio
    async def test_short_address_rejected(self):
        db = AsyncMock()
        payload = make_payload(delivery_address="Short")
        with pytest.raises(HTTPException) as exc:
            await _anti_abuse_guard(db, payload)
        assert exc.value.status_code == 400


class TestPhoneBlocklist:
    @pytest.mark.asyncio
    async def test_blocked_phone_rejected(self):
        db = _mock_db(settings_rows=[_Row("order_blocked_phones", "01712345678, 01800000000")])
        payload = make_payload(customer_phone="01712345678")
        with pytest.raises(HTTPException) as exc:
            await _anti_abuse_guard(db, payload)
        assert exc.value.status_code == 403

    @pytest.mark.asyncio
    async def test_non_blocked_phone_passes(self):
        db = _mock_db(settings_rows=[_Row("order_blocked_phones", "01800000000")], pending_count=0)
        payload = make_payload(customer_phone="01712345678")
        await _anti_abuse_guard(db, payload)  # must not raise

    @pytest.mark.asyncio
    async def test_empty_blocklist_passes(self):
        db = _mock_db(settings_rows=[_Row("order_blocked_phones", "")], pending_count=0)
        payload = make_payload()
        await _anti_abuse_guard(db, payload)  # must not raise


class TestPendingCodCap:
    @pytest.mark.asyncio
    async def test_at_or_above_cap_rejected(self):
        db = _mock_db(settings_rows=[_Row("cod_max_pending_per_phone", "5")], pending_count=5)
        payload = make_payload()
        with pytest.raises(HTTPException) as exc:
            await _anti_abuse_guard(db, payload)
        assert exc.value.status_code == 429

    @pytest.mark.asyncio
    async def test_below_cap_passes(self):
        db = _mock_db(settings_rows=[_Row("cod_max_pending_per_phone", "5")], pending_count=2)
        payload = make_payload()
        await _anti_abuse_guard(db, payload)  # must not raise

    @pytest.mark.asyncio
    async def test_cap_zero_disables_the_check(self):
        db = _mock_db(settings_rows=[_Row("cod_max_pending_per_phone", "0")], pending_count=999)
        payload = make_payload()
        await _anti_abuse_guard(db, payload)  # must not raise — 0 means unlimited

    @pytest.mark.asyncio
    async def test_missing_setting_defaults_to_five(self):
        db = _mock_db(settings_rows=[], pending_count=5)
        payload = make_payload()
        with pytest.raises(HTTPException):
            await _anti_abuse_guard(db, payload)
