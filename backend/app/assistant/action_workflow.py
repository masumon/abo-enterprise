"""Multi-turn workflows — orders, bookings, leads via assistant (DB-backed)."""

from __future__ import annotations

import re
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.assistant.constants import EntityType
from app.assistant.context_manager import ConversationContext
from app.assistant.knowledge_base import KnowledgeBase
from app.assistant.automation_engine import AutomationEngine
from app.assistant.response_generator import ResponseGenerator
from app.assistant.validation_engine import ValidationEngine

_CANCEL_WORDS = frozenset({
    "cancel", "stop", "quit", "exit", "বাতিল", "থামুন", "cancelled", "থাক", "বাদ", "batil",
})
# Phrases that clearly ask for a different topic — when the user types one of
# these mid-workflow they meant to switch, not to answer the current step.
_SWITCH_HINTS = (
    "সব সেবা", "সকল সেবা", "সেবা দেখ", "সেবা বুক", "সার্ভিস", "সব পণ্য", "সকল পণ্য",
    "পণ্য দেখ", "কি কি", "ট্র্যাক", "কুপন", "যোগাযোগ", "ডেলিভারি",
    "all service", "services", "all product", "products", "track", "coupon",
    "book service", "show all", "list ",
)
_YES_WORDS = frozenset({
    "yes", "y", "ok", "okay", "confirm", "sure", "yeah", "yep",
    "হ্যাঁ", "হ্যা", "ঠিক", "জি", "জ্বি", "জ্বী", "আচ্ছা", "হবে", "করুন",
    "ji", "jee", "hae", "hobe", "thik", "accha", "acha",
})
_NO_WORDS = frozenset({"no", "n", "না", "নাহ", "nah", "nope"})
_PAYMENT_MAP = {
    "bkash": "bkash", "বিকাশ": "bkash",
    "nagad": "nagad", "নগদ": "nagad",
    "cod": "cod", "cash": "cod", "cash on delivery": "cod", "ক্যাশ": "cod",
}


class ActionWorkflowEngine:
    def __init__(
        self,
        knowledge: KnowledgeBase,
        automation: AutomationEngine,
        response: ResponseGenerator,
        validation: ValidationEngine,
    ) -> None:
        self.knowledge = knowledge
        self.automation = automation
        self.response = response
        self.validation = validation

    def is_active(self, ctx: ConversationContext) -> bool:
        wf = ctx.slots.get("workflow")
        return bool(wf and wf.get("type"))

    def _wf(self, ctx: ConversationContext) -> dict:
        if "workflow" not in ctx.slots:
            ctx.slots["workflow"] = {"type": None, "step": None, "data": {}}
        return ctx.slots["workflow"]

    def _clear(self, ctx: ConversationContext) -> None:
        ctx.slots.pop("workflow", None)
        ctx.pending_action = None

    @staticmethod
    def _tokens(normalized: str) -> set[str]:
        return set(re.findall(r"[\wঀ-৿]+", normalized.lower()))

    def _is_switch(self, normalized: str, raw: str) -> bool:
        t = f"{normalized} {raw}".lower()
        if raw.strip().endswith("?"):
            return True
        return any(h in t for h in _SWITCH_HINTS)

    def _is_cancel(self, normalized: str) -> bool:
        tokens = self._tokens(normalized)
        return bool(tokens & _CANCEL_WORDS) or normalized.strip().startswith("cancel")

    def _is_yes(self, normalized: str) -> bool:
        # Token-based so Banglish hints appended by the preprocessor
        # ("ji" → "ji yes") still register, and "না" anywhere wins over "ok".
        tokens = self._tokens(normalized)
        if not tokens or len(tokens) > 4:
            return False
        return bool(tokens & _YES_WORDS) and not (tokens & _NO_WORDS) and not (tokens & _CANCEL_WORDS)

    def _is_no(self, normalized: str) -> bool:
        tokens = self._tokens(normalized)
        if not tokens or len(tokens) > 4:
            return False
        return bool(tokens & _NO_WORDS) and not (tokens & _YES_WORDS)

    async def handle_turn(
        self,
        db: AsyncSession,
        ctx: ConversationContext,
        preprocessed: dict,
        lang: str,
        entities: Any,
    ) -> tuple[str, dict, list[dict]] | None:
        if not self.is_active(ctx):
            return None

        normalized = preprocessed["normalized"]
        raw = preprocessed["raw"]

        if self._is_cancel(normalized):
            self._clear(ctx)
            return self.response.workflow_cancelled(lang), {}, []

        # Topic switch — the user asked for something else mid-flow. Drop the
        # workflow and return None so the orchestrator handles the new intent
        # normally (instead of forcing the message into the current step).
        if self._is_switch(normalized, raw):
            self._clear(ctx)
            return None

        wf = self._wf(ctx)
        wtype = wf.get("type")
        if wtype == "order":
            return await self._order_turn(db, ctx, preprocessed, lang, entities)
        if wtype == "booking":
            return await self._booking_turn(db, ctx, preprocessed, lang, entities)
        if wtype == "lead":
            return await self._lead_turn(db, ctx, preprocessed, lang, entities)
        return None

    # ── Order workflow ──────────────────────────────────────────────

    async def start_order(
        self,
        db: AsyncSession,
        ctx: ConversationContext,
        preprocessed: dict,
        lang: str,
        entities: Any,
    ) -> tuple[str, dict, list[dict]]:
        wf = self._wf(ctx)
        wf["type"] = "order"
        wf["data"] = {"cart": []}

        if ctx.last_product_slug:
            product = await self.knowledge.get_product_by_slug(db, ctx.last_product_slug)
            if product and product.stock_quantity > 0:
                wf["data"]["pending_product"] = self.knowledge.product_to_dict(product)
                wf["step"] = "quantity"
                name = product.name_bn if lang == "bn" else product.name_en
                return self.response.workflow_ask_quantity(lang, name), {"workflow": "order"}, []

        wf["step"] = "product"
        return self.response.workflow_ask_product(lang), {"workflow": "order"}, []

    async def _order_turn(self, db, ctx, preprocessed, lang, entities):
        wf = self._wf(ctx)
        data = wf["data"]
        step = wf.get("step")
        raw = preprocessed["raw"]
        normalized = preprocessed["normalized"]
        links: list[dict] = []

        if step == "product":
            query = ctx.slots.get("product_query") or raw
            product = await self.knowledge.get_product_by_slug_or_name(db, query)
            if not product:
                found = await self.knowledge.search_products(db, query, limit=1)
                product = found[0] if found else None
            if not product:
                # Generic request ("আরো পণ্য", "list", "দেখাও") or an unmatched
                # name — show a few products to pick from instead of a dead loop.
                options = await self.knowledge.search_products(db, "", limit=6)
                if options:
                    names = " · ".join((p.name_bn if lang == "bn" else p.name_en) for p in options)
                    msg = (
                        f"আমাদের কিছু পণ্য: {names}।\nযেটি চান তার নাম লিখুন, অথবা 'বাতিল'।"
                        if lang == "bn"
                        else f"Some of our products: {names}.\nType the name of the one you want, or 'cancel'."
                    )
                    return msg, {"workflow": "order", "products": [self.knowledge.product_to_dict(p) for p in options]}, links
                return self.response.workflow_product_not_found(lang), {"workflow": "order"}, links
            if product.stock_quantity <= 0:
                return self.response.workflow_out_of_stock(lang), {"workflow": "order"}, links
            data["pending_product"] = self.knowledge.product_to_dict(product)
            wf["step"] = "quantity"
            name = product.name_bn if lang == "bn" else product.name_en
            return self.response.workflow_ask_quantity(lang, name), {"workflow": "order"}, links

        if step == "quantity":
            qty = self._parse_quantity(preprocessed, entities)
            if not qty or qty < 1:
                return self.response.workflow_invalid_quantity(lang), {"workflow": "order"}, links
            pending = data.get("pending_product", {})
            if qty > pending.get("stock_quantity", 0):
                return self.response.workflow_insufficient_stock(lang, pending.get("stock_quantity", 0)), {"workflow": "order"}, links
            data["cart"].append({
                "product_id": str(pending.get("id") or ""),
                "product_name": pending.get("name_en", ""),
                "product_price": pending.get("price", 0),
                "quantity": qty,
                "slug": pending.get("slug", ""),
            })
            data.pop("pending_product", None)
            wf["step"] = "add_more"
            return self.response.workflow_ask_add_more(lang, len(data["cart"])), {"workflow": "order"}, links

        if step == "add_more":
            if self._is_yes(normalized):
                wf["step"] = "product"
                return self.response.workflow_ask_product(lang), {"workflow": "order"}, links
            if self._is_no(normalized):
                wf["step"] = "name"
                if ctx.customer_name:
                    data["customer_name"] = ctx.customer_name
                    wf["step"] = "phone"
                    if ctx.customer_phone:
                        data["customer_phone"] = ctx.customer_phone
                        wf["step"] = "address"
                        return self.response.workflow_ask_address(lang), {"workflow": "order"}, links
                    return self.response.workflow_ask_phone(lang), {"workflow": "order"}, links
                return self.response.workflow_ask_name(lang), {"workflow": "order"}, links
            return self.response.workflow_ask_add_more(lang, len(data["cart"])), {"workflow": "order"}, links

        if step == "name":
            name = raw.strip()
            if len(name) < 2:
                return self.response.workflow_ask_name(lang), {"workflow": "order"}, links
            data["customer_name"] = name
            ctx.customer_name = name
            wf["step"] = "phone"
            if ctx.customer_phone:
                data["customer_phone"] = ctx.customer_phone
                wf["step"] = "address"
                return self.response.workflow_ask_address(lang), {"workflow": "order"}, links
            return self.response.workflow_ask_phone(lang), {"workflow": "order"}, links

        if step == "phone":
            phone = preprocessed.get("phones", [None])[0] or raw.strip()
            v = self.validation.validate_phone(phone)
            if not v.valid:
                return self.response.workflow_ask_phone(lang), {"workflow": "order"}, links
            data["customer_phone"] = phone
            ctx.customer_phone = phone
            wf["step"] = "address"
            return self.response.workflow_ask_address(lang), {"workflow": "order"}, links

        if step == "address":
            if len(raw.strip()) < 8:
                return self.response.workflow_ask_address(lang), {"workflow": "order"}, links
            data["delivery_address"] = raw.strip()
            wf["step"] = "payment"
            return self.response.workflow_ask_payment(lang), {"workflow": "order"}, links

        if step == "payment":
            method = self._parse_payment(normalized, raw)
            if not method:
                return self.response.workflow_ask_payment(lang), {"workflow": "order"}, links
            data["payment_method"] = method
            if method in ("bkash", "nagad"):
                wf["step"] = "payment_number"
                return self.response.workflow_ask_payment_number(lang, method), {"workflow": "order"}, links
            wf["step"] = "confirm"
            return self.response.workflow_order_summary(lang, data), {"workflow": "order"}, links

        if step == "payment_number":
            trx = raw.strip()
            if len(trx) < 4:
                return self.response.workflow_ask_payment_number(lang, data.get("payment_method", "")), {"workflow": "order"}, links
            data["payment_number"] = trx
            wf["step"] = "confirm"
            return self.response.workflow_order_summary(lang, data), {"workflow": "order"}, links

        if step == "confirm":
            if self._is_no(normalized):
                self._clear(ctx)
                return self.response.workflow_cancelled(lang), {}, links
            if not self._is_yes(normalized):
                return self.response.workflow_confirm_prompt(lang), {"workflow": "order"}, links
            result = await self.automation.create_order_from_cart(
                db,
                customer_name=data["customer_name"],
                customer_phone=data["customer_phone"],
                delivery_address=data["delivery_address"],
                payment_method=data["payment_method"],
                payment_number=data.get("payment_number"),
                cart=data["cart"],
                coupon_code=data.get("coupon_code") or ctx.slots.get("coupon_code"),
            )
            self._clear(ctx)
            if result.get("error"):
                return self.response.workflow_error(lang, result["error"]), {}, links
            order = result["order"]
            links = [
                {"label": "Track order", "label_bn": "অর্ডার ট্র্যাক", "url": f"/track?order={order['order_number']}", "type": "track"},
                {"label": "Invoice", "label_bn": "ইনভয়েস", "url": f"/order-success?order={order['order_number']}&phone={data['customer_phone']}", "type": "invoice"},
            ]
            return self.response.workflow_order_success(lang, order), {"order": order}, links

        return self.response.workflow_ask_product(lang), {"workflow": "order"}, links

    # ── Booking workflow ──────────────────────────────────────────

    async def start_booking(
        self,
        db: AsyncSession,
        ctx: ConversationContext,
        preprocessed: dict,
        lang: str,
        entities: Any,
    ) -> tuple[str, dict, list[dict]]:
        wf = self._wf(ctx)
        wf["type"] = "booking"
        wf["data"] = {}

        service = None
        query = ctx.slots.get("service_query")
        if query:
            service = await self.knowledge.get_service_by_slug_or_name(db, query)
        if not service and ctx.last_service_slug:
            service = await self.knowledge.get_service_by_slug_or_name(db, ctx.last_service_slug)
        if service:
            wf["data"]["service"] = self.knowledge.service_to_dict(service)
            wf["step"] = "name"
            if ctx.customer_name:
                wf["data"]["customer_name"] = ctx.customer_name
                wf["step"] = "phone"
                if ctx.customer_phone:
                    wf["data"]["customer_phone"] = ctx.customer_phone
                    wf["step"] = "details"
                    return self.response.workflow_ask_booking_details(lang), {"workflow": "booking"}, []
                return self.response.workflow_ask_phone(lang), {"workflow": "booking"}, []
            return self.response.workflow_ask_name(lang), {"workflow": "booking"}, []

        wf["step"] = "service"
        return self.response.workflow_ask_service(lang), {"workflow": "booking"}, []

    async def _booking_turn(self, db, ctx, preprocessed, lang, entities):
        wf = self._wf(ctx)
        data = wf["data"]
        step = wf.get("step")
        raw = preprocessed["raw"]
        normalized = preprocessed["normalized"]
        links: list[dict] = []

        if step == "service":
            query = ctx.slots.get("service_query") or raw
            service = await self.knowledge.get_service_by_slug_or_name(db, query)
            if not service:
                found = await self.knowledge.search_services(db, query, limit=1)
                service = found[0] if found else None
            if not service:
                return self.response.workflow_service_not_found(lang), {"workflow": "booking"}, links
            data["service"] = self.knowledge.service_to_dict(service)
            ctx.last_service_slug = service.slug
            wf["step"] = "name"
            if ctx.customer_name:
                data["customer_name"] = ctx.customer_name
                wf["step"] = "phone"
                if ctx.customer_phone:
                    data["customer_phone"] = ctx.customer_phone
                    wf["step"] = "details"
                    return self.response.workflow_ask_booking_details(lang), {"workflow": "booking"}, links
                return self.response.workflow_ask_phone(lang), {"workflow": "booking"}, links
            return self.response.workflow_ask_name(lang), {"workflow": "booking"}, links

        if step == "name":
            if len(raw.strip()) < 2:
                return self.response.workflow_ask_name(lang), {"workflow": "booking"}, links
            data["customer_name"] = raw.strip()
            ctx.customer_name = data["customer_name"]
            wf["step"] = "phone"
            return self.response.workflow_ask_phone(lang), {"workflow": "booking"}, links

        if step == "phone":
            phone = preprocessed.get("phones", [None])[0] or raw.strip()
            v = self.validation.validate_phone(phone)
            if not v.valid:
                return self.response.workflow_ask_phone(lang), {"workflow": "booking"}, links
            data["customer_phone"] = phone
            ctx.customer_phone = phone
            wf["step"] = "details"
            return self.response.workflow_ask_booking_details(lang), {"workflow": "booking"}, links

        if step == "details":
            if len(raw.strip()) < 5:
                return self.response.workflow_ask_booking_details(lang), {"workflow": "booking"}, links
            data["details"] = raw.strip()
            wf["step"] = "confirm"
            return self.response.workflow_booking_summary(lang, data), {"workflow": "booking"}, links

        if step == "confirm":
            if self._is_no(normalized):
                self._clear(ctx)
                return self.response.workflow_cancelled(lang), {}, links
            if not self._is_yes(normalized):
                return self.response.workflow_confirm_prompt(lang), {"workflow": "booking"}, links
            svc = data["service"]
            service = await self.knowledge.get_service_by_slug_or_name(db, svc.get("slug", ""))
            if not service:
                self._clear(ctx)
                return self.response.workflow_error(lang, "Service not found"), {}, links
            wf_result = await self.automation.create_booking(
                db,
                service_id=service.id,
                customer_name=data["customer_name"],
                customer_phone=data["customer_phone"],
                customer_email=ctx.customer_email,
                pricing_type=service.pricing_type or "fixed",
                details=data.get("details"),
            )
            self._clear(ctx)
            ref = wf_result.reference or ""
            links = [{"label": "View service", "label_bn": "সেবা দেখুন", "url": f"/services/{service.slug}", "type": "service"}]
            return self.response.workflow_booking_success(lang, ref, svc.get("name_bn" if lang == "bn" else "name_en", "")), {"booking_number": ref}, links

        return self.response.workflow_ask_service(lang), {"workflow": "booking"}, links

    # ── Lead workflow ───────────────────────────────────────────────

    async def start_lead(
        self,
        ctx: ConversationContext,
        preprocessed: dict,
        lang: str,
        lead_type: str = "general",
    ) -> tuple[str, dict, list[dict]]:
        wf = self._wf(ctx)
        wf["type"] = "lead"
        wf["data"] = {"lead_type": lead_type, "project_description": preprocessed.get("raw", "")}

        if ctx.customer_name and ctx.customer_phone:
            wf["step"] = "details"
            wf["data"]["customer_name"] = ctx.customer_name
            wf["data"]["customer_phone"] = ctx.customer_phone
            return self.response.workflow_ask_lead_details(lang), {"workflow": "lead"}, []

        wf["step"] = "name"
        if ctx.customer_name:
            wf["data"]["customer_name"] = ctx.customer_name
            wf["step"] = "phone"
            if ctx.customer_phone:
                wf["data"]["customer_phone"] = ctx.customer_phone
                wf["step"] = "details"
                return self.response.workflow_ask_lead_details(lang), {"workflow": "lead"}, []
            return self.response.workflow_ask_phone(lang), {"workflow": "lead"}, []
        return self.response.workflow_ask_name(lang), {"workflow": "lead"}, []

    async def _lead_turn(self, db, ctx, preprocessed, lang, entities):
        wf = self._wf(ctx)
        data = wf["data"]
        step = wf.get("step")
        raw = preprocessed["raw"]
        normalized = preprocessed["normalized"]

        if step == "name":
            if len(raw.strip()) < 2:
                return self.response.workflow_ask_name(lang), {"workflow": "lead"}, []
            data["customer_name"] = raw.strip()
            ctx.customer_name = data["customer_name"]
            wf["step"] = "phone"
            return self.response.workflow_ask_phone(lang), {"workflow": "lead"}, []

        if step == "phone":
            phone = preprocessed.get("phones", [None])[0] or raw.strip()
            v = self.validation.validate_phone(phone)
            if not v.valid:
                return self.response.workflow_ask_phone(lang), {"workflow": "lead"}, []
            data["customer_phone"] = phone
            ctx.customer_phone = phone
            wf["step"] = "details"
            return self.response.workflow_ask_lead_details(lang), {"workflow": "lead"}, []

        if step == "details":
            if len(raw.strip()) < 5:
                return self.response.workflow_ask_lead_details(lang), {"workflow": "lead"}, []
            data["project_description"] = raw.strip()
            wf["step"] = "confirm"
            return self.response.workflow_lead_summary(lang, data), {"workflow": "lead"}, []

        if step == "confirm":
            if self._is_no(normalized):
                self._clear(ctx)
                return self.response.workflow_cancelled(lang), {}, []
            if not self._is_yes(normalized):
                return self.response.workflow_confirm_prompt(lang), {"workflow": "lead"}, []
            wf_result = await self.automation.create_lead(
                db,
                name=data["customer_name"],
                phone=data["customer_phone"],
                lead_type=data.get("lead_type", "general"),
                email=ctx.customer_email,
                project_description=data.get("project_description"),
            )
            self._clear(ctx)
            return self.response.workflow_lead_success(lang, wf_result.reference or ""), {"reference": wf_result.reference}, []

        return self.response.workflow_ask_name(lang), {"workflow": "lead"}, []

    # ── Helpers ─────────────────────────────────────────────────────

    def _parse_quantity(self, preprocessed: dict, entities: Any) -> int | None:
        qty_entity = entities.get(EntityType.QUANTITY)
        if qty_entity:
            try:
                return int(qty_entity.value)
            except ValueError:
                pass
        for q in preprocessed.get("quantities", []):
            if q > 0:
                return q
        m = re.search(r"\b(\d{1,4})\b", preprocessed.get("raw", ""))
        if m:
            return int(m.group(1))
        return None

    def _parse_payment(self, normalized: str, raw: str) -> str | None:
        combined = f"{normalized} {raw.lower()}"
        for key, method in _PAYMENT_MAP.items():
            if key in combined:
                return method
        return None
