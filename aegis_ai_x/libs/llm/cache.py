"""LLM response caching layer."""

from __future__ import annotations

import hashlib
import json
import logging
from typing import Any

from libs.llm.providers.base import LLMResponse

logger = logging.getLogger(__name__)


class LLMCache:
    """In-memory + Redis backed cache for LLM responses."""

    def __init__(self, redis_client: Any = None, ttl: int = 3600) -> None:
        self._local: dict[str, LLMResponse] = {}
        self._redis = redis_client
        self._ttl = ttl

    @staticmethod
    def _make_key(messages: list[dict[str, str]], provider: str) -> str:
        raw = json.dumps({"messages": messages, "provider": provider}, sort_keys=True)
        return f"llm_cache:{hashlib.sha256(raw.encode()).hexdigest()}"

    async def get(self, messages: list[dict[str, str]], provider: str) -> LLMResponse | None:
        key = self._make_key(messages, provider)

        # Check local cache first
        if key in self._local:
            return self._local[key]

        # Check Redis
        if self._redis:
            try:
                data = await self._redis.get(key)
                if data:
                    parsed = json.loads(data)
                    response = LLMResponse(**parsed)
                    self._local[key] = response
                    return response
            except Exception as e:
                logger.warning("Redis cache read failed: %s", e)

        return None

    async def set(
        self, messages: list[dict[str, str]], provider: str, response: LLMResponse
    ) -> None:
        key = self._make_key(messages, provider)
        self._local[key] = response

        if self._redis:
            try:
                import dataclasses

                data = json.dumps(dataclasses.asdict(response))
                await self._redis.setex(key, self._ttl, data)
            except Exception as e:
                logger.warning("Redis cache write failed: %s", e)

    async def invalidate(self, messages: list[dict[str, str]], provider: str) -> None:
        key = self._make_key(messages, provider)
        self._local.pop(key, None)
        if self._redis:
            try:
                await self._redis.delete(key)
            except Exception as e:
                logger.warning("Redis cache invalidation failed: %s", e)
