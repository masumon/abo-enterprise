"""Unit tests for bookings_v2's generate_booking_number and _phone_matches —
both pure functions, no database. _phone_matches gates the public booking
lookup (GET /service-bookings/{id}?phone=...), so a bug here is either a
privacy leak (too permissive) or a support headache (too strict).
"""
import re

from app.api.v1.routes.bookings_v2 import _phone_matches, generate_booking_number


def test_booking_number_format():
    number = generate_booking_number()
    assert re.fullmatch(r"BK-\d{4}-[0-9A-F]{6}", number), number


def test_booking_numbers_are_unique():
    numbers = {generate_booking_number() for _ in range(200)}
    assert len(numbers) == 200


class TestPhoneMatches:
    def test_exact_match(self):
        assert _phone_matches("+8801712345678", "+8801712345678") is True

    def test_empty_supplied_never_matches(self):
        assert _phone_matches("+8801712345678", "") is False
        assert _phone_matches("+8801712345678", "   ") is False

    def test_same_local_format_with_punctuation_still_matches(self):
        # bd_phone only strips whitespace/parens/dashes — it does not
        # reformat between 01XXXXXXXXX and +880-prefixed styles, so a match
        # requires the same prefix style, cleaned of stray punctuation.
        assert _phone_matches("01712345678", "017-1234-5678") is True

    def test_different_prefix_style_for_the_same_number_does_not_match(self):
        # Documents the real (narrower than one might assume) behaviour:
        # bd_phone validates, it does not normalize +880/0 forms into a
        # single canonical shape.
        assert _phone_matches("+8801712345678", "01712345678") is False

    def test_different_phone_does_not_match(self):
        assert _phone_matches("01712345678", "01899999999") is False

    def test_garbage_input_does_not_match_and_does_not_raise(self):
        assert _phone_matches("+8801712345678", "not-a-phone") is False

    def test_whitespace_padded_supplied_is_trimmed(self):
        assert _phone_matches("01712345678", "  01712345678  ") is True
