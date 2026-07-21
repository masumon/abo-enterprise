"""Confidence calibration for deterministic assistant classifications."""

from __future__ import annotations

import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class ConfidenceConfig:
    min_confidence: float = 0.0
    max_confidence: float = 1.0
    entity_boost: float = 0.03
    context_boost: float = 0.05


class ConfidenceEngine:
    def __init__(self, config: ConfidenceConfig | None = None) -> None:
        self.config = config or ConfidenceConfig()

    def calibrate(self, *, base_confidence: float, entity_count: int, has_session_context: bool) -> float:
        try:
            calibrated = base_confidence + min(entity_count, 4) * self.config.entity_boost
            if has_session_context:
                calibrated += self.config.context_boost
            return max(self.config.min_confidence, min(self.config.max_confidence, calibrated))
        except Exception as exc:
            logger.warning("confidence_calibration_failed: %s", exc)
            return max(self.config.min_confidence, min(self.config.max_confidence, base_confidence))
