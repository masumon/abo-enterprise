"""Unit tests for the LLM router."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from libs.llm.router import LLMRouter
from libs.llm.providers.base import BaseLLMProvider, LLMResponse


class MockProvider(BaseLLMProvider):
    def __init__(self, name: str, should_fail: bool = False):
        self._name = name
        self._should_fail = should_fail

    @property
    def provider_name(self) -> str:
        return self._name

    async def generate(self, messages, temperature=0.7, max_tokens=4096, **kwargs):
        if self._should_fail:
            raise RuntimeError(f"Provider {self._name} failed")
        return LLMResponse(
            content=f"Response from {self._name}",
            model="test-model",
            provider=self._name,
            usage={"total_tokens": 100},
        )

    async def generate_stream(self, messages, temperature=0.7, max_tokens=4096, **kwargs):
        yield f"chunk from {self._name}"


class TestLLMRouter:
    def setup_method(self):
        self.router = LLMRouter()

    def test_register_provider(self):
        provider = MockProvider("test")
        self.router.register(provider)
        assert "test" in self.router._providers

    def test_get_provider(self):
        provider = MockProvider("test")
        self.router.register(provider)
        result = self.router.get_provider("test")
        assert result.provider_name == "test"

    def test_get_unknown_provider_raises(self):
        with pytest.raises(ValueError, match="not registered"):
            self.router.get_provider("nonexistent")

    @pytest.mark.asyncio
    async def test_generate_routes_to_specific_provider(self):
        self.router.register(MockProvider("provider_a"))
        self.router.register(MockProvider("provider_b"))

        result = await self.router.generate(
            messages=[{"role": "user", "content": "test"}],
            provider="provider_b",
            use_cache=False,
        )
        assert result.provider == "provider_b"

    @pytest.mark.asyncio
    async def test_fallback_on_failure(self):
        self.router.register(MockProvider("failing", should_fail=True), priority=0)
        self.router.register(MockProvider("working"), priority=1)

        result = await self.router.generate(
            messages=[{"role": "user", "content": "test"}],
            use_cache=False,
        )
        assert result.provider == "working"

    @pytest.mark.asyncio
    async def test_all_providers_fail_raises(self):
        self.router.register(MockProvider("fail1", should_fail=True))
        self.router.register(MockProvider("fail2", should_fail=True))

        with pytest.raises(RuntimeError, match="All LLM providers failed"):
            await self.router.generate(
                messages=[{"role": "user", "content": "test"}],
                use_cache=False,
            )

    @pytest.mark.asyncio
    async def test_caching(self):
        self.router.register(MockProvider("test"))
        messages = [{"role": "user", "content": "cached test"}]

        result1 = await self.router.generate(messages=messages, use_cache=True)
        result2 = await self.router.generate(messages=messages, use_cache=True)
        assert result1.content == result2.content
