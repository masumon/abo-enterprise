"""Business rules for fraud detection, duplicate orders, and suspicious requests."""

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Order
from app.assistant.constants import Intent


@dataclass
class RuleResult:
    passed: bool = True
    flags: list[str] = field(default_factory=list)
    block_automation: bool = False
    notify_admin: bool = False
    message_en: str | None = None
    message_bn: str | None = None


class BusinessRuleEngine:
    MAX_ORDERS_PER_PHONE_PER_HOUR = 3
    MAX_MESSAGE_LENGTH = 2000
    SUSPICIOUS_PATTERNS = ("test order", "fake order", "free product", "hack", "sql injection")

    async def evaluate(
        self,
        db: AsyncSession,
        intent: Intent,
        normalized_text: str,
        phone: str | None = None,
        customer_name: str | None = None,
    ) -> RuleResult:
        result = RuleResult()

        if len(normalized_text) > self.MAX_MESSAGE_LENGTH:
            result.passed = False
            result.block_automation = True
            result.message_en = "Message is too long. Please shorten your request."
            result.message_bn = "বার্তাটি অনেক বড়। অনুগ্রহ করে ছোট করুন।"
            return result

        for pattern in self.SUSPICIOUS_PATTERNS:
            if pattern in normalized_text:
                result.flags.append("suspicious_content")
                result.notify_admin = True

        if intent == Intent.ORDER_CREATION and phone:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=1)
            count_result = await db.execute(
                select(func.count(Order.id)).where(
                    Order.customer_phone == phone,
                    Order.created_at >= cutoff,
                    Order.is_deleted == False,  # noqa: E712
                )
            )
            recent_count = count_result.scalar() or 0
            if recent_count >= self.MAX_ORDERS_PER_PHONE_PER_HOUR:
                result.flags.append("duplicate_order_risk")
                result.block_automation = True
                result.notify_admin = True
                result.message_en = (
                    "Multiple recent orders detected for this phone number. "
                    "Please contact support or wait before placing another order."
                )
                result.message_bn = (
                    "এই নম্বরে সম্প্রতি একাধিক অর্ডার পাওয়া গেছে। "
                    "সাপোর্টে যোগাযোগ করুন অথবা কিছুক্ষণ অপেক্ষা করুন।"
                )

        if customer_name and customer_name.lower() in ("test", "fake", "asdf", "xxx"):
            result.flags.append("fake_customer_name")
            result.notify_admin = True

        if result.flags and not result.block_automation:
            result.passed = True  # warn but allow read-only flows

        return result
