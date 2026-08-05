"""Unit test for core/invoice.generate_invoice_number — pure function, no
database or filesystem access."""
import re

from app.core.invoice import generate_invoice_number


def test_format_is_inv_year_hex():
    number = generate_invoice_number()
    assert re.fullmatch(r"INV-\d{4}-[0-9A-F]{6}", number), number


def test_year_matches_current_year():
    from datetime import datetime, timezone
    number = generate_invoice_number()
    year = str(datetime.now(timezone.utc).year)
    assert number.split("-")[1] == year


def test_successive_calls_are_unique():
    numbers = {generate_invoice_number() for _ in range(200)}
    # 6 hex chars = 16.7M possibilities; 200 draws colliding is effectively
    # impossible unless the RNG is broken.
    assert len(numbers) == 200
