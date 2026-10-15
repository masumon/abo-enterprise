"""Release-audit fixes (2026-10-16): N1 client price, N2 booking permission, N3 delivery
fallback, N4 courier-cancel stock, N6 public tracking leak."""
import asyncio
import inspect
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api.v1.routes import bookings, orders


class _Result:
    def __init__(self, items):
        self._items = items

    def scalars(self):
        return self

    def all(self):
        return self._items

    def scalar_one_or_none(self):
        return self._items[0] if self._items else None


class FakeDB:
    """Answers each execute() with the next prepared list of rows."""

    def __init__(self, *answers):
        self.answers = list(answers)

    async def execute(self, _stmt):
        return _Result(self.answers.pop(0) if self.answers else [])


def _line(pid, price=1.0):
    return SimpleNamespace(product_id=pid, product_name="X", product_price=price, quantity=1)


@pytest.mark.parametrize("pid", ["", None, "not-a-uuid"])
def test_n1_order_line_without_real_product_is_rejected(pid):
    with pytest.raises(HTTPException) as exc:
        asyncio.run(orders._validate_and_reserve_stock(FakeDB(), [_line(pid)]))
    assert exc.value.status_code == 400


def test_n2_booking_status_change_needs_write_permission():
    src = inspect.getsource(bookings.update_booking_status)
    assert 'require_role("bookings.write")' in src and 'require_role("bookings.read")' not in src


def test_n3_no_district_uses_outside_tier_not_client_value():
    assert orders._delivery_from_zones_or_tier([], {}, "", None, 500.0, 0.0) == 130.0
    src = inspect.getsource(orders.create_order)
    assert "payload.delivery_charge" not in src


def test_n4_restore_stock_gives_quantity_back():
    product = SimpleNamespace(stock_quantity=3)
    item = SimpleNamespace(product_id="p1", quantity=2)
    asyncio.run(orders._restore_stock(FakeDB([item], [product]), "order-1"))
    assert product.stock_quantity == 5


def _order():
    return SimpleNamespace(order_number="ABO-202610-0001", order_status="pending", payment_method="cod",
                           payment_status="pending", total=1500, items=[1, 2], customer_phone="01712345678",
                           created_at=datetime(2026, 10, 1, tzinfo=timezone.utc), courier_provider=None,
                           courier_tracking_id=None)


def test_n6_track_hides_money_without_phone_and_shows_with_it():
    plain = asyncio.run(orders.track_order(number="ABO-202610-0001", phone="", db=FakeDB([_order()]))).data
    assert "total" not in plain and "payment_status" not in plain and plain["order_status"] == "pending"
    wrong = asyncio.run(orders.track_order(number="ABO-202610-0001", phone="9999", db=FakeDB([_order()]))).data
    assert "total" not in wrong
    ok = asyncio.run(orders.track_order(number="ABO-202610-0001", phone="5678", db=FakeDB([_order()]))).data
    assert ok["total"] == 1500.0 and ok["payment_status"] == "pending"
