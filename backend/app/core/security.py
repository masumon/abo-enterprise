from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID
import bcrypt
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.core.database import get_db
from app.models.models import AdminUser

bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    # cost=12 is the current OWASP baseline. Existing hashes at other costs
    # remain valid — bcrypt.checkpw reads the cost from each stored hash.
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(subject: str | Any, expires_delta: timedelta | None = None) -> str:
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return jwt.encode(
        {"sub": str(subject), "exp": expire, "type": "access"},
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


CUSTOMER_TOKEN_DAYS = 30


def create_customer_token(phone: str) -> str:
    """Issued after OTP verification — proves ownership of a phone number."""
    expire = datetime.now(timezone.utc) + timedelta(days=CUSTOMER_TOKEN_DAYS)
    return jwt.encode(
        {"sub": phone, "exp": expire, "type": "customer"},
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


async def require_customer(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    """Returns the OTP-verified phone number from a customer token."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phone verification required. Please log in with OTP.",
        )
    payload = decode_token(credentials.credentials)
    if payload.get("type") != "customer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
    phone = payload.get("sub")
    if not phone:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return phone


async def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> str:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
    admin_id = payload.get("sub")
    if not admin_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    try:
        admin_uuid = UUID(admin_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    result = await db.execute(
        select(AdminUser).where(AdminUser.id == admin_uuid, AdminUser.is_active == True)  # noqa: E712
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin account inactive or not found")
    return admin_id


def require_role(permission: str):
    """FastAPI dependency factory — validates JWT and enforces RBAC permission.

    Usage: _admin: str = Depends(require_role("products.delete"))
    Resolves role from DB on every call so role changes take effect immediately.
    """
    from app.core.database import get_db
    from app.models.models import AdminUser
    from app.core.rbac import check_role

    async def _dependency(
        admin_id: str = Depends(require_admin),
        db: AsyncSession = Depends(get_db),
    ) -> str:
        result = await db.execute(
            select(AdminUser).where(AdminUser.id == UUID(admin_id), AdminUser.is_active == True)  # noqa: E712
        )
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin account not found")
        check_role(user.role, permission)
        return admin_id

    return _dependency
