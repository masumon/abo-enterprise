import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, Response, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.http_cache import etag_json_response
from app.core.taxonomy import descendant_ids_for_slug
from app.core.json_util import to_json_safe
from app.core.security import require_role
from app.core.blog_links import set_blogs_for_service, get_blog_ids_for_service
from app.models.models import (
    Service,
    ServicePricingTier,
    ServiceBookingForm,
    ActivityLog,
)
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

# Pricing fields whose presence in a payload triggers the coherence check.
_PRICING_KEYS = {"pricing_type", "base_price", "min_price", "max_price", "hourly_rate"}


def _assert_price_coherence(
    pricing_type: str | None,
    base_price: float | None,
    min_price: float | None,
    max_price: float | None,
    hourly_rate: float | None,
    has_tiers: bool = False,
) -> None:
    """Reject a price setup that can only ever produce a ৳0 booking.

    A service priced `fixed` with no base price (or `hourly` with no rate)
    silently books at zero, because the booking falls back to base_price and
    then to None. Pricing tiers satisfy any of these on their own.
    """
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(
            status_code=422, detail="Minimum price cannot be greater than maximum price"
        )
    if has_tiers:
        return
    missing = {
        "fixed": ("base_price", base_price is None),
        "hourly": ("hourly_rate", hourly_rate is None),
    }.get(pricing_type or "")
    if missing and missing[1]:
        raise HTTPException(
            status_code=422,
            detail=f"A '{pricing_type}' service needs {missing[0]} (or at least one pricing tier)",
        )
    if pricing_type == "package" and base_price is None and (min_price is None or max_price is None):
        raise HTTPException(
            status_code=422,
            detail="A 'package' service needs a base price, a min/max range, or at least one pricing tier",
        )

async def _sync_category_cache(db: AsyncSession, values: dict) -> None:
    """Keep `category` as a cache of the linked taxonomy node's slug.

    The two classifications used to drift because nothing wrote both. Now the
    tree is authoritative: whenever category_id is set, the legacy string is
    derived from it, so every query and URL that reads the string keeps working
    and always agrees with the FK.
    """
    node_id = values.get("category_id")
    if not node_id:
        return
    from app.models.models import Category

    slug = (await db.execute(
        select(Category.slug).where(Category.id == node_id, Category.is_deleted == False)  # noqa: E712
    )).scalar_one_or_none()
    if slug:
        values["category"] = slug


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
    category_slug: str | None = None,
    subcategory_slug: str | None = None,
    featured: bool | None = None,
    search: str | None = None,
    sort: str | None = Query(
        None, description="default | name | price_low | price_high | newest"
    ),
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
    # Slug-based taxonomy filters — power the nested public routes. A node
    # matches the item's own node OR any ancestor: filtering by a parent shows
    # everything beneath it (unlimited depth). The deepest slug wins.
    node_slug = subcategory_slug or category_slug
    if node_slug:
        ids = await descendant_ids_for_slug(db, node_slug)
        conditions.append(
            or_(Service.category_id.in_(ids), Service.subcategory_id.in_(ids))
        )
    if featured is not None:
        conditions.append(Service.is_featured == featured)
    if search:
        term = f"%{search}%"
        # Widened beyond the two name columns so a customer searching for what a
        # service *does* ("passport", "firmware") finds it, not only its exact title.
        conditions.append(
            or_(
                Service.name_en.ilike(term),
                Service.name_bn.ilike(term),
                Service.short_description_en.ilike(term),
                Service.short_description_bn.ilike(term),
                Service.description_en.ilike(term),
            )
        )

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
    # Price sorts coalesce base → min → hourly so a service priced any of the
    # three ways still ranks, and nulls sink rather than leading the list.
    _price = func.coalesce(Service.base_price, Service.min_price, Service.hourly_rate)
    query = query.order_by(
        {
            "name": Service.name_en.asc(),
            "price_low": _price.asc().nullslast(),
            "price_high": _price.desc().nullslast(),
            "newest": Service.created_at.desc(),
        }.get(sort or "", Service.sort_order)
    )

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

    data = ServiceOut.model_validate(service).model_dump()
    # Aggregate rating from approved reviews — drives the on-page rating and
    # the aggregateRating in the service's structured data.
    from app.models.models import Review

    agg = (await db.execute(
        select(func.avg(Review.rating), func.count(Review.id)).where(
            Review.service_id == service.id,
            Review.is_active == True,  # noqa: E712
        )
    )).one()
    data["rating"] = round(float(agg[0]), 2) if agg[0] is not None else None
    data["review_count"] = int(agg[1] or 0)

    return ApiResponse(data=data, message="Service fetched successfully")


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


@router.get("/{service_id}/availability", response_model=ApiResponse)
async def get_service_availability(
    service_id: uuid.UUID,
    date: str = Query(..., description="Local (Asia/Dhaka) date, YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    """Bookable slots for a service on one day (public).

    Returns an empty list with ``scheduling_enabled: false`` for a service that
    doesn't use scheduling, so a client can call this unconditionally.
    """
    from datetime import date as date_cls
    from app.core import scheduling
    from app.models.models import BookingV2

    try:
        day = date_cls.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid date — use YYYY-MM-DD")

    result = await db.execute(
        select(Service).where(
            and_(Service.id == service_id, Service.is_deleted == False, Service.is_active == True)  # noqa: E712
        )
    )
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    if not scheduling.is_enabled(service):
        return ApiResponse(
            data={"scheduling_enabled": False, "date": date, "slots": []},
            message="Scheduling is not enabled for this service",
        )

    slots = scheduling.generate_slots(service, day)
    taken: dict = {}
    if slots:
        # One grouped count over the day's slots — cancelled bookings release
        # their slot, so they must not consume capacity.
        rows = await db.execute(
            select(BookingV2.booking_date, func.count(BookingV2.id))
            .where(
                BookingV2.service_id == service_id,
                BookingV2.is_deleted == False,  # noqa: E712
                BookingV2.status != "cancelled",
                BookingV2.booking_date.in_(slots),
            )
            .group_by(BookingV2.booking_date)
        )
        taken = scheduling.taken_counts(rows.all())

    return ApiResponse(
        data={
            "scheduling_enabled": True,
            "date": date,
            "slots": scheduling.slot_availability(service, day, taken),
        },
        message="Availability fetched successfully",
    )


# ==================== ADMIN ENDPOINTS ====================

@router.post("/admin/services", response_model=ApiResponse)
async def create_service(
    payload: ServiceCreate,
    admin_id: str = Depends(require_role("services.write")),
    db: AsyncSession = Depends(get_db),
):
    """Create a new service (admin only)"""
    # Check if slug already exists
    existing = await db.execute(
        select(Service).where(Service.slug == payload.slug)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Slug already exists")

    _assert_price_coherence(
        payload.pricing_type, payload.base_price, payload.min_price,
        payload.max_price, payload.hourly_rate,
    )

    values = payload.model_dump()
    blog_ids = values.pop("blog_ids", None)
    await _sync_category_cache(db, values)
    service = Service(**values)
    db.add(service)
    await db.flush()
    if blog_ids is not None:
        await set_blogs_for_service(db, service.id, blog_ids)
    await db.commit()

    # Log activity
    log = ActivityLog(
        admin_id=uuid.UUID(admin_id),
        action="create",
        entity_type="service",
        entity_id=service.id,
        new_values=to_json_safe(payload.model_dump()),
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
    admin_id: str = Depends(require_role("services.read")),
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
    admin_id: str = Depends(require_role("services.read")),
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
    admin_id: str = Depends(require_role("services.write")),
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

    old_values = to_json_safe({
        "name_en": service.name_en,
        "name_bn": service.name_bn,
        "base_price": service.base_price,
        "is_active": service.is_active,
    })

    # Update fields
    update_data = payload.dict(exclude_unset=True)
    # Blog links live in a separate table — pull them out before the column
    # loop below (Service has no blog_ids attribute).
    blog_ids = update_data.pop("blog_ids", None)

    # Slug is editable, but must stay unique across live services.
    new_slug = update_data.get("slug")
    if new_slug is not None and new_slug != service.slug:
        clash = await db.execute(
            select(Service).where(
                Service.slug == new_slug,
                Service.id != service_id,
                Service.is_deleted == False,  # noqa: E712
            )
        )
        if clash.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Slug already exists")

    # Only validate pricing when the request actually touches it, so editing an
    # unrelated field (SEO, copy) on a legacy service is never blocked.
    if _PRICING_KEYS & update_data.keys():
        tiers = await db.execute(
            select(func.count(ServicePricingTier.id)).where(
                ServicePricingTier.service_id == service_id,
                ServicePricingTier.is_deleted == False,  # noqa: E712
                ServicePricingTier.is_active == True,  # noqa: E712
            )
        )
        merged = {
            k: update_data.get(k, getattr(service, k))
            for k in ("pricing_type", "base_price", "min_price", "max_price", "hourly_rate")
        }
        _assert_price_coherence(
            merged["pricing_type"],
            *(None if merged[k] is None else float(merged[k])
              for k in ("base_price", "min_price", "max_price", "hourly_rate")),
            has_tiers=(tiers.scalar() or 0) > 0,
        )

    await _sync_category_cache(db, update_data)

    for field, value in update_data.items():
        setattr(service, field, value)

    if blog_ids is not None:
        await set_blogs_for_service(db, service.id, blog_ids)

    await db.commit()

    # Log activity
    log = ActivityLog(
        admin_id=uuid.UUID(admin_id),
        action="update",
        entity_type="service",
        entity_id=service.id,
        old_values=old_values,
        new_values=to_json_safe(update_data),
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
    admin_id: str = Depends(require_role("services.delete")),
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
    admin_id: str = Depends(require_role("services.write")),
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
    admin_id: str = Depends(require_role("services.write")),
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
    admin_id: str = Depends(require_role("services.delete")),
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
    admin_id: str = Depends(require_role("services.write")),
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
    admin_id: str = Depends(require_role("services.write")),
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
    admin_id: str = Depends(require_role("services.delete")),
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
