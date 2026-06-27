"""Main assistant pipeline — coordinates all engines."""

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.assistant.constants import Intent, IDENTITY_REQUIRED_INTENTS, EntityType
from app.assistant.nlp.preprocessor import preprocess_text
from app.assistant.intent_engine import IntentEngine
from app.assistant.entity_extractor import EntityExtractor
from app.assistant.knowledge_base import KnowledgeBase
from app.assistant.business_rules import BusinessRuleEngine
from app.assistant.validation_engine import ValidationEngine
from app.assistant.permission_engine import PermissionEngine
from app.assistant.logging_engine import LoggingEngine
from app.assistant.context_manager import ContextManager, ConversationContext
from app.assistant.conversation_manager import ConversationManager
from app.assistant.response_generator import ResponseGenerator
from app.assistant.automation_engine import AutomationEngine


class AssistantOrchestrator:
    def __init__(self) -> None:
        self.intent_engine = IntentEngine()
        self.entity_extractor = EntityExtractor()
        self.knowledge = KnowledgeBase()
        self.business_rules = BusinessRuleEngine()
        self.validation = ValidationEngine()
        self.permissions = PermissionEngine()
        self.logging = LoggingEngine()
        self.context_mgr = ContextManager()
        self.conversation_mgr = ConversationManager()
        self.response = ResponseGenerator()
        self.automation = AutomationEngine()

    async def process_message(
        self,
        db: AsyncSession,
        message: str,
        session_id: str | None = None,
        customer_name: str | None = None,
        customer_phone: str | None = None,
        customer_email: str | None = None,
        language: str | None = None,
    ) -> dict[str, Any]:
        # 1. Validate
        msg_validation = self.validation.validate_message(message)
        if not msg_validation.valid:
            return self._error_response("en", msg_validation.errors[0])

        session_validation = self.validation.validate_session_id(session_id)
        if not session_validation.valid:
            return self._error_response("en", session_validation.errors[0])

        # 2. Load conversation
        conv, ctx = await self.conversation_mgr.get_or_create_session(db, session_id, customer_phone)
        ctx = self.context_mgr.merge(
            ctx, conv.session_id,
            customer_name=customer_name or ctx.customer_name,
            customer_phone=customer_phone or ctx.customer_phone,
            customer_email=customer_email or ctx.customer_email,
        )

        # 3. NLP
        preprocessed = preprocess_text(message)
        if language:
            ctx.language = language
        elif preprocessed["language"] != "en":
            ctx.language = preprocessed["language"]

        lang = ctx.language

        # 4. Catalog hints for entity extraction
        products = await self.knowledge.search_products(db, "", limit=50)
        services = await self.knowledge.search_services(db, "", limit=30)
        categories = await self.knowledge.list_categories(db)
        brands = await self.knowledge.list_brands(db)

        product_names = [p.name_en for p in products] + [p.name_bn for p in products]
        service_names = [s.name_en for s in services] + [s.name_bn for s in services]

        intent, confidence = self.intent_engine.recognize(preprocessed["normalized"])
        entities = self.entity_extractor.extract(
            preprocessed,
            product_names=product_names,
            service_names=service_names,
            categories=categories,
            brands=brands,
        )
        ctx.update_from_entities(entities.entities, preprocessed)
        ctx.last_intent = intent.value

        # 5. Permissions (public)
        perm = self.permissions.check_public_intent(intent)
        if not perm.allowed:
            text = self.response.permission_denied(lang, perm.reason)
            await self._finalize_turn(db, conv, ctx, message, text, intent.value, {"blocked": True})
            result = self.response.format_response(lang, intent, text)
            result["session_id"] = conv.session_id
            return result

        # 6. Business rules
        phone_entity = entities.get(EntityType.PHONE)
        rule_result = await self.business_rules.evaluate(
            db, intent, preprocessed["normalized"],
            phone=ctx.customer_phone or (phone_entity.value if phone_entity else None),
            customer_name=ctx.customer_name,
        )
        if rule_result.block_automation:
            text = self.response.business_blocked(lang, rule_result.message_en, rule_result.message_bn)
            await self.logging.log_action(
                db, session_id=conv.session_id, intent=intent.value,
                action="business_rule_block", status="blocked", details={"flags": rule_result.flags},
            )
            await self._finalize_turn(db, conv, ctx, message, text, intent.value, {"flags": rule_result.flags})
            result = self.response.format_response(lang, intent, text)
            result["session_id"] = conv.session_id
            return result

        if rule_result.notify_admin:
            await self.automation.notify_admin(
                "Assistant suspicious activity",
                f"Session {conv.session_id}: flags={rule_result.flags}, intent={intent.value}",
            )

        # 7. Handle intent
        response_data: dict[str, Any] = {"confidence": round(confidence, 2), "entities": [
            {"type": e.type.value, "value": e.value} for e in entities.entities
        ]}
        text, action_data = await self._handle_intent(db, ctx, intent, entities, preprocessed, lang)
        response_data.update(action_data or {})

        await self.logging.log_action(
            db, session_id=conv.session_id, intent=intent.value,
            action="chat", status="success", details={"confidence": confidence},
        )
        await self._finalize_turn(db, conv, ctx, message, text, intent.value, response_data)

        suggestions = self._suggestions(intent, lang)
        result = self.response.format_response(lang, intent, text, data=response_data, suggestions=suggestions)
        result["session_id"] = conv.session_id
        return result

    async def _handle_intent(self, db, ctx, intent, entities, preprocessed, lang):
        automation_perm = self.permissions.check_automation(
            intent, ctx.has_identity(), False,
        )

        if intent == Intent.GREETING:
            return self.response.greeting(lang, ctx.customer_name), {}

        if intent == Intent.UNKNOWN:
            return self.response.unknown(lang), {}

        if intent == Intent.CONTACT:
            info = await self.knowledge.get_contact_info(db)
            return self.response.contact(lang, info), {"contact": info}

        if intent in (Intent.DELIVERY, Intent.WARRANTY, Intent.RETURN_POLICY, Intent.PAYMENT, Intent.COMPANY_INFO):
            key_map = {
                Intent.DELIVERY: "delivery",
                Intent.WARRANTY: "warranty",
                Intent.RETURN_POLICY: "return",
                Intent.PAYMENT: "payment",
                Intent.COMPANY_INFO: "company",
            }
            faq = self.knowledge.get_faq(key_map[intent], lang)
            return self.response.faq_answer(lang, faq or self.response.unknown(lang)), {}

        if intent in (Intent.PRODUCT_SEARCH, Intent.CATEGORY, Intent.BRAND):
            query = ctx.slots.get("product_query", "")
            category = entities.get(EntityType.CATEGORY)
            brand = entities.get(EntityType.BRAND)
            cat_val = category.value if category else None
            brand_val = brand.value if brand else None
            if intent == Intent.CATEGORY and not cat_val:
                cats = await self.knowledge.list_categories(db)
                text = ("ক্যাটাগরি: " if lang == "bn" else "Categories: ") + ", ".join(cats[:15])
                return text, {"categories": cats}
            if intent == Intent.BRAND and not brand_val:
                brs = await self.knowledge.list_brands(db)
                text = ("ব্র্যান্ড: " if lang == "bn" else "Brands: ") + ", ".join(brs[:15])
                return text, {"brands": brs}
            found = await self.knowledge.search_products(db, query, limit=5, category=cat_val, brand=brand_val)
            product_dicts = [
                {"name_en": p.name_en, "name_bn": p.name_bn, "price": float(p.price), "stock_quantity": p.stock_quantity, "slug": p.slug}
                for p in found
            ]
            return self.response.product_list(lang, product_dicts), {"products": product_dicts}

        if intent in (Intent.PRODUCT_DETAILS, Intent.PRODUCT_PRICE, Intent.PRODUCT_STOCK, Intent.PRODUCT_AVAILABILITY):
            query = ctx.slots.get("product_query", preprocessed["normalized"])
            product = await self.knowledge.get_product_by_slug_or_name(db, query)
            if not product:
                found = await self.knowledge.search_products(db, query, limit=1)
                product = found[0] if found else None
            if not product:
                need = "product name" if lang == "en" else "পণ্যের নাম"
                return self.response.need_more_info(lang, [need]), {}
            ctx.last_product_slug = product.slug
            pd = {
                "name_en": product.name_en, "name_bn": product.name_bn,
                "price": float(product.price), "stock_quantity": product.stock_quantity,
                "description_en": product.description_en, "description_bn": product.description_bn,
                "slug": product.slug,
            }
            if intent == Intent.PRODUCT_PRICE:
                text = f"৳{float(product.price):,.0f}" if lang == "en" else f"দাম: ৳{float(product.price):,.0f}"
                return text, {"product": pd}
            if intent in (Intent.PRODUCT_STOCK, Intent.PRODUCT_AVAILABILITY):
                avail = product.stock_quantity > 0
                if lang == "bn":
                    text = f"স্টক: {product.stock_quantity}" + (" (উপলব্ধ)" if avail else " (স্টক নেই)")
                else:
                    text = f"Stock: {product.stock_quantity}" + (" (available)" if avail else " (out of stock)")
                return text, {"product": pd}
            return self.response.product_detail(lang, pd), {"product": pd}

        if intent in (Intent.SERVICE_INFO, Intent.SERVICE_PRICE):
            query = ctx.slots.get("service_query", "")
            found = await self.knowledge.search_services(db, query, limit=5)
            if not found and query:
                svc = await self.knowledge.get_service_by_slug_or_name(db, query)
                found = [svc] if svc else []
            svc_dicts = [{"name_en": s.name_en, "name_bn": s.name_bn, "slug": s.slug} for s in found]
            return self.response.service_list(lang, svc_dicts), {"services": svc_dicts}

        if intent in (Intent.ORDER_TRACKING, Intent.ORDER_STATUS):
            order_num = ctx.slots.get("order_number") or (
                entities.get(EntityType.ORDER_NUMBER).value if entities.get(EntityType.ORDER_NUMBER) else None
            )
            if order_num:
                order = await self.automation.track_order(db, order_num)
                if order:
                    return self.response.order_status(lang, order), {"order": order}
                return ("অর্ডার পাওয়া যায়নি।" if lang == "bn" else "Order not found."), {}
            if ctx.customer_phone:
                orders = await self.automation.track_orders_by_phone(db, ctx.customer_phone)
                if orders:
                    lines = [self.response.order_status(lang, o) for o in orders]
                    return "\n\n".join(lines), {"orders": orders}
            need = ["order number or phone"] if lang == "en" else ["অর্ডার নম্বর বা ফোন"]
            return self.response.need_more_info(lang, need), {}

        if intent == Intent.LEAD_CREATION:
            if not automation_perm.allowed:
                fields = ["name", "phone"] if lang == "en" else ["নাম", "ফোন"]
                return self.response.need_more_info(lang, fields), {}
            wf = await self.automation.create_lead(
                db,
                name=ctx.customer_name or "Customer",
                phone=ctx.customer_phone or "",
                project_description=preprocessed["raw"],
            )
            text = self.response.automation_success(lang, "Lead", wf.reference or "")
            return text, {"workflow": wf.status.value, "reference": wf.reference}

        if intent == Intent.SERVICE_BOOKING:
            if not automation_perm.allowed:
                fields = ["name", "phone", "service"] if lang == "en" else ["নাম", "ফোন", "সেবা"]
                return self.response.need_more_info(lang, fields), {}
            service_query = ctx.slots.get("service_query")
            service = None
            if service_query:
                service = await self.knowledge.get_service_by_slug_or_name(db, service_query)
            if not service:
                services = await self.knowledge.search_services(db, "", limit=1)
                service = services[0] if services else None
            if not service:
                return self.response.need_more_info(lang, ["service name"]), {}
            wf = await self.automation.create_booking(
                db,
                service_id=service.id,
                customer_name=ctx.customer_name or "Customer",
                customer_phone=ctx.customer_phone or "",
                customer_email=ctx.customer_email,
                pricing_type=service.pricing_type or "fixed",
                details=preprocessed["raw"],
            )
            text = self.response.automation_success(lang, "Booking", wf.reference or "")
            return text, {"workflow": wf.status.value, "reference": wf.reference}

        if intent == Intent.QUOTE:
            if not automation_perm.allowed:
                return self.response.need_more_info(lang, ["name", "phone", "project details"]), {}
            wf = await self.automation.create_lead(
                db,
                name=ctx.customer_name or "Customer",
                phone=ctx.customer_phone or "",
                lead_type="custom_quote",
                project_description=preprocessed["raw"],
            )
            text = (
                "কোট অনুরোধ গ্রহণ করা হয়েছে। শীঘ্রই যোগাযোগ করা হবে।"
                if lang == "bn"
                else "Quote request received. We will contact you shortly."
            )
            return text, {"reference": wf.reference}

        if intent == Intent.COMPLAINT:
            await self.automation.notify_admin(
                "Customer complaint via assistant",
                f"Phone: {ctx.customer_phone or 'N/A'}\nMessage: {preprocessed['raw']}",
            )
            text = (
                "আপনার অভিযোগ গ্রহণ করা হয়েছে। শীঘ্রই যোগাযোগ করা হবে।"
                if lang == "bn"
                else "Your complaint has been recorded. Our team will follow up shortly."
            )
            return text, {"notified": True}

        if intent == Intent.FAQ:
            faq = self.knowledge.get_faq("delivery", lang)
            return self.response.faq_answer(lang, faq or self.response.unknown(lang)), {}

        if intent == Intent.BLOG:
            posts = await self.knowledge.get_recent_blog_posts(db)
            if not posts:
                return ("কোনো ব্লগ পোস্ট নেই।" if lang == "bn" else "No blog posts available."), {}
            lines = [f"• {p.title_en}" for p in posts]
            header = "সাম্প্রতিক ব্লগ:" if lang == "bn" else "Recent blog posts:"
            return header + "\n" + "\n".join(lines), {"posts": [{"title": p.title_en, "slug": p.slug} for p in posts]}

        if intent == Intent.CUSTOMER_SUPPORT:
            info = await self.knowledge.get_contact_info(db)
            text = self.response.contact(lang, info)
            if lang == "bn":
                text += "\n\nঅথবা WhatsApp-এ সরাসরি যোগাযোগ করুন।"
            else:
                text += "\n\nOr contact us directly on WhatsApp."
            return text, {"contact": info}

        if intent == Intent.ORDER_CREATION:
            return (
                "অর্ডার করতে পণ্য নির্বাচন করে চেকআউট পেজ ব্যবহার করুন।"
                if lang == "bn"
                else "To place an order, add products to cart and use the checkout page.",
            ), {"redirect": "/checkout"}

        # Fallback intents
        return self.response.unknown(lang), {}

    async def _finalize_turn(self, db, conv, ctx, user_msg, assistant_msg, intent, metadata):
        await self.conversation_mgr.save_turn(db, conv, ctx, user_msg, assistant_msg, intent, metadata)

    def _suggestions(self, intent: Intent, lang: str) -> list[str]:
        if lang == "bn":
            defaults = ["পণ্য খুঁজুন", "সেবা দেখুন", "অর্ডার ট্র্যাক করুন", "যোগাযোগ"]
        else:
            defaults = ["Search products", "View services", "Track order", "Contact us"]
        if intent == Intent.GREETING:
            return defaults
        return defaults[:3]

    def _error_response(self, lang: str, error: str) -> dict:
        return {"message": error, "intent": "error", "language": lang, "success": False}
