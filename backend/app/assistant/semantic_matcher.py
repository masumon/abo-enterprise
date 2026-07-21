"""Deterministic semantic matching using token overlap heuristics."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass

logger = logging.getLogger(__name__)

_TOKEN_RE = re.compile(r"[\w\u0980-\u09FF]+")


@dataclass(slots=True)
class SemanticMatchConfig:
    min_token_length: int = 2


class SemanticMatcher:
    def __init__(self, config: SemanticMatchConfig | None = None) -> None:
        self.config = config or SemanticMatchConfig()

    def score(self, query: str, text: str) -> float:
        try:
            q_tokens = self._tokens(query)
            t_tokens = self._tokens(text)
            if not q_tokens or not t_tokens:
                return 0.0
            intersection = len(q_tokens & t_tokens)
            union = len(q_tokens | t_tokens)
            return intersection / union if union else 0.0
        except Exception as exc:
            logger.warning("semantic_score_failed: %s", exc)
            return 0.0

    def _tokens(self, value: str) -> set[str]:
        return {
            tok.lower()
            for tok in _TOKEN_RE.findall(value or "")
            if len(tok) >= self.config.min_token_length
        }
