"""Helpers for the public "Apon" APK download: math captcha, one-time download tickets,
source-URL allow-list and privacy-friendly IP hashing.

All state is signed with SECRET_KEY (stateless) plus a tiny in-process "already used" set —
the API runs a single worker, so that is enough and needs no extra service (free-tier friendly).
"""
from __future__ import annotations

import hashlib
import hmac
import secrets
import time
from urllib.parse import urlparse

from app.core.config import settings

CAPTCHA_TTL_SECONDS = 300
TICKET_TTL_SECONDS = 900
TICKET_MAX_REQUESTS = 6  # a ticket may serve a few Range requests so an interrupted download can resume

# Where the APK may be fetched from (set by an admin, so it must never point at internal hosts).
ALLOWED_SOURCE_HOST_SUFFIXES = ("github.com", "githubusercontent.com", "supabase.co")

_BN_DIGITS = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")

_used_captchas: dict[str, int] = {}
_ticket_requests: dict[str, tuple[int, int]] = {}  # nonce -> (expires_at, requests_served)


# ------------------------------------------------------------------------ signing
def _sign(message: str) -> str:
    return hmac.new(settings.SECRET_KEY.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()[:32]


def _prune(now: int) -> None:
    for store in (_used_captchas,):
        for k in [k for k, exp in store.items() if exp < now]:
            store.pop(k, None)
    for k in [k for k, (exp, _) in _ticket_requests.items() if exp < now]:
        _ticket_requests.pop(k, None)


def normalize_digits(value: str) -> str:
    """Accept Bengali digits (৭) as well as 7, ignore spaces."""
    return (value or "").translate(_BN_DIGITS).strip().replace(" ", "")


# ------------------------------------------------------------------------ captcha
def make_captcha(level: str = "easy", now: int | None = None) -> dict:
    """A small add/subtract question. The answer is never sent to the browser."""
    now = int(now if now is not None else time.time())
    if level == "medium":
        a, b = secrets.randbelow(31) + 10, secrets.randbelow(8) + 2
    else:
        a, b = secrets.randbelow(8) + 2, secrets.randbelow(8) + 2
    op = secrets.choice(["+", "-"])
    if op == "-" and b > a:
        a, b = b, a
    answer = a + b if op == "+" else a - b
    nonce = secrets.token_urlsafe(9)
    exp = now + CAPTCHA_TTL_SECONDS
    token = f"{nonce}.{exp}.{_sign(f'cap|{nonce}|{exp}|{answer}')}"
    return {"token": token, "a": a, "op": op, "b": b, "expires_in": CAPTCHA_TTL_SECONDS}


def verify_captcha(token: str, answer: str, now: int | None = None) -> bool:
    """True once for a correct, unexpired answer; a token can never be reused."""
    now = int(now if now is not None else time.time())
    try:
        nonce, exp_s, sig = (token or "").split(".")
        exp = int(exp_s)
        value = int(normalize_digits(answer))
    except (ValueError, AttributeError):
        return False
    _prune(now)
    if exp < now or nonce in _used_captchas:
        return False
    if not hmac.compare_digest(sig, _sign(f"cap|{nonce}|{exp}|{value}")):
        return False
    _used_captchas[nonce] = exp
    return True


# ------------------------------------------------------------------------ tickets
def make_ticket(release_id: str, now: int | None = None) -> str:
    now = int(now if now is not None else time.time())
    nonce = secrets.token_urlsafe(9)
    exp = now + TICKET_TTL_SECONDS
    return f"{nonce}.{exp}.{release_id}.{_sign(f'tk|{nonce}|{exp}|{release_id}')}"


def verify_ticket(ticket: str, now: int | None = None) -> str | None:
    """Release id when the ticket is valid and still has requests left, else None."""
    now = int(now if now is not None else time.time())
    try:
        nonce, exp_s, release_id, sig = (ticket or "").split(".")
        exp = int(exp_s)
    except (ValueError, AttributeError):
        return None
    _prune(now)
    if exp < now or not hmac.compare_digest(sig, _sign(f"tk|{nonce}|{exp}|{release_id}")):
        return None
    _, served = _ticket_requests.get(nonce, (exp, 0))
    if served >= TICKET_MAX_REQUESTS:
        return None
    _ticket_requests[nonce] = (exp, served + 1)
    return release_id


# ------------------------------------------------------------------------- source
def is_allowed_source_url(url: str) -> bool:
    """https only, no credentials, and an allow-listed host (blocks internal/SSRF targets)."""
    try:
        parsed = urlparse((url or "").strip())
    except ValueError:
        return False
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        return False
    if parsed.port not in (None, 443):
        return False
    host = parsed.hostname.lower()
    return any(host == s or host.endswith("." + s) for s in ALLOWED_SOURCE_HOST_SUFFIXES)


def hash_ip(ip: str) -> str:
    return hashlib.sha256(f"{settings.SECRET_KEY}|{ip}".encode("utf-8")).hexdigest()


def safe_filename(name: str, fallback: str = "Apon.apk") -> str:
    cleaned = "".join(ch for ch in (name or "") if ch.isalnum() or ch in "._-").lstrip("._-")[:80]
    if not cleaned:
        return fallback
    return cleaned if cleaned.lower().endswith(".apk") else cleaned + ".apk"
