"""Assistant analytics event builder for structured observability."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class AnalyticsConfig:
    include_timestamp: bool = True


@dataclass(slots=True)
class AnalyticsEvent:
    session_id: str
    intent: str
    confidence: float
    latency_ms: int
    metadata: dict[str, Any] = field(default_factory=dict)
    timestamp: str | None = None


class AnalyticsEngine:
    def __init__(self, config: AnalyticsConfig | None = None) -> None:
        self.config = config or AnalyticsConfig()

    def build_event(
        self,
        *,
        session_id: str,
        intent: str,
        confidence: float,
        latency_ms: int,
        metadata: dict[str, Any] | None = None,
    ) -> AnalyticsEvent:
        ts = datetime.now(timezone.utc).isoformat() if self.config.include_timestamp else None
        return AnalyticsEvent(
            session_id=session_id,
            intent=intent,
            confidence=round(confidence, 4),
            latency_ms=latency_ms,
            metadata=metadata or {},
            timestamp=ts,
        )

    def as_dict(self, event: AnalyticsEvent) -> dict[str, Any]:
        try:
            payload: dict[str, Any] = {
                "session_id": event.session_id,
                "intent": event.intent,
                "confidence": event.confidence,
                "latency_ms": event.latency_ms,
                "metadata": event.metadata,
            }
            if event.timestamp:
                payload["timestamp"] = event.timestamp
            return payload
        except Exception as exc:
            logger.warning("analytics_payload_failed: %s", exc)
            return {}
