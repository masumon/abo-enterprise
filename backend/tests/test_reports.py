"""Unified Reports module contract tests — date-range window logic and
route registration. The report builders themselves need a live DB session
(no fixture for that exists in this test suite, consistent with the rest
of the codebase's unit-only backend tests), so this covers what's testable
without one.
"""
from datetime import date, timedelta, timezone

import pytest
from fastapi import HTTPException

from app.api.v1.routes.reports import REPORT_BUILDERS, _window


def test_window_defaults_to_last_30_days_when_unset():
    start, end = _window(None, None)
    assert (end - start).days == 31  # 30 days + 1 (end is exclusive, whole-day-inclusive)
    assert start.tzinfo == timezone.utc
    assert end.tzinfo == timezone.utc


def test_window_single_day_includes_the_whole_day():
    d = date(2026, 1, 15)
    start, end = _window(d, d)
    assert start.date() == d
    assert end.date() == d + timedelta(days=1)
    assert (end - start).total_seconds() == 86400


def test_window_rejects_start_after_end():
    with pytest.raises(HTTPException) as exc:
        _window(date(2026, 2, 1), date(2026, 1, 1))
    assert exc.value.status_code == 422


def test_all_advertised_report_types_have_builders():
    expected = {"sales", "revenue", "products", "services", "customers", "payments", "courier", "profit", "reconciliation"}
    assert set(REPORT_BUILDERS.keys()) == expected


def test_reports_routes_registered():
    from app.api.v1.router import api_router

    paths = {getattr(r, "path", "") for r in api_router.routes}
    assert "/api/v1/admin/reports/{report_type}" in paths
    assert "/api/v1/admin/reports/{report_type}/export" in paths


def test_product_cost_price_column_is_nullable():
    """Never fabricate profit for products without an admin-entered cost."""
    from app.models.models import Product

    column = Product.__table__.columns["cost_price"]
    assert column.nullable is True
