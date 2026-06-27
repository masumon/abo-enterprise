from collections import defaultdict, deque
from datetime import datetime, timezone
from time import time

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import create_access_token, require_admin, verify_password
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


@router.post("/login", response_model=ApiResponse)
async def login(request: Request, payload: LoginRequest, db: AsyncSession = Depends(get_db)):
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

    _clear_failures(ip)
    user.last_login = datetime.now(timezone.utc)
    await db.commit()
    token = create_access_token(str(user.id))
    return ApiResponse(
        data=TokenResponse(access_token=token),
        message="Login successful",
    )


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
