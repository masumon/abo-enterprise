"""Content ingestion engine that splits parsed documents into indexable chunks."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from app.assistant.document_parser import DocumentParser

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class IngestionConfig:
    chunk_size: int = 600
    chunk_overlap: int = 100


@dataclass(slots=True)
class IngestedChunk:
    doc_id: str
    chunk_id: str
    text: str


class IngestionEngine:
    def __init__(self, parser: DocumentParser | None = None, config: IngestionConfig | None = None) -> None:
        self.parser = parser or DocumentParser()
        self.config = config or IngestionConfig()

    def ingest(self, *, doc_id: str, payload: bytes, content_type: str | None = None, filename: str | None = None) -> list[IngestedChunk]:
        try:
            parsed = self.parser.parse(payload=payload, content_type=content_type, filename=filename)
            text = parsed.text.strip()
            if not text:
                return []
            chunks: list[IngestedChunk] = []
            step = max(1, self.config.chunk_size - self.config.chunk_overlap)
            idx = 0
            for start in range(0, len(text), step):
                part = text[start : start + self.config.chunk_size].strip()
                if not part:
                    continue
                chunks.append(IngestedChunk(doc_id=doc_id, chunk_id=f"{doc_id}:{idx}", text=part))
                idx += 1
                if start + self.config.chunk_size >= len(text):
                    break
            return chunks
        except Exception as exc:
            logger.warning("ingestion_failed doc=%s err=%s", doc_id, exc)
            return []
