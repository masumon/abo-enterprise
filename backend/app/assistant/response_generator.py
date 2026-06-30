"""Bilingual response generation from structured data — no external AI."""

from typing import Any

from app.assistant.constants import Intent


class ResponseGenerator:
    def greeting(self, language: str, name: str | None = None) -> str:
        if language == "bn":
            return "আমি ABO Enterprise সহকারী। পণ্য, সেবা, অর্ডার ট্র্যাকিং বা যোগাযোগ — জিজ্ঞাসা করুন।"
        return (
            "I'm the ABO Enterprise assistant. Ask about products, services, order tracking, or contact info."
        )

    def web_enriched(self, language: str, summary: str) -> str:
        if language == "bn":
            return f"আমি আমাদের ডাটাবেস ও ওয়েব থেকে পেলাম:\n\n{summary}"
        return f"From our catalog and web search:\n\n{summary}"

    def unknown(self, language: str) -> str:
        if language == "bn":
            return "দুঃখিত, আমি ঠিক বুঝতে পারিনি। অনুগ্রহ করে পণ্য, সেবা, অর্ডার ট্র্যাকিং বা যোগাযোগ সম্পর্কে জিজ্ঞাসা করুন।"
        return (
            "I'm sorry, I didn't quite understand. "
            "Please ask about products, services, order tracking, or contact information."
        )

    def need_more_info(self, language: str, fields: list[str]) -> str:
        if language == "bn":
            return f"এই কাজের জন্য আরও তথ্য দরকার: {', '.join(fields)}। অনুগ্রহ করে জানান।"
        return f"I need more information: {', '.join(fields)}. Please provide these details."

    def permission_denied(self, language: str, reason: str | None = None) -> str:
        if language == "bn":
            return reason or "এই কাজের অনুমতি নেই।"
        return reason or "You don't have permission for this action."

    def business_blocked(self, language: str, message_en: str | None, message_bn: str | None) -> str:
        if language == "bn" and message_bn:
            return message_bn
        return message_en or "This request cannot be processed at the moment."

    def product_list(self, language: str, products: list[dict]) -> str:
        if not products:
            return "কোনো পণ্য পাওয়া যায়নি।" if language == "bn" else "No products found."
        lines = []
        for p in products:
            name = p.get("name_bn") if language == "bn" else p.get("name_en")
            price = p.get("price")
            stock = p.get("stock_quantity", 0)
            lines.append(f"• {name} — ৳{price:,.0f} (stock: {stock})")
        header = "পাওয়া পণ্য:" if language == "bn" else "Products found:"
        return header + "\n" + "\n".join(lines)

    def product_detail(self, language: str, product: dict) -> str:
        name = product.get("name_bn") if language == "bn" else product.get("name_en")
        desc = product.get("description_bn") if language == "bn" else product.get("description_en")
        price = product.get("price", 0)
        stock = product.get("stock_quantity", 0)
        if language == "bn":
            return (
                f"**{name}**\nদাম: ৳{price:,.0f}\nস্টক: {stock}\n"
                f"{desc or 'বিস্তারিত পণ্য পেজে দেখুন।'}"
            )
        return (
            f"**{name}**\nPrice: ৳{price:,.0f}\nStock: {stock}\n"
            f"{desc or 'See product page for details.'}"
        )

    def service_list(self, language: str, services: list[dict]) -> str:
        if not services:
            return "কোনো সেবা পাওয়া যায়নি।" if language == "bn" else "No services found."
        lines = []
        for s in services:
            name = s.get("name_bn") if language == "bn" else s.get("name_en")
            lines.append(f"• {name}")
        header = "আমাদের সেবা:" if language == "bn" else "Our services:"
        return header + "\n" + "\n".join(lines)

    def order_status(self, language: str, order: dict) -> str:
        if language == "bn":
            return (
                f"অর্ডার {order['order_number']}: স্ট্যাটাস **{order['order_status']}**, "
                f"মোট ৳{order['total']:,.0f}, {order.get('items_count', 0)}টি আইটেম।"
            )
        return (
            f"Order {order['order_number']}: status **{order['order_status']}**, "
            f"total ৳{order['total']:,.0f}, {order.get('items_count', 0)} item(s)."
        )

    def automation_success(self, language: str, action: str, reference: str) -> str:
        if language == "bn":
            return f"✅ {action} সফল হয়েছে। রেফারেন্স: {reference}"
        return f"✅ {action} completed successfully. Reference: {reference}"

    def contact(self, language: str, info: dict) -> str:
        if language == "bn":
            return (
                f"যোগাযোগ:\n📞 {info.get('phone', 'N/A')}\n"
                f"📧 {info.get('email', 'N/A')}\n"
                f"WhatsApp: {info.get('whatsapp', 'N/A')}"
            )
        return (
            f"Contact us:\n📞 {info.get('phone', 'N/A')}\n"
            f"📧 {info.get('email', 'N/A')}\n"
            f"WhatsApp: {info.get('whatsapp', 'N/A')}"
        )

    def faq_answer(self, language: str, text: str) -> str:
        return text

    def format_response(
        self,
        language: str,
        intent: Intent,
        text: str,
        data: dict[str, Any] | None = None,
        suggestions: list[str] | None = None,
    ) -> dict:
        result: dict[str, Any] = {
            "message": text,
            "intent": intent.value,
            "language": language,
            "data": data,
        }
        if suggestions:
            result["suggestions"] = suggestions
        return result
