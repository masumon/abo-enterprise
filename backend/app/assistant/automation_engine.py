"""Automation execution — creates orders, leads, bookings via existing business logic."""

import random
import secrets
import string
import uuid
import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.email import send_email
from app.core.invoice import InvoiceService
from app.models.models import Order, OrderItem, Product, LeadV2, BookingV2, Service, Invoice
from app.assistant.workflow_engine import WorkflowEngine, WorkflowType, WorkflowStatus, WorkflowResult
from app.assistant.constants import Intent

logger = logging.getLogger(__name__)


def _generate_lead_number() -> str:
    year = datetime.now(timezone.utc).year
    return f"LF-{year}-{''.join(random.choices(string.digits, k=6))}"


def _generate_order_number() -> str:
    now = datetime.now()
    return f"ABO-{now.year}{now.month:02d}-{secrets.token_hex(3).upper()}"


def _generate_booking_number() -> str:
    year = datetime.now(timezone.utc).year
    return f"BK-{year}-{''.join(random.choices(string.digits, k=6))}"


def _calc_delivery_charge(district_hint: str, subtotal: float, settings_map: dict[str, str]) -> float:
    free_min = float(settings_map.get("free_delivery_min_amount") or settings_map.get("free_delivery_min") or 2000)
    if subtotal >= free_min:
        return 0.0
    hint = district_hint.lower()
    sylhet = float(settings_map.get("delivery_charge_sylhet") or 0)
    dhaka = float(settings_map.get("delivery_charge_dhaka") or 60)
    outside = float(settings_map.get("delivery_charge_outside") or 120)
    if "sylhet" in hint:
        return sylhet
    if any(d in hint for d in ("dhaka", "gazipur", "narayanganj", "ঢাকা")):
        return dhaka
    return outside


class AutomationEngine:
    def __init__(self) -> None:
        self.workflow = WorkflowEngine()

    async def create_lead(
        self,
        db: AsyncSession,
        *,
        name: str,
        phone: str,
        lead_type: str = "general",
        email: str | None = None,
        project_description: str | None = None,
        service_id: uuid.UUID | None = None,
    ) -> WorkflowResult:
        wf = self.workflow.create_workflow(WorkflowType.LEAD)
        self.workflow.mark_step(wf, "validate_input", WorkflowStatus.EXECUTED)

        lead = LeadV2(
            lead_number=_generate_lead_number(),
            name=name,
            phone=phone,
            email=email,
            lead_type=lead_type,
            project_description=project_description,
            service_id=service_id,
            source="assistant",
        )
        db.add(lead)
        await db.flush()
        await db.refresh(lead)

        self.workflow.mark_step(wf, "execute_action", WorkflowStatus.EXECUTED, lead.lead_number)
        return self.workflow.finalize(wf, WorkflowStatus.EXECUTED, reference=lead.lead_number, error=None)

    async def create_booking(
        self,
        db: AsyncSession,
        *,
        service_id: uuid.UUID,
        customer_name: str,
        customer_phone: str,
        pricing_type: str,
        customer_email: str | None = None,
        details: str | None = None,
    ) -> WorkflowResult:
        wf = self.workflow.create_workflow(WorkflowType.BOOKING)
        service_result = await db.execute(
            select(Service).where(Service.id == service_id, Service.is_deleted == False)  # noqa: E712
        )
        service = service_result.scalar_one_or_none()
        if not service:
            return self.workflow.finalize(wf, WorkflowStatus.FAILED, error="Service not found")

        booking = BookingV2(
            booking_number=_generate_booking_number(),
            service_id=service_id,
            service_name=service.name_en,
            customer_name=customer_name,
            customer_phone=customer_phone,
            customer_email=customer_email,
            pricing_type=pricing_type,
            details=details,
            status="pending",
            notes="Created via assistant",
        )
        db.add(booking)
        await db.flush()
        await db.refresh(booking)

        try:
            await InvoiceService(db).create_booking_invoice(booking_id=booking.id)
        except Exception as exc:
            logger.warning("Assistant booking invoice failed: %s", exc)

        ref = booking.booking_number
        return self.workflow.finalize(wf, WorkflowStatus.EXECUTED, reference=ref)

    async def create_order_from_cart(
        self,
        db: AsyncSession,
        *,
        customer_name: str,
        customer_phone: str,
        delivery_address: str,
        payment_method: str,
        cart: list[dict],
        payment_number: str | None = None,
        coupon_code: str | None = None,
        customer_email: str | None = None,
    ) -> dict:
        """Create order from assistant cart — validates stock and writes to DB."""
        if not cart:
            return {"error": "Cart is empty"}

        from app.models.models import Setting

        settings_result = await db.execute(
            select(Setting).where(
                Setting.key.in_([
                    "delivery_charge_dhaka", "delivery_charge_outside", "delivery_charge_sylhet",
                    "free_delivery_min_amount", "free_delivery_min",
                ]),
                Setting.is_deleted == False,  # noqa: E712
            )
        )
        settings_map = {s.key: s.value for s in settings_result.scalars().all()}

        order_items: list[OrderItem] = []
        subtotal = 0.0

        for item in cart:
            product_id = item.get("product_id")
            qty = int(item.get("quantity", 1))
            if not product_id:
                return {"error": f"Invalid product in cart: {item.get('product_name', '?')}"}
            try:
                pid = UUID(str(product_id))
            except ValueError:
                return {"error": "Invalid product ID"}

            result = await db.execute(
                select(Product).where(
                    Product.id == pid,
                    Product.is_deleted == False,  # noqa: E712
                    Product.is_active == True,  # noqa: E712
                )
            )
            product = result.scalar_one_or_none()
            if not product:
                return {"error": f"Product not found: {item.get('product_name', '?')}"}
            if product.stock_quantity < qty:
                return {"error": f"Insufficient stock for {product.name_en}. Available: {product.stock_quantity}"}

            line_subtotal = float(product.price) * qty
            subtotal += line_subtotal
            order_items.append((product, qty, line_subtotal))

        delivery_charge = _calc_delivery_charge(delivery_address, subtotal, settings_map)
        discount_amount = 0.0
        total = subtotal - discount_amount + delivery_charge

        order = Order(
            order_number=_generate_order_number(),
            customer_name=customer_name,
            customer_phone=customer_phone,
            customer_email=customer_email,
            delivery_address=delivery_address,
            payment_method=payment_method,
            payment_number=payment_number,
            subtotal=subtotal,
            discount_amount=discount_amount,
            coupon_code=coupon_code,
            delivery_charge=delivery_charge,
            total=total,
            notes="Created via assistant",
        )
        db.add(order)
        await db.flush()

        for product, qty, line_subtotal in order_items:
            product.stock_quantity -= qty
            db.add(OrderItem(
                order_id=order.id,
                product_id=product.id,
                product_name=product.name_en,
                product_price=float(product.price),
                quantity=qty,
                subtotal=line_subtotal,
            ))

        await db.flush()

        result = await db.execute(
            select(Order).options(selectinload(Order.items)).where(Order.id == order.id)
        )
        order = result.scalar_one()

        invoice_id = None
        try:
            invoice = await InvoiceService(db).create_order_invoice(order_id=order.id)
            invoice_id = str(invoice.id)
        except Exception as exc:
            logger.warning("Assistant order invoice failed: %s", exc)

        from app.core.email_config import resolve_notify_email
        _notify_to = await resolve_notify_email(db)
        if _notify_to:
            try:
                items_summary = ", ".join(f"{i.product_name} x{i.quantity}" for i in order.items)
                await send_email(
                    _notify_to,
                    f"New Order {order.order_number} (Assistant)",
                    f"<p>Assistant order from {customer_name} ({customer_phone})</p><p>{items_summary}</p><p>Total: ৳{total:,.0f}</p>",
                )
            except Exception:
                pass

        return {
            "order": {
                "order_number": order.order_number,
                "order_status": order.order_status,
                "payment_status": order.payment_status,
                "payment_method": order.payment_method,
                "total": float(order.total),
                "subtotal": float(order.subtotal),
                "delivery_charge": float(order.delivery_charge),
                "items_count": len(order.items),
                "items": [{"name": i.product_name, "quantity": i.quantity, "price": float(i.product_price)} for i in order.items],
                "invoice_id": invoice_id,
            }
        }

    async def track_order(self, db: AsyncSession, order_number: str) -> dict | None:
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.order_number == order_number.upper(), Order.is_deleted == False)  # noqa: E712
        )
        order = result.scalar_one_or_none()
        if not order:
            return None
        return self._order_to_track_dict(order)

    async def track_orders_by_phone(self, db: AsyncSession, phone: str) -> list[dict]:
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.customer_phone == phone, Order.is_deleted == False)  # noqa: E712
            .order_by(Order.created_at.desc())
            .limit(5)
        )
        return [self._order_to_track_dict(o) for o in result.scalars().all()]

    def _order_to_track_dict(self, order: Order) -> dict:
        return {
            "order_number": order.order_number,
            "order_status": order.order_status,
            "payment_status": order.payment_status,
            "total": float(order.total),
            "items_count": len(order.items),
            "payment_method": order.payment_method,
            "courier_provider": order.courier_provider,
            "courier_tracking_id": order.courier_tracking_id,
            "items": [{"name": i.product_name, "quantity": i.quantity} for i in order.items],
            "created_at": order.created_at.isoformat() if order.created_at else None,
        }

    async def track_booking(self, db: AsyncSession, booking_number: str) -> dict | None:
        result = await db.execute(
            select(BookingV2).where(
                BookingV2.booking_number == booking_number.upper(),
                BookingV2.is_deleted == False,  # noqa: E712
            )
        )
        booking = result.scalar_one_or_none()
        if not booking:
            return None
        return {
            "booking_number": booking.booking_number,
            "service_name": booking.service_name,
            "status": booking.status,
            "payment_status": booking.payment_status,
            "quoted_price": float(booking.quoted_price) if booking.quoted_price else None,
            "created_at": booking.created_at.isoformat() if booking.created_at else None,
        }

    async def track_bookings_by_phone(self, db: AsyncSession, phone: str) -> list[dict]:
        result = await db.execute(
            select(BookingV2).where(
                BookingV2.customer_phone == phone,
                BookingV2.is_deleted == False,  # noqa: E712
            ).order_by(BookingV2.created_at.desc()).limit(5)
        )
        return [
            {
                "booking_number": b.booking_number,
                "service_name": b.service_name,
                "status": b.status,
                "payment_status": b.payment_status,
            }
            for b in result.scalars().all()
        ]

    async def track_lead(self, db: AsyncSession, lead_number: str) -> dict | None:
        result = await db.execute(
            select(LeadV2).where(
                LeadV2.lead_number == lead_number.upper(),
                LeadV2.is_deleted == False,  # noqa: E712
            )
        )
        lead = result.scalar_one_or_none()
        if not lead:
            return None
        return {
            "lead_number": lead.lead_number,
            "lead_type": lead.lead_type,
            "status": lead.status,
            "name": lead.name,
            "created_at": lead.created_at.isoformat() if lead.created_at else None,
        }

    async def track_leads_by_phone(self, db: AsyncSession, phone: str) -> list[dict]:
        result = await db.execute(
            select(LeadV2).where(
                LeadV2.phone == phone,
                LeadV2.is_deleted == False,  # noqa: E712
            ).order_by(LeadV2.created_at.desc()).limit(5)
        )
        return [
            {
                "lead_number": l.lead_number,
                "lead_type": l.lead_type,
                "status": l.status,
            }
            for l in result.scalars().all()
        ]

    async def notify_admin(self, subject: str, body: str) -> bool:
        from app.core.database import AsyncSessionLocal
        from app.core.email_config import resolve_notify_email

        try:
            async with AsyncSessionLocal() as db:
                notify_to = await resolve_notify_email(db)
        except Exception:  # noqa: BLE001
            notify_to = settings.ADMIN_NOTIFY_EMAIL
        if not notify_to:
            return False
        try:
            await send_email(notify_to, subject, f"<p>{body}</p>")
            return True
        except Exception:
            return False

    async def start_courier_workflow(self, db: AsyncSession, order_number: str) -> WorkflowResult:
        wf = self.workflow.create_workflow(WorkflowType.COURIER)
        order_data = await self.track_order(db, order_number)
        if not order_data:
            return self.workflow.finalize(wf, WorkflowStatus.FAILED, error="Order not found")
        if order_data["order_status"] not in ("confirmed", "processing", "shipped"):
            return self.workflow.finalize(
                wf, WorkflowStatus.BLOCKED,
                error=f"Order status '{order_data['order_status']}' is not eligible for courier dispatch",
            )
        notified = await self.notify_admin(
            f"Courier workflow requested — {order_number}",
            f"Customer requested courier dispatch for order {order_number}.",
        )
        self.workflow.mark_step(wf, "notify", WorkflowStatus.EXECUTED if notified else WorkflowStatus.PENDING)
        return self.workflow.finalize(wf, WorkflowStatus.EXECUTED, reference=order_number)
