from app.api.v1.routes.settings import (
    _is_admin_editable_setting_key,
    _is_cms_managed_setting_key,
)


def test_cms_managed_settings_bypass_legacy_non_editable_flag():
    assert _is_cms_managed_setting_key("logo_url") is True
    assert _is_cms_managed_setting_key("hero_image_url") is True
    assert _is_cms_managed_setting_key("banner_home_title") is True


def test_non_cms_settings_are_not_treated_as_runtime_cms_bindings():
    assert _is_cms_managed_setting_key("smtp_host") is False
    assert _is_cms_managed_setting_key("random_system_setting") is False


def test_only_explicit_admin_integration_credentials_are_exempted():
    assert _is_admin_editable_setting_key("steadfast_api_key") is True
    assert _is_admin_editable_setting_key("steadfast_secret_key") is True
    assert _is_admin_editable_setting_key("stripe_secret_key") is False
