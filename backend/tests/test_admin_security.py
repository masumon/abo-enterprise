"""Admin sign-in hardening: recovery codes, TOTP replay guard, lockout rules, 2FA policy
and the 'set up 2FA first' session restriction."""
import json
from datetime import datetime, timedelta, timezone

import pyotp
import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.core import admin_security as sec
from app.core.security import create_access_token, decode_token, require_admin


# ---------------------------------------------------------------- recovery codes
def test_recovery_codes_are_unique_readable_and_stored_hashed():
    codes = sec.generate_recovery_codes()
    assert len(codes) == sec.RECOVERY_CODE_COUNT == len(set(codes))
    assert all(len(c) == 11 and c[5] == "-" for c in codes)
    assert not any(ch in "01OIL" for c in codes for ch in c.replace("-", ""))
    stored = sec.hash_recovery_codes(codes)
    assert codes[0].replace("-", "") not in stored  # plain code never stored
    assert sec.recovery_codes_remaining(stored) == sec.RECOVERY_CODE_COUNT


def test_a_recovery_code_works_once_and_tolerates_formatting():
    codes = sec.generate_recovery_codes(3)
    stored = sec.hash_recovery_codes(codes)
    ok, stored = sec.consume_recovery_code(stored, codes[1].lower().replace("-", " "))
    assert ok and sec.recovery_codes_remaining(stored) == 2
    ok_again, stored_again = sec.consume_recovery_code(stored, codes[1])
    assert not ok_again and stored_again == stored
    assert not sec.consume_recovery_code(stored, "ZZZZZ-ZZZZZ")[0]
    assert not sec.consume_recovery_code(None, codes[0])[0]


def test_code_shape_detection_separates_app_codes_from_recovery_codes():
    assert sec.looks_like_recovery_code("K7Q2M-9XH4T")
    assert not sec.looks_like_recovery_code("123456")
    assert not sec.looks_like_recovery_code("12345")


# ----------------------------------------------------------------- TOTP replay
def test_totp_code_is_accepted_once_and_never_replayed():
    secret = pyotp.random_base32()
    now = 1_800_000_000
    code = pyotp.TOTP(secret).at(now)
    step = sec.verify_totp_once(secret, code, None, now=now)
    assert step == now // 30
    assert sec.verify_totp_once(secret, code, step, now=now) is None  # same code again
    assert sec.verify_totp_once(secret, code, step, now=now + 5) is None


def test_totp_rejects_wrong_and_malformed_codes_but_allows_clock_drift():
    secret = pyotp.random_base32()
    now = 1_800_000_000
    assert sec.verify_totp_once(secret, "000000", None, now=now) is None
    assert sec.verify_totp_once(secret, "abc123", None, now=now) is None
    previous = pyotp.TOTP(secret).at(now - 30)  # phone clock 30 s behind
    assert sec.verify_totp_once(secret, previous, None, now=now) == now // 30 - 1


# --------------------------------------------------------------------- lockout
def test_account_locks_after_repeated_failures_then_resets_count():
    now = datetime(2026, 10, 8, tzinfo=timezone.utc)
    count, locked = 0, None
    for _ in range(sec.LOCK_AFTER_FAILURES - 1):
        count, locked = sec.next_failure_state(count, now)
        assert locked is None
    count, locked = sec.next_failure_state(count, now)
    assert locked == now + timedelta(minutes=sec.LOCK_MINUTES) and count == 0
    assert sec.is_locked(locked, now) and not sec.is_locked(locked, now + timedelta(minutes=sec.LOCK_MINUTES, seconds=1))
    assert not sec.is_locked(None, now)


# ------------------------------------------------------------ 2FA set-up window
def test_only_2fa_setup_paths_are_open_before_2fa_is_enabled():
    assert sec.path_allowed_before_2fa("/api/v1/auth/2fa/setup")
    assert sec.path_allowed_before_2fa("/api/v1/auth/2fa/enable")
    assert sec.path_allowed_before_2fa("/api/v1/auth/me")
    assert not sec.path_allowed_before_2fa("/api/v1/admin/users")
    assert not sec.path_allowed_before_2fa("/api/v1/orders")
    assert not sec.path_allowed_before_2fa("/api/v1/auth/security-policy")


def test_tokens_carry_version_and_setup_flag():
    token = create_access_token("abc", extra={"tv": 3, "mfa_setup": True})
    payload = decode_token(token)
    assert payload["tv"] == 3 and payload["mfa_setup"] is True and payload["type"] == "access"
    plain = decode_token(create_access_token("abc"))
    assert "tv" not in plain and "mfa_setup" not in plain


def test_policy_cache_is_updated_immediately_on_save():
    sec.set_policy_cache(True)
    assert sec._policy["required"] is True
    sec.set_policy_cache(False)
    assert sec._policy["required"] is False


# --------------------------------------------- require_admin session enforcement
class _FakeUser:
    def __init__(self, **kw):
        self.id = kw.get("id", "11111111-1111-1111-1111-111111111111")
        self.role = kw.get("role", "admin")
        self.is_active = True
        self.totp_enabled = kw.get("totp_enabled", False)
        self.token_version = kw.get("token_version", 0)


class _Result:
    def __init__(self, user):
        self._user = user

    def scalar_one_or_none(self):
        return self._user


class _FakeDb:
    def __init__(self, user):
        self._user = user

    async def execute(self, *_a, **_k):
        return _Result(self._user)


def _request(path="/api/v1/admin/users", method="GET") -> Request:
    return Request({
        "type": "http", "method": method, "path": path, "headers": [],
        "query_string": b"", "scheme": "https", "server": ("example.com", 443), "client": ("127.0.0.1", 1),
    })


class _Cred:
    def __init__(self, token):
        self.credentials = token


async def _call(user, token, path="/api/v1/admin/users"):
    return await require_admin(_request(path), _Cred(token), _FakeDb(user))


@pytest.mark.asyncio
async def test_old_token_without_version_still_works_for_unchanged_account():
    user = _FakeUser()
    sec.set_policy_cache(False)
    assert await _call(user, create_access_token(user.id)) == user.id


@pytest.mark.asyncio
async def test_logout_everywhere_invalidates_old_tokens():
    user = _FakeUser(token_version=1)
    sec.set_policy_cache(False)
    stale = create_access_token(user.id, extra={"tv": 0})
    with pytest.raises(HTTPException) as exc:
        await _call(user, stale)
    assert exc.value.status_code == 401
    fresh = create_access_token(user.id, extra={"tv": 1})
    assert await _call(user, fresh) == user.id


@pytest.mark.asyncio
async def test_required_2fa_blocks_admin_data_but_not_setup(monkeypatch):
    user = _FakeUser(totp_enabled=False)
    sec.set_policy_cache(True)
    token = create_access_token(user.id, extra={"tv": 0})
    with pytest.raises(HTTPException) as exc:
        await _call(user, token, "/api/v1/admin/users")
    assert exc.value.status_code == 403 and exc.value.detail == "2fa_setup_required"
    assert await _call(user, token, "/api/v1/auth/2fa/setup") == user.id
    sec.set_policy_cache(False)


@pytest.mark.asyncio
async def test_setup_only_token_cannot_reach_data_even_when_policy_is_off():
    user = _FakeUser(totp_enabled=False)
    sec.set_policy_cache(False)
    token = create_access_token(user.id, extra={"tv": 0, "mfa_setup": True})
    with pytest.raises(HTTPException) as exc:
        await _call(user, token, "/api/v1/orders")
    assert exc.value.detail == "2fa_setup_required"


@pytest.mark.asyncio
async def test_account_with_2fa_is_never_restricted():
    user = _FakeUser(totp_enabled=True)
    sec.set_policy_cache(True)
    token = create_access_token(user.id, extra={"tv": 0})
    assert await _call(user, token, "/api/v1/admin/users") == user.id
    sec.set_policy_cache(False)
