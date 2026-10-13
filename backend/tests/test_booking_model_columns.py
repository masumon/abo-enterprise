"""The booking row must accept everything the create endpoint puts on it.

A column that lands on the wrong model is invisible until a request fails:
BookingV2(**payload) raises TypeError for an unknown keyword, so a missing
column turns every booking into a 500. These tests pin the contract.
"""

import ast
import uuid
from pathlib import Path

from app.models.models import BookingV2, Order
from app.schemas.schemas import BookingV2Create


def test_booking_accepts_every_field_the_endpoint_sets():
    # Mirrors routes/bookings_v2.create_booking's construction exactly.
    booking = BookingV2(
        booking_number="BK-2026-TEST01",
        service_name="Test service",
        customer_name="Test",
        customer_phone="01712345678",
        pricing_type="fixed",
        quoted_price=1000,
        discount_amount=100,
        coupon_code="ABO10",
        advance_amount=0,
        advance_paid=False,
        district="Sylhet",
        upazila="Beanibazar",
        form_data={},
        attachments=[],
    )
    assert booking.coupon_code == "ABO10"
    assert float(booking.discount_amount) == 100


def test_linked_service_booking_uses_catalog_service_name_without_duplicate_keyword():
    """The excluded payload name cannot collide with the trusted catalog name."""
    payload = BookingV2Create(
        service_id=uuid.UUID("11111111-1111-4111-8111-111111111111"),
        service_name="Client-supplied name",
        customer_name="Test Customer",
        customer_phone="01712345678",
    )

    booking_fields = payload.model_dump(exclude={"service_name"})
    booking = BookingV2(
        booking_number="BK-2026-TEST02",
        service_name="Trusted catalog service",
        **booking_fields,
    )

    assert booking.service_name == "Trusted catalog service"


def test_create_booking_excludes_service_name_from_payload_dump():
    """Guard the actual endpoint against reintroducing the duplicate keyword bug."""
    route_path = (
        Path(__file__).resolve().parents[1]
        / "app"
        / "api"
        / "v1"
        / "routes"
        / "bookings_v2.py"
    )
    module = ast.parse(route_path.read_text(encoding="utf-8"))
    create_booking = next(
        node
        for node in module.body
        if isinstance(node, ast.AsyncFunctionDef) and node.name == "create_booking"
    )

    found_safe_dump = False
    for node in ast.walk(create_booking):
        if not isinstance(node, ast.Assign):
            continue
        if not any(
            isinstance(target, ast.Name) and target.id == "booking_fields"
            for target in node.targets
        ):
            continue
        call = node.value
        if not (
            isinstance(call, ast.Call)
            and isinstance(call.func, ast.Attribute)
            and call.func.attr == "model_dump"
        ):
            continue
        for keyword in call.keywords:
            if keyword.arg == "exclude" and isinstance(keyword.value, ast.Set):
                if {
                    item.value
                    for item in keyword.value.elts
                    if isinstance(item, ast.Constant)
                } >= {"service_name"}:
                    found_safe_dump = True

    assert found_safe_dump, (
        "create_booking must exclude service_name from payload.model_dump() "
        "before passing the trusted service.name_en separately"
    )


def test_no_duplicate_columns_on_commerce_models():
    """A repeated declaration silently overrides the first and is never intended."""
    for model in (BookingV2, Order):
        names = [c.name for c in model.__table__.c]
        assert len(names) == len(set(names)), f"{model.__name__} has duplicate columns"
