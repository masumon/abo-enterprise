"""Offline tests for the Operations module event buffers and persistent telemetry."""
from __future__ import annotations

import logging
import os

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://x:x@localhost/x")

from app.core import ops_events


def test_error_capture_handler():
    ops_events.install_error_capture()
    ops_events.install_error_capture()
    root = logging.getLogger()
    handlers = [h for h in root.handlers if isinstance(h, ops_events.RecentErrorsHandler)]
    assert len(handlers) == 1

    before = len(ops_events.recent_errors)
    logging.getLogger("test.ops").error("boom-%s", "x")
    assert len(ops_events.recent_errors) == before + 1
    assert ops_events.recent_errors[0]["message"].startswith("boom-x")
    assert ops_events.recent_errors[0]["count"] == 1
    logging.getLogger("test.ops").info("quiet")
    assert len(ops_events.recent_errors) == before + 1


def test_identical_errors_are_deduplicated_with_count():
    ops_events.install_error_capture()
    ops_events.recent_errors.clear()
    log = logging.getLogger("test.ops.dedup")
    for _ in range(5):
        log.error("repeated failure")
    matching = [e for e in ops_events.recent_errors if e["message"] == "repeated failure"]
    assert len(matching) == 1
    assert matching[0]["count"] == 5


def test_exception_message_is_summarized_not_full_traceback():
    ops_events.install_error_capture()
    ops_events.recent_errors.clear()
    try:
        raise ConnectionRefusedError("[Errno 111] Connection refused")
    except ConnectionRefusedError:
        logging.getLogger("test.ops.exc").error("db call failed", exc_info=True)
    msg = ops_events.recent_errors[0]["message"]
    assert "ConnectionRefusedError" in msg
    assert "Traceback" not in msg
    assert len(msg) <= 300


def test_operational_buffers_are_bounded():
    """Ephemeral diagnostics must remain bounded and never grow without limit."""
    ops_events.recent_errors.clear()
    ops_events.failed_emails.clear()
    ops_events.failed_logins.clear()

    for i in range(ops_events.recent_errors.maxlen + 50):
        ops_events.recent_errors.append({"message": f"error-{i}"})
    for i in range(ops_events.failed_emails.maxlen + 50):
        ops_events.failed_emails.append({"at": i})
    for i in range(ops_events.failed_logins.maxlen + 50):
        ops_events.failed_logins.append({"at": i})

    assert len(ops_events.recent_errors) == ops_events.recent_errors.maxlen
    assert len(ops_events.failed_emails) == ops_events.failed_emails.maxlen
    assert len(ops_events.failed_logins) == ops_events.failed_logins.maxlen


def test_failed_email_and_login_are_masked():
    # These are shared, module-level deques (not reset between tests by
    # pytest itself) — clear first so [0] is provably this test's own
    # entry, not a leftover from test_operational_buffers_are_bounded
    # (which intentionally fills them past maxlen to test the bound).
    ops_events.failed_emails.clear()
    ops_events.failed_logins.clear()

    ops_events.record_failed_email("customer@example.com", "Order confirmation", "smtp down")
    e = ops_events.failed_emails[0]
    assert "customer@example.com" not in e["to"]
    assert e["to"].endswith("example.com")

    ops_events.record_failed_login("1.2.3.4", "admin@example.com")
    l = ops_events.failed_logins[0]
    assert l["ip"] == "1.2.3.4"
    assert "admin@example.com" not in l["email"]


def test_operational_events_emit_persistent_telemetry_when_available(monkeypatch):
    """Important operational events must have a restart-safe telemetry path."""
    captured: list[tuple[str, str]] = []

    monkeypatch.setattr("app.core.monitoring.sentry_enabled", lambda: True)

    import sentry_sdk

    monkeypatch.setattr(
        sentry_sdk,
        "capture_message",
        lambda message, level="error": captured.append((message, level)),
    )

    ops_events.record_failed_email("customer@example.com", "Order email", "provider timeout")
    ops_events.record_failed_login("1.2.3.4", "admin@example.com")

    assert any(level == "error" and "Order email" in message for message, level in captured)
    assert any(level == "warning" and message == "Admin login failed" for message, level in captured)
    assert all("customer@example.com" not in message for message, _ in captured)
    assert all("admin@example.com" not in message for message, _ in captured)


def test_persistent_telemetry_failure_never_breaks_event_recording(monkeypatch):
    monkeypatch.setattr("app.core.monitoring.sentry_enabled", lambda: True)

    import sentry_sdk

    def fail_capture(*_args, **_kwargs):
        raise RuntimeError("telemetry unavailable")

    monkeypatch.setattr(sentry_sdk, "capture_message", fail_capture)
    ops_events.failed_emails.clear()
    ops_events.record_failed_email("customer@example.com", "Order email", "provider timeout")

    assert len(ops_events.failed_emails) == 1
    assert ops_events.failed_emails[0]["subject"] == "Order email"


def test_ops_routes_registered():
    from app.api.v1.router import api_router

    paths = {r.path for r in api_router.routes}
    for suffix in ("health", "errors", "security", "notifications", "backup/export", "backup/restore-settings"):
        assert f"/api/v1/admin/ops/{suffix}" in paths
