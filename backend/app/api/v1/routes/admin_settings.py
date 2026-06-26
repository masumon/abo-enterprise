import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.security import require_admin
from app.models.models import AdminSetting, PaymentMethod, ActivityLog
from app.schemas.schemas import (
    AdminSettingOut,
    AdminSettingCreate,
    AdminSettingUpdate,
    PaymentMethodOut,
    PaymentMethodCreate,
    PaginatedResponse,
    PaginatedMeta,
    ApiResponse,
)

router = APIRouter(prefix="/admin", tags=["admin-settings"])

# ==================== ADMIN SETTINGS ====================

@router.get("/settings", response_model=ApiResponse)
async def get_settings(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    category: str | None = None,
):
    """Get admin settings by category or all"""
    query = select(AdminSetting).where(AdminSetting.is_deleted == False)

    if category:
        query = query.where(AdminSetting.category == category)

    query = query.order_by(AdminSetting.sort_order)

    result = await db.execute(query)
    settings = result.scalars().all()

    # Group by category
    grouped = {}
    for setting in settings:
        if setting.category not in grouped:
            grouped[setting.category] = []
        grouped[setting.category].append(AdminSettingOut.from_orm(setting).dict())

    return ApiResponse(
        data=grouped,
        message="Settings fetched successfully",
    )


@router.get("/settings/{key}", response_model=ApiResponse)
async def get_setting(
    key: str,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get specific setting by key"""
    result = await db.execute(
        select(AdminSetting).where(
            AdminSetting.key == key, AdminSetting.is_deleted == False
        )
    )
    setting = result.scalar_one_or_none()

    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")

    return ApiResponse(
        data=AdminSettingOut.from_orm(setting).dict(),
        message="Setting fetched successfully",
    )


@router.put("/settings/{key}", response_model=ApiResponse)
async def update_setting(
    key: str,
    payload: AdminSettingUpdate,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update admin setting"""
    result = await db.execute(
        select(AdminSetting).where(
            AdminSetting.key == key, AdminSetting.is_deleted == False
        )
    )
    setting = result.scalar_one_or_none()

    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")

    if not setting.is_editable:
        raise HTTPException(
            status_code=403, detail="This setting cannot be edited"
        )

    old_value = setting.value

    # Update
    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(setting, field, value)

    await db.commit()
    await db.refresh(setting)

    # Log activity
    log = ActivityLog(
        admin_id=uuid.UUID(admin_id),
        action="update",
        entity_type="admin_setting",
        entity_id=setting.id,
        old_values={"value": old_value},
        new_values={"value": setting.value},
    )
    db.add(log)
    await db.commit()

    return ApiResponse(
        data=AdminSettingOut.from_orm(setting).dict(),
        message="Setting updated successfully",
    )


@router.post("/settings", response_model=ApiResponse)
async def create_setting(
    payload: AdminSettingCreate,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create new admin setting"""
    # Check if key already exists
    existing = await db.execute(
        select(AdminSetting).where(AdminSetting.key == payload.key)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Setting key already exists")

    setting = AdminSetting(**payload.dict())
    db.add(setting)
    await db.commit()
    await db.refresh(setting)

    return ApiResponse(
        data=AdminSettingOut.from_orm(setting).dict(),
        message="Setting created successfully",
    )


# ==================== PAYMENT METHODS ====================

@router.get("/payment-methods", response_model=ApiResponse)
async def list_payment_methods(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all payment methods"""
    result = await db.execute(
        select(PaymentMethod).order_by(PaymentMethod.sort_order)
    )
    methods = result.scalars().all()

    return ApiResponse(
        data=[PaymentMethodOut.from_orm(m).dict() for m in methods],
        message="Payment methods fetched successfully",
    )


@router.get("/payment-methods/{method_id}", response_model=ApiResponse)
async def get_payment_method(
    method_id: uuid.UUID,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get payment method details"""
    result = await db.execute(
        select(PaymentMethod).where(PaymentMethod.id == method_id)
    )
    method = result.scalar_one_or_none()

    if not method:
        raise HTTPException(status_code=404, detail="Payment method not found")

    return ApiResponse(
        data=PaymentMethodOut.from_orm(method).dict(),
        message="Payment method fetched successfully",
    )


@router.post("/payment-methods", response_model=ApiResponse)
async def create_payment_method(
    payload: PaymentMethodCreate,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create payment method"""
    method = PaymentMethod(**payload.dict())
    db.add(method)
    await db.commit()
    await db.refresh(method)

    return ApiResponse(
        data=PaymentMethodOut.from_orm(method).dict(),
        message="Payment method created successfully",
    )


@router.put("/payment-methods/{method_id}", response_model=ApiResponse)
async def update_payment_method(
    method_id: uuid.UUID,
    payload: PaymentMethodCreate,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update payment method"""
    result = await db.execute(
        select(PaymentMethod).where(PaymentMethod.id == method_id)
    )
    method = result.scalar_one_or_none()

    if not method:
        raise HTTPException(status_code=404, detail="Payment method not found")

    # Update
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(method, field, value)

    await db.commit()
    await db.refresh(method)

    return ApiResponse(
        data=PaymentMethodOut.from_orm(method).dict(),
        message="Payment method updated successfully",
    )


@router.delete("/payment-methods/{method_id}", response_model=ApiResponse)
async def delete_payment_method(
    method_id: uuid.UUID,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete payment method"""
    result = await db.execute(
        select(PaymentMethod).where(PaymentMethod.id == method_id)
    )
    method = result.scalar_one_or_none()

    if not method:
        raise HTTPException(status_code=404, detail="Payment method not found")

    await db.delete(method)
    await db.commit()

    return ApiResponse(message="Payment method deleted successfully")


# ==================== PUBLIC PAYMENT METHODS ====================

@router.get("/payment-methods-public", response_model=ApiResponse)
async def list_active_payment_methods(
    db: AsyncSession = Depends(get_db),
):
    """List active payment methods (public)"""
    result = await db.execute(
        select(PaymentMethod)
        .where(PaymentMethod.is_active == True)
        .order_by(PaymentMethod.sort_order)
    )
    methods = result.scalars().all()

    return ApiResponse(
        data=[PaymentMethodOut.from_orm(m).dict() for m in methods],
        message="Payment methods fetched successfully",
    )
