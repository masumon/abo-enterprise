"""The booking row must accept everything the create endpoint puts on it.

A column that lands on the wrong model is invisible until a request fails:
BookingV2(**payload) raises TypeError for an unknown keyword, so a missing
column turns every booking into a 500. These tests pin the contract.
"""

from app.models.models import BookingV2, Order


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


def test_no_duplicate_columns_on_commerce_models():
    """A repeated declaration silently overrides the first and is never intended."""
    for model in (BookingV2, Order):
        names = [c.name for c in model.__table__.c]
        assert len(names) == len(set(names)), f"{model.__name__} has duplicate columns"
