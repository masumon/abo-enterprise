import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import require_role
from app.models.models import PaymentMethod, ActivityLog
from app.schemas.schemas import (
    PaymentMethodOut,
    PaymentMethodCreate,
    PaymentMethodUpdate,
    ApiResponse,
)

# The generic admin-settings CRUD (AdminSetting model / admin_settings table)
# that used to live in this file has been removed — confirmed zero frontend
# callers (the live settings.py's `Setting` table/`/api/v1/settings/*` routes
# are what the admin panel actually reads/writes). See
# manual_sql/0025_archive_dead_tables.sql for the corresponding table archive.

router = APIRouter(prefix="/admin", tags=["admin-settings"])

# ==================== PAYMENT METHODS ====================

@router.get("/payment-methods", response_model=ApiResponse)
async def list_payment_methods(
    admin_id: str = Depends(require_role("payments.read")),
    db: AsyncSession = Depends(get_db),
):
    """List payment methods that have not been archived."""
    result = await db.execute(
        select(PaymentMethod)
        .where(PaymentMethod.is_deleted == False)  # noqa: E712
        .order_by(PaymentMethod.sort_order)
    )
    methods = result.scalars().all()

    return ApiResponse(
        data=[PaymentMethodOut.model_validate(m).model_dump() for m in methods],
        message="Payment methods fetched successfully",
    )


@router.get("/payment-methods/{method_id}", response_model=ApiResponse)
async def get_payment_method(
    method_id: uuid.UUID,
    admin_id: str = Depends(require_role("payments.read")),
    db: AsyncSession = Depends(get_db),
):
    """Get an active payment method record."""
    result = await db.execute(
        select(PaymentMethod).where(
            PaymentMethod.id == method_id,
            PaymentMethod.is_deleted == False,  # noqa: E712
        )
    )
    method = result.scalar_one_or_none()

    if not method:
        raise HTTPException(status_code=404, detail="Payment method not found")

    return ApiResponse(
        data=PaymentMethodOut.model_validate(method).model_dump(),
        message="Payment method fetched successfully",
    )


@router.post("/payment-methods", response_model=ApiResponse)
async def create_payment_method(
    payload: PaymentMethodCreate,
    admin_id: str = Depends(require_role("payments.write")),
    db: AsyncSession = Depends(get_db),
):
    """Create payment method."""
    method = PaymentMethod(**payload.model_dump())
    db.add(method)
    await db.flush()
    db.add(ActivityLog(
        admin_id=uuid.UUID(admin_id), action="create",
        entity_type="payment_method", entity_id=method.id,
        new_values=payload.model_dump(mode="json"),
    ))
    await db.commit()
    await db.refresh(method)

    return ApiResponse(
        data=PaymentMethodOut.model_validate(method).model_dump(),
        message="Payment method created successfully",
    )


@router.put("/payment-methods/{method_id}", response_model=ApiResponse)
async def update_payment_method(
    method_id: uuid.UUID,
    payload: PaymentMethodUpdate,
    admin_id: str = Depends(require_role("payments.write")),
    db: AsyncSession = Depends(get_db),
):
    """Update payment method (partial updates supported)."""
    result = await db.execute(
        select(PaymentMethod).where(
            PaymentMethod.id == method_id,
            PaymentMethod.is_deleted == False,  # noqa: E712
        )
    )
    method = result.scalar_one_or_none()

    if not method:
        raise HTTPException(status_code=404, detail="Payment method not found")

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=422, detail="No fields to update")

    for field, value in updates.items():
        setattr(method, field, value)

    db.add(ActivityLog(
        admin_id=uuid.UUID(admin_id), action="update",
        entity_type="payment_method", entity_id=method.id,
        new_values=updates,
    ))
    await db.commit()
    await db.refresh(method)

    return ApiResponse(
        data=PaymentMethodOut.model_validate(method).model_dump(),
        message="Payment method updated successfully",
    )


@router.delete("/payment-methods/{method_id}", response_model=ApiResponse)
async def delete_payment_method(
    method_id: uuid.UUID,
    admin_id: str = Depends(require_role("payments.write")),
    db: AsyncSession = Depends(get_db),
):
    """Disable a payment method without deleting its historical configuration."""
    result = await db.execute(
        select(PaymentMethod).where(
            PaymentMethod.id == method_id,
            PaymentMethod.is_deleted == False,  # noqa: E712
        )
    )
    method = result.scalar_one_or_none()

    if not method:
        raise HTTPException(status_code=404, detail="Payment method not found")

    method.is_active = False
    db.add(ActivityLog(
        admin_id=uuid.UUID(admin_id), action="deactivate",
        entity_type="payment_method", entity_id=method.id,
        new_values={"is_active": False, "reason": "admin_archive"},
    ))
    await db.commit()
    await db.refresh(method)

    return ApiResponse(message="Payment method disabled; historical configuration preserved")


# ==================== PUBLIC PAYMENT METHODS ====================

@router.get("/payment-methods-public", response_model=ApiResponse)
async def list_active_payment_methods(
    db: AsyncSession = Depends(get_db),
):
    """List active, non-archived payment methods (public)."""
    result = await db.execute(
        select(PaymentMethod)
        .where(
            PaymentMethod.is_active == True,  # noqa: E712
            PaymentMethod.is_deleted == False,  # noqa: E712
        )
        .order_by(PaymentMethod.sort_order)
    )
    methods = result.scalars().all()

    return ApiResponse(
        data=[PaymentMethodOut.model_validate(m).model_dump() for m in methods],
        message="Payment methods fetched successfully",
    )
