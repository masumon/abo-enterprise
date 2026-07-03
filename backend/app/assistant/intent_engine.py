"""Rule-based intent recognition with bilingual keyword and synonym matching."""

import json
import re
from pathlib import Path

from app.assistant.constants import Intent
from app.assistant.nlp.fuzzy import fuzzy_score

_DATA_PATH = Path(__file__).parent / "data" / "intent_patterns.json"
_SYNONYMS_PATH = Path(__file__).parent / "data" / "synonyms.json"

# Map synonym base words to intent keys for score boosting
_SYNONYM_INTENT_MAP: dict[str, list[str]] = {
    "product": ["product_search", "product_details", "product_price", "product_stock", "product_availability"],
    "order": ["order_tracking", "order_status", "order_creation", "invoice", "courier_tracking"],
    "delivery": ["delivery", "courier_tracking"],
    "payment": ["payment"],
    "price": ["product_price", "service_price"],
    "stock": ["product_stock", "product_availability"],
    "service": ["service_information", "service_price", "service_booking"],
    "booking": ["service_booking", "booking_tracking"],
    "warranty": ["warranty"],
    "return": ["return_policy"],
    "invoice": ["invoice"],
    "contact": ["contact", "customer_support"],
    "quote": ["quote", "lead_creation"],
    "coupon": ["coupon"],
    "complaint": ["complaint"],
}


def _load_patterns() -> dict:
    with open(_DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


def _load_synonyms() -> dict:
    with open(_SYNONYMS_PATH, encoding="utf-8") as f:
        return json.load(f)


def _keyword_in_text(keyword: str, text: str) -> bool:
    """Match a keyword/phrase on word boundaries.

    Plain substring matching caused false intents ("hi" inside "which",
    "book" inside "facebook"). Bengali script has no such issue because
    \\b works on unicode word characters there too.
    """
    return re.search(rf"(?<!\w){re.escape(keyword)}(?!\w)", text) is not None


class IntentEngine:
    def __init__(self) -> None:
        self._patterns = _load_patterns()
        self._synonyms = _load_synonyms()

    def _score_intent(self, normalized_text: str, tokens: list[str], intent_key: str, config: dict) -> float:
        score = 0.0
        all_keywords = (
            config.get("keywords_en", [])
            + config.get("keywords_bn", [])
            + config.get("synonyms", [])
        )
        for kw in all_keywords:
            kw_lower = kw.lower()
            if _keyword_in_text(kw_lower, normalized_text):
                score += 1.0 + len(kw_lower) * 0.02
            elif " " not in kw_lower and len(kw_lower) >= 4:
                # Typo tolerance: compare against individual words, not the
                # whole message (whole-message ratios are meaningless).
                for token in tokens:
                    if abs(len(token) - len(kw_lower)) <= 2 and fuzzy_score(token, kw_lower) > 0.8:
                        score += 0.5
                        break

        for base, syns in self._synonyms.items():
            matched = _keyword_in_text(base, normalized_text) or any(
                _keyword_in_text(s.lower(), normalized_text) for s in syns
            )
            if matched and intent_key in _SYNONYM_INTENT_MAP.get(base, []):
                score += 0.45

        return score

    def recognize(self, normalized_text: str) -> tuple[Intent, float]:
        if not normalized_text.strip():
            return Intent.UNKNOWN, 0.0

        tokens = normalized_text.split()
        scores: dict[str, float] = {}
        for intent_key, config in self._patterns.items():
            scores[intent_key] = self._score_intent(normalized_text, tokens, intent_key, config)

        best_key = max(scores, key=scores.get)
        best_score = scores[best_key]

        # Greeting shortcut only when nothing stronger matched.
        if scores.get("greeting", 0) >= 1.0 and len(tokens) <= 4 and scores["greeting"] >= best_score:
            return Intent.GREETING, scores["greeting"]

        if best_score < 0.5:
            return Intent.UNKNOWN, best_score
        try:
            return Intent(best_key), best_score
        except ValueError:
            return Intent.UNKNOWN, best_score
