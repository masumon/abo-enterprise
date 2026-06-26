from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.core.database import get_db
from app.core.security import require_admin
from app.core.config import settings
from app.core.email import send_email, booking_notification_html, customer_booking_confirmation_html
from app.models.models import Booking
from app.schemas.schemas import BookingCreate, BookingOut, BookingStatusUpdate, ApiResponse, PaginatedResponse, PaginatedMeta

router = APIRouter(prefix="/bookings", tags=["bookings"])


def generate_booking_number() -> str:
    now = datetime.now()
    return f"ABO-B-{now.year}{now.month:02d}-{now.microsecond % 10000:04d}"


@router.post("", response_model=ApiResponse, status_code=201)
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
    await db.flush()
    await db.refresh(booking)

    # Send admin notification
    if settings.ADMIN_NOTIFY_EMAIL:
        html = booking_notification_html(
            booking.booking_number, payload.customer_name, payload.customer_phone,
            payload.service_type, payload.details or "",
        )
        background_tasks.add_task(
            send_email, settings.ADMIN_NOTIFY_EMAIL,
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

    return ApiResponse(
        data={"booking_id": str(booking.id), "booking_number": booking.booking_number},
        message="Booking created successfully! Check your email for confirmation."
    )


@router.get("", response_model=PaginatedResponse)
async def list_bookings(
    service_type: str | None = Query(None),
    status: str | None = Query(None),
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
    return ApiResponse(data=BookingOut.model_validate(booking), message="Status updated")
