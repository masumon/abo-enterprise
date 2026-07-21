"""Deterministic reasoning summaries for assistant execution decisions."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from app.assistant.constants import Intent

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class ReasoningConfig:
    include_entity_count: bool = True
    low_confidence_threshold: float = 0.55


@dataclass(slots=True)
class ReasoningStep:
    name: str
    detail: str
    weight: float = 0.0


@dataclass(slots=True)
class ReasoningResult:
    summary: str
    steps: list[ReasoningStep] = field(default_factory=list)
    risk_flags: list[str] = field(default_factory=list)


class ReasoningEngine:
    """Builds transparent, testable reasoning artifacts from deterministic signals."""

    def __init__(self, config: ReasoningConfig | None = None) -> None:
        self.config = config or ReasoningConfig()

    def analyze(self, *, intent: Intent, confidence: float, entity_count: int) -> ReasoningResult:
        try:
            steps: list[ReasoningStep] = [
                ReasoningStep(name="intent", detail=f"intent={intent.value}", weight=confidence),
            ]
            flags: list[str] = []
            if self.config.include_entity_count:
                steps.append(ReasoningStep(name="entities", detail=f"count={entity_count}", weight=min(entity_count / 5.0, 1.0)))
            if confidence < self.config.low_confidence_threshold:
                flags.append("low_confidence")
            summary = f"Intent {intent.value} selected with confidence {confidence:.2f}."
            return ReasoningResult(summary=summary, steps=steps, risk_flags=flags)
        except Exception as exc:
            logger.warning("reasoning_analyze_failed: %s", exc)
            return ReasoningResult(summary="Reasoning unavailable", steps=[], risk_flags=["reasoning_error"])
