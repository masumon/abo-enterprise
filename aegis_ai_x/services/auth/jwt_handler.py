"""JWT token creation and verification."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from pydantic import BaseModel

from libs.config import get_settings


class TokenPayload(BaseModel):
    sub: str  # user_id
    email: str
    role: str
    exp: datetime
    iat: datetime
    jti: str = ""


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class JWTHandler:
    """Handles JWT token creation and verification."""

    def __init__(self) -> None:
        self.settings = get_settings()

    def create_access_token(
        self,
        user_id: str,
        email: str,
        role: str,
        expires_delta: timedelta | None = None,
    ) -> str:
        """Create a new JWT access token."""
        now = datetime.now(timezone.utc)
        expire = now + (
            expires_delta or timedelta(minutes=self.settings.jwt_access_token_expire_minutes)
        )

        payload = {
            "sub": user_id,
            "email": email,
            "role": role,
            "exp": expire,
            "iat": now,
            "type": "access",
        }

        return jwt.encode(
            payload,
            self.settings.jwt_secret_key,
            algorithm=self.settings.jwt_algorithm,
        )

    def create_refresh_token(self, user_id: str) -> str:
        """Create a refresh token (longer lived)."""
        now = datetime.now(timezone.utc)
        expire = now + timedelta(days=7)

        payload = {
            "sub": user_id,
            "exp": expire,
            "iat": now,
            "type": "refresh",
        }

        return jwt.encode(
            payload,
            self.settings.jwt_secret_key,
            algorithm=self.settings.jwt_algorithm,
        )

    def create_token_pair(self, user_id: str, email: str, role: str) -> TokenPair:
        """Create both access and refresh tokens."""
        return TokenPair(
            access_token=self.create_access_token(user_id, email, role),
            refresh_token=self.create_refresh_token(user_id),
            expires_in=self.settings.jwt_access_token_expire_minutes * 60,
        )

    def verify_token(self, token: str) -> dict[str, Any]:
        """Verify and decode a JWT token."""
        try:
            payload = jwt.decode(
                token,
                self.settings.jwt_secret_key,
                algorithms=[self.settings.jwt_algorithm],
            )
            return payload
        except JWTError as e:
            raise ValueError(f"Invalid token: {e}")

    def get_user_id_from_token(self, token: str) -> str:
        """Extract user ID from token."""
        payload = self.verify_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Token missing 'sub' claim")
        return user_id
