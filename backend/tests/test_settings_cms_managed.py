import pytest

from app.api.v1.routes.settings import _is_cms_managed_setting_key


@pytest.mark.parametrize(
    "key",
    [
        "facebook_url",
        "instagram_url",
        "twitter_url",
        "linkedin_url",
        "youtube_url",
        "tiktok_url",
    ],
)
def test_social_links_are_cms_managed(key: str) -> None:
    assert _is_cms_managed_setting_key(key) is True
