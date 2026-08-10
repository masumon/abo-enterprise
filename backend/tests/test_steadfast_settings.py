"""Regression tests for admin-managed Steadfast credential settings."""

from app.api.v1.routes.settings import _is_admin_editable_setting_key


def test_steadfast_credentials_are_admin_editable():
    assert _is_admin_editable_setting_key("steadfast_api_key")
    assert _is_admin_editable_setting_key("steadfast_secret_key")


def test_unrelated_protected_settings_remain_protected():
    assert not _is_admin_editable_setting_key("some_internal_setting")
    assert not _is_admin_editable_setting_key("smtp_password")
