import uuid
import secrets
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.core.database import get_db
from app.core.security import require_admin
from app.core.config import settings
from app.core.email import (
    send_email,
    booking_notification_html,
    customer_booking_confirmation_html,
)
from app.core.invoice import InvoiceService
from app.models.models import (
    BookingV2,
    Service,
    ActivityLog,
    AdminUser,
    Invoice,
)
from app.core.rate_limit import rate_limit
from app.schemas.schemas import (
    BookingV2Out,
    BookingV2Create,
    BookingV2StatusUpdate,
    PaginatedResponse,
    PaginatedMeta,
    ApiResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/service-bookings", tags=["service-bookings"])


def generate_booking_number():
    """Generate unique booking number BK-YYYY-XXXXXX (hex — same entropy
    approach as order numbers; far lower collision odds than 6 digits)."""
    year = datetime.now(timezone.utc).year
    return f"BK-{year}-{secrets.token_hex(3).upper()}"


# ==================== PUBLIC ENDPOINTS ====================

@router.post("", response_model=ApiResponse, dependencies=[Depends(rate_limit("bookings_v2_create", 10, 600))])
async def create_booking(
    payload: BookingV2Create,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Create new booking (public)"""
    # Verify service exists
    service_result = await db.execute(
        select(Service).where(Service.id == payload.service_id)
    )
    service = service_result.scalar_one_or_none()

    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # ---- Server-authoritative price (never trust the client quoted_price) ----
    # Resolve from the selected tier, else the service base price. Mirrors the
    # booking form's own resolution but sourced from trusted DB rows.
    from app.models.models import ServicePricingTier
    trusted_price = None
    if payload.service_tier:
        tier_result = await db.execute(
            select(ServicePricingTier).where(
                ServicePricingTier.service_id == service.id,
                ServicePricingTier.tier_name == payload.service_tier,
            )
        )
        tier = tier_result.scalar_one_or_none()
        if tier is not None:
            trusted_price = float(tier.price)
    if trusted_price is None:
        trusted_price = float(service.base_price) if service.base_price is not None else None

    # Generate booking number
    booking_number = generate_booking_number()

    booking_fields = payload.model_dump()
    booking_fields["quoted_price"] = trusted_price

    booking = BookingV2(
        booking_number=booking_number,
        service_name=service.name_en,
        **booking_fields,
    )

    db.add(booking)
    await db.commit()
    await db.refresh(booking)

    if settings.ADMIN_NOTIFY_EMAIL:
        html = booking_notification_html(
            booking.booking_number,
            payload.customer_name,
            payload.customer_phone,
            service.name_en,
            payload.details or "",
        )
        background_tasks.add_task(
            send_email,
            settings.ADMIN_NOTIFY_EMAIL,
            f"New Booking {booking.booking_number} — ABO Enterprise",
            html,
        )

    if payload.customer_email:
        estimated = (
            f"৳{trusted_price:,.0f}" if trusted_price else "Quote upon confirmation"
        )
        html = customer_booking_confirmation_html(
            booking.booking_number,
            payload.customer_name,
            service.name_en,
            estimated,
            settings.WHATSAPP_NUMBER,
        )
        background_tasks.add_task(
            send_email,
            payload.customer_email,
            f"Booking Confirmation #{booking.booking_number} — ABO Enterprise",
            html,
        )

    invoice_id = None
    try:
        invoice = await InvoiceService(db).create_booking_invoice(booking_id=booking.id)
        invoice_id = str(invoice.id)
    except Exception:
        await db.rollback()
        logger.exception("Auto invoice for booking %s failed", booking.booking_number)

    data = BookingV2Out.model_validate(booking).model_dump()
    data["invoice_id"] = invoice_id

    return ApiResponse(
        data=data,
        message="Booking created successfully",
    )


@router.get("/{booking_id}", response_model=ApiResponse)
async def get_booking(
    booking_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get booking details (public - customer can see their booking by ID)"""
    result = await db.execute(
        select(BookingV2).where(
            and_(BookingV2.id == booking_id, BookingV2.is_deleted == False)
        )
    )
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    return ApiResponse(
        data=BookingV2Out.model_validate(booking).model_dump(),
        message="Booking fetched successfully",
    )


# ==================== ADMIN ENDPOINTS ====================

@router.get("/admin/bookings", response_model=PaginatedResponse)
async def list_bookings_admin(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: str | None = None,
    service_id: uuid.UUID | None = None,
    payment_status: str | None = None,
):
    """List all bookings (admin only)"""
    query = select(BookingV2).where(BookingV2.is_deleted == False)

    if status:
        query = query.where(BookingV2.status == status)

    if service_id:
        query = query.where(BookingV2.service_id == service_id)

    if payment_status:
        query = query.where(BookingV2.payment_status == payment_status)

    count_conditions = [BookingV2.is_deleted == False]
    if status:
        count_conditions.append(BookingV2.status == status)
    if service_id:
        count_conditions.append(BookingV2.service_id == service_id)
    if payment_status:
        count_conditions.append(BookingV2.payment_status == payment_status)

    count_result = await db.execute(
        select(func.count(BookingV2.id)).where(and_(*count_conditions))
    )
    total = count_result.scalar()

    # Pagination and sorting
    total_pages = (total + per_page - 1) // per_page
    query = (
        query.offset((page - 1) * per_page)
        .limit(per_page)
        .order_by(BookingV2.created_at.desc())
    )

    result = await db.execute(query)
    bookings = result.scalars().all()

    return PaginatedResponse(
        data=[BookingV2Out.model_validate(b).model_dump() for b in bookings],
        message="Bookings fetched successfully",
        meta=PaginatedMeta(
            page=page,
            per_page=per_page,
            total=total,
            total_pages=total_pages,
        ),
    )


@router.get("/admin/bookings/{booking_id}", response_model=ApiResponse)
async def get_booking_admin(
    booking_id: uuid.UUID,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get booking details (admin)"""
    result = await db.execute(
        select(BookingV2).where(
            and_(BookingV2.id == booking_id, BookingV2.is_deleted == False)
        )
    )
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    return ApiResponse(
        data=BookingV2Out.model_validate(booking).model_dump(),
        message="Booking fetched successfully",
    )


@router.patch("/admin/bookings/{booking_id}/status", response_model=ApiResponse)
async def update_booking_status(
    booking_id: uuid.UUID,
    payload: BookingV2StatusUpdate,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update booking status (admin only)"""
    result = await db.execute(
        select(BookingV2).where(
            and_(BookingV2.id == booking_id, BookingV2.is_deleted == False)
        )
    )
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    old_status = booking.status
    booking.status = payload.status

    if payload.status == "completed":
        booking.completed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(booking)

    # Log activity
    log = ActivityLog(
        admin_id=uuid.UUID(admin_id),
        action="update",
        entity_type="booking",
        entity_id=booking.id,
        old_values={"status": old_status},
        new_values={"status": booking.status},
    )
    db.add(log)
    await db.commit()

    # TODO: Send status update email to customer

    return ApiResponse(
        data=BookingV2Out.model_validate(booking).model_dump(),
        message="Booking status updated successfully",
    )


@router.put("/admin/bookings/{booking_id}", response_model=ApiResponse)
async def update_booking(
    booking_id: uuid.UUID,
    payload: BookingV2Create,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update booking details (admin only)"""
    result = await db.execute(
        select(BookingV2).where(
            and_(BookingV2.id == booking_id, BookingV2.is_deleted == False)
        )
    )
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Update fields
    update_data = payload.dict(exclude={"service_id"})
    for field, value in update_data.items():
        setattr(booking, field, value)

    await db.commit()
    await db.refresh(booking)

    # Log activity
    log = ActivityLog(
        admin_id=uuid.UUID(admin_id),
        action="update",
        entity_type="booking",
        entity_id=booking.id,
        new_values=update_data,
    )
    db.add(log)
    await db.commit()

    return ApiResponse(
        data=BookingV2Out.model_validate(booking).model_dump(),
        message="Booking updated successfully",
    )


@router.delete("/admin/bookings/{booking_id}", response_model=ApiResponse)
async def delete_booking(
    booking_id: uuid.UUID,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete booking (admin only)"""
    result = await db.execute(
        select(BookingV2).where(
            and_(BookingV2.id == booking_id, BookingV2.is_deleted == False)
        )
    )
    booking = result.scalar_one_or_none()

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.is_deleted = True
    await db.commit()

    # Log activity
    log = ActivityLog(
        admin_id=uuid.UUID(admin_id),
        action="delete",
        entity_type="booking",
        entity_id=booking.id,
    )
    db.add(log)
    await db.commit()

    return ApiResponse(message="Booking deleted successfully")


# ==================== BOOKING STATISTICS ====================

@router.get("/admin/bookings/stats/summary", response_model=ApiResponse)
async def get_booking_stats(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get booking statistics summary"""
    # Total bookings
    total_result = await db.execute(
        select(func.count(BookingV2.id)).where(BookingV2.is_deleted == False)
    )
    total_bookings = total_result.scalar() or 0

    # Pending
    pending_result = await db.execute(
        select(func.count(BookingV2.id)).where(
            and_(BookingV2.is_deleted == False, BookingV2.status == "pending")
        )
    )
    pending_bookings = pending_result.scalar() or 0

    # Confirmed
    confirmed_result = await db.execute(
        select(func.count(BookingV2.id)).where(
            and_(BookingV2.is_deleted == False, BookingV2.status == "confirmed")
        )
    )
    confirmed_bookings = confirmed_result.scalar() or 0

    # In progress
    in_progress_result = await db.execute(
        select(func.count(BookingV2.id)).where(
            and_(BookingV2.is_deleted == False, BookingV2.status == "in_progress")
        )
    )
    in_progress_bookings = in_progress_result.scalar() or 0

    # Completed
    completed_result = await db.execute(
        select(func.count(BookingV2.id)).where(
            and_(BookingV2.is_deleted == False, BookingV2.status == "completed")
        )
    )
    completed_bookings = completed_result.scalar() or 0

    return ApiResponse(
        data={
            "total_bookings": total_bookings,
            "pending": pending_bookings,
            "confirmed": confirmed_bookings,
            "in_progress": in_progress_bookings,
            "completed": completed_bookings,
        },
        message="Booking stats fetched successfully",
    )
