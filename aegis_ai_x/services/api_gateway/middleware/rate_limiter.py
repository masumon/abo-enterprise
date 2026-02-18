"""Rate limiting middleware using sliding window."""

from __future__ import annotations

import time
from collections import defaultdict
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

SKIP_PATHS = {"/health", "/health/ready", "/health/live", "/metrics"}


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """In-memory sliding-window rate limiter with automatic cleanup."""

    def __init__(self, app, rate_limit: int = 100, window: int = 60) -> None:
        super().__init__(app)
        self.rate_limit = rate_limit
        self.window = window
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._last_cleanup = time.time()
        self._cleanup_interval = 300  # purge stale IPs every 5 min

    def _cleanup_stale(self, now: float) -> None:
        """Remove IPs with no recent activity to prevent memory leak."""
        if now - self._last_cleanup < self._cleanup_interval:
            return
        stale_keys = [
            ip for ip, timestamps in self._requests.items()
            if not timestamps or timestamps[-1] < now - self.window * 2
        ]
        for key in stale_keys:
            del self._requests[key]
        self._last_cleanup = now

    async def dispatch(self, request: Request, call_next: Callable):
        if request.url.path in SKIP_PATHS:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        # Periodic cleanup
        self._cleanup_stale(now)

        # Slide window
        self._requests[client_ip] = [
            t for t in self._requests[client_ip] if t > now - self.window
        ]

        if len(self._requests[client_ip]) >= self.rate_limit:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Please try again later."},
                headers={
                    "Retry-After": str(self.window),
                    "X-RateLimit-Limit": str(self.rate_limit),
                    "X-RateLimit-Remaining": "0",
                },
            )

        self._requests[client_ip].append(now)
        response = await call_next(request)
        remaining = self.rate_limit - len(self._requests[client_ip])
        response.headers["X-RateLimit-Limit"] = str(self.rate_limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))
        return response
