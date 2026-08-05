"""Unit tests for services._assert_price_coherence — a pure validation
function that stops a service being saved in a state that can only ever
produce a ৳0 booking (e.g. 'fixed' pricing with no base price)."""
import pytest
from fastapi import HTTPException

from app.api.v1.routes.services import _assert_price_coherence


class TestMinMaxRange:
    def test_min_greater_than_max_rejected(self):
        with pytest.raises(HTTPException) as exc:
            _assert_price_coherence("package", None, 500, 100, None)
        assert exc.value.status_code == 422

    def test_min_equal_max_allowed(self):
        _assert_price_coherence("package", None, 300, 300, None)  # must not raise

    def test_min_without_max_allowed(self):
        _assert_price_coherence("fixed", 100, 50, None, None)  # must not raise


class TestFixedPricing:
    def test_fixed_without_base_price_rejected(self):
        with pytest.raises(HTTPException) as exc:
            _assert_price_coherence("fixed", None, None, None, None)
        assert "base_price" in exc.value.detail

    def test_fixed_with_base_price_allowed(self):
        _assert_price_coherence("fixed", 500, None, None, None)  # must not raise

    def test_fixed_without_base_price_allowed_when_tiers_exist(self):
        _assert_price_coherence("fixed", None, None, None, None, has_tiers=True)  # must not raise


class TestHourlyPricing:
    def test_hourly_without_rate_rejected(self):
        with pytest.raises(HTTPException) as exc:
            _assert_price_coherence("hourly", None, None, None, None)
        assert "hourly_rate" in exc.value.detail

    def test_hourly_with_rate_allowed(self):
        _assert_price_coherence("hourly", None, None, None, 250)  # must not raise


class TestPackagePricing:
    def test_package_with_nothing_set_rejected(self):
        with pytest.raises(HTTPException):
            _assert_price_coherence("package", None, None, None, None)

    def test_package_with_base_price_allowed(self):
        _assert_price_coherence("package", 1000, None, None, None)  # must not raise

    def test_package_with_min_max_range_allowed(self):
        _assert_price_coherence("package", None, 500, 1500, None)  # must not raise

    def test_package_with_only_min_rejected(self):
        with pytest.raises(HTTPException):
            _assert_price_coherence("package", None, 500, None, None)


class TestCustomQuotePricing:
    def test_custom_quote_needs_no_price_fields(self):
        # Not fixed/hourly/package -> the missing-field checks don't apply.
        _assert_price_coherence("custom_quote", None, None, None, None)  # must not raise
