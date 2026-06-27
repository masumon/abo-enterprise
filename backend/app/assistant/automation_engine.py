"""Automation execution — creates orders, leads, bookings via existing business logic."""

import random
import secrets
import string
import uuid
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.email import send_email, lead_notification_html, order_notification_html, customer_order_confirmation_html
from app.models.models import Order, OrderItem, Product, LeadV2, BookingV2, Service, Invoice
from app.assistant.workflow_engine import WorkflowEngine, WorkflowType, WorkflowStatus, WorkflowResult
from app.assistant.constants import Intent


def _generate_lead_number() -> str:
    year = datetime.now(timezone.utc).year
    return f"LF-{year}-{''.join(random.choices(string.digits, k=6))}"


def _generate_order_number() -> str:
    now = datetime.now()
    return f"ABO-{now.year}{now.month:02d}-{secrets.token_hex(3).upper()}"


def _generate_booking_number() -> str:
    year = datetime.now(timezone.utc).year
    return f"BK-{year}-{''.join(random.choices(string.digits, k=6))}"


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
        )
        db.add(booking)
        await db.flush()
        await db.refresh(booking)

        ref = booking.booking_number
        return self.workflow.finalize(wf, WorkflowStatus.EXECUTED, reference=ref)

    async def track_order(self, db: AsyncSession, order_number: str) -> dict | None:
        from sqlalchemy.orm import selectinload

        result = await db.execute(
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.order_number == order_number.upper(), Order.is_deleted == False)  # noqa: E712
        )
        order = result.scalar_one_or_none()
        if not order:
            return None
        return {
            "order_number": order.order_number,
            "order_status": order.order_status,
            "total": float(order.total),
            "items_count": len(order.items),
            "payment_method": order.payment_method,
            "created_at": order.created_at.isoformat() if order.created_at else None,
        }

    async def track_orders_by_phone(self, db: AsyncSession, phone: str) -> list[dict]:
        from sqlalchemy.orm import selectinload

        result = await db.execute(
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.customer_phone == phone, Order.is_deleted == False)  # noqa: E712
            .order_by(Order.created_at.desc())
            .limit(5)
        )
        orders = result.scalars().all()
        return [
            {
                "order_number": o.order_number,
                "order_status": o.order_status,
                "total": float(o.total),
                "items_count": len(o.items),
            }
            for o in orders
        ]

    async def notify_admin(self, subject: str, body: str) -> bool:
        if not settings.ADMIN_NOTIFY_EMAIL:
            return False
        try:
            await send_email(settings.ADMIN_NOTIFY_EMAIL, subject, f"<p>{body}</p>")
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
