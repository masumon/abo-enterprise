"""Lightweight phone OTP for checkout — in-memory, free-tier friendly (no SMS API required)."""
import logging
import random
import time
from pydantic import BaseModel, field_validator
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.rate_limit import RateLimiter, rate_limit
from app.core.security import create_customer_token
from app.core.sms import send_sms
from app.schemas.schemas import ApiResponse, bd_phone

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/customer", tags=["customer"])

# phone -> { code, expires_at }
_otp_store: dict[str, dict] = {}
OTP_TTL_SECONDS = 300


class SendOtpRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return bd_phone(v)


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
    code = f"{random.randint(1000, 9999)}"
    _otp_store[payload.phone] = {"code": code, "expires_at": time.time() + OTP_TTL_SECONDS}
    sms_sent = await send_sms(payload.phone, f"ABO Enterprise OTP: {code}. Valid 5 min.")
    if not sms_sent:
        logger.info("OTP for %s: %s (dev/log only — set SMS_API_URL for production)", payload.phone[-4:], code)
    return ApiResponse(
        success=True,
        message="OTP sent",
        data={"sent": True, "expires_in": OTP_TTL_SECONDS, "via_sms": sms_sent},
    )


@router.post(
    "/verify-otp",
    response_model=ApiResponse,
    dependencies=[Depends(rate_limit("otp_verify", 10, 300))],
)
async def verify_otp(payload: VerifyOtpRequest):
    _clean_expired()
    entry = _otp_store.get(payload.phone)
    if not entry or entry["code"] != payload.code.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")
    _otp_store.pop(payload.phone, None)
    # Token proves phone ownership — required for order-history reads
    return ApiResponse(
        success=True,
        message="Verified",
        data={"verified": True, "access_token": create_customer_token(payload.phone)},
    )
