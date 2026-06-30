"""Per-session conversation context management."""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ConversationContext:
    session_id: str
    language: str = "en"
    customer_name: str | None = None
    customer_phone: str | None = None
    customer_email: str | None = None
    last_intent: str | None = None
    last_product_slug: str | None = None
    last_service_slug: str | None = None
    pending_action: str | None = None
    slots: dict[str, Any] = field(default_factory=dict)

    def has_identity(self) -> bool:
        return bool(self.customer_name and self.customer_phone)

    def update_from_entities(self, entities: list, preprocessed: dict) -> None:
        from app.assistant.constants import EntityType

        for e in entities:
            if e.type == EntityType.PHONE and not self.customer_phone:
                self.customer_phone = e.value
            if e.type == EntityType.EMAIL and not self.customer_email:
                self.customer_email = e.value
            if e.type == EntityType.CUSTOMER and not self.customer_name:
                self.customer_name = e.value
            if e.type == EntityType.PRODUCT:
                self.slots["product_query"] = e.value
            if e.type == EntityType.SERVICE:
                self.slots["service_query"] = e.value
            if e.type == EntityType.ORDER_NUMBER:
                self.slots["order_number"] = e.value
            if e.type == EntityType.BOOKING_NUMBER:
                self.slots["booking_number"] = e.value
            if e.type == EntityType.LEAD_NUMBER:
                self.slots["lead_number"] = e.value
            if e.type == EntityType.QUANTITY:
                self.slots["quantity"] = e.value

        if preprocessed.get("phones") and not self.customer_phone:
            self.customer_phone = preprocessed["phones"][0]
        if preprocessed.get("emails") and not self.customer_email:
            self.customer_email = preprocessed["emails"][0]


class ContextManager:
    def merge(self, existing: ConversationContext | None, session_id: str, **overrides) -> ConversationContext:
        if existing:
            ctx = existing
        else:
            ctx = ConversationContext(session_id=session_id)
        for key, value in overrides.items():
            if value is not None and hasattr(ctx, key):
                setattr(ctx, key, value)
        return ctx

    def to_dict(self, ctx: ConversationContext) -> dict:
        return {
            "session_id": ctx.session_id,
            "language": ctx.language,
            "customer_name": ctx.customer_name,
            "customer_phone": ctx.customer_phone,
            "customer_email": ctx.customer_email,
            "last_intent": ctx.last_intent,
            "last_product_slug": ctx.last_product_slug,
            "last_service_slug": ctx.last_service_slug,
            "pending_action": ctx.pending_action,
            "slots": ctx.slots,
        }

    def from_dict(self, data: dict) -> ConversationContext:
        return ConversationContext(
            session_id=data.get("session_id", ""),
            language=data.get("language", "en"),
            customer_name=data.get("customer_name"),
            customer_phone=data.get("customer_phone"),
            customer_email=data.get("customer_email"),
            last_intent=data.get("last_intent"),
            last_product_slug=data.get("last_product_slug"),
            last_service_slug=data.get("last_service_slug"),
            pending_action=data.get("pending_action"),
            slots=data.get("slots") or {},
        )
