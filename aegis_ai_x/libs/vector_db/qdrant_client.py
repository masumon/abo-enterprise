"""Qdrant vector database client."""

from __future__ import annotations

import logging
from typing import Any
from uuid import uuid4

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    PointStruct,
    VectorParams,
    Filter,
    FieldCondition,
    MatchValue,
)

logger = logging.getLogger(__name__)


class QdrantVectorDB:
    """Async client for Qdrant vector database operations."""

    def __init__(self, host: str = "localhost", port: int = 6333, api_key: str = "") -> None:
        kwargs: dict[str, Any] = {"host": host, "port": port}
        if api_key:
            kwargs["api_key"] = api_key
        self.client = AsyncQdrantClient(**kwargs)

    async def create_collection(
        self,
        name: str,
        vector_size: int = 1536,
        distance: Distance = Distance.COSINE,
    ) -> None:
        """Create a vector collection if it doesn't exist."""
        collections = await self.client.get_collections()
        existing = [c.name for c in collections.collections]
        if name not in existing:
            await self.client.create_collection(
                collection_name=name,
                vectors_config=VectorParams(size=vector_size, distance=distance),
            )
            logger.info("Created collection: %s", name)

    async def upsert(
        self,
        collection: str,
        vectors: list[list[float]],
        payloads: list[dict[str, Any]],
        ids: list[str] | None = None,
    ) -> None:
        """Insert or update vectors with payloads."""
        point_ids = ids or [str(uuid4()) for _ in vectors]
        points = [
            PointStruct(id=pid, vector=vec, payload=payload)
            for pid, vec, payload in zip(point_ids, vectors, payloads)
        ]
        await self.client.upsert(collection_name=collection, points=points)

    async def search(
        self,
        collection: str,
        query_vector: list[float],
        limit: int = 10,
        filters: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Search for similar vectors."""
        qdrant_filter = None
        if filters:
            conditions = [
                FieldCondition(key=k, match=MatchValue(value=v))
                for k, v in filters.items()
            ]
            qdrant_filter = Filter(must=conditions)

        results = await self.client.search(
            collection_name=collection,
            query_vector=query_vector,
            limit=limit,
            query_filter=qdrant_filter,
        )

        return [
            {
                "id": str(hit.id),
                "score": hit.score,
                "payload": hit.payload,
            }
            for hit in results
        ]

    async def delete(self, collection: str, ids: list[str]) -> None:
        """Delete vectors by IDs."""
        await self.client.delete(
            collection_name=collection,
            points_selector=ids,
        )
