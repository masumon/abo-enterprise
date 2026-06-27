"""Rule-based intent recognition with bilingual keyword and synonym matching."""

import json
from pathlib import Path

from app.assistant.constants import Intent
from app.assistant.nlp.fuzzy import fuzzy_score

_DATA_PATH = Path(__file__).parent / "data" / "intent_patterns.json"
_SYNONYMS_PATH = Path(__file__).parent / "data" / "synonyms.json"


def _load_patterns() -> dict:
    with open(_DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


def _load_synonyms() -> dict:
    with open(_SYNONYMS_PATH, encoding="utf-8") as f:
        return json.load(f)


class IntentEngine:
    def __init__(self) -> None:
        self._patterns = _load_patterns()
        self._synonyms = _load_synonyms()

    def _score_intent(self, normalized_text: str, intent_key: str, config: dict) -> float:
        score = 0.0
        all_keywords = (
            config.get("keywords_en", [])
            + config.get("keywords_bn", [])
            + config.get("synonyms", [])
        )
        for kw in all_keywords:
            kw_lower = kw.lower()
            if kw_lower in normalized_text:
                score += 1.0 + len(kw_lower) * 0.02
            else:
                ratio = fuzzy_score(normalized_text, kw_lower)
                if ratio > 0.72:
                    score += ratio * 0.5
        # Synonym expansion
        for base, syns in self._synonyms.items():
            if base in normalized_text or any(s in normalized_text for s in syns):
                if intent_key in ("product_search", "product_details") and base == "product":
                    score += 0.4
                if intent_key == "order_tracking" and base == "order":
                    score += 0.3
        return score

    def recognize(self, normalized_text: str) -> tuple[Intent, float]:
        if not normalized_text.strip():
            return Intent.UNKNOWN, 0.0

        scores: dict[str, float] = {}
        for intent_key, config in self._patterns.items():
            scores[intent_key] = self._score_intent(normalized_text, intent_key, config)

        # Short-circuit high-confidence greeting
        if scores.get("greeting", 0) >= 1.0 and len(normalized_text.split()) <= 4:
            return Intent.GREETING, scores["greeting"]

        best_key = max(scores, key=scores.get)
        best_score = scores[best_key]
        if best_score < 0.5:
            return Intent.UNKNOWN, best_score
        try:
            return Intent(best_key), best_score
        except ValueError:
            return Intent.UNKNOWN, best_score
