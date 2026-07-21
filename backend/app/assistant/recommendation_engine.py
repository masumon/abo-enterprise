"""Recommendation engine for ranking and de-duplicating assistant suggestions."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from app.assistant.context_manager import ConversationContext
from app.assistant.ranking_engine import RankingEngine

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class RecommendationConfig:
    max_items: int = 4


class RecommendationEngine:
    def __init__(self, ranking_engine: RankingEngine | None = None, config: RecommendationConfig | None = None) -> None:
        self.ranking = ranking_engine or RankingEngine()
        self.config = config or RecommendationConfig()

    def recommend(self, suggestions: list[str], ctx: ConversationContext | None = None) -> list[str]:
        try:
            unique: list[str] = []
            seen: set[str] = set()
            for item in suggestions:
                key = item.strip().lower()
                if not key or key in seen:
                    continue
                seen.add(key)
                unique.append(item)

            def _score(value: str) -> float:
                score = 1.0
                if ctx and ctx.last_intent and ctx.last_intent.replace("_", " ") in value.lower():
                    score += 0.3
                if len(value) <= 18:
                    score += 0.1
                return score

            ranked = self.ranking.rank(unique, score_fn=_score, limit=self.config.max_items)
            return [r.item for r in ranked]
        except Exception as exc:
            logger.warning("recommendation_failed: %s", exc)
            return suggestions[: self.config.max_items]
