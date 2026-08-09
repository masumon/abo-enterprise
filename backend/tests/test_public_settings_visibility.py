from app.api.v1.routes.settings import _is_cms_managed_setting_key, _is_public_setting_key


def test_public_cms_image_settings_are_exposed():
    keys = {
        "banner_about_image_url",
        "banner_products_image_url",
        "banner_blog_image_url",
        "logo_url",
        "favicon_url",
        "app_icon_url",
        "default_og_image_url",
        "hero_image_url",
        "about_story_image_url",
    }
    assert all(_is_public_setting_key(key) for key in keys)


def test_public_footer_social_and_app_links_are_exposed():
    keys = {
        "footer_about_bn",
        "footer_payment_image_url",
        "twitter_url",
        "tiktok_url",
        "play_store_url",
        "app_store_url",
        "contact_address",
        "contact_email",
        "seo_title",
    }
    assert all(_is_public_setting_key(key) for key in keys)


def test_cms_image_settings_can_bypass_legacy_non_editable_flag():
    assert _is_cms_managed_setting_key("banner_products_image_url")
    assert _is_cms_managed_setting_key("logo_url")
    assert _is_cms_managed_setting_key("hero_image_url")
    assert not _is_cms_managed_setting_key("smtp_password")
    assert not _is_cms_managed_setting_key("arbitrary_setting")


def test_sensitive_settings_remain_private():
    keys = {
        "smtp_password",
        "cloudinary_api_key",
        "cloudinary_api_secret",
        "resend_api_key",
        "secret_key",
    }
    assert not any(_is_public_setting_key(key) for key in keys)
