"""Unit tests for the dynamic booking form validation engine and CTA resolver."""

from types import SimpleNamespace

import pytest

from app.core.booking_form import (
    BookingFormValidationError,
    summarize_form_data,
    validate_form_data,
)
from app.core.capabilities import resolve_service_cta


def make_field(**kwargs) -> SimpleNamespace:
    base = dict(
        field_name="nid_number",
        field_type="text",
        field_label_en="NID Number",
        field_label_bn="এনআইডি নম্বর",
        is_required=True,
        options=None,
        validation_rules=None,
        conditional_logic=None,
    )
    base.update(kwargs)
    return SimpleNamespace(**base)


class TestValidateFormData:
    def test_empty_config_accepts_empty_data(self):
        assert validate_form_data([], {}) == {}
        assert validate_form_data([], None) == {}

    def test_required_field_missing(self):
        with pytest.raises(BookingFormValidationError) as exc:
            validate_form_data([make_field()], {})
        assert "nid_number" in exc.value.errors

    def test_required_field_empty_string(self):
        with pytest.raises(BookingFormValidationError):
            validate_form_data([make_field()], {"nid_number": "   "})

    def test_optional_field_missing_ok(self):
        assert validate_form_data([make_field(is_required=False)], {}) == {}

    def test_unknown_field_silently_dropped(self):
        # Stale keys (field renamed/removed while the customer had the cached
        # form open) must not block the booking — they are dropped, not saved.
        cleaned = validate_form_data([make_field()], {"nid_number": "123", "stale_field": "x"})
        assert cleaned == {"nid_number": "123"}

    def test_valid_text_passes_and_strips(self):
        cleaned = validate_form_data([make_field()], {"nid_number": " 1234567890 "})
        assert cleaned == {"nid_number": "1234567890"}

    def test_pattern_rule(self):
        f = make_field(validation_rules={"pattern": r"^\d{10}$", "pattern_message": "10 digits"})
        assert validate_form_data([f], {"nid_number": "0123456789"}) == {"nid_number": "0123456789"}
        with pytest.raises(BookingFormValidationError) as exc:
            validate_form_data([f], {"nid_number": "abc"})
        assert exc.value.errors["nid_number"] == "10 digits"

    def test_bad_admin_regex_never_blocks(self):
        f = make_field(validation_rules={"pattern": "([unclosed"})
        assert validate_form_data([f], {"nid_number": "anything"})

    def test_min_max_length(self):
        f = make_field(validation_rules={"min_length": 3, "max_length": 5})
        with pytest.raises(BookingFormValidationError):
            validate_form_data([f], {"nid_number": "ab"})
        with pytest.raises(BookingFormValidationError):
            validate_form_data([f], {"nid_number": "abcdef"})

    def test_number_field(self):
        f = make_field(field_type="number", validation_rules={"min": 1, "max": 10})
        assert validate_form_data([f], {"nid_number": "5"}) == {"nid_number": 5.0}
        with pytest.raises(BookingFormValidationError):
            validate_form_data([f], {"nid_number": "11"})
        with pytest.raises(BookingFormValidationError):
            validate_form_data([f], {"nid_number": "not-a-number"})

    def test_email_field(self):
        f = make_field(field_type="email")
        assert validate_form_data([f], {"nid_number": "a@b.com"})
        with pytest.raises(BookingFormValidationError):
            validate_form_data([f], {"nid_number": "nope"})

    def test_date_field(self):
        f = make_field(field_type="date")
        assert validate_form_data([f], {"nid_number": "2026-07-15"})
        with pytest.raises(BookingFormValidationError):
            validate_form_data([f], {"nid_number": "15/07/2026"})

    def test_select_whitelist(self):
        f = make_field(field_type="select", options=["Home", "Office"])
        assert validate_form_data([f], {"nid_number": "Home"})
        with pytest.raises(BookingFormValidationError):
            validate_form_data([f], {"nid_number": "Elsewhere"})

    def test_multiselect(self):
        f = make_field(field_type="multiselect", options=["A", "B", "C"])
        cleaned = validate_form_data([f], {"nid_number": ["A", "C"]})
        assert cleaned == {"nid_number": ["A", "C"]}
        with pytest.raises(BookingFormValidationError):
            validate_form_data([f], {"nid_number": ["A", "Z"]})

    def test_checkbox_boolean(self):
        f = make_field(field_type="checkbox", is_required=False)
        assert validate_form_data([f], {"nid_number": True}) == {"nid_number": True}
        assert validate_form_data([f], {"nid_number": "false"}) == {"nid_number": False}

    def test_required_checkbox_must_be_checked(self):
        # Consent semantics: a required checkbox submitted as False is as
        # invalid as one never submitted at all.
        f = make_field(field_type="checkbox", is_required=True)
        assert validate_form_data([f], {"nid_number": True}) == {"nid_number": True}
        with pytest.raises(BookingFormValidationError):
            validate_form_data([f], {"nid_number": False})
        with pytest.raises(BookingFormValidationError):
            validate_form_data([f], {})

    def test_number_rejects_nan_and_inf(self):
        f = make_field(field_type="number")
        for bad in ("nan", "inf", "-inf", "Infinity"):
            with pytest.raises(BookingFormValidationError):
                validate_form_data([f], {"nid_number": bad})
        fi = make_field(field_type="integer")
        with pytest.raises(BookingFormValidationError):
            validate_form_data([fi], {"nid_number": "nan"})

    def test_phone_field_normalized_bd(self):
        f = make_field(field_type="phone")
        cleaned = validate_form_data([f], {"nid_number": "01712345678"})
        assert cleaned["nid_number"].endswith("1712345678")
        with pytest.raises(BookingFormValidationError):
            validate_form_data([f], {"nid_number": "12345"})

    def test_url_field(self):
        f = make_field(field_type="url")
        assert validate_form_data([f], {"nid_number": "https://example.com/x"})
        with pytest.raises(BookingFormValidationError):
            validate_form_data([f], {"nid_number": "not-a-url"})

    def test_max_length_zero_is_honored(self):
        f = make_field(validation_rules={"max_length": 0})
        with pytest.raises(BookingFormValidationError):
            validate_form_data([f], {"nid_number": "x"})

    def test_conditional_hidden_field_not_required(self):
        addr = make_field(
            field_name="address",
            conditional_logic={"show_if": {"field": "delivery", "equals": "home"}},
        )
        delivery = make_field(field_name="delivery", field_type="select", options=["home", "pickup"])
        # Condition not met → address not required, value dropped.
        cleaned = validate_form_data([addr, delivery], {"delivery": "pickup", "address": "x"})
        assert cleaned == {"delivery": "pickup"}
        # Condition met → address required.
        with pytest.raises(BookingFormValidationError):
            validate_form_data([addr, delivery], {"delivery": "home"})

    def test_summarize(self):
        f = make_field()
        out = summarize_form_data([f], {"nid_number": "123"})
        assert out == "NID Number: 123"
        assert summarize_form_data([f], {}) == ""


class TestResolveServiceCta:
    def test_default_bookable_service(self):
        cta = resolve_service_cta(None, None, None, "fixed", None, None)
        assert cta["type"] == "book"
        assert cta["label_en"] == "Book Now"

    def test_custom_quote_infers_quote(self):
        cta = resolve_service_cta(None, None, None, "custom_quote", None, None)
        assert cta["type"] == "quote"
        assert cta["label_en"] == "Request Quote"

    def test_orderable_not_bookable_infers_order(self):
        cta = resolve_service_cta(None, None, None, "fixed", True, False)
        assert cta["type"] == "order"

    def test_not_bookable_falls_back_to_contact(self):
        cta = resolve_service_cta(None, None, None, "fixed", None, False)
        assert cta["type"] == "contact"

    def test_admin_override_wins(self):
        cta = resolve_service_cta("order", None, None, "custom_quote", None, None)
        assert cta["type"] == "order"

    def test_invalid_override_falls_back_to_inference(self):
        cta = resolve_service_cta("bogus", None, None, "custom_quote", None, None)
        assert cta["type"] == "quote"

    def test_label_override(self):
        cta = resolve_service_cta("book", "Reserve Slot", "স্লট বুক করুন", "fixed", None, None)
        assert cta["label_en"] == "Reserve Slot"
        assert cta["label_bn"] == "স্লট বুক করুন"
