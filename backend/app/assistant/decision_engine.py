"""Deterministic decision engine for route and fallback choices."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from app.assistant.constants import Intent

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class DecisionConfig:
    fallback_threshold: float = 0.35


@dataclass(slots=True)
class DecisionResult:
    action: str
    reason: str


class DecisionEngine:
    """Selects a safe handling action based on intent confidence."""

    def __init__(self, config: DecisionConfig | None = None) -> None:
        self.config = config or DecisionConfig()

    def decide(self, *, intent: Intent, confidence: float) -> DecisionResult:
        try:
            if intent == Intent.UNKNOWN:
                return DecisionResult(action="fallback_unknown", reason="intent_unknown")
            if confidence < self.config.fallback_threshold:
                return DecisionResult(action="fallback_unknown", reason="confidence_too_low")
            return DecisionResult(action="handle_intent", reason="deterministic_match")
        except Exception as exc:
            logger.warning("decision_failed: %s", exc)
            return DecisionResult(action="fallback_unknown", reason="decision_error")
