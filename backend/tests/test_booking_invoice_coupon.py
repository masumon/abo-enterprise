"""Regression tests for booking invoice creation with coupon-backed discounts.

No live database is used. The booking carries coupon_code/discount_amount, but the
Invoice ORM model intentionally has no coupon_code field; invoice totals must
still preserve the stored discount without passing an unsupported constructor kwarg.
"""
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core import invoice as invoice_module


@pytest.mark.asyncio
async def test_booking_invoice_keeps_discount_without_invoice_coupon_code(monkeypatch):
    booking_id = uuid.uuid4()
    booking = SimpleNamespace(
        id=booking_id,
        service_name="Passport Assistance",
        final_price=None,
        quoted_price=1000,
        discount_amount=100,
        coupon_code="ABO10",
        customer_name="Test Customer",
        customer_email=None,
        customer_phone="01825007977",
        payment_method="pending",
        payment_status="pending",
        booking_number="BK-TEST-001",
    )

    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = booking
    db.execute.return_value = result

    created = {}

    def fake_invoice(**kwargs):
        created.update(kwargs)
        return SimpleNamespace(id=uuid.uuid4(), **kwargs)

    monkeypatch.setattr(invoice_module, "Invoice", fake_invoice)
    service = invoice_module.InvoiceService(db)
    monkeypatch.setattr(service, "get_by_booking_v2_id", AsyncMock(return_value=None))

    invoice = await service.create_booking_invoice(booking_id=booking_id)

    assert "coupon_code" not in created
    assert created["discount_amount"] == 100
    assert created["subtotal"] == 1000
    assert created["total"] == 900
    assert invoice.total == 900
    db.add.assert_called_once_with(invoice)
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(invoice)
