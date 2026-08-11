from datetime import datetime, timezone

import pytest

from app.api.v1.routes.public import get_public_stats


class _Result:
    def __init__(self, value):
        self._value = value

    def scalar(self):
        return self._value


class _FakeDb:
    def __init__(self, values):
        self._values = iter(values)

    async def execute(self, _statement):
        return _Result(next(self._values))


@pytest.mark.asyncio
async def test_public_stats_does_not_fabricate_clients_projects_or_years():
    first_order = datetime(2024, 8, 11, tzinfo=timezone.utc)
    db = _FakeDb([
        3,      # orders
        8,      # products
        4,      # services
        2,      # reviews
        4.5,    # average rating
        first_order,
    ])

    response = await get_public_stats(db)
    data = response.data

    assert data["orders"] == 3
    assert data["products"] == 8
    assert data["services"] == 4
    assert data["clients"] is None
    assert data["projects"] is None
    assert data["years"] >= 1
    assert data["reviews"] == 2
    assert data["average_rating"] == 4.5


@pytest.mark.asyncio
async def test_public_stats_returns_unavailable_years_without_orders():
    db = _FakeDb([
        0,      # orders
        0,      # products
        0,      # services
        0,      # reviews
        None,   # average rating
        None,   # first order
    ])

    response = await get_public_stats(db)

    assert response.data["years"] is None
    assert response.data["clients"] is None
    assert response.data["projects"] is None
