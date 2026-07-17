"""Public assistant session signing helpers.

Assistant chat sessions are public, so a raw session_id alone must never be
enough to read or resume someone else's conversation. We sign the session id
with the app secret and require that token whenever the client wants to reuse
an existing session.
"""

from __future__ import annotations

import hashlib
import hmac

from app.core.config import settings


def _session_secret() -> bytes:
    return settings.SECRET_KEY.encode("utf-8")


def build_assistant_session_token(session_id: str) -> str:
    return hmac.new(_session_secret(), session_id.encode("utf-8"), hashlib.sha256).hexdigest()


def verify_assistant_session_token(session_id: str, token: str | None) -> bool:
    if not token:
        return False
    expected = build_assistant_session_token(session_id)
    return hmac.compare_digest(expected, token)