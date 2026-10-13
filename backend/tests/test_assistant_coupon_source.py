"""Assistant coupon lookup must read the same table as admin CRUD/checkout."""
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.assistant.knowledge_base import KnowledgeBase


@pytest.mark.asyncio
async def test_load_coupons_uses_active_coupon_rows_from_database():
    db = AsyncMock()
    result = MagicMock()
    result.scalars.return_value.all.return_value = [
        SimpleNamespace(code="ABO10", discount_percent=10, min_subtotal=0),
        SimpleNamespace(code="WELCOME", discount_percent=5, min_subtotal=500),
    ]
    db.execute.return_value = result

    coupons = await KnowledgeBase().load_coupons(db)

    assert coupons == {
        "ABO10": {"discount_percent": 10.0, "min_subtotal": 0.0, "active": True},
        "WELCOME": {"discount_percent": 5.0, "min_subtotal": 500.0, "active": True},
    }
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_coupon_respects_database_values_and_minimum():
    db = AsyncMock()
    result = MagicMock()
    result.scalars.return_value.all.return_value = [
        SimpleNamespace(code="WELCOME", discount_percent=5, min_subtotal=500),
    ]
    db.execute.return_value = result
    kb = KnowledgeBase()

    coupon = await kb.get_coupon(db, " welcome ")

    assert coupon == {
        "code": "WELCOME",
        "discount_percent": 5.0,
        "min_subtotal": 500.0,
    }
