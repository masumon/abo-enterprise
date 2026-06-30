"""Main assistant pipeline — coordinates all engines."""

import re
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.assistant.constants import Intent, EntityType
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

_FOLLOW_UP_PRODUCT = frozenset({
    Intent.PRODUCT_PRICE, Intent.PRODUCT_STOCK, Intent.PRODUCT_AVAILABILITY, Intent.PRODUCT_DETAILS,
})
_SHORT_FOLLOW_UP = frozenset({
    "price", "cost", "rate", "stock", "available", "availability", "details", "info",
    "দাম", "মূল্য", "স্টক", "বিস্তারিত", "উপলব্ধ", "কত",
})
_COUPON_CODE_RE = re.compile(r"\b[A-Z0-9]{3,20}\b")


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
        msg_validation = self.validation.validate_message(message)
        if not msg_validation.valid:
            return self._error_response("en", msg_validation.errors[0])

        session_validation = self.validation.validate_session_id(session_id)
        if not session_validation.valid:
            return self._error_response("en", session_validation.errors[0])

        conv, ctx = await self.conversation_mgr.get_or_create_session(db, session_id, customer_phone)
        await self.knowledge.load_faq_from_db(db)
        ctx = self.context_mgr.merge(
            ctx, conv.session_id,
            customer_name=customer_name or ctx.customer_name,
            customer_phone=customer_phone or ctx.customer_phone,
            customer_email=customer_email or ctx.customer_email,
        )

        preprocessed = preprocess_text(message)
        if language:
            ctx.language = language
        elif preprocessed["language"] != "en":
            ctx.language = preprocessed["language"]

        lang = ctx.language

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
        intent = self._resolve_follow_up_intent(intent, ctx, preprocessed)
        ctx.last_intent = intent.value

        perm = self.permissions.check_public_intent(intent)
        if not perm.allowed:
            text = self.response.permission_denied(lang, perm.reason)
            await self._finalize_turn(db, conv, ctx, message, text, intent.value, {"blocked": True})
            return self._build_result(lang, intent, text, conv.session_id)

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
            return self._build_result(lang, intent, text, conv.session_id)

        if rule_result.notify_admin:
            await self.automation.notify_admin(
                "Assistant suspicious activity",
                f"Session {conv.session_id}: flags={rule_result.flags}, intent={intent.value}",
            )

        response_data: dict[str, Any] = {
            "confidence": round(confidence, 2),
            "entities": [{"type": e.type.value, "value": e.value} for e in entities.entities],
        }
        text, action_data, links = await self._handle_intent(db, ctx, intent, entities, preprocessed, lang)
        response_data.update(action_data or {})

        await self.logging.log_action(
            db, session_id=conv.session_id, intent=intent.value,
            action="chat", status="success", details={"confidence": confidence},
        )
        await self._finalize_turn(db, conv, ctx, message, text, intent.value, response_data)

        suggestions = self._suggestions(intent, lang, ctx)
        result = self.response.format_response(lang, intent, text, data=response_data, suggestions=suggestions, links=links)
        result["session_id"] = conv.session_id
        return result

    def _resolve_follow_up_intent(self, intent: Intent, ctx: ConversationContext, preprocessed: dict) -> Intent:
        normalized = preprocessed["normalized"].strip()
        words = normalized.split()
        is_short = len(words) <= 3

        if intent in _FOLLOW_UP_PRODUCT and is_short and not ctx.slots.get("product_query") and ctx.last_product_slug:
            return intent

        if is_short and normalized in _SHORT_FOLLOW_UP and ctx.last_product_slug:
            if intent == Intent.UNKNOWN:
                return Intent.PRODUCT_PRICE if normalized in {"price", "cost", "rate", "দাম", "মূল্য", "কত"} else Intent.PRODUCT_DETAILS

        if ctx.pending_action == "order_tracking" and (preprocessed.get("order_numbers") or preprocessed.get("phones")):
            return Intent.ORDER_TRACKING

        return intent

    async def _handle_intent(self, db, ctx, intent, entities, preprocessed, lang):
        automation_perm = self.permissions.check_automation(intent, ctx.has_identity(), False)
        links: list[dict] = []

        if intent == Intent.GREETING:
            welcome = await self.knowledge.get_assistant_welcome(db, lang)
            return self.response.greeting(lang, ctx.customer_name, welcome), {}, links

        if intent == Intent.UNKNOWN:
            return await self._handle_unknown(db, ctx, preprocessed, lang)

        if intent == Intent.CONTACT or intent == Intent.BUSINESS_HOURS:
            info = await self.knowledge.get_contact_info(db, lang)
            return self.response.contact(lang, info), {"contact": info}, links

        if intent == Intent.DELIVERY:
            info = await self.knowledge.get_delivery_info(db, lang)
            return self.response.delivery_info(lang, info), {"delivery": info}, links

        if intent in (Intent.WARRANTY, Intent.RETURN_POLICY, Intent.PAYMENT, Intent.COMPANY_INFO):
            key_map = {
                Intent.WARRANTY: "warranty",
                Intent.RETURN_POLICY: "return",
                Intent.PAYMENT: "payment",
                Intent.COMPANY_INFO: "company",
            }
            faq = self.knowledge.get_faq(key_map[intent], lang)
            return self.response.faq_answer(lang, faq or self.response.unknown(lang)), {}, links

        if intent in (Intent.PRODUCT_SEARCH, Intent.CATEGORY, Intent.BRAND):
            query = ctx.slots.get("product_query", "") or preprocessed["normalized"]
            category = entities.get(EntityType.CATEGORY)
            brand = entities.get(EntityType.BRAND)
            cat_val = category.value if category else None
            brand_val = brand.value if brand else None
            if intent == Intent.CATEGORY and not cat_val:
                cats = await self.knowledge.list_categories(db)
                text = ("ক্যাটাগরি: " if lang == "bn" else "Categories: ") + ", ".join(cats[:15])
                return text, {"categories": cats}, links
            if intent == Intent.BRAND and not brand_val:
                brs = await self.knowledge.list_brands(db)
                text = ("ব্র্যান্ড: " if lang == "bn" else "Brands: ") + ", ".join(brs[:15])
                return text, {"brands": brs}, links
            if intent == Intent.PRODUCT_SEARCH and not query.strip():
                found = await self.knowledge.search_products(db, "", limit=5)
            else:
                found = await self.knowledge.search_products(db, query, limit=5, category=cat_val, brand=brand_val)
            product_dicts = [self.knowledge.product_to_dict(p) for p in found]
            links = self.response.product_links(product_dicts)
            return self.response.product_list(lang, product_dicts), {"products": product_dicts}, links

        if intent in (Intent.PRODUCT_DETAILS, Intent.PRODUCT_PRICE, Intent.PRODUCT_STOCK, Intent.PRODUCT_AVAILABILITY):
            product = await self._resolve_product(db, ctx, entities, preprocessed)
            if not product:
                need = "product name" if lang == "en" else "পণ্যের নাম"
                return self.response.need_more_info(lang, [need]), {}, links
            ctx.last_product_slug = product.slug
            pd = self.knowledge.product_to_dict(product)
            links = [self.response._product_link(product.slug)]
            if intent == Intent.PRODUCT_PRICE:
                text = f"৳{float(product.price):,.0f}" if lang == "en" else f"দাম: ৳{float(product.price):,.0f}"
                return text, {"product": pd}, links
            if intent in (Intent.PRODUCT_STOCK, Intent.PRODUCT_AVAILABILITY):
                avail = product.stock_quantity > 0
                if lang == "bn":
                    text = f"স্টক: {product.stock_quantity}" + (" (উপলব্ধ)" if avail else " (স্টক নেই)")
                else:
                    text = f"Stock: {product.stock_quantity}" + (" (available)" if avail else " (out of stock)")
                return text, {"product": pd}, links
            return self.response.product_detail(lang, pd), {"product": pd}, links

        if intent in (Intent.SERVICE_INFO, Intent.SERVICE_PRICE):
            query = ctx.slots.get("service_query", "") or preprocessed["normalized"]
            if query.strip():
                service, tiers = await self.knowledge.get_service_with_tiers(db, query)
                if service:
                    ctx.last_service_slug = service.slug
                    sd = self.knowledge.service_to_dict(service, tiers)
                    links = [self.response._service_link(service.slug)]
                    if intent == Intent.SERVICE_PRICE:
                        hint = self.response._service_price_hint(sd, lang)
                        return hint or self.response.service_detail(lang, sd), {"service": sd}, links
                    return self.response.service_detail(lang, sd), {"service": sd}, links
            found = await self.knowledge.search_services(db, query, limit=5)
            svc_dicts = [self.knowledge.service_to_dict(s) for s in found]
            links = self.response.service_links(svc_dicts)
            return self.response.service_list(lang, svc_dicts), {"services": svc_dicts}, links

        if intent in (Intent.ORDER_TRACKING, Intent.ORDER_STATUS):
            ctx.pending_action = None
            order_num = ctx.slots.get("order_number") or (
                entities.get(EntityType.ORDER_NUMBER).value if entities.get(EntityType.ORDER_NUMBER) else None
            )
            if order_num:
                order = await self.automation.track_order(db, order_num)
                if order:
                    track_links = [{"label": "Track order", "label_bn": "অর্ডার ট্র্যাক", "url": f"/track?order={order_num}", "type": "track"}]
                    return self.response.order_status(lang, order), {"order": order}, track_links
                return ("অর্ডার পাওয়া যায়নি।" if lang == "bn" else "Order not found."), {}, links
            if ctx.customer_phone:
                orders = await self.automation.track_orders_by_phone(db, ctx.customer_phone)
                if orders:
                    lines = [self.response.order_status(lang, o) for o in orders]
                    return "\n\n".join(lines), {"orders": orders}, links
            ctx.pending_action = "order_tracking"
            need = ["order number or phone"] if lang == "en" else ["অর্ডার নম্বর বা ফোন"]
            return self.response.need_more_info(lang, need), {}, links

        if intent == Intent.INVOICE:
            order_num = ctx.slots.get("order_number") or (
                entities.get(EntityType.ORDER_NUMBER).value if entities.get(EntityType.ORDER_NUMBER) else None
            )
            text = self.response.invoice_help(lang, order_num)
            inv_links = []
            if order_num:
                inv_links.append({"label": "Track & invoice", "label_bn": "ট্র্যাক ও ইনভয়েস", "url": f"/track?order={order_num}", "type": "invoice"})
            return text, {"order_number": order_num}, inv_links

        if intent == Intent.COUPON:
            code = self._extract_coupon_code(preprocessed)
            if code:
                coupon = await self.knowledge.get_coupon(db, code)
                if coupon:
                    checkout_links = [{"label": "Checkout", "label_bn": "চেকআউট", "url": f"/checkout?coupon={code}", "type": "checkout"}]
                    return self.response.coupon_info(lang, coupon), {"coupon": coupon}, checkout_links
                return ("কুপন সঠিক নয়।" if lang == "bn" else "Invalid coupon code."), {}, links
            coupons = await self.knowledge.load_coupons(db)
            active = []
            for k, v in coupons.items():
                if not v.get("active", True):
                    continue
                discount_raw = float(v.get("discount_percent", v.get("discount_rate", 0)))
                if discount_raw <= 1:
                    discount_raw *= 100
                active.append({
                    "code": k,
                    "discount_percent": round(discount_raw, 2),
                    "min_subtotal": float(v.get("min_subtotal", 0)),
                })
            active = active[:5]
            return self.response.coupon_list(lang, active), {"coupons": active}, links

        if intent == Intent.LEAD_CREATION:
            if not automation_perm.allowed:
                fields = ["name", "phone"] if lang == "en" else ["নাম", "ফোন"]
                return self.response.need_more_info(lang, fields), {}, links
            wf = await self.automation.create_lead(
                db, name=ctx.customer_name or "Customer", phone=ctx.customer_phone or "",
                project_description=preprocessed["raw"],
            )
            return self.response.automation_success(lang, "Lead", wf.reference or ""), {"workflow": wf.status.value, "reference": wf.reference}, links

        if intent == Intent.SERVICE_BOOKING:
            if not automation_perm.allowed:
                fields = ["name", "phone", "service"] if lang == "en" else ["নাম", "ফোন", "সেবা"]
                return self.response.need_more_info(lang, fields), {}, links
            service_query = ctx.slots.get("service_query")
            service = None
            if service_query:
                service = await self.knowledge.get_service_by_slug_or_name(db, service_query)
            if not service and ctx.last_service_slug:
                service = await self.knowledge.get_service_by_slug_or_name(db, ctx.last_service_slug)
            if not service:
                services = await self.knowledge.search_services(db, "", limit=1)
                service = services[0] if services else None
            if not service:
                return self.response.need_more_info(lang, ["service name"]), {}, links
            wf = await self.automation.create_booking(
                db, service_id=service.id, customer_name=ctx.customer_name or "Customer",
                customer_phone=ctx.customer_phone or "", customer_email=ctx.customer_email,
                pricing_type=service.pricing_type or "fixed", details=preprocessed["raw"],
            )
            book_links = [self.response._service_link(service.slug)]
            return self.response.automation_success(lang, "Booking", wf.reference or ""), {"workflow": wf.status.value, "reference": wf.reference}, book_links

        if intent == Intent.QUOTE:
            if not automation_perm.allowed:
                return self.response.need_more_info(lang, ["name", "phone", "project details"]), {}, links
            wf = await self.automation.create_lead(
                db, name=ctx.customer_name or "Customer", phone=ctx.customer_phone or "",
                lead_type="custom_quote", project_description=preprocessed["raw"],
            )
            text = (
                "কোট অনুরোধ গ্রহণ করা হয়েছে। শীঘ্রই যোগাযোগ করা হবে।"
                if lang == "bn" else "Quote request received. We will contact you shortly."
            )
            return text, {"reference": wf.reference}, links

        if intent == Intent.COMPLAINT:
            await self.automation.notify_admin(
                "Customer complaint via assistant",
                f"Phone: {ctx.customer_phone or 'N/A'}\nMessage: {preprocessed['raw']}",
            )
            text = (
                "আপনার অভিযোগ গ্রহণ করা হয়েছে। শীঘ্রই যোগাযোগ করা হবে।"
                if lang == "bn" else "Your complaint has been recorded. Our team will follow up shortly."
            )
            return text, {"notified": True}, links

        if intent == Intent.FAQ:
            query = preprocessed["normalized"]
            results = self.knowledge.search_faq(query, lang, limit=3)
            if results:
                return self.response.faq_search_results(lang, results), {"faq": results}, links
            topics = self.knowledge.list_faq_topics()
            header = "FAQ বিষয়:" if lang == "bn" else "FAQ topics:"
            return header + " " + ", ".join(topics[:8]), {"topics": topics}, links

        if intent == Intent.BLOG:
            query = ctx.slots.get("product_query", "") or preprocessed["normalized"]
            if any(kw in query for kw in ("blog", "article", "news", "ব্লগ", "নিউজ")):
                query = ""
            posts_raw = await self.knowledge.search_blog_posts(db, query, limit=3) if query else await self.knowledge.get_recent_blog_posts(db)
            posts = [{"title_en": p.title_en, "title_bn": p.title_bn, "slug": p.slug} for p in posts_raw]
            links = self.response.blog_links(posts)
            return self.response.blog_list(lang, posts), {"posts": posts}, links

        if intent == Intent.PORTFOLIO:
            text = self.response.portfolio_info(lang)
            port_links = [{"label": "Services", "label_bn": "সেবা", "url": "/services", "type": "page"}]
            return text, {"redirect": "/services"}, port_links

        if intent == Intent.REVIEW_REQUEST:
            return self.response.review_request(lang), {}, links

        if intent == Intent.CUSTOMER_SUPPORT:
            info = await self.knowledge.get_contact_info(db, lang)
            return self.response.contact(lang, info), {"contact": info}, links

        if intent == Intent.ORDER_CREATION:
            text = (
                "অর্ডার করতে পণ্য নির্বাচন করে চেকআউট পেজ ব্যবহার করুন।"
                if lang == "bn" else "To place an order, add products to cart and use the checkout page."
            )
            checkout_links = [{"label": "Checkout", "label_bn": "চেকআউট", "url": "/checkout", "type": "checkout"}]
            return text, {"redirect": "/checkout"}, checkout_links

        return self.response.unknown(lang), {}, links

    async def _handle_unknown(self, db, ctx, preprocessed, lang):
        query = preprocessed["normalized"].strip()
        links: list[dict] = []

        faq_hits = self.knowledge.search_faq(query, lang, limit=1)
        if faq_hits:
            return self.response.faq_search_results(lang, faq_hits), {"faq": faq_hits}, links

        posts_raw = await self.knowledge.search_blog_posts(db, query, limit=2)
        if posts_raw:
            posts = [{"title_en": p.title_en, "title_bn": p.title_bn, "slug": p.slug} for p in posts_raw]
            links = self.response.blog_links(posts)
            return self.response.blog_list(lang, posts), {"posts": posts}, links

        found = await self.knowledge.search_products(db, query, limit=3)
        if found:
            product_dicts = [self.knowledge.product_to_dict(p) for p in found]
            links = self.response.product_links(product_dicts)
            return self.response.product_list(lang, product_dicts), {"products": product_dicts}, links

        svcs = await self.knowledge.search_services(db, query, limit=3)
        if svcs:
            svc_dicts = [self.knowledge.service_to_dict(s) for s in svcs]
            links = self.response.service_links(svc_dicts)
            return self.response.service_list(lang, svc_dicts), {"services": svc_dicts}, links

        from app.assistant.web_search import search_web
        web = await search_web(query)
        if web:
            return self.response.web_enriched(lang, web), {"web_search": True}, links

        return self.response.unknown(lang), {}, links

    async def _resolve_product(self, db, ctx, entities, preprocessed):
        query = ctx.slots.get("product_query", preprocessed["normalized"])
        if ctx.last_product_slug and (not query or query in _SHORT_FOLLOW_UP):
            product = await self.knowledge.get_product_by_slug(db, ctx.last_product_slug)
            if product:
                return product
        product = await self.knowledge.get_product_by_slug_or_name(db, query)
        if not product:
            found = await self.knowledge.search_products(db, query, limit=1)
            product = found[0] if found else None
        return product

    def _extract_coupon_code(self, preprocessed: dict) -> str | None:
        raw = preprocessed.get("raw", "")
        for match in _COUPON_CODE_RE.findall(raw.upper()):
            if match not in {"FAQ", "COD", "BDT", "ABO", "PDF", "URL", "SMS"}:
                return match
        return None

    async def _finalize_turn(self, db, conv, ctx, user_msg, assistant_msg, intent, metadata):
        await self.conversation_mgr.save_turn(db, conv, ctx, user_msg, assistant_msg, intent, metadata)

    def _suggestions(self, intent: Intent, lang: str, ctx: ConversationContext | None = None) -> list[str]:
        if lang == "bn":
            by_intent = {
                Intent.GREETING: ["পণ্য দেখান", "সেবা সম্পর্কে", "অর্ডার ট্র্যাক", "যোগাযোগ"],
                Intent.PRODUCT_SEARCH: ["ক্যাটাগরি দেখুন", "ডেলিভারি চার্জ", "কুপন আছে?", "যোগাযোগ"],
                Intent.PRODUCT_DETAILS: ["স্টক আছে?", "অর্ডার করুন", "ডেলিভারি সময়"],
                Intent.ORDER_TRACKING: ["ইনভয়েস ডাউনলোড", "যোগাযোগ", "অর্ডার করুন"],
                Intent.DELIVERY: ["পেমেন্ট অপশন", "রিটার্ন পলিসি", "পণ্য দেখান"],
                Intent.COUPON: ["চেকআউট", "পণ্য দেখান", "ডেলিভারি চার্জ"],
                Intent.SERVICE_INFO: ["সেবা বুক করুন", "কোট চান", "যোগাযোগ"],
            }
            defaults = ["পণ্য খুঁজুন", "সেবা দেখুন", "অর্ডার ট্র্যাক", "যোগাযোগ"]
        else:
            by_intent = {
                Intent.GREETING: ["Show products", "About services", "Track order", "Contact us"],
                Intent.PRODUCT_SEARCH: ["Browse categories", "Delivery charges", "Any coupons?", "Contact"],
                Intent.PRODUCT_DETAILS: ["Check stock", "Place order", "Delivery time"],
                Intent.ORDER_TRACKING: ["Download invoice", "Contact support", "Place order"],
                Intent.DELIVERY: ["Payment options", "Return policy", "Browse products"],
                Intent.COUPON: ["Go to checkout", "Browse products", "Delivery info"],
                Intent.SERVICE_INFO: ["Book service", "Get a quote", "Contact us"],
            }
            defaults = ["Search products", "View services", "Track order", "Contact us"]

        suggestions = by_intent.get(intent, defaults)
        if ctx and ctx.last_product_slug and intent in _FOLLOW_UP_PRODUCT:
            if lang == "bn":
                suggestions = ["স্টক আছে?", "অর্ডার করুন", "ডেলিভারি চার্জ"]
            else:
                suggestions = ["Check stock", "Place order", "Delivery charges"]
        return suggestions[:4]

    def _build_result(self, lang: str, intent: Intent, text: str, session_id: str) -> dict:
        result = self.response.format_response(lang, intent, text)
        result["session_id"] = session_id
        return result

    def _error_response(self, lang: str, error: str) -> dict:
        return {"message": error, "intent": "error", "language": lang, "success": False}
