from fastapi import Request, HTTPException, status
from collections import defaultdict
from datetime import datetime, timedelta, timezone
import asyncio

# Simple in-memory rate limiter (use Redis in production)
_request_counts: dict[str, list[datetime]] = defaultdict(list)
_lock = asyncio.Lock()

RATE_LIMITS = {
    "/api/v1/auth/login":   (5, 60),   # 5 requests / 60 sec
    "/api/v1/leads":        (10, 60),
    "/api/v1/bookings":     (10, 60),
    "/api/v1/orders":       (20, 60),
    "default":              (100, 60),
}


async def rate_limit_middleware(request: Request, call_next):
    path = request.url.path
    ip = request.client.host if request.client else "unknown"
    key = f"{ip}:{path}"

    limit, window = RATE_LIMITS.get(path, RATE_LIMITS["default"])
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(seconds=window)

    async with _lock:
        _request_counts[key] = [t for t in _request_counts[key] if t > cutoff]
        if len(_request_counts[key]) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Retry after {window} seconds.",
                headers={"Retry-After": str(window)},
            )
        _request_counts[key].append(now)

    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(limit)
    response.headers["X-RateLimit-Remaining"] = str(limit - len(_request_counts[key]))
    return response
