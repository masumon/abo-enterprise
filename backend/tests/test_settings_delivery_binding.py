import pytest

from app.assistant.automation_engine import _calc_delivery_charge, _required_setting_amount


def test_required_delivery_setting_uses_admin_value_or_legacy_alias_only():
    assert _required_setting_amount({"delivery_charge_sylhet": "75"}, "delivery_charge_sylhet") == 75.0
    assert _required_setting_amount({"free_delivery_min": "2500"}, "free_delivery_min_amount", "free_delivery_min") == 2500.0


def test_required_delivery_setting_fails_closed_when_missing_or_invalid():
    with pytest.raises(ValueError, match="Required setting is not configured"):
        _required_setting_amount({}, "delivery_charge_sylhet")

    with pytest.raises(ValueError, match="Invalid numeric setting"):
        _required_setting_amount({"delivery_charge_sylhet": "not-a-number"}, "delivery_charge_sylhet")


def test_delivery_charge_uses_only_resolved_runtime_settings():
    kwargs = {
        "free_min": 2500.0,
        "sylhet_charge": 75.0,
        "dhaka_charge": 125.0,
        "outside_charge": 140.0,
    }
    assert _calc_delivery_charge("Sylhet", 3000, **kwargs) == 0.0
    assert _calc_delivery_charge("Sylhet", 1000, **kwargs) == 75.0
    assert _calc_delivery_charge("Dhaka", 1000, **kwargs) == 125.0
    assert _calc_delivery_charge("Rajshahi", 1000, **kwargs) == 140.0
