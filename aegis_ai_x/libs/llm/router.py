"""LLM Router - intelligent routing across multiple LLM providers."""

from __future__ import annotations

import asyncio
import logging
from typing import Any, AsyncIterator

from libs.llm.providers.base import BaseLLMProvider, LLMResponse
from libs.llm.cache import LLMCache

logger = logging.getLogger(__name__)


class LLMRouter:
    """Routes LLM requests to the best available provider with fallback support."""

    def __init__(self) -> None:
        self._providers: dict[str, BaseLLMProvider] = {}
        self._priority: list[str] = []
        self._cache = LLMCache()

    def register(self, provider: BaseLLMProvider, priority: int = 0) -> None:
        """Register an LLM provider with a priority (lower = higher priority)."""
        name = provider.provider_name
        self._providers[name] = provider
        self._priority.append(name)
        self._priority.sort(key=lambda n: priority)

    def get_provider(self, name: str) -> BaseLLMProvider:
        """Get a specific provider by name."""
        if name not in self._providers:
            raise ValueError(f"Provider '{name}' not registered. Available: {list(self._providers)}")
        return self._providers[name]

    async def generate(
        self,
        messages: list[dict[str, str]],
        provider: str | None = None,
        use_cache: bool = True,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs: Any,
    ) -> LLMResponse:
        """Generate a response, optionally routing to a specific provider."""
        if use_cache:
            cached = await self._cache.get(messages, provider or "default")
            if cached:
                logger.debug("Cache hit for LLM request")
                return cached

        providers_to_try = [provider] if provider else self._priority
        last_error: Exception | None = None

        for pname in providers_to_try:
            if pname not in self._providers:
                continue
            try:
                result = await self._providers[pname].generate(
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    **kwargs,
                )
                if use_cache:
                    await self._cache.set(messages, provider or "default", result)
                return result
            except Exception as e:
                logger.warning("Provider %s failed: %s", pname, e)
                last_error = e
                continue

        raise RuntimeError(
            f"All LLM providers failed. Last error: {last_error}"
        )

    async def generate_stream(
        self,
        messages: list[dict[str, str]],
        provider: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        """Stream a response from the specified or best available provider."""
        pname = provider or (self._priority[0] if self._priority else None)
        if not pname or pname not in self._providers:
            raise RuntimeError("No LLM provider available for streaming")

        async for chunk in self._providers[pname].generate_stream(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs,
        ):
            yield chunk

    async def parallel_generate(
        self,
        messages: list[dict[str, str]],
        providers: list[str] | None = None,
        **kwargs: Any,
    ) -> dict[str, LLMResponse]:
        """Send the same prompt to multiple providers in parallel."""
        target_providers = providers or list(self._providers.keys())
        tasks = {
            name: self._providers[name].generate(messages=messages, **kwargs)
            for name in target_providers
            if name in self._providers
        }
        results = await asyncio.gather(*tasks.values(), return_exceptions=True)
        return {
            name: result
            for name, result in zip(tasks.keys(), results)
            if not isinstance(result, Exception)
        }
