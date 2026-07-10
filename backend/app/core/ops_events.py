"""In-process operational event buffers for the admin Operations panel.

Free-tier design: no new tables, no external services. Ring buffers hold
the most recent events (lost on restart — Sentry covers persistence when
SENTRY_DSN is set). Single-worker deployment (see rate_limit.py), so one
process sees all traffic.
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


def record_failed_email(to: str, subject: str, error: str) -> None:
    failed_emails.appendleft({
        "at": time.time(),
        # mask the recipient — ops readers don't need full addresses
        "to": (to[:3] + "…" + to.split("@")[-1]) if "@" in to else to[:6],
        "subject": subject[:120],
        "error": error[:300],
    })


def record_failed_login(ip: str, email: str) -> None:
    failed_logins.appendleft({
        "at": time.time(),
        "ip": ip,
        "email": (email[:3] + "…@" + email.split("@")[-1]) if "@" in email else email[:6],
    })


class RecentErrorsHandler(logging.Handler):
    """Captures ERROR+ records app-wide into the ring buffer."""

    def emit(self, record: logging.LogRecord) -> None:  # noqa: D102
        try:
            recent_errors.appendleft({
                "at": record.created,
                "logger": record.name,
                "level": record.levelname,
                "message": self.format(record)[:500],
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
