"""Vector-based retrieval for RAG (Retrieval Augmented Generation)."""

from __future__ import annotations

import logging
from typing import Any

from libs.vector_db.qdrant_client import QdrantVectorDB
from libs.vector_db.embeddings import EmbeddingService

logger = logging.getLogger(__name__)


class VectorRetriever:
    """RAG retriever that combines embeddings with vector search."""

    def __init__(self, vector_db: QdrantVectorDB, embedding_service: EmbeddingService) -> None:
        self.vector_db = vector_db
        self.embedding_service = embedding_service

    async def index_documents(
        self,
        collection: str,
        documents: list[dict[str, Any]],
    ) -> int:
        """Index a list of documents into the vector store.

        Each document should have at minimum a 'content' field.
        """
        all_vectors: list[list[float]] = []
        all_payloads: list[dict[str, Any]] = []

        for doc in documents:
            chunks = await self.embedding_service.embed_document(doc["content"])
            for chunk in chunks:
                all_vectors.append(chunk["embedding"])
                all_payloads.append({
                    "text": chunk["text"],
                    "chunk_index": chunk["chunk_index"],
                    "source": doc.get("source", "unknown"),
                    "metadata": doc.get("metadata", {}),
                })

        await self.vector_db.upsert(
            collection=collection,
            vectors=all_vectors,
            payloads=all_payloads,
        )

        logger.info("Indexed %d chunks from %d documents", len(all_vectors), len(documents))
        return len(all_vectors)

    async def retrieve(
        self,
        collection: str,
        query: str,
        top_k: int = 5,
        filters: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Retrieve relevant documents for a query."""
        query_vector = await self.embedding_service.embed_text(query)
        results = await self.vector_db.search(
            collection=collection,
            query_vector=query_vector,
            limit=top_k,
            filters=filters,
        )
        return results

    async def retrieve_with_context(
        self,
        collection: str,
        query: str,
        top_k: int = 5,
        context_template: str = "Context:\n{context}\n\nQuestion: {query}",
    ) -> str:
        """Retrieve and format context for LLM consumption."""
        results = await self.retrieve(collection, query, top_k)
        context_parts = [r["payload"]["text"] for r in results if r.get("payload")]
        context = "\n---\n".join(context_parts)
        return context_template.format(context=context, query=query)
