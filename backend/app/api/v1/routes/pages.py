import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role
from app.models.models import ActivityLog, Page
from app.schemas.schemas import ApiResponse, PageCreate, PageOut, PageUpdate, PaginatedMeta, PaginatedResponse

router = APIRouter(prefix="/pages", tags=["pages"])

# Top-level app routes a Page slug must not shadow (Next.js static routes
# always win over the dynamic /[slug] catch, so this isn't a security
# issue — just avoids an admin creating a page that can never be reached).
RESERVED_SLUGS = {
    "about", "blog", "book", "booking-success", "career", "cart", "checkout",
    "compare", "contact", "dashboard", "faq", "forgot-password", "gallery",
    "legal", "login", "order-success", "orders", "payment", "products",
    "profile", "projects", "register", "search", "services", "shipping",
    "sumon", "testimonials", "track", "api",
}


def _validate_slug(slug: str) -> None:
    if slug in RESERVED_SLUGS:
        raise HTTPException(status_code=400, detail=f"'{slug}' is a reserved route and can't be used as a page slug")


# ==================== PUBLIC ====================

@router.get("/{slug}", response_model=ApiResponse)
async def get_page(slug: str, db: AsyncSession = Depends(get_db)):
    """Get a published page by slug (public)."""
    result = await db.execute(
        select(Page).where(and_(Page.slug == slug, Page.is_deleted == False, Page.status == "published"))  # noqa: E712
    )
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return ApiResponse(data=PageOut.model_validate(page).model_dump(), message="Page fetched successfully")


# ==================== ADMIN ====================

@router.get("/admin/all", response_model=PaginatedResponse)
async def list_pages_admin(
    admin_id: str = Depends(require_role("pages.read")),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: str | None = None,
    search: str | None = Query(None),
):
    query = select(Page).where(Page.is_deleted == False)  # noqa: E712
    count_query = select(func.count(Page.id)).where(Page.is_deleted == False)  # noqa: E712

    if status:
        query = query.where(Page.status == status)
        count_query = count_query.where(Page.status == status)
    if search:
        term = f"%{search}%"
        clause = or_(Page.title_en.ilike(term), Page.title_bn.ilike(term), Page.slug.ilike(term))
        query = query.where(clause)
        count_query = count_query.where(clause)

    total = (await db.execute(count_query)).scalar() or 0
    total_pages = max(1, (total + per_page - 1) // per_page)

    result = await db.execute(
        query.order_by(Page.updated_at.desc()).offset((page - 1) * per_page).limit(per_page)
    )
    rows = result.scalars().all()

    return PaginatedResponse(
        data=[PageOut.model_validate(p).model_dump() for p in rows],
        message="Pages fetched successfully",
        meta=PaginatedMeta(page=page, per_page=per_page, total=total, total_pages=total_pages),
    )


@router.post("/admin", response_model=ApiResponse)
async def create_page(
    payload: PageCreate,
    admin_id: str = Depends(require_role("pages.write")),
    db: AsyncSession = Depends(get_db),
):
    _validate_slug(payload.slug)
    existing = await db.execute(select(Page).where(Page.slug == payload.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Slug already exists")

    data = payload.model_dump()
    if data.get("status") == "published" and not data.get("published_at"):
        data["published_at"] = datetime.now(timezone.utc)

    new_page = Page(**data)
    db.add(new_page)
    await db.flush()
    db.add(ActivityLog(
        admin_id=uuid.UUID(admin_id), action="create", entity_type="page", entity_id=new_page.id,
        new_values={"slug": new_page.slug, "title_en": new_page.title_en},
    ))
    await db.commit()
    await db.refresh(new_page)
    return ApiResponse(data=PageOut.model_validate(new_page).model_dump(), message="Page created successfully")


@router.get("/admin/{page_id}", response_model=ApiResponse)
async def get_page_admin(
    page_id: uuid.UUID,
    admin_id: str = Depends(require_role("pages.read")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Page).where(and_(Page.id == page_id, Page.is_deleted == False)))  # noqa: E712
    found = result.scalar_one_or_none()
    if not found:
        raise HTTPException(status_code=404, detail="Page not found")
    return ApiResponse(data=PageOut.model_validate(found).model_dump(), message="Page fetched successfully")


@router.put("/admin/{page_id}", response_model=ApiResponse)
async def update_page(
    page_id: uuid.UUID,
    payload: PageUpdate,
    admin_id: str = Depends(require_role("pages.write")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Page).where(and_(Page.id == page_id, Page.is_deleted == False)))  # noqa: E712
    found = result.scalar_one_or_none()
    if not found:
        raise HTTPException(status_code=404, detail="Page not found")

    update_data = payload.model_dump(exclude_unset=True)
    if update_data.get("status") == "published" and not found.published_at and not update_data.get("published_at"):
        update_data["published_at"] = datetime.now(timezone.utc)

    for field, value in update_data.items():
        setattr(found, field, value)

    await db.commit()
    await db.refresh(found)
    db.add(ActivityLog(
        admin_id=uuid.UUID(admin_id), action="update", entity_type="page", entity_id=found.id,
        new_values={k: (v.isoformat() if hasattr(v, "isoformat") else v) for k, v in update_data.items()},
    ))
    await db.commit()
    return ApiResponse(data=PageOut.model_validate(found).model_dump(), message="Page updated successfully")


@router.delete("/admin/{page_id}", response_model=ApiResponse)
async def delete_page(
    page_id: uuid.UUID,
    admin_id: str = Depends(require_role("pages.write")),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete — content is preserved, just no longer reachable."""
    result = await db.execute(select(Page).where(and_(Page.id == page_id, Page.is_deleted == False)))  # noqa: E712
    found = result.scalar_one_or_none()
    if not found:
        raise HTTPException(status_code=404, detail="Page not found")

    found.is_deleted = True
    db.add(ActivityLog(
        admin_id=uuid.UUID(admin_id), action="delete", entity_type="page", entity_id=found.id,
        old_values={"slug": found.slug, "title_en": found.title_en},
    ))
    await db.commit()
    return ApiResponse(message="Page deleted successfully")
