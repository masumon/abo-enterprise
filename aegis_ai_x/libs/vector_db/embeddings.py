"""Embedding generation service for vector operations."""

from __future__ import annotations

import logging
from typing import Any

import openai

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Generate text embeddings using OpenAI or other providers."""

    def __init__(
        self,
        api_key: str,
        model: str = "text-embedding-3-small",
        dimensions: int = 1536,
    ) -> None:
        self.client = openai.AsyncOpenAI(api_key=api_key)
        self.model = model
        self.dimensions = dimensions

    async def embed_text(self, text: str) -> list[float]:
        """Generate embedding for a single text."""
        response = await self.client.embeddings.create(
            model=self.model,
            input=text,
        )
        return response.data[0].embedding

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for a batch of texts."""
        response = await self.client.embeddings.create(
            model=self.model,
            input=texts,
        )
        return [item.embedding for item in sorted(response.data, key=lambda x: x.index)]

    async def embed_document(
        self, content: str, chunk_size: int = 500, overlap: int = 50
    ) -> list[dict[str, Any]]:
        """Split a document into chunks and generate embeddings."""
        chunks = self._chunk_text(content, chunk_size, overlap)
        embeddings = await self.embed_batch(chunks)
        return [
            {"text": chunk, "embedding": emb, "chunk_index": i}
            for i, (chunk, emb) in enumerate(zip(chunks, embeddings))
        ]

    @staticmethod
    def _chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
        """Split text into overlapping chunks."""
        words = text.split()
        chunks: list[str] = []
        start = 0
        while start < len(words):
            end = start + chunk_size
            chunks.append(" ".join(words[start:end]))
            start = end - overlap
        return chunks
