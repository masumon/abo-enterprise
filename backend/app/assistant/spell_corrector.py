"""Rule-based spell correction for common assistant-domain typos."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class SpellCorrectorConfig:
    replacements: dict[str, str] = field(
        default_factory=lambda: {
            "delivary": "delivery",
            "warrenty": "warranty",
            "retun": "return",
            "bokking": "booking",
            "servce": "service",
            "prodcut": "product",
            "prcie": "price",
            "stok": "stock",
        }
    )


class SpellCorrector:
    def __init__(self, config: SpellCorrectorConfig | None = None) -> None:
        self.config = config or SpellCorrectorConfig()

    def correct(self, text: str) -> str:
        try:
            tokens = re.findall(r"[\w\u0980-\u09FF]+|[^\w\u0980-\u09FF]+", text or "")
            corrected: list[str] = []
            for token in tokens:
                low = token.lower()
                corrected.append(self.config.replacements.get(low, token))
            return "".join(corrected)
        except Exception as exc:
            logger.warning("spell_correct_failed: %s", exc)
            return text
