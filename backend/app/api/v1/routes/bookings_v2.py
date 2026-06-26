import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.core.database import get_db
from app.core.security import require_admin
from app.models.models import (
    BookingV2,
    Service,
    ActivityLog,
    AdminUser,
    Invoice,
)
from app.schemas.schemas import (
    BookingV2Out,
    BookingV2Create,
    BookingV2StatusUpdate,
    PaginatedResponse,
    PaginatedMeta,
    ApiResponse,
)
import random
import string

router = APIRouter(prefix="/bookings", tags=["bookings"])


def generate_booking_number():
    """Generate unique booking number BK-YYYY-XXXXXX"""
    year = datetime.now(timezone.utc).year
    random_part = "".join(random.choices(string.digits, k=6))
    return f"BK-{year}-{random_part}"


# ==================== PUBLIC ENDPOINTS ====================

@router.post("", response_model=ApiResponse)
async def create_booking(
    payload: BookingV2Create,
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

    # Generate booking number
    booking_number = generate_booking_number()

    booking = BookingV2(
        booking_number=booking_number,
        service_name=service.name_en,
        **payload.model_dump(),
    )

    db.add(booking)
    await db.commit()
    await db.refresh(booking)

    # TODO: Send confirmation email to customer
    # TODO: Notify admin of new booking

    return ApiResponse(
        data=BookingV2Out.model_validate(booking).model_dump(),
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

    # Count total
    count_result = await db.execute(
        select(func.count(BookingV2.id)).where(BookingV2.is_deleted == False)
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
