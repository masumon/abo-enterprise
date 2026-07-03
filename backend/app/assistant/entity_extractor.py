"""Entity extraction from preprocessed user messages."""

import re
from dataclasses import dataclass, field

from app.assistant.constants import EntityType
from app.assistant.nlp.fuzzy import fuzzy_score

_TOKEN_RE = re.compile(r"[\wঀ-৿]+")


def _match_catalog_name(
    normalized: str, message_tokens: list[str], names: list[str]
) -> tuple[str | None, float]:
    """Find the catalog name best mentioned inside the message.

    The old approach fuzzy-compared the WHOLE message against each name,
    so "laptop er dam koto" never matched "Laptop X200". Here a name
    matches when it appears as a phrase, or when enough of its tokens
    appear in the message (with per-token typo tolerance).
    """
    best: str | None = None
    best_score = 0.0
    for name in names:
        if not name:
            continue
        n = name.lower().strip()
        if len(n) < 2:
            continue
        if n in normalized:
            score = 1.0 + len(n) * 0.01  # exact phrase; prefer longer names
        else:
            name_tokens = [t for t in _TOKEN_RE.findall(n) if len(t) >= 2]
            if not name_tokens:
                continue
            hits = 0
            for nt in name_tokens:
                if nt in message_tokens:
                    hits += 1
                    continue
                for mt in message_tokens:
                    if len(mt) >= 3 and abs(len(mt) - len(nt)) <= 2 and fuzzy_score(mt, nt) > 0.82:
                        hits += 1
                        break
            if hits == 0:
                continue
            coverage = hits / len(name_tokens)
            if len(name_tokens) == 1:
                score = coverage  # single-word name needs its word present
            elif hits >= 2 and coverage >= 0.5:
                score = 0.6 + coverage * 0.3
            else:
                continue
        if score > best_score:
            best, best_score = name, score
    if best_score >= 0.6:
        return best, min(best_score, 1.0)
    return None, best_score


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

        # Match catalog names mentioned inside the message
        message_tokens = _TOKEN_RE.findall(normalized)
        if product_names:
            match, score = _match_catalog_name(normalized, message_tokens, product_names)
            if match:
                result.entities.append(ExtractedEntity(EntityType.PRODUCT, match, score))

        if service_names:
            match, score = _match_catalog_name(normalized, message_tokens, service_names)
            if match:
                result.entities.append(ExtractedEntity(EntityType.SERVICE, match, score))

        if categories:
            match, score = _match_catalog_name(normalized, message_tokens, categories)
            if match:
                result.entities.append(ExtractedEntity(EntityType.CATEGORY, match, score))

        if brands:
            match, score = _match_catalog_name(normalized, message_tokens, brands)
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
