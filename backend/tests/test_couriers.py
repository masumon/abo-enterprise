"""Courier automation: phone/COD helpers, area matching, undo-window scheduling."""
import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from app.core import couriers as C


def test_normalize_phone_bd_formats():
    assert C.normalize_phone("+880 1712-345678") == "01712345678"
    assert C.normalize_phone("1712345678") == "01712345678"
    assert C.normalize_phone("01712345678") == "01712345678"


def test_cod_amount_respects_paid_and_advance():
    assert C.cod_amount(SimpleNamespace(payment_status="completed", total=500)) == 0.0
    assert C.cod_amount(SimpleNamespace(payment_status="pending", total=1000, advance_amount=200, advance_paid=True)) == 800
    assert C.cod_amount(SimpleNamespace(payment_status="pending", total=1000, advance_amount=200, advance_paid=False)) == 1000


def test_area_match_prefers_longest_name():
    areas = [{"name": "Sylhet"}, {"name": "Sylhet Sadar"}, {"name": "Dhaka"}]
    assert C._match(areas, "House 5, Zindabazar, Sylhet Sadar, Sylhet")["name"] == "Sylhet Sadar"
    assert C._match(areas, "চট্টগ্রাম") is None


def test_undo_window_is_15_seconds():
    due = C.dispatch_due_at()
    assert timedelta(seconds=14) < due - datetime.now(timezone.utc) <= timedelta(seconds=15)


def test_due_dispatch_skips_undone_or_sent(monkeypatch):
    from app.api.v1.routes import couriers as R

    sent = []

    async def fake_dispatch(db, order, provider, admin_id):
        sent.append(order.order_number)

    class _S:
        def __init__(self, order):
            self.order = order

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def execute(self, _q):
            o = self.order
            return SimpleNamespace(scalar_one_or_none=lambda: o)

        async def commit(self):
            return None

    async def cfg(db):
        return {"default": "steadfast", "mode": "auto", "providers": {}}

    import app.core.database as database
    monkeypatch.setattr(R, "dispatch", fake_dispatch)
    monkeypatch.setattr(C, "get_config", cfg)
    past = datetime.now(timezone.utc) - timedelta(seconds=1)
    for order, expect in (
        (SimpleNamespace(order_number="A", courier_dispatch_at=None, courier_tracking_id=None, courier_provider=None), False),
        (SimpleNamespace(order_number="B", courier_dispatch_at=past, courier_tracking_id="T1", courier_provider=None), False),
        (SimpleNamespace(order_number="C", courier_dispatch_at=past, courier_tracking_id=None, courier_provider="pathao"), True),
    ):
        monkeypatch.setattr(database, "AsyncSessionLocal", lambda o=order: _S(o))
        asyncio.run(R.run_due_dispatch("x", "a"))
        assert (order.order_number in sent) is expect
