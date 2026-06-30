"""Admin-configurable assistant feature flags (stored in settings table)."""

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.assistant.constants import Intent
from app.assistant.knowledge_base import KnowledgeBase

# All boolean assistant feature keys — defaults True for backward compatibility
ASSISTANT_BOOLEAN_FEATURES: dict[str, bool] = {
    "feature_assistant_chat": True,
    "feature_assistant_whatsapp": True,
    "assistant_feature_orders": True,
    "assistant_feature_order_tracking": True,
    "assistant_feature_bookings": True,
    "assistant_feature_booking_tracking": True,
    "assistant_feature_leads": True,
    "assistant_feature_lead_tracking": True,
    "assistant_feature_product_search": True,
    "assistant_feature_service_info": True,
    "assistant_feature_coupons": True,
    "assistant_feature_invoices": True,
    "assistant_feature_delivery_info": True,
    "assistant_feature_faq": True,
    "assistant_feature_blog": True,
    "assistant_feature_web_search": True,
    "assistant_feature_complaints": True,
}

ASSISTANT_STRING_KEYS = (
    "whatsapp_number",
    "assistant_welcome_en",
    "assistant_welcome_bn",
)

ASSISTANT_CONFIG_KEYS = tuple(ASSISTANT_BOOLEAN_FEATURES.keys()) + ASSISTANT_STRING_KEYS


def parse_bool(value: str | None, default: bool = True) -> bool:
    if value is None:
        return default
    return value.lower() in ("true", "1", "yes")


@dataclass
class AssistantFeatureFlags:
    chat_enabled: bool = True
    whatsapp_enabled: bool = True
    orders: bool = True
    order_tracking: bool = True
    bookings: bool = True
    booking_tracking: bool = True
    leads: bool = True
    lead_tracking: bool = True
    product_search: bool = True
    service_info: bool = True
    coupons: bool = True
    invoices: bool = True
    delivery_info: bool = True
    faq: bool = True
    blog: bool = True
    web_search: bool = True
    complaints: bool = True

    @classmethod
    def from_settings(cls, data: dict[str, str]) -> "AssistantFeatureFlags":
        return cls(
            chat_enabled=parse_bool(data.get("feature_assistant_chat"), True),
            whatsapp_enabled=parse_bool(data.get("feature_assistant_whatsapp"), True),
            orders=parse_bool(data.get("assistant_feature_orders"), True),
            order_tracking=parse_bool(data.get("assistant_feature_order_tracking"), True),
            bookings=parse_bool(data.get("assistant_feature_bookings"), True),
            booking_tracking=parse_bool(data.get("assistant_feature_booking_tracking"), True),
            leads=parse_bool(data.get("assistant_feature_leads"), True),
            lead_tracking=parse_bool(data.get("assistant_feature_lead_tracking"), True),
            product_search=parse_bool(data.get("assistant_feature_product_search"), True),
            service_info=parse_bool(data.get("assistant_feature_service_info"), True),
            coupons=parse_bool(data.get("assistant_feature_coupons"), True),
            invoices=parse_bool(data.get("assistant_feature_invoices"), True),
            delivery_info=parse_bool(data.get("assistant_feature_delivery_info"), True),
            faq=parse_bool(data.get("assistant_feature_faq"), True),
            blog=parse_bool(data.get("assistant_feature_blog"), True),
            web_search=parse_bool(data.get("assistant_feature_web_search"), True),
            complaints=parse_bool(data.get("assistant_feature_complaints"), True),
        )

    def to_dict(self) -> dict[str, bool]:
        return {
            "feature_assistant_chat": self.chat_enabled,
            "feature_assistant_whatsapp": self.whatsapp_enabled,
            "assistant_feature_orders": self.orders,
            "assistant_feature_order_tracking": self.order_tracking,
            "assistant_feature_bookings": self.bookings,
            "assistant_feature_booking_tracking": self.booking_tracking,
            "assistant_feature_leads": self.leads,
            "assistant_feature_lead_tracking": self.lead_tracking,
            "assistant_feature_product_search": self.product_search,
            "assistant_feature_service_info": self.service_info,
            "assistant_feature_coupons": self.coupons,
            "assistant_feature_invoices": self.invoices,
            "assistant_feature_delivery_info": self.delivery_info,
            "assistant_feature_faq": self.faq,
            "assistant_feature_blog": self.blog,
            "assistant_feature_web_search": self.web_search,
            "assistant_feature_complaints": self.complaints,
        }

    def public_features(self) -> dict[str, bool]:
        """Feature map exposed to frontend widget (excludes chat master toggle)."""
        return {
            "orders": self.orders,
            "order_tracking": self.order_tracking,
            "bookings": self.bookings,
            "booking_tracking": self.booking_tracking,
            "leads": self.leads,
            "lead_tracking": self.lead_tracking,
            "product_search": self.product_search,
            "service_info": self.service_info,
            "coupons": self.coupons,
            "invoices": self.invoices,
        }


async def load_feature_flags(db: AsyncSession) -> AssistantFeatureFlags:
    kb = KnowledgeBase()
    data = await kb.get_site_settings(db, list(ASSISTANT_CONFIG_KEYS))
    return AssistantFeatureFlags.from_settings(data)


def is_intent_allowed(flags: AssistantFeatureFlags, intent: Intent) -> bool:
    """Return False when admin has disabled this capability."""
    blocked: dict[Intent, bool] = {
        Intent.ORDER_CREATION: not flags.orders,
        Intent.ORDER_TRACKING: not flags.order_tracking,
        Intent.ORDER_STATUS: not flags.order_tracking,
        Intent.COURIER_TRACKING: not flags.order_tracking,
        Intent.ORDER_CONFIRMATION: not flags.orders,
        Intent.SERVICE_BOOKING: not flags.bookings,
        Intent.BOOKING_TRACKING: not flags.booking_tracking,
        Intent.LEAD_CREATION: not flags.leads,
        Intent.QUOTE: not flags.leads,
        Intent.LEAD_TRACKING: not flags.lead_tracking,
        Intent.PRODUCT_SEARCH: not flags.product_search,
        Intent.PRODUCT_DETAILS: not flags.product_search,
        Intent.PRODUCT_PRICE: not flags.product_search,
        Intent.PRODUCT_STOCK: not flags.product_search,
        Intent.PRODUCT_AVAILABILITY: not flags.product_search,
        Intent.CATEGORY: not flags.product_search,
        Intent.BRAND: not flags.product_search,
        Intent.SERVICE_INFO: not flags.service_info,
        Intent.SERVICE_PRICE: not flags.service_info,
        Intent.COUPON: not flags.coupons,
        Intent.INVOICE: not flags.invoices,
        Intent.DELIVERY: not flags.delivery_info,
        Intent.FAQ: not flags.faq,
        Intent.BLOG: not flags.blog,
        Intent.COMPLAINT: not flags.complaints,
    }
    return not blocked.get(intent, False)


def is_workflow_allowed(flags: AssistantFeatureFlags, workflow_type: str) -> bool:
    return {
        "order": flags.orders,
        "booking": flags.bookings,
        "lead": flags.leads,
    }.get(workflow_type, True)
