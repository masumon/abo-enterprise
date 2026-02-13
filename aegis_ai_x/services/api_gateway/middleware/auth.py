"""Authentication middleware for API Gateway."""

from __future__ import annotations

from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from services.auth.jwt_handler import JWTHandler

# Paths that don't require authentication
PUBLIC_PATHS = {
    "/health",
    "/metrics",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/auth/login",
    "/auth/register",
    "/auth/oauth/github",
    "/auth/oauth/github/callback",
    "/auth/oauth/google",
    "/auth/oauth/google/callback",
}


class AuthMiddleware(BaseHTTPMiddleware):
    """Validates JWT tokens on protected routes."""

    def __init__(self, app) -> None:
        super().__init__(app)
        self.jwt_handler = JWTHandler()

    async def dispatch(self, request: Request, call_next: Callable):
        path = request.url.path

        # Allow public paths
        if path in PUBLIC_PATHS or path.startswith("/auth/"):
            return await call_next(request)

        # Extract token
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing or invalid Authorization header"},
            )

        token = auth_header[7:]
        try:
            payload = self.jwt_handler.verify_token(token)
            # Attach user info to request state
            request.state.user_id = payload["sub"]
            request.state.user_email = payload.get("email", "")
            request.state.user_role = payload.get("role", "viewer")
        except ValueError:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or expired token"},
            )

        return await call_next(request)
