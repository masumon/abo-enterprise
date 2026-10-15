"""Settings that depend on another setting (Admin → any page that saves settings).

MANDATORY: when the trigger is switched OFF, the dependent is switched OFF too, on the
server, so it holds no matter which admin page made the change. The frontend mirror
(frontend/src/lib/linkedSettings.ts) shows the Bangla notice / optional prompts.
"""
from __future__ import annotations

# trigger key → dependent keys that must go off with it
MANDATORY_OFF: dict[str, list[str]] = {
    "feature_assistant_chat": ["feature_assistant_whatsapp"],  # no chat widget → no widget WhatsApp button
    "apon_enabled": ["apon_downloads_enabled"],  # app switched off → downloads off
    "feature_coupons": ["assistant_feature_coupons"],  # coupons off → the assistant offers none either
}

_OFF = {"false", "0", "off", "no", ""}


def is_off(value: object) -> bool:
    return str(value).strip().lower() in _OFF


def mandatory_followers(changes: dict[str, str]) -> dict[str, str]:
    """Extra key → "false" pairs implied by the switches turned off in ``changes``."""
    extra: dict[str, str] = {}
    for key, value in changes.items():
        if key in MANDATORY_OFF and is_off(value):
            for dep in MANDATORY_OFF[key]:
                if dep not in changes:
                    extra[dep] = "false"
    return extra
