"""Entity extraction from preprocessed user messages."""

import re
from dataclasses import dataclass, field

from app.assistant.constants import EntityType
from app.assistant.nlp.fuzzy import best_match


@dataclass
class ExtractedEntity:
    type: EntityType
    value: str
    confidence: float = 1.0
    raw: str | None = None


@dataclass
class EntityResult:
    entities: list[ExtractedEntity] = field(default_factory=list)

    def get(self, entity_type: EntityType) -> ExtractedEntity | None:
        for e in self.entities:
            if e.type == entity_type:
                return e
        return None

    def get_all(self, entity_type: EntityType) -> list[ExtractedEntity]:
        return [e for e in self.entities if e.type == entity_type]


class EntityExtractor:
    _QUOTED_RE = re.compile(r"['\"]([^'\"]{2,80})['\"]")

    def extract(
        self,
        preprocessed: dict,
        product_names: list[str] | None = None,
        service_names: list[str] | None = None,
        categories: list[str] | None = None,
        brands: list[str] | None = None,
    ) -> EntityResult:
        result = EntityResult()
        normalized = preprocessed.get("normalized", "")

        for phone in preprocessed.get("phones", []):
            result.entities.append(ExtractedEntity(EntityType.PHONE, phone, 0.95))

        for email in preprocessed.get("emails", []):
            result.entities.append(ExtractedEntity(EntityType.EMAIL, email, 0.95))

        for on in preprocessed.get("order_numbers", []):
            result.entities.append(ExtractedEntity(EntityType.ORDER_NUMBER, on, 0.99))

        for bn in preprocessed.get("booking_numbers", []):
            result.entities.append(ExtractedEntity(EntityType.BOOKING_NUMBER, bn, 0.99))

        for ln in preprocessed.get("lead_numbers", []):
            result.entities.append(ExtractedEntity(EntityType.LEAD_NUMBER, ln, 0.99))

        for inv in preprocessed.get("invoice_numbers", []):
            result.entities.append(ExtractedEntity(EntityType.INVOICE_NUMBER, inv, 0.99))

        for i, qty in enumerate(preprocessed.get("quantities", [])):
            result.entities.append(ExtractedEntity(EntityType.QUANTITY, str(qty), 0.85))

        for i, price in enumerate(preprocessed.get("prices", [])):
            result.entities.append(ExtractedEntity(EntityType.PRICE, str(price), 0.85))

        # Quoted product/service names
        for m in self._QUOTED_RE.findall(preprocessed.get("raw", "")):
            result.entities.append(ExtractedEntity(EntityType.PRODUCT, m.strip(), 0.9, raw=m))

        # Fuzzy match against catalog names
        if product_names:
            match, score = best_match(normalized, product_names, threshold=0.6)
            if match:
                result.entities.append(ExtractedEntity(EntityType.PRODUCT, match, score))

        if service_names:
            match, score = best_match(normalized, service_names, threshold=0.6)
            if match:
                result.entities.append(ExtractedEntity(EntityType.SERVICE, match, score))

        if categories:
            match, score = best_match(normalized, categories, threshold=0.65)
            if match:
                result.entities.append(ExtractedEntity(EntityType.CATEGORY, match, score))

        if brands:
            match, score = best_match(normalized, brands, threshold=0.65)
            if match:
                result.entities.append(ExtractedEntity(EntityType.BRAND, match, score))

        # SKU / barcode patterns
        sku_match = re.search(r"\bsku[:\s-]*([a-z0-9-]{3,30})\b", normalized, re.I)
        if sku_match:
            result.entities.append(ExtractedEntity(EntityType.SKU, sku_match.group(1).upper(), 0.9))

        barcode_match = re.search(r"\bbarcode[:\s-]*(\d{8,14})\b", normalized, re.I)
        if barcode_match:
            result.entities.append(ExtractedEntity(EntityType.BARCODE, barcode_match.group(1), 0.9))

        return result
