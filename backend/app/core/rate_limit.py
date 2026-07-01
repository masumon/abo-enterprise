from datetime import datetime, timedelta
from typing import Dict
from collections import defaultdict

class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, list[datetime]] = defaultdict(list)

    def is_allowed(self, key: str) -> bool:
        now = datetime.utcnow()
        cutoff = now - timedelta(seconds=self.window_seconds)
        self.requests[key] = [
            req_time for req_time in self.requests[key] if req_time > cutoff
        ]

        if len(self.requests[key]) < self.max_requests:
            self.requests[key].append(now)
            return True
        return False

export_limiter = RateLimiter(max_requests=10, window_seconds=60)
