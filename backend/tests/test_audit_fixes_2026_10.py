"""Release-audit fixes (2026-10-16): N1 client price, N2 booking permission, N3 delivery
fallback, N4 courier-cancel stock, N6 public tracking leak."""
import asyncio
import inspect
from datetime import datetime, timezone
from pathlib import Path
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


# ── N5 refund / return ──────────────────────────────────────────────────────

class _RefundDB(FakeDB):
    def __init__(self, order, *answers):
        super().__init__([order], *answers)
        self.added = []

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        return None

    async def refresh(self, _obj):
        return None


def _paid_order(**kw):
    import uuid as _u
    base = dict(id=_u.uuid4(), order_number="ABO-1", customer_name="C", customer_phone="017", customer_email=None,
                delivery_address="A", payment_method="cod", payment_status="completed", order_status="delivered",
                subtotal=1000, discount_amount=0, delivery_charge=0, total=1000, coupon_code=None, notes=None,
                items=[], created_at=datetime(2026, 10, 1, tzinfo=timezone.utc), refund_amount=None,
                refund_method=None, refund_note=None, refunded_at=None)
    base.update(kw)
    return SimpleNamespace(**base)


def _refund(order, amount, restock=False, *answers):
    from unittest.mock import patch
    db = _RefundDB(order, *answers)
    body = orders.RefundIn(amount=amount, method="bkash", note="ফেরত", restock=restock)
    with patch.object(orders.OrderOut, "model_validate", lambda o: o):
        return asyncio.run(orders.refund_order(order.id, body, admin_id="00000000-0000-0000-0000-000000000001", db=db)), db


def test_n5_partial_then_full_refund():
    order = _paid_order()
    _refund(order, 300)
    assert order.refund_amount == 300 and order.payment_status == "partially_refunded" and order.order_status == "delivered"
    _refund(order, 700)
    assert order.refund_amount == 1000 and order.payment_status == "refunded" and "৳700" in order.refund_note


def test_n5_refund_cannot_exceed_total():
    with pytest.raises(HTTPException) as exc:
        _refund(_paid_order(refund_amount=900), 200)
    assert exc.value.status_code == 400


def test_n5_restock_marks_returned_and_restores_stock():
    product = SimpleNamespace(stock_quantity=1)
    order = _paid_order()
    _refund(order, 1000, True, [SimpleNamespace(product_id="p", quantity=2)], [product])
    assert order.order_status == "returned" and product.stock_quantity == 3


def test_n5_revenue_is_net_of_refunds():
    for mod in ("reports", "analytics"):
        src = (Path(__file__).resolve().parents[1] / "app/api/v1/routes" / f"{mod}.py").read_text(encoding="utf-8")
        assert "func.sum(Order.total)" not in src
