"""Operational diagnostics with bounded local buffers and persistent telemetry.

The in-process buffers provide fast recent-event visibility for the Admin
Operations panel. Important operational events are also sent to Sentry when
persistent telemetry is configured, so process restarts do not make the
in-memory buffers the only source of operational history.
"""
from __future__ import annotations

import logging
import time
from collections import deque
from typing import Any

_MAX = 200

recent_errors: deque[dict[str, Any]] = deque(maxlen=_MAX)
failed_emails: deque[dict[str, Any]] = deque(maxlen=100)
failed_logins: deque[dict[str, Any]] = deque(maxlen=100)

_STARTED_AT = time.time()


def started_at() -> float:
    return _STARTED_AT


def _capture_persistent_event(
    message: str,
    *,
    level: str = "error",
    event_type: str,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Best-effort persistent telemetry; never break the business operation."""
    try:
        from app.core.monitoring import sentry_enabled

        if not sentry_enabled():
            return
        import sentry_sdk

        with sentry_sdk.push_scope() as scope:
            scope.set_tag("ops_event", event_type)
            if metadata:
                for key, value in metadata.items():
                    scope.set_extra(key, value)
            sentry_sdk.capture_message(message[:300], level=level)
    except Exception:  # noqa: BLE001 — telemetry must never break business code
        pass


def record_failed_email(to: str, subject: str, error: str) -> None:
    masked_to = (to[:3] + "…" + to.split("@")[-1]) if "@" in to else to[:6]
    safe_subject = subject[:120]
    safe_error = error[:300]
    failed_emails.append({
        "at": time.time(),
        "to": masked_to,
        "subject": safe_subject,
        "error": safe_error,
    })
    _capture_persistent_event(
        f"Email delivery failed: {safe_subject}",
        event_type="failed_email",
        metadata={"recipient": masked_to, "error": safe_error},
    )


def record_failed_login(ip: str, email: str) -> None:
    masked_email = (email[:3] + "…@" + email.split("@")[-1]) if "@" in email else email[:6]
    failed_logins.append({
        "at": time.time(),
        "ip": ip,
        "email": masked_email,
    })
    _capture_persistent_event(
        "Admin login failed",
        level="warning",
        event_type="failed_login",
        metadata={"email": masked_email},
    )


def _clean_message(record: logging.LogRecord) -> str:
    """Human-scannable one-liner without a full multi-line traceback."""
    msg = record.getMessage()
    if record.exc_info and record.exc_info[1] is not None:
        exc = record.exc_info[1]
        exc_str = str(exc).splitlines()[0] if str(exc) else ""
        summary = f"{type(exc).__name__}: {exc_str}".strip().rstrip(":")
        if summary and summary not in msg:
            msg = f"{msg} — {summary}" if msg else summary
    return msg[:300]


class RecentErrorsHandler(logging.Handler):
    """Capture ERROR+ records locally while persistent telemetry handles history."""

    def emit(self, record: logging.LogRecord) -> None:  # noqa: D102
        try:
            message = _clean_message(record)
            for entry in recent_errors:
                if entry["logger"] == record.name and entry["message"] == message:
                    entry["count"] += 1
                    entry["at"] = record.created
                    return
            recent_errors.appendleft({
                "at": record.created,
                "logger": record.name,
                "level": record.levelname,
                "message": message,
                "count": 1,
            })
        except Exception:  # noqa: BLE001 — a logging handler must never raise
            pass


def install_error_capture() -> None:
    root = logging.getLogger()
    if any(isinstance(h, RecentErrorsHandler) for h in root.handlers):
        return
    handler = RecentErrorsHandler(level=logging.ERROR)
    handler.setFormatter(logging.Formatter("%(message)s"))
    root.addHandler(handler)
