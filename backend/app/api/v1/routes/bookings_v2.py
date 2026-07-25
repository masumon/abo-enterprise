import html as html_escape_mod
import uuid
import secrets
import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.json_util import to_json_safe
from app.core.security import require_role
from app.core.config import settings
from app.core.email import (
    send_email,
    booking_notification_html,
    customer_booking_confirmation_html,
)
from app.core.capabilities import get_capabilities
from app.core.invoice import InvoiceService
from app.core.booking_form import (
    BookingFormValidationError,
    summarize_form_data,
    validate_form_data,
)
from app.models.models import (
    BookingV2,
    Service,
    ActivityLog,
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


def _phone_matches(stored: str, supplied: str) -> bool:
    """Compare a supplied phone against the stored one.

    Stored numbers are normalised by ``bd_phone`` at creation while callers
    often send exactly what the customer typed, so both forms are accepted.
    Falls back to a raw comparison when the supplied value doesn't normalise.
    """
    supplied = (supplied or "").strip()
    if not supplied:
        return False
    if stored == supplied:
        return True
    from app.schemas.schemas import bd_phone

    try:
        return stored == bd_phone(supplied)
    except ValueError:
        return False


# ==================== PUBLIC ENDPOINTS ====================

@router.post("", response_model=ApiResponse, dependencies=[Depends(rate_limit("bookings_v2_create", 10, 600))])
async def create_booking(
    payload: BookingV2Create,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Create new booking (public)"""
    # Verify the service exists AND is publicly transactable. The public read
    # endpoints already filter on is_deleted/is_active (routes/services.py), so
    # accepting a booking for a withdrawn service here would let a replayed
    # service_id book something no customer can see. Booking form fields ride
    # along in the same query.
    service_result = await db.execute(
        select(Service)
        .where(
            Service.id == payload.service_id,
            Service.is_deleted == False,  # noqa: E712
            Service.is_active == True,  # noqa: E712
        )
        .options(selectinload(Service.booking_forms))
    )
    service = service_result.scalar_one_or_none()

    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # This endpoint is the intake for both the "book" and the "order" CTA
    # (an orderable-but-not-bookable service posts here in mode=order), so the
    # gate is "has any commerce capability" rather than bookable-only. A
    # service with neither resolves to the "contact" CTA and must not accept
    # form submissions at all.
    if not get_capabilities(service):
        raise HTTPException(
            status_code=409,
            detail="This service is not available for online booking.",
        )

    # A preferred date in the past is never a real intent. Compared with a
    # one-day grace so a date picked "today" in Bangladesh (UTC+6, submitted as
    # UTC midnight) is never rejected.
    if payload.booking_date is not None:
        booked_at = payload.booking_date
        if booked_at.tzinfo is None:
            booked_at = booked_at.replace(tzinfo=timezone.utc)
        if booked_at < datetime.now(timezone.utc) - timedelta(days=1):
            raise HTTPException(
                status_code=422,
                detail={
                    "message": "Invalid booking form data",
                    "errors": {"booking_date": "Preferred date cannot be in the past"},
                },
            )

    # ---- Dynamic booking form validation (admin-defined fields) ----
    # Validates the submitted form_data against the service's active
    # service_booking_forms config; stale/unknown keys are dropped, bad
    # values are rejected with per-field errors.
    form_fields = [
        f for f in service.booking_forms if not f.is_deleted and f.is_active
    ]
    try:
        cleaned_form_data = validate_form_data(form_fields, payload.form_data)
    except BookingFormValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail={"message": "Invalid booking form data", "errors": exc.errors},
        )

    # ---- Server-authoritative price (never trust the client quoted_price) ----
    # Resolve from the selected tier, else the service base price. Mirrors the
    # booking form's own resolution but sourced from trusted DB rows.
    from app.models.models import ServicePricingTier
    trusted_price = None
    if payload.service_tier:
        # Soft-deleted/disabled tiers must not price a booking, and tier names
        # are not unique per service — order + limit keeps the pick
        # deterministic instead of raising MultipleResultsFound on a duplicate.
        tier_result = await db.execute(
            select(ServicePricingTier)
            .where(
                ServicePricingTier.service_id == service.id,
                ServicePricingTier.tier_name == payload.service_tier,
                ServicePricingTier.is_deleted == False,  # noqa: E712
                ServicePricingTier.is_active == True,  # noqa: E712
            )
            .order_by(ServicePricingTier.created_at)
            .limit(1)
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
    booking_fields["form_data"] = cleaned_form_data
    # pricing_type describes the service, not the request — take it from the
    # trusted row so a tampered body can't mislabel how the booking is priced.
    booking_fields["pricing_type"] = service.pricing_type

    booking = BookingV2(
        booking_number=booking_number,
        service_name=service.name_en,
        **booking_fields,
    )

    db.add(booking)
    await db.commit()
    await db.refresh(booking)

    from app.core.email_config import resolve_notify_email
    _notify_to = await resolve_notify_email(db)
    if _notify_to:
        # Include the dynamic form answers in the admin notification. The
        # template interpolates into HTML, so escape and use <br/> — plain
        # newlines would collapse and run the answers together.
        form_summary = summarize_form_data(form_fields, cleaned_form_data)
        details_with_form = "<br/><br/>".join(
            html_escape_mod.escape(x).replace("\n", "<br/>")
            for x in (payload.details, form_summary)
            if x
        )
        html = booking_notification_html(
            booking.booking_number,
            payload.customer_name,
            payload.customer_phone,
            service.name_en,
            details_with_form,
        )
        background_tasks.add_task(
            send_email,
            _notify_to,
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


@router.get(
    "/{booking_id}",
    response_model=ApiResponse,
    dependencies=[Depends(rate_limit("bookings_v2_read", 30, 300))],
)
async def get_booking(
    booking_id: uuid.UUID,
    phone: str = Query(..., description="Customer phone used on the booking"),
    db: AsyncSession = Depends(get_db),
):
    """Get booking details (public) — requires the matching customer phone.

    The response carries the customer's name, contacts and every dynamic form
    answer, so the booking id alone is not sufficient authorisation. Same gate
    as the public invoice endpoints (routes/invoices.py); a mismatch returns
    404 rather than 403 so the endpoint never confirms that an id exists.
    """
    result = await db.execute(
        select(BookingV2).where(
            and_(BookingV2.id == booking_id, BookingV2.is_deleted == False)
        )
    )
    booking = result.scalar_one_or_none()

    if not booking or not _phone_matches(booking.customer_phone, phone):
        raise HTTPException(status_code=404, detail="Booking not found")

    return ApiResponse(
        data=BookingV2Out.model_validate(booking).model_dump(),
        message="Booking fetched successfully",
    )


# ==================== ADMIN ENDPOINTS ====================

@router.get("/admin/bookings", response_model=PaginatedResponse)
async def list_bookings_admin(
    admin_id: str = Depends(require_role("bookings.read")),
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
    admin_id: str = Depends(require_role("bookings.read")),
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
    admin_id: str = Depends(require_role("bookings.write")),
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
    admin_id: str = Depends(require_role("bookings.write")),
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

    # Update fields. form_data holds the customer's dynamic-form answers —
    # only overwrite it when the admin explicitly sent it, otherwise a routine
    # edit (e.g. fixing a phone typo) would wipe the answers to the default {}.
    update_data = payload.dict(exclude={"service_id"})
    if "form_data" not in payload.model_fields_set:
        update_data.pop("form_data", None)
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
        new_values=to_json_safe(update_data),
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
    admin_id: str = Depends(require_role("bookings.delete")),
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
    admin_id: str = Depends(require_role("bookings.read")),
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
