"""Offline tests for the Operations module event buffers and route wiring."""
from __future__ import annotations

import logging
import os

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://x:x@localhost/x")

from app.core import ops_events


def test_error_capture_handler():
    ops_events.install_error_capture()
    ops_events.install_error_capture()  # idempotent — no duplicate handlers
    root = logging.getLogger()
    handlers = [h for h in root.handlers if isinstance(h, ops_events.RecentErrorsHandler)]
    assert len(handlers) == 1

    before = len(ops_events.recent_errors)
    logging.getLogger("test.ops").error("boom-%s", "x")
    assert len(ops_events.recent_errors) == before + 1
    assert ops_events.recent_errors[0]["message"].startswith("boom-x")
    # INFO must not be captured
    logging.getLogger("test.ops").info("quiet")
    assert len(ops_events.recent_errors) == before + 1


def test_failed_email_and_login_are_masked():
    ops_events.record_failed_email("customer@example.com", "Order confirmation", "smtp down")
    e = ops_events.failed_emails[0]
    assert "customer@example.com" not in e["to"]
    assert e["to"].endswith("example.com")

    ops_events.record_failed_login("1.2.3.4", "admin@example.com")
    l = ops_events.failed_logins[0]
    assert l["ip"] == "1.2.3.4"
    assert "admin@example.com" not in l["email"]


def test_ops_routes_registered():
    from app.api.v1.router import api_router

    paths = {r.path for r in api_router.routes}
    for suffix in ("health", "errors", "security", "notifications", "backup/export", "backup/restore-settings"):
        assert f"/api/v1/admin/ops/{suffix}" in paths
