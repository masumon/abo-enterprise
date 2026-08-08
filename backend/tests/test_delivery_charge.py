"""Unit tests for the server-side delivery-charge rule (pure function, no DB).
Guards the money path: the charge is re-derived from admin zones / legacy tier,
never trusted from the client, and degrades safely when no zones exist."""
from types import SimpleNamespace as NS

from app.api.v1.routes.orders import _delivery_from_zones_or_tier as calc


def test_legacy_tier_defaults():
    assert calc([], {}, "Sylhet", "", 100, 0) == 60.0        # sylhet tier
    assert calc([], {}, "Dhaka", "", 100, 0) == 120.0        # dhaka tier
    assert calc([], {}, "Rangpur", "", 100, 0) == 130.0      # outside tier


def test_sylhet_free_above_threshold_only():
    assert calc([], {}, "Sylhet", "", 5000, 0) == 0.0        # sylhet free ≥ 2000
    assert calc([], {}, "Dhaka", "", 999999, 0) == 120.0     # non-sylhet never free by threshold


def test_settings_override_defaults():
    s = {"delivery_charge_dhaka": "150", "free_delivery_min_amount": "1000"}
    assert calc([], s, "Dhaka", "", 100, 0) == 150.0
    assert calc([], s, "Sylhet", "", 1200, 0) == 0.0         # threshold from settings


def test_product_override_wins_when_higher():
    assert calc([], {}, "Sylhet", "", 100, 200) == 200.0


def test_zone_match_and_free_threshold():
    z = NS(districts=["Cox"], upazilas=[], free_threshold=500, charge=90)
    assert calc([z], {}, "Cox", "", 600, 0) == 0.0           # free at/above threshold
    assert calc([z], {}, "Cox", "", 100, 0) == 90.0          # zone charge below threshold
    assert calc([z], {}, "Dhaka", "", 100, 0) == 120.0       # no zone match → legacy


def test_zone_upazila_scoping():
    z = NS(districts=["Sylhet"], upazilas=["Beanibazar"], free_threshold=None, charge=40)
    assert calc([z], {}, "Sylhet", "Beanibazar", 100, 0) == 40.0   # upazila matches
    assert calc([z], {}, "Sylhet", "Golapganj", 100, 0) == 60.0    # other upazila → legacy sylhet
