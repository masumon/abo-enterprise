"""Customer OTP — code delivered by EMAIL (Resend), phone kept as the account
identity so existing order history keeps working. In-memory, free-tier friendly.

SMS delivery was removed: Render's free tier blocks SMS gateways / none was
configured, so codes never arrived. The OTP is now emailed via the configured
email provider; the phone still identifies the customer for order-history reads.
"""
import logging
import secrets
import time
from pydantic import BaseModel, EmailStr, field_validator
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.rate_limit import RateLimiter, rate_limit
from app.core.security import create_customer_token
from app.schemas.schemas import ApiResponse, bd_phone

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/customer", tags=["customer"])

# phone -> { code, expires_at }
_otp_store: dict[str, dict] = {}
OTP_TTL_SECONDS = 300


class SendOtpRequest(BaseModel):
    phone: str
    email: EmailStr  # OTP is delivered here

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return bd_phone(v)


def _otp_email_html(code: str) -> str:
    return (
        '<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:auto;'
        'padding:28px;border:1px solid #e2e8f0;border-radius:12px">'
        '<h2 style="color:#1e5ba8;margin:0 0 6px">ABO Enterprise</h2>'
        '<p style="color:#334155;font-size:15px;margin:0 0 4px">Your verification code is:</p>'
        f'<p style="font-size:34px;font-weight:bold;letter-spacing:8px;color:#0f172a;margin:14px 0">{code}</p>'
        '<p style="color:#64748b;font-size:13px;margin:0">This code is valid for 5 minutes. '
        "If you didn't request it, you can safely ignore this email.</p>"
        "</div>"
    )


class VerifyOtpRequest(BaseModel):
    phone: str
    code: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return bd_phone(v)


def _clean_expired() -> None:
    now = time.time()
    expired = [p for p, d in _otp_store.items() if d["expires_at"] < now]
    for p in expired:
        _otp_store.pop(p, None)


# Per-phone limit on top of the per-IP one — protects SMS spend even when
# an attacker rotates IPs against a single victim number.
_phone_send_limiter = RateLimiter(max_requests=3, window_seconds=600)

# Per-phone verify-attempt limit — the per-IP limiter alone can be bypassed by
# rotating IPs, letting a 4-digit code be brute-forced within its 5-min TTL.
_phone_verify_limiter = RateLimiter(max_requests=5, window_seconds=300)


@router.post(
    "/send-otp",
    response_model=ApiResponse,
    dependencies=[Depends(rate_limit("otp_send", 6, 600))],
)
async def send_otp(payload: SendOtpRequest):
    _clean_expired()
    if not _phone_send_limiter.is_allowed(payload.phone):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many OTP requests for this number. Try again in 10 minutes.",
        )
    code = f"{secrets.randbelow(9000) + 1000}"
    _otp_store[payload.phone] = {"code": code, "expires_at": time.time() + OTP_TTL_SECONDS}

    # Deliver the code by email via the configured provider. Sent synchronously
    # so the response reflects real delivery status (unlike fire-and-forget).
    email_sent = False
    try:
        from app.core.email_factory import get_email_provider
        provider = await get_email_provider()
        await provider.send(str(payload.email), "ABO Enterprise verification code", _otp_email_html(code))
        email_sent = True
    except Exception as exc:  # noqa: BLE001 — never leak internals to the client
        logger.error("OTP email to %s failed: %s", payload.email, exc)

    if not email_sent:
        logger.info("OTP for %s: %s (email not delivered — check email provider config)", payload.phone[-4:], code)
    return ApiResponse(
        success=True,
        message="OTP sent",
        data={"sent": email_sent, "expires_in": OTP_TTL_SECONDS, "via_email": email_sent},
    )


@router.post(
    "/verify-otp",
    response_model=ApiResponse,
    dependencies=[Depends(rate_limit("otp_verify", 10, 300))],
)
async def verify_otp(payload: VerifyOtpRequest):
    _clean_expired()
    if not _phone_verify_limiter.is_allowed(payload.phone):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts for this number. Request a new OTP.",
        )
    entry = _otp_store.get(payload.phone)
    if not entry or not secrets.compare_digest(entry["code"], payload.code.strip()):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")
    _otp_store.pop(payload.phone, None)
    # Token proves phone ownership — required for order-history reads
    return ApiResponse(
        success=True,
        message="Verified",
        data={"verified": True, "access_token": create_customer_token(payload.phone)},
    )
