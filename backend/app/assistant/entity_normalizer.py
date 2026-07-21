"""Entity value normalization layer for extracted assistant entities."""

from __future__ import annotations

import logging
import re

from app.assistant.constants import EntityType
from app.assistant.entity_extractor import EntityResult, ExtractedEntity

logger = logging.getLogger(__name__)


class EntityNormalizer:
    def normalize(self, result: EntityResult) -> EntityResult:
        try:
            normalized = EntityResult()
            for entity in result.entities:
                value = entity.value
                if entity.type == EntityType.PHONE:
                    value = self._normalize_phone(value)
                elif entity.type in {
                    EntityType.ORDER_NUMBER,
                    EntityType.BOOKING_NUMBER,
                    EntityType.LEAD_NUMBER,
                    EntityType.INVOICE_NUMBER,
                    EntityType.SKU,
                }:
                    value = value.upper().strip()
                elif entity.type == EntityType.EMAIL:
                    value = value.lower().strip()
                else:
                    value = value.strip()
                normalized.entities.append(
                    ExtractedEntity(type=entity.type, value=value, confidence=entity.confidence, raw=entity.raw)
                )
            return normalized
        except Exception as exc:
            logger.warning("entity_normalization_failed: %s", exc)
            return result

    @staticmethod
    def _normalize_phone(value: str) -> str:
        digits = re.sub(r"\D", "", value)
        if digits.startswith("88") and len(digits) == 13:
            digits = digits[2:]
        return digits
