"""In-memory indexing engine for deterministic chunk retrieval."""

from __future__ import annotations

import logging
import re
from collections import defaultdict
from dataclasses import dataclass

from app.assistant.ingestion_engine import IngestedChunk
from app.assistant.semantic_matcher import SemanticMatcher

logger = logging.getLogger(__name__)

_TOKEN_RE = re.compile(r"[\w\u0980-\u09FF]+")


@dataclass(slots=True)
class IndexSearchResult:
    chunk_id: str
    score: float
    text: str


class IndexingEngine:
    def __init__(self, matcher: SemanticMatcher | None = None) -> None:
        self._matcher = matcher or SemanticMatcher()
        self._chunks: dict[str, IngestedChunk] = {}
        self._postings: dict[str, set[str]] = defaultdict(set)

    def index(self, chunks: list[IngestedChunk]) -> int:
        count = 0
        for chunk in chunks:
            try:
                self._chunks[chunk.chunk_id] = chunk
                for token in _TOKEN_RE.findall(chunk.text.lower()):
                    if len(token) >= 2:
                        self._postings[token].add(chunk.chunk_id)
                count += 1
            except Exception as exc:
                logger.warning("index_chunk_failed id=%s err=%s", chunk.chunk_id, exc)
        return count

    def search(self, query: str, limit: int = 5) -> list[IndexSearchResult]:
        try:
            tokens = [t for t in _TOKEN_RE.findall((query or "").lower()) if len(t) >= 2]
            candidates: set[str] = set()
            for token in tokens:
                candidates.update(self._postings.get(token, set()))
            results: list[IndexSearchResult] = []
            for chunk_id in candidates:
                chunk = self._chunks.get(chunk_id)
                if not chunk:
                    continue
                score = self._matcher.score(query, chunk.text)
                if score <= 0:
                    continue
                results.append(IndexSearchResult(chunk_id=chunk_id, score=score, text=chunk.text))
            results.sort(key=lambda x: x.score, reverse=True)
            return results[:limit]
        except Exception as exc:
            logger.warning("index_search_failed: %s", exc)
            return []
