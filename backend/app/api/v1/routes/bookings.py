from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from app.core.database import get_db
from app.core.security import require_admin
from app.core.config import settings
from app.core.email import send_email, booking_notification_html, customer_booking_confirmation_html
from app.core.invoice import InvoiceService
from app.models.models import Booking, BookingV2
from app.schemas.schemas import BookingCreate, BookingOut, BookingStatusUpdate, ApiResponse, PaginatedResponse, PaginatedMeta
from app.core.rate_limit import rate_limit
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bookings", tags=["bookings"])


def generate_booking_number() -> str:
    now = datetime.now()
    return f"ABO-B-{now.year}{now.month:02d}-{now.microsecond % 10000:04d}"


@router.post("", response_model=ApiResponse, status_code=201, dependencies=[Depends(rate_limit("bookings_create", 10, 600))])
async def create_booking(
    payload: BookingCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    booking = Booking(
        booking_number=generate_booking_number(),
        **payload.model_dump(),
    )
    db.add(booking)
    await db.commit()
    await db.refresh(booking)

    # Send admin notification (recipient is admin-editable: Settings → Email)
    from app.core.email_config import resolve_notify_email
    _notify_to = await resolve_notify_email(db)
    if _notify_to:
        html = booking_notification_html(
            booking.booking_number, payload.customer_name, payload.customer_phone,
            payload.service_type, payload.details or "",
        )
        background_tasks.add_task(
            send_email, _notify_to,
            f"New Booking {booking.booking_number} — ABO Enterprise", html,
        )

    # Send customer confirmation email
    if payload.customer_email:
        html = customer_booking_confirmation_html(
            booking.booking_number,
            payload.customer_name,
            payload.service_type,
            booking.estimated_price or "Quote upon confirmation",
            settings.WHATSAPP_NUMBER,
        )
        background_tasks.add_task(
            send_email, payload.customer_email,
            f"Booking Confirmation #{booking.booking_number} — ABO Enterprise", html,
        )

    invoice_id = None
    try:
        invoice = await InvoiceService(db).create_legacy_booking_invoice(booking)
        invoice_id = str(invoice.id)
    except Exception:
        await db.rollback()
        logger.exception("Auto invoice for booking %s failed", booking.booking_number)

    return ApiResponse(
        data={
            "booking_id": str(booking.id),
            "booking_number": booking.booking_number,
            "invoice_id": invoice_id,
        },
        message="Booking created successfully! Check your email for confirmation."
    )


@router.get("", response_model=PaginatedResponse)
async def list_bookings(
    service_type: str | None = Query(None),
    status: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    conditions = [Booking.is_deleted == False]  # noqa: E712
    if service_type:
        conditions.append(Booking.service_type == service_type)
    if status:
        conditions.append(Booking.status == status)
    if search:
        q = f"%{search}%"
        conditions.append(or_(
            Booking.customer_name.ilike(q),
            Booking.customer_phone.ilike(q),
            Booking.booking_number.ilike(q),
        ))

    total = (await db.execute(select(func.count(Booking.id)).where(and_(*conditions)))).scalar_one()
    result = await db.execute(
        select(Booking).where(and_(*conditions))
        .order_by(Booking.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    bookings = result.scalars().all()
    return PaginatedResponse(
        data=[BookingOut.model_validate(b) for b in bookings],
        meta=PaginatedMeta(page=page, per_page=per_page, total=total, total_pages=-(-total // per_page)),
    )


# Public booking tracking — mirrors /orders/track. Handles both booking
# systems: v2 (BK-…, the /book flow) and legacy v1 (ABO-B-…, printing/legal).
# MUST stay above the /{booking_id} route so "track" isn't parsed as a UUID.
@router.get("/track", response_model=ApiResponse)
async def track_booking_public(
    number: str = Query(..., description="Booking number, e.g. BK-2026-000123 or ABO-B-202607-1234"),
    db: AsyncSession = Depends(get_db),
):
    num = number.strip()

    v2 = await db.execute(
        select(BookingV2).where(
            BookingV2.booking_number == num,
            BookingV2.is_deleted == False,  # noqa: E712
        )
    )
    b2 = v2.scalar_one_or_none()
    if b2:
        return ApiResponse(data={
            "kind": "booking",
            "booking_number": b2.booking_number,
            "booking_status": b2.status,
            "service_name": b2.service_name,
            "payment_status": b2.payment_status,
            "total": float(b2.final_price or b2.quoted_price or 0),
            "created_at": b2.created_at.isoformat(),
        })

    v1 = await db.execute(
        select(Booking).where(
            Booking.booking_number == num,
            Booking.is_deleted == False,  # noqa: E712
        )
    )
    b1 = v1.scalar_one_or_none()
    if b1:
        label = (b1.service_type or "Service").replace("_", " ").title()
        if b1.service_subtype:
            label = f"{label} — {b1.service_subtype.replace('_', ' ').title()}"
        return ApiResponse(data={
            "kind": "booking",
            "booking_number": b1.booking_number,
            "booking_status": b1.status,
            "service_name": label,
            "payment_status": None,
            "estimated_price": b1.estimated_price,
            "created_at": b1.created_at.isoformat(),
        })

    raise HTTPException(status_code=404, detail="Booking not found")


@router.get("/{booking_id}", response_model=ApiResponse)
async def get_booking(
    booking_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return ApiResponse(data=BookingOut.model_validate(booking))


@router.patch("/{booking_id}/status", response_model=ApiResponse)
async def update_booking_status(
    booking_id: UUID,
    payload: BookingStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking.status = payload.status
    await db.commit()
    await db.refresh(booking)
    return ApiResponse(data=BookingOut.model_validate(booking), message="Status updated")
