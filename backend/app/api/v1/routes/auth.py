from collections import defaultdict, deque
from datetime import datetime, timezone
from time import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import ADMIN_SESSION_COOKIE, create_access_token, require_admin, verify_password
from app.models.models import AdminUser
from app.schemas.schemas import ApiResponse, LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory brute-force tracker — suitable for single-worker free-tier deployment.
# Keyed by client IP; stores timestamps of recent failed attempts.
_MAX_FAILURES = 5
_LOCKOUT_SECONDS = 300  # 5 minutes

_login_failures: dict[str, deque] = defaultdict(lambda: deque(maxlen=_MAX_FAILURES))


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _is_locked(ip: str) -> bool:
    now = time()
    recent = [t for t in _login_failures[ip] if now - t < _LOCKOUT_SECONDS]
    _login_failures[ip] = deque(recent, maxlen=_MAX_FAILURES)
    return len(recent) >= _MAX_FAILURES


def _record_failure(ip: str) -> None:
    _login_failures[ip].append(time())


def _clear_failures(ip: str) -> None:
    _login_failures.pop(ip, None)


def _is_https(request: Request) -> bool:
    return request.headers.get("x-forwarded-proto", request.url.scheme) == "https"


@router.post("/login", response_model=ApiResponse)
async def login(
    request: Request,
    response: Response,
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    ip = _client_ip(request)

    if _is_locked(ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed attempts. Try again in {_LOCKOUT_SECONDS // 60} minutes.",
        )

    result = await db.execute(
        select(AdminUser).where(AdminUser.email == payload.email, AdminUser.is_active == True)  # noqa: E712
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        _record_failure(ip)
        if _is_locked(ip):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed attempts. Try again in {_LOCKOUT_SECONDS // 60} minutes.",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Optional TOTP second factor — only for accounts that enabled it.
    if user.totp_enabled and user.totp_secret:
        import pyotp

        if not payload.totp_code:
            # Password verified; the client should now prompt for the code.
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="totp_required")
        if not pyotp.TOTP(user.totp_secret).verify(payload.totp_code.strip(), valid_window=1):
            _record_failure(ip)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authenticator code")

    _clear_failures(ip)
    user.last_login = datetime.now(timezone.utc)
    await db.commit()
    token = create_access_token(str(user.id))
    # HttpOnly session cookie (XSS-safe). Host-only on the API domain —
    # same-site XHR from the frontend (www.aboenterprise.com ->
    # api.aboenterprise.com) sends it with credentials. The body token stays
    # for backward compatibility and non-browser clients.
    response.set_cookie(
        ADMIN_SESSION_COOKIE,
        token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=_is_https(request),
        samesite="lax",
        path="/",
    )
    return ApiResponse(
        data=TokenResponse(access_token=token),
        message="Login successful",
    )


@router.post("/logout", response_model=ApiResponse)
async def logout(response: Response):
    """Clear the HttpOnly admin session cookie."""
    response.delete_cookie(ADMIN_SESSION_COOKIE, path="/")
    return ApiResponse(data=None, message="Logged out")


def _totp_qr_data_uri(uri: str) -> str:
    """Provisioning URI → PNG QR code as a data URI (rendered client-side)."""
    import base64
    from io import BytesIO

    import qrcode

    img = qrcode.make(uri, box_size=6, border=2)
    buf = BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


@router.get("/2fa/status", response_model=ApiResponse)
async def totp_status(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID

    user = (await db.execute(select(AdminUser).where(AdminUser.id == UUID(admin_id)))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return ApiResponse(data={"enabled": bool(user.totp_enabled)})


@router.post("/2fa/setup", response_model=ApiResponse)
async def totp_setup(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Generate (or regenerate) a TOTP secret — NOT enabled until verified."""
    from uuid import UUID

    import pyotp

    user = (await db.execute(select(AdminUser).where(AdminUser.id == UUID(admin_id)))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA is already enabled. Disable it first.")
    secret = pyotp.random_base32()
    user.totp_secret = secret
    await db.commit()
    uri = pyotp.TOTP(secret).provisioning_uri(name=user.email, issuer_name="ABO Enterprise Admin")
    return ApiResponse(data={"secret": secret, "otpauth_uri": uri, "qr_data_uri": _totp_qr_data_uri(uri)})


@router.post("/2fa/enable", response_model=ApiResponse)
async def totp_enable(
    payload: dict,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Confirm the authenticator app works, then turn 2FA on."""
    from uuid import UUID

    import pyotp

    code = str(payload.get("code", "")).strip()
    user = (await db.execute(select(AdminUser).where(AdminUser.id == UUID(admin_id)))).scalar_one_or_none()
    if not user or not user.totp_secret:
        raise HTTPException(status_code=400, detail="Run 2FA setup first")
    if not pyotp.TOTP(user.totp_secret).verify(code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid authenticator code")
    user.totp_enabled = True
    await db.commit()
    return ApiResponse(data={"enabled": True}, message="Two-factor authentication enabled")


@router.post("/2fa/disable", response_model=ApiResponse)
async def totp_disable(
    payload: dict,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Disabling requires a valid current code (protects a hijacked session)."""
    from uuid import UUID

    import pyotp

    code = str(payload.get("code", "")).strip()
    user = (await db.execute(select(AdminUser).where(AdminUser.id == UUID(admin_id)))).scalar_one_or_none()
    if not user or not user.totp_enabled or not user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA is not enabled")
    if not pyotp.TOTP(user.totp_secret).verify(code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid authenticator code")
    user.totp_enabled = False
    user.totp_secret = None
    await db.commit()
    return ApiResponse(data={"enabled": False}, message="Two-factor authentication disabled")


@router.get("/me", response_model=ApiResponse)
async def get_me(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID
    result = await db.execute(select(AdminUser).where(AdminUser.id == UUID(admin_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return ApiResponse(data={"id": str(user.id), "email": user.email, "name": user.name, "role": user.role})
