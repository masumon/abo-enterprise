"""Optional Sentry integration — activates only when SENTRY_DSN is set.

Free-tier friendly: no cost unless the env var is present, and sample rate
is capped so the free Sentry quota lasts.
"""
from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)


def init_sentry() -> bool:
    """Configure Sentry if a DSN is provided. Returns True when active."""
    dsn = os.environ.get("SENTRY_DSN", "").strip()
    if not dsn:
        return False
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
    except ImportError:
        logger.warning("SENTRY_DSN is set but sentry-sdk is not installed — skipping.")
        return False

    sample = float(os.environ.get("SENTRY_TRACES_SAMPLE_RATE", "0.05") or 0.05)
    environment = os.environ.get("APP_ENV", "development")
    sentry_sdk.init(
        dsn=dsn,
        integrations=[FastApiIntegration(), StarletteIntegration()],
        traces_sample_rate=max(0.0, min(sample, 0.2)),  # cap at 20% for free tier
        environment=environment,
        send_default_pii=False,
    )
    logger.info("Sentry initialised (env=%s)", environment)
    return True
