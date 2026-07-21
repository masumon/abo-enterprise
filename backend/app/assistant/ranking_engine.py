"""Generic ranking helpers for assistant candidate ordering."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Callable, Generic, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


@dataclass(slots=True)
class RankedItem(Generic[T]):
    item: T
    score: float


class RankingEngine:
    def rank(self, items: list[T], *, score_fn: Callable[[T], float], limit: int | None = None) -> list[RankedItem[T]]:
        try:
            ranked = [RankedItem(item=item, score=score_fn(item)) for item in items]
            ranked.sort(key=lambda x: x.score, reverse=True)
            return ranked if limit is None else ranked[:limit]
        except Exception as exc:
            logger.warning("ranking_failed: %s", exc)
            return []
