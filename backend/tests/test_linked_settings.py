"""Linked settings: switching a trigger off also switches its dependents off."""
from app.core.linked_settings import mandatory_followers


def test_chat_off_turns_whatsapp_off():
    assert mandatory_followers({"feature_assistant_chat": "false"}) == {"feature_assistant_whatsapp": "false"}


def test_turning_on_or_unrelated_changes_nothing():
    assert mandatory_followers({"feature_assistant_chat": "true"}) == {}
    assert mandatory_followers({"site_name": "x"}) == {}


def test_explicit_value_for_dependent_is_respected():
    assert mandatory_followers({"apon_enabled": "false", "apon_downloads_enabled": "false"}) == {}
    assert mandatory_followers({"feature_coupons": "0"}) == {"assistant_feature_coupons": "false"}
