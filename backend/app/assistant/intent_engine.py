"""Rule-based intent recognition with bilingual keyword and synonym matching."""

import json
from pathlib import Path

from app.assistant.constants import Intent
from app.assistant.nlp.fuzzy import fuzzy_score

_DATA_PATH = Path(__file__).parent / "data" / "intent_patterns.json"
_SYNONYMS_PATH = Path(__file__).parent / "data" / "synonyms.json"

# Map synonym base words to intent keys for score boosting
_SYNONYM_INTENT_MAP: dict[str, list[str]] = {
    "product": ["product_search", "product_details", "product_price", "product_stock", "product_availability"],
    "order": ["order_tracking", "order_status", "order_creation", "invoice"],
    "delivery": ["delivery"],
    "payment": ["payment"],
    "price": ["product_price", "service_price"],
    "stock": ["product_stock", "product_availability"],
    "service": ["service_information", "service_price", "service_booking"],
    "booking": ["service_booking"],
    "warranty": ["warranty"],
    "return": ["return_policy"],
    "invoice": ["invoice"],
    "contact": ["contact", "customer_support"],
    "quote": ["quote", "lead_creation"],
    "coupon": ["coupon"],
}


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

        for base, syns in self._synonyms.items():
            matched = base in normalized_text or any(s in normalized_text for s in syns)
            if matched and intent_key in _SYNONYM_INTENT_MAP.get(base, []):
                score += 0.45

        return score

    def recognize(self, normalized_text: str) -> tuple[Intent, float]:
        if not normalized_text.strip():
            return Intent.UNKNOWN, 0.0

        scores: dict[str, float] = {}
        for intent_key, config in self._patterns.items():
            scores[intent_key] = self._score_intent(normalized_text, intent_key, config)

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
