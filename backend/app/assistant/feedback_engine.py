"""Feedback signal extraction from user utterances."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class FeedbackSignal:
    label: str
    score: float


class FeedbackEngine:
    _POSITIVE = {"thanks", "great", "good", "awesome", "ধন্যবাদ", "দারুণ", "ভাল"}
    _NEGATIVE = {"bad", "wrong", "useless", "terrible", "খারাপ", "ভুল", "বাজে"}

    def detect(self, message: str) -> FeedbackSignal:
        try:
            tokens = {t.lower() for t in re.findall(r"[\w\u0980-\u09FF]+", message or "")}
            pos = len(tokens & self._POSITIVE)
            neg = len(tokens & self._NEGATIVE)
            if pos == neg == 0:
                return FeedbackSignal(label="neutral", score=0.0)
            if pos >= neg:
                score = min(1.0, 0.4 + pos * 0.2)
                return FeedbackSignal(label="positive", score=score)
            score = max(-1.0, -0.4 - neg * 0.2)
            return FeedbackSignal(label="negative", score=score)
        except Exception as exc:
            logger.warning("feedback_detection_failed: %s", exc)
            return FeedbackSignal(label="neutral", score=0.0)
