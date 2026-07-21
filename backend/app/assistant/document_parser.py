"""Document parser for text and JSON payloads used by ingestion pipelines."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class ParsedDocument:
    text: str
    metadata: dict[str, str] = field(default_factory=dict)


class DocumentParser:
    def parse(self, *, payload: bytes, content_type: str | None = None, filename: str | None = None) -> ParsedDocument:
        try:
            ctype = (content_type or "").lower()
            if "json" in ctype or (filename and filename.lower().endswith(".json")):
                loaded = json.loads(payload.decode("utf-8"))
                return ParsedDocument(text=json.dumps(loaded, ensure_ascii=False), metadata={"format": "json"})
            text = payload.decode("utf-8", errors="ignore")
            return ParsedDocument(text=text, metadata={"format": "text"})
        except Exception as exc:
            logger.warning("document_parse_failed: %s", exc)
            return ParsedDocument(text="", metadata={"error": "parse_failed"})
