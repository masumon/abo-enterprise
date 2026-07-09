"""Main assistant pipeline — coordinates all engines."""

import re
import time
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
from app.assistant.action_workflow import ActionWorkflowEngine
from app.assistant.feature_flags import load_feature_flags, is_intent_allowed, is_workflow_allowed, AssistantFeatureFlags
from app.assistant import site_map

_FOLLOW_UP_PRODUCT = frozenset({
    Intent.PRODUCT_PRICE, Intent.PRODUCT_STOCK, Intent.PRODUCT_AVAILABILITY, Intent.PRODUCT_DETAILS,
})
_SHORT_FOLLOW_UP = frozenset({
    "price", "cost", "rate", "stock", "available", "availability", "details", "info",
    "দাম", "মূল্য", "স্টক", "বিস্তারিত", "উপলব্ধ", "কত",
    # tokens the preprocessor may append as hints
    "how", "much", "dam", "koto", "ache", "mojud", "stok",
})
_COUPON_CODE_RE = re.compile(r"\b[A-Z0-9]{3,20}\b")

# Filler words stripped from product/service search queries so
# "laptop er dam koto" searches for "laptop", not the whole sentence.
_QUERY_STOPWORDS = frozenset({
    "a", "an", "the", "i", "me", "my", "you", "your", "is", "are", "do", "does",
    "what", "which", "how", "much", "many", "can", "could", "please", "pls",
    "show", "find", "search", "looking", "for", "want", "need", "buy", "get",
    "tell", "about", "of", "in", "on", "to", "have", "any", "there",
    "price", "cost", "rate", "stock", "available", "availability", "details", "info",
    "product", "products", "item", "items", "service", "services",
    "er", "ta", "ti", "ki", "ki?", "koto", "dam", "daam", "ache", "ase", "chai", "lagbe",
    "kinbo", "kinte", "korbo", "nibo", "nite", "koi", "kothay", "vai", "bhai", "apni",
    "আমি", "আমার", "আপনার", "আপনি", "কি", "কী", "কত", "দাম", "মূল্য", "স্টক", "আছে",
    "চাই", "লাগবে", "কিনব", "কিনতে", "নিতে", "দেখান", "দেখাও", "খুঁজুন", "সম্পর্কে",
    "পণ্য", "প্রোডাক্ট", "সেবা", "সার্ভিস", "একটা", "একটি", "টা", "টি", "এর", "কেমন",
})


def _clean_search_query(text: str) -> str:
    tokens = re.findall(r"[\wঀ-৿]+", text.lower())
    kept = [t for t in tokens if t not in _QUERY_STOPWORDS and len(t) >= 2]
    return " ".join(kept)


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
        self.action_workflow = ActionWorkflowEngine(
            self.knowledge, self.automation, self.response, self.validation,
        )

    async def process_message(
        self,
        db: AsyncSession,
        message: str,
        session_id: str | None = None,
        customer_name: str | None = None,
        customer_phone: str | None = None,
        customer_email: str | None = None,
        language: str | None = None,
        page_path: str | None = None,
    ) -> dict[str, Any]:
        msg_validation = self.validation.validate_message(message)
        if not msg_validation.valid:
            return self._error_response("en", msg_validation.errors[0])

        session_validation = self.validation.validate_session_id(session_id)
        if not session_validation.valid:
            return self._error_response("en", session_validation.errors[0])

        conv, ctx = await self.conversation_mgr.get_or_create_session(db, session_id, customer_phone)
        await self.knowledge.load_faq_from_db(db)
        flags = await load_feature_flags(db)
        ctx = self.context_mgr.merge(
            ctx, conv.session_id,
            customer_name=customer_name or ctx.customer_name,
            customer_phone=customer_phone or ctx.customer_phone,
            customer_email=customer_email or ctx.customer_email,
        )

        preprocessed = preprocess_text(message)
        if language in ("bn", "en"):
            ctx.language = language
        elif preprocessed["language"] in ("bn", "mixed"):
            # Any Bengali script → reply in Bengali.
            ctx.language = "bn"
        elif len(preprocessed["normalized"].split()) >= 3:
            # A full English sentence switches the reply language back.
            ctx.language = "en"

        lang = ctx.language

        # Product/service mentions are per-turn signals; stale slots from a
        # previous question must not hijack this turn's search. Follow-up
        # questions still work via last_product_slug / last_service_slug.
        # (order/booking/lead numbers stay — they're explicit identifiers.)
        ctx.slots.pop("product_query", None)
        ctx.slots.pop("service_query", None)

        if page_path:
            _page, module, slug = site_map.page_for_path(page_path)
            ctx.current_page = page_path.split("?")[0]
            ctx.current_module = module
            if slug and module == "product_detail":
                prod = await self.knowledge.get_product_by_slug(db, slug)
                if prod:
                    ctx.last_product_slug = prod.slug
            elif slug and module == "service_detail":
                svc, _tiers = await self.knowledge.get_service_with_tiers(db, slug)
                if svc:
                    ctx.last_service_slug = svc.slug

        product_names, service_names, categories, brands = await self._entity_vocab(db)

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

        # Active multi-turn workflow takes priority
        if self.action_workflow.is_active(ctx):
            wf_type = ctx.slots.get("workflow", {}).get("type", "")
            if not is_workflow_allowed(flags, wf_type):
                self.action_workflow._clear(ctx)
                text = self.response.feature_disabled(lang, wf_type)
                await self._finalize_turn(db, conv, ctx, message, text, "feature_disabled", {})
                return self._build_result(lang, Intent.UNKNOWN, text, conv.session_id)
            wf_result = await self.action_workflow.handle_turn(db, ctx, preprocessed, lang, entities)
            if wf_result:
                text, action_data, links = wf_result
                response_data: dict[str, Any] = {"workflow": True}
                response_data.update(action_data or {})
                await self._finalize_turn(db, conv, ctx, message, text, ctx.slots.get("workflow", {}).get("type", "workflow"), response_data)
                suggestions = self._suggestions(Intent.ORDER_CREATION if ctx.slots.get("workflow", {}).get("type") == "order" else Intent.GREETING, lang, ctx)
                result = self.response.format_response(lang, Intent.ORDER_CREATION, text, data=response_data, suggestions=suggestions, links=links)
                result["session_id"] = conv.session_id
                return result

        ctx.last_intent = intent.value

        if not is_intent_allowed(flags, intent):
            label = intent.value.replace("_", " ")
            text = self.response.feature_disabled(lang, label)
            await self._finalize_turn(db, conv, ctx, message, text, intent.value, {"feature_disabled": True})
            return self._build_result(lang, intent, text, conv.session_id)

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
        text, action_data, links = await self._handle_intent(db, ctx, intent, entities, preprocessed, lang, flags)
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

    @staticmethod
    def _is_short_follow_up(preprocessed: dict) -> bool:
        """True when every token is a follow-up word (e.g. 'dam koto', 'দাম')."""
        # Hint expansion can double the token count ("dam koto" →
        # "dam koto price how much"), so allow a few extra tokens; the
        # all-tokens-must-be-follow-up-words rule is the real guard.
        tokens = [re.sub(r"[^\wঀ-৿]", "", t) for t in preprocessed["normalized"].split()]
        tokens = [t for t in tokens if t]
        return bool(tokens) and len(tokens) <= 6 and all(t in _SHORT_FOLLOW_UP for t in tokens)

    def _resolve_follow_up_intent(self, intent: Intent, ctx: ConversationContext, preprocessed: dict) -> Intent:
        if self._is_short_follow_up(preprocessed) and ctx.last_product_slug:
            if intent == Intent.UNKNOWN:
                tokens = set(preprocessed["normalized"].split())
                price_words = {"price", "cost", "rate", "দাম", "মূল্য", "কত", "dam", "koto", "much"}
                return Intent.PRODUCT_PRICE if tokens & price_words else Intent.PRODUCT_DETAILS

        if ctx.pending_action == "order_tracking" and (preprocessed.get("order_numbers") or preprocessed.get("phones")):
            return Intent.ORDER_TRACKING
        if ctx.pending_action == "booking_tracking" and (preprocessed.get("booking_numbers") or preprocessed.get("phones")):
            return Intent.BOOKING_TRACKING
        if ctx.pending_action == "lead_tracking" and (preprocessed.get("lead_numbers") or preprocessed.get("phones")):
            return Intent.LEAD_TRACKING

        return intent

    async def _handle_intent(self, db, ctx, intent, entities, preprocessed, lang, flags: AssistantFeatureFlags):
        links: list[dict] = []

        if intent == Intent.GREETING:
            welcome = await self.knowledge.get_assistant_welcome(db, lang)
            return self.response.greeting(lang, ctx.customer_name, welcome), {}, links

        if intent == Intent.UNKNOWN:
            return await self._handle_unknown(db, ctx, preprocessed, lang, flags)

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
            query = ctx.slots.get("product_query", "") or _clean_search_query(preprocessed["normalized"])
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
            query = ctx.slots.get("service_query", "") or _clean_search_query(preprocessed["normalized"])
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

        if intent in (Intent.ORDER_TRACKING, Intent.ORDER_STATUS, Intent.COURIER_TRACKING):
            ctx.pending_action = None
            order_num = ctx.slots.get("order_number") or (
                entities.get(EntityType.ORDER_NUMBER).value if entities.get(EntityType.ORDER_NUMBER) else None
            )
            if order_num:
                order = await self.automation.track_order(db, order_num)
                if order:
                    track_links = [{"label": "Track order", "label_bn": "অর্ডার ট্র্যাক", "url": f"/track?order={order_num}", "type": "track"}]
                    if order.get("courier_tracking_id"):
                        track_links.append({"label": "Courier info", "label_bn": "কুরিয়ার", "url": f"/track?order={order_num}", "type": "courier"})
                    text = self.response.order_status(lang, order)
                    if intent == Intent.COURIER_TRACKING and order.get("courier_tracking_id"):
                        if lang == "bn":
                            text += f"\n\n🚚 কুরিয়ার ট্র্যাকিং: {order['courier_tracking_id']}"
                        else:
                            text += f"\n\n🚚 Courier tracking: {order['courier_tracking_id']}"
                    return text, {"order": order}, track_links
                return ("অর্ডার পাওয়া যায়নি।" if lang == "bn" else "Order not found."), {}, links
            if ctx.customer_phone:
                orders = await self.automation.track_orders_by_phone(db, ctx.customer_phone)
                if orders:
                    lines = [self.response.order_status(lang, o) for o in orders]
                    return "\n\n".join(lines), {"orders": orders}, links
            ctx.pending_action = "order_tracking"
            need = ["order number or phone"] if lang == "en" else ["অর্ডার নম্বর বা ফোন"]
            return self.response.need_more_info(lang, need), {}, links

        if intent == Intent.BOOKING_TRACKING:
            ctx.pending_action = None
            booking_num = ctx.slots.get("booking_number") or (
                entities.get(EntityType.BOOKING_NUMBER).value if entities.get(EntityType.BOOKING_NUMBER) else None
            )
            if booking_num:
                booking = await self.automation.track_booking(db, booking_num)
                if booking:
                    return self.response.booking_status(lang, booking), {"booking": booking}, links
                return ("বুকিং পাওয়া যায়নি।" if lang == "bn" else "Booking not found."), {}, links
            if ctx.customer_phone:
                bookings = await self.automation.track_bookings_by_phone(db, ctx.customer_phone)
                if bookings:
                    lines = [self.response.booking_status(lang, b) for b in bookings]
                    return "\n\n".join(lines), {"bookings": bookings}, links
            ctx.pending_action = "booking_tracking"
            need = ["booking number or phone"] if lang == "en" else ["বুকিং নম্বর বা ফোন"]
            return self.response.need_more_info(lang, need), {}, links

        if intent == Intent.LEAD_TRACKING:
            ctx.pending_action = None
            lead_num = ctx.slots.get("lead_number") or (
                entities.get(EntityType.LEAD_NUMBER).value if entities.get(EntityType.LEAD_NUMBER) else None
            )
            if lead_num:
                lead = await self.automation.track_lead(db, lead_num)
                if lead:
                    return self.response.lead_status(lang, lead), {"lead": lead}, links
                return ("লিড পাওয়া যায়নি।" if lang == "bn" else "Lead/inquiry not found."), {}, links
            if ctx.customer_phone:
                leads = await self.automation.track_leads_by_phone(db, ctx.customer_phone)
                if leads:
                    lines = [self.response.lead_status(lang, l) for l in leads]
                    return "\n\n".join(lines), {"leads": leads}, links
            ctx.pending_action = "lead_tracking"
            need = ["lead reference or phone"] if lang == "en" else ["লিড রেফারেন্স বা ফোন"]
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
            codes = self._extract_coupon_codes(preprocessed)
            invalid_code: str | None = None
            for code in codes:
                coupon = await self.knowledge.get_coupon(db, code)
                if coupon:
                    checkout_links = [{"label": "Checkout", "label_bn": "চেকআউট", "url": f"/checkout?coupon={code}", "type": "checkout"}]
                    return self.response.coupon_info(lang, coupon), {"coupon": coupon}, checkout_links
                invalid_code = code
            if invalid_code:
                return (
                    f"'{invalid_code}' কুপনটি সঠিক নয়। চালু অফারগুলো দেখতে 'কুপন' লিখুন।"
                    if lang == "bn"
                    else f"Coupon '{invalid_code}' is not valid. Type 'coupon' to see current offers."
                ), {}, links
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
            return await self.action_workflow.start_lead(ctx, preprocessed, lang, "general")

        if intent == Intent.SERVICE_BOOKING:
            return await self.action_workflow.start_booking(db, ctx, preprocessed, lang, entities)

        if intent == Intent.QUOTE:
            return await self.action_workflow.start_lead(ctx, preprocessed, lang, "custom_quote")

        if intent == Intent.ORDER_CREATION:
            return await self.action_workflow.start_order(db, ctx, preprocessed, lang, entities)

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

        if intent == Intent.NAVIGATION:
            page = site_map.find_page(preprocessed["normalized"], lang)
            if page:
                text = site_map.navigation_answer(page, lang)
                return text, {"page": page.path}, site_map.navigation_links(page, lang)
            # fall through to knowledge search when no page matched
            return await self._handle_unknown(db, ctx, preprocessed, lang, flags)

        if intent == Intent.REVIEW_REQUEST:
            return self.response.review_request(lang), {}, links

        if intent == Intent.CUSTOMER_SUPPORT:
            info = await self.knowledge.get_contact_info(db, lang)
            return self.response.contact(lang, info), {"contact": info}, links

        return self.response.unknown(lang), {}, links

    async def _handle_unknown(self, db, ctx, preprocessed, lang, flags: AssistantFeatureFlags):
        query = preprocessed["normalized"].strip()
        links: list[dict] = []

        if flags.faq:
            faq_hits = self.knowledge.search_faq(query, lang, limit=1)
            if faq_hits:
                return self.response.faq_search_results(lang, faq_hits), {"faq": faq_hits}, links

        if flags.blog:
            posts_raw = await self.knowledge.search_blog_posts(db, query, limit=2)
            if posts_raw:
                posts = [{"title_en": p.title_en, "title_bn": p.title_bn, "slug": p.slug} for p in posts_raw]
                links = self.response.blog_links(posts)
                return self.response.blog_list(lang, posts), {"posts": posts}, links

        cleaned = _clean_search_query(query)
        if flags.product_search and cleaned:
            found = await self.knowledge.search_products(db, cleaned, limit=3)
            if found:
                product_dicts = [self.knowledge.product_to_dict(p) for p in found]
                links = self.response.product_links(product_dicts)
                return self.response.product_list(lang, product_dicts), {"products": product_dicts}, links

        if flags.service_info and cleaned:
            svcs = await self.knowledge.search_services(db, cleaned, limit=3)
            if svcs:
                svc_dicts = [self.knowledge.service_to_dict(s) for s in svcs]
                links = self.response.service_links(svc_dicts)
                return self.response.service_list(lang, svc_dicts), {"services": svc_dicts}, links

        page = site_map.find_page(query, lang)
        if page:
            return site_map.navigation_answer(page, lang), {"page": page.path}, site_map.navigation_links(page, lang)

        if flags.web_search and cleaned:
            from app.assistant.web_search import search_web
            web = await search_web(cleaned)
            if web:
                return self.response.web_enriched(lang, web), {"web_search": True}, links

        return self.response.unknown(lang), {}, links

    async def _resolve_product(self, db, ctx, entities, preprocessed):
        query = ctx.slots.get("product_query") or _clean_search_query(preprocessed["normalized"])
        if ctx.last_product_slug and (not query or self._is_short_follow_up(preprocessed)):
            product = await self.knowledge.get_product_by_slug(db, ctx.last_product_slug)
            if product:
                return product
        if not query:
            return None
        product = await self.knowledge.get_product_by_slug_or_name(db, query)
        if not product:
            found = await self.knowledge.search_products(db, query, limit=1)
            product = found[0] if found else None
        return product

    def _extract_coupon_codes(self, preprocessed: dict) -> list[str]:
        """Return plausible coupon codes only.

        A token counts as a code candidate when the user typed it in ALL
        CAPS or it contains a digit — plain words like "any"/"coupon"
        must never be treated as codes (that used to answer every
        "any coupons?" with "Invalid coupon code").
        """
        raw = preprocessed.get("raw", "")
        candidates: list[str] = []
        for token in re.findall(r"\b[A-Za-z0-9]{3,20}\b", raw):
            has_digit = any(c.isdigit() for c in token)
            is_caps = token.isupper() and token.isalpha()
            if not (has_digit or is_caps):
                continue
            code = token.upper()
            if code in {"FAQ", "COD", "BDT", "ABO", "PDF", "URL", "SMS", "INV", "COD", "VAT"}:
                continue
            if code.isdigit():  # bare numbers are quantities/phones, not codes
                continue
            candidates.append(code)
        return candidates

    async def _finalize_turn(self, db, conv, ctx, user_msg, assistant_msg, intent, metadata):
        await self.conversation_mgr.save_turn(db, conv, ctx, user_msg, assistant_msg, intent, metadata)

    def _suggestions(self, intent: Intent, lang: str, ctx: ConversationContext | None = None) -> list[str]:
        if lang == "bn":
            by_intent = {
                Intent.GREETING: ["অর্ডার করুন", "সেবা বুক", "অর্ডার ট্র্যাক", "বুকিং ট্র্যাক"],
                Intent.PRODUCT_SEARCH: ["অর্ডার করুন", "ডেলিভারি চার্জ", "কুপন আছে?", "যোগাযোগ"],
                Intent.PRODUCT_DETAILS: ["স্টক আছে?", "অর্ডার করুন", "ডেলিভারি সময়"],
                Intent.ORDER_TRACKING: ["ইনভয়েস", "বুকিং ট্র্যাক", "অর্ডার করুন"],
                Intent.BOOKING_TRACKING: ["সেবা বুক", "অর্ডার ট্র্যাক", "যোগাযোগ"],
                Intent.LEAD_TRACKING: ["কোট চান", "যোগাযোগ", "সেবা দেখুন"],
                Intent.ORDER_CREATION: ["আরো পণ্য", "ডেলিভারি চার্জ", "যোগাযোগ"],
                Intent.SERVICE_BOOKING: ["বুকিং ট্র্যাক", "সেবা দেখুন", "যোগাযোগ"],
                Intent.DELIVERY: ["পেমেন্ট অপশন", "রিটার্ন পলিসি", "অর্ডার করুন"],
                Intent.COUPON: ["অর্ডার করুন", "পণ্য দেখান", "ডেলিভারি চার্জ"],
                Intent.SERVICE_INFO: ["সেবা বুক করুন", "কোট চান", "যোগাযোগ"],
            }
            defaults = ["অর্ডার করুন", "সেবা বুক", "অর্ডার ট্র্যাক", "যোগাযোগ"]
        else:
            by_intent = {
                Intent.GREETING: ["Place order", "Book service", "Track order", "Track booking"],
                Intent.PRODUCT_SEARCH: ["Place order", "Delivery charges", "Any coupons?", "Contact"],
                Intent.PRODUCT_DETAILS: ["Check stock", "Place order", "Delivery time"],
                Intent.ORDER_TRACKING: ["Invoice", "Track booking", "Place order"],
                Intent.BOOKING_TRACKING: ["Book service", "Track order", "Contact"],
                Intent.LEAD_TRACKING: ["Get quote", "Contact", "View services"],
                Intent.ORDER_CREATION: ["Add product", "Delivery info", "Contact"],
                Intent.SERVICE_BOOKING: ["Track booking", "View services", "Contact"],
                Intent.DELIVERY: ["Payment options", "Return policy", "Place order"],
                Intent.COUPON: ["Place order", "Browse products", "Delivery info"],
                Intent.SERVICE_INFO: ["Book service", "Get a quote", "Contact us"],
            }
            defaults = ["Place order", "Book service", "Track order", "Contact us"]

        suggestions = by_intent.get(intent, defaults)
        if ctx and ctx.last_product_slug and intent in _FOLLOW_UP_PRODUCT:
            if lang == "bn":
                suggestions = ["স্টক আছে?", "অর্ডার করুন", "ডেলিভারি চার্জ"]
            else:
                suggestions = ["Check stock", "Place order", "Delivery charges"]
        return suggestions[:4]

    _vocab_cache: dict[str, Any] = {"at": 0.0, "data": None}
    _VOCAB_TTL = 300  # 5 min — admin catalog edits surface within this window

    async def _entity_vocab(self, db) -> tuple[list[str], list[str], list[str], list[str]]:
        """Product/service names + categories + brands for entity matching.

        These four queries used to run on EVERY message; the vocabulary only
        changes when the catalog does, so a short in-process cache removes
        ~4 queries per turn (single worker — see rate_limit.py note).
        """
        now = time.time()
        cache = AssistantOrchestrator._vocab_cache
        if cache["data"] and now - cache["at"] < self._VOCAB_TTL:
            return cache["data"]
        products = await self.knowledge.search_products(db, "", limit=50)
        services = await self.knowledge.search_services(db, "", limit=30)
        categories = await self.knowledge.list_categories(db)
        brands = await self.knowledge.list_brands(db)
        data = (
            [p.name_en for p in products] + [p.name_bn for p in products],
            [s.name_en for s in services] + [s.name_bn for s in services],
            categories,
            brands,
        )
        cache["at"] = now
        cache["data"] = data
        return data

    def _build_result(self, lang: str, intent: Intent, text: str, session_id: str) -> dict:
        result = self.response.format_response(lang, intent, text)
        result["session_id"] = session_id
        return result

    def _error_response(self, lang: str, error: str) -> dict:
        return {"message": error, "intent": "error", "language": lang, "success": False}
