"""Canonical customer master model and serialization contract tests."""

from pathlib import Path

import pytest
from pydantic import ValidationError

from app.api.v1.routes.customers import CustomerUpdate, _customer_activity_subqueries, _serialize_customer
from app.models.customer import Customer


PROJECT_ROOT = Path(__file__).resolve().parents[2]
MANUAL_SQL = PROJECT_ROOT / "manual_sql" / "20260812_batch02_customer_master.sql"


def test_customer_master_schema_preserves_canonical_identity_fields():
    columns = {column.name: column for column in Customer.__table__.columns}

    assert Customer.__tablename__ == "customers"
    assert columns["phone"].unique is True
    assert columns["phone"].nullable is False
    assert columns["name"].nullable is False
    assert columns["is_deleted"].nullable is False
    assert "created_at" in columns
    assert "updated_at" in columns


def test_customer_master_serialization_exposes_profile_and_activity_without_mutation():
    customer = Customer(
        phone="01712345678",
        name="Test Customer",
        email="test@example.com",
        company="Test Company",
        address="Sylhet",
    )

    payload = _serialize_customer(
        customer,
        order_count=2,
        booking_count=3,
        lead_count=1,
        order_value=1200,
        booking_value=800,
    )

    assert payload["phone"] == "01712345678"
    assert payload["name"] == "Test Customer"
    assert payload["order_count"] == 2
    assert payload["booking_count"] == 3
    assert payload["lead_count"] == 1
    assert payload["order_value"] == 1200.0
    assert payload["booking_value"] == 800.0
    assert payload["status"] == "active"
    assert customer.is_deleted is not True


def test_customer_activity_queries_cover_orders_bookings_leads_and_values():
    queries = _customer_activity_subqueries()
    assert len(queries) == 8
    assert all(query is not None for query in queries)


def test_customer_update_rejects_blank_name():
    with pytest.raises(ValidationError):
        CustomerUpdate(name="   ")


def test_manual_customer_sql_is_idempotent_and_non_destructive():
    sql = MANUAL_SQL.read_text(encoding="utf-8").upper()

    assert "CREATE TABLE IF NOT EXISTS CUSTOMERS" in sql
    assert "ON CONFLICT (PHONE) DO NOTHING" in sql
    assert "DROP TABLE" not in sql
    assert "TRUNCATE" not in sql
    assert "DELETE FROM" not in sql
    assert "UPDATE CUSTOMERS" not in sql
