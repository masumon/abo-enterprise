"""Google Gemini LLM provider client."""

from __future__ import annotations

from typing import Any, AsyncIterator

import google.generativeai as genai

from libs.llm.providers.base import BaseLLMProvider, LLMResponse


class GeminiClient(BaseLLMProvider):
    """Client for Google Gemini models."""

    def __init__(self, api_key: str, model: str = "gemini-pro") -> None:
        genai.configure(api_key=api_key)
        self.model_name = model
        self.model = genai.GenerativeModel(model)

    @property
    def provider_name(self) -> str:
        return "gemini"

    def _convert_messages(self, messages: list[dict[str, str]]) -> list[dict[str, Any]]:
        """Convert standard message format to Gemini's format."""
        history: list[dict[str, Any]] = []
        for msg in messages:
            if msg["role"] == "system":
                history.append({"role": "user", "parts": [msg["content"]]})
                history.append({"role": "model", "parts": ["Understood."]})
            elif msg["role"] == "assistant":
                history.append({"role": "model", "parts": [msg["content"]]})
            else:
                history.append({"role": "user", "parts": [msg["content"]]})
        return history

    async def generate(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs: Any,
    ) -> LLMResponse:
        history = self._convert_messages(messages)
        last_message = history.pop()

        chat = self.model.start_chat(history=history)
        response = await chat.send_message_async(
            last_message["parts"][0],
            generation_config=genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            ),
        )

        return LLMResponse(
            content=response.text,
            model=self.model_name,
            provider=self.provider_name,
            usage={},
            finish_reason="stop",
        )

    async def generate_stream(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        history = self._convert_messages(messages)
        last_message = history.pop()

        chat = self.model.start_chat(history=history)
        response = await chat.send_message_async(
            last_message["parts"][0],
            generation_config=genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            ),
            stream=True,
        )

        async for chunk in response:
            if chunk.text:
                yield chunk.text
