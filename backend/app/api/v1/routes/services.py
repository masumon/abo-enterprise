import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.http_cache import etag_json_response
from app.core.security import require_admin
from app.models.models import Service, ServicePricingTier, ServiceBookingForm, ActivityLog, AdminUser
from app.schemas.schemas import (
    ServiceOut,
    ServiceCreate,
    ServiceUpdate,
    ServicePricingTierOut,
    ServicePricingTierCreate,
    ServiceBookingFormOut,
    ServiceBookingFormCreate,
    PaginatedResponse,
    PaginatedMeta,
    ApiResponse,
)

router = APIRouter(prefix="/services", tags=["services"])

# ==================== PUBLIC ENDPOINTS ====================

@router.get("", response_model=PaginatedResponse)
async def list_services(
    request: Request,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    category: str | None = None,
    category_id: uuid.UUID | None = None,
    subcategory_id: uuid.UUID | None = None,
    featured: bool | None = None,
    search: str | None = None,
) -> Response:
    """List all active services (public endpoint)"""
    conditions = [
        Service.is_deleted == False,  # noqa: E712
        Service.is_active == True,  # noqa: E712
    ]
    if category:
        conditions.append(Service.category == category)
    # Additive taxonomy filters — legacy string `category` above still works.
    if category_id is not None:
        conditions.append(Service.category_id == category_id)
    if subcategory_id is not None:
        conditions.append(Service.subcategory_id == subcategory_id)
    if featured is not None:
        conditions.append(Service.is_featured == featured)
    if search:
        term = f"%{search}%"
        conditions.append(or_(Service.name_en.ilike(term), Service.name_bn.ilike(term)))

    query = select(Service).where(and_(*conditions)).options(
        selectinload(Service.pricing_tiers), selectinload(Service.booking_forms)
    )

    # Count total
    count_result = await db.execute(
        select(func.count(Service.id)).select_from(Service).where(and_(*conditions))
    )
    total = count_result.scalar()

    # Pagination
    total_pages = (total + per_page - 1) // per_page
    query = query.offset((page - 1) * per_page).limit(per_page)
    query = query.order_by(Service.sort_order)

    result = await db.execute(query)
    services = result.scalars().all()

    payload = PaginatedResponse(
        data=[ServiceOut.model_validate(s).model_dump() for s in services],
        message="Services fetched successfully",
        meta=PaginatedMeta(
            page=page,
            per_page=per_page,
            total=total,
            total_pages=total_pages,
        ),
    )
    # ETag + short public cache — repeat visits get 304s (mobile + free-tier win)
    return etag_json_response(request, payload.model_dump(mode="json"), max_age=60)


@router.get("/{slug}", response_model=ApiResponse)
async def get_service(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Get service details by slug (public)"""
    result = await db.execute(
        select(Service).where(
            and_(Service.slug == slug, Service.is_deleted == False, Service.is_active == True)
        ).options(selectinload(Service.pricing_tiers), selectinload(Service.booking_forms))
    )
    service = result.scalar_one_or_none()

    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    return ApiResponse(
        data=ServiceOut.model_validate(service).model_dump(),
        message="Service fetched successfully",
    )


@router.get("/{service_id}/booking-form", response_model=ApiResponse)
async def get_booking_form(
    service_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get booking form fields for a service (public)"""
    result = await db.execute(
        select(ServiceBookingForm)
        .where(
            and_(
                ServiceBookingForm.service_id == service_id,
                ServiceBookingForm.is_deleted == False,
                ServiceBookingForm.is_active == True,
            )
        )
        .order_by(ServiceBookingForm.sort_order)
    )
    fields = result.scalars().all()

    return ApiResponse(
        data=[ServiceBookingFormOut.model_validate(f).model_dump() for f in fields],
        message="Booking form fields fetched successfully",
    )


# ==================== ADMIN ENDPOINTS ====================

@router.post("/admin/services", response_model=ApiResponse)
async def create_service(
    payload: ServiceCreate,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new service (admin only)"""
    # Check if slug already exists
    existing = await db.execute(
        select(Service).where(Service.slug == payload.slug)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Slug already exists")

    service = Service(**payload.model_dump())
    db.add(service)
    await db.commit()

    # Log activity
    log = ActivityLog(
        admin_id=uuid.UUID(admin_id),
        action="create",
        entity_type="service",
        entity_id=service.id,
        new_values=payload.model_dump(),
    )
    db.add(log)
    await db.commit()

    result = await db.execute(
        select(Service).where(Service.id == service.id)
        .options(selectinload(Service.pricing_tiers), selectinload(Service.booking_forms))
    )
    service = result.scalar_one()

    return ApiResponse(
        data=ServiceOut.model_validate(service).model_dump(),
        message="Service created successfully",
    )


@router.get("/admin/services", response_model=PaginatedResponse)
async def list_services_admin(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
):
    """List all services (admin)"""
    query = select(Service).where(Service.is_deleted == False).options(
        selectinload(Service.pricing_tiers), selectinload(Service.booking_forms)
    )

    # Count total
    count_result = await db.execute(
        select(func.count(Service.id)).where(Service.is_deleted == False)
    )
    total = count_result.scalar()

    # Pagination
    total_pages = (total + per_page - 1) // per_page
    query = query.offset((page - 1) * per_page).limit(per_page)
    query = query.order_by(Service.sort_order)

    result = await db.execute(query)
    services = result.scalars().all()

    return PaginatedResponse(
        data=[ServiceOut.model_validate(s).model_dump() for s in services],
        message="Services fetched successfully",
        meta=PaginatedMeta(
            page=page,
            per_page=per_page,
            total=total,
            total_pages=total_pages,
        ),
    )


@router.get("/admin/services/{service_id}", response_model=ApiResponse)
async def get_service_admin(
    service_id: uuid.UUID,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get service details (admin)"""
    result = await db.execute(
        select(Service).where(
            and_(Service.id == service_id, Service.is_deleted == False)
        ).options(selectinload(Service.pricing_tiers), selectinload(Service.booking_forms))
    )
    service = result.scalar_one_or_none()

    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    return ApiResponse(
        data=ServiceOut.model_validate(service).model_dump(),
        message="Service fetched successfully",
    )


@router.put("/admin/services/{service_id}", response_model=ApiResponse)
async def update_service(
    service_id: uuid.UUID,
    payload: ServiceUpdate,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update service (admin only)"""
    result = await db.execute(
        select(Service).where(
            and_(Service.id == service_id, Service.is_deleted == False)
        )
    )
    service = result.scalar_one_or_none()

    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    old_values = {
        "name_en": service.name_en,
        "name_bn": service.name_bn,
        "base_price": service.base_price,
        "is_active": service.is_active,
    }

    # Update fields
    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(service, field, value)

    await db.commit()

    # Log activity
    log = ActivityLog(
        admin_id=uuid.UUID(admin_id),
        action="update",
        entity_type="service",
        entity_id=service.id,
        old_values=old_values,
        new_values=update_data,
    )
    db.add(log)
    await db.commit()

    result = await db.execute(
        select(Service).where(Service.id == service_id)
        .options(selectinload(Service.pricing_tiers), selectinload(Service.booking_forms))
    )
    service = result.scalar_one()

    return ApiResponse(
        data=ServiceOut.model_validate(service).model_dump(),
        message="Service updated successfully",
    )


@router.delete("/admin/services/{service_id}", response_model=ApiResponse)
async def delete_service(
    service_id: uuid.UUID,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete service (admin only)"""
    result = await db.execute(
        select(Service).where(
            and_(Service.id == service_id, Service.is_deleted == False)
        )
    )
    service = result.scalar_one_or_none()

    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    service.is_deleted = True
    await db.commit()

    # Log activity
    log = ActivityLog(
        admin_id=uuid.UUID(admin_id),
        action="delete",
        entity_type="service",
        entity_id=service.id,
    )
    db.add(log)
    await db.commit()

    return ApiResponse(
        message="Service deleted successfully",
    )


# ==================== SERVICE PRICING TIERS ====================

@router.post("/admin/services/{service_id}/tiers", response_model=ApiResponse)
async def create_pricing_tier(
    service_id: uuid.UUID,
    payload: ServicePricingTierCreate,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create pricing tier for service (admin only)"""
    # Verify service exists
    service_result = await db.execute(
        select(Service).where(Service.id == service_id)
    )
    if not service_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Service not found")

    tier = ServicePricingTier(service_id=service_id, **payload.model_dump())
    db.add(tier)
    await db.commit()
    await db.refresh(tier)

    return ApiResponse(
        data=ServicePricingTierOut.model_validate(tier).model_dump(),
        message="Pricing tier created successfully",
    )


@router.put("/admin/services/{service_id}/tiers/{tier_id}", response_model=ApiResponse)
async def update_pricing_tier(
    service_id: uuid.UUID,
    tier_id: uuid.UUID,
    payload: ServicePricingTierCreate,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update pricing tier (admin only)"""
    result = await db.execute(
        select(ServicePricingTier).where(
            and_(
                ServicePricingTier.id == tier_id,
                ServicePricingTier.service_id == service_id,
                ServicePricingTier.is_deleted == False,
            )
        )
    )
    tier = result.scalar_one_or_none()

    if not tier:
        raise HTTPException(status_code=404, detail="Tier not found")

    # Update
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(tier, field, value)

    await db.commit()
    await db.refresh(tier)

    return ApiResponse(
        data=ServicePricingTierOut.model_validate(tier).model_dump(),
        message="Tier updated successfully",
    )


@router.delete("/admin/services/{service_id}/tiers/{tier_id}", response_model=ApiResponse)
async def delete_pricing_tier(
    service_id: uuid.UUID,
    tier_id: uuid.UUID,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete pricing tier (admin only)"""
    result = await db.execute(
        select(ServicePricingTier).where(
            and_(
                ServicePricingTier.id == tier_id,
                ServicePricingTier.service_id == service_id,
            )
        )
    )
    tier = result.scalar_one_or_none()

    if not tier:
        raise HTTPException(status_code=404, detail="Tier not found")

    tier.is_deleted = True
    await db.commit()

    return ApiResponse(message="Tier deleted successfully")


# ==================== BOOKING FORM FIELDS ====================

@router.post(
    "/admin/services/{service_id}/form-fields", response_model=ApiResponse
)
async def create_booking_form_field(
    service_id: uuid.UUID,
    payload: ServiceBookingFormCreate,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create booking form field (admin only)"""
    # Verify service exists
    service_result = await db.execute(
        select(Service).where(Service.id == service_id)
    )
    if not service_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Service not found")

    field = ServiceBookingForm(service_id=service_id, **payload.model_dump())
    db.add(field)
    await db.commit()
    await db.refresh(field)

    return ApiResponse(
        data=ServiceBookingFormOut.model_validate(field).model_dump(),
        message="Form field created successfully",
    )


@router.put(
    "/admin/services/{service_id}/form-fields/{field_id}", response_model=ApiResponse
)
async def update_booking_form_field(
    service_id: uuid.UUID,
    field_id: uuid.UUID,
    payload: ServiceBookingFormCreate,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update booking form field (admin only)"""
    result = await db.execute(
        select(ServiceBookingForm).where(
            and_(
                ServiceBookingForm.id == field_id,
                ServiceBookingForm.service_id == service_id,
                ServiceBookingForm.is_deleted == False,
            )
        )
    )
    field = result.scalar_one_or_none()

    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    # Update
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(field, key, value)

    await db.commit()
    await db.refresh(field)

    return ApiResponse(
        data=ServiceBookingFormOut.model_validate(field).model_dump(),
        message="Field updated successfully",
    )


@router.delete(
    "/admin/services/{service_id}/form-fields/{field_id}", response_model=ApiResponse
)
async def delete_booking_form_field(
    service_id: uuid.UUID,
    field_id: uuid.UUID,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete booking form field (admin only)"""
    result = await db.execute(
        select(ServiceBookingForm).where(
            and_(
                ServiceBookingForm.id == field_id,
                ServiceBookingForm.service_id == service_id,
            )
        )
    )
    field = result.scalar_one_or_none()

    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    field.is_deleted = True
    await db.commit()

    return ApiResponse(message="Field deleted successfully")
