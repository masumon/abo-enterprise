"""Commerce taxonomy API — Category -> Subcategory management.

Public endpoints expose the active taxonomy tree (consumed by product/service
category pages and navigation). Admin endpoints provide full CRUD, guarded by
the existing RBAC (`require_role`) using the catalog (`products.*`)
permissions — no new permission set is introduced.

This is additive: it never mutates the existing `category`/`sub_category`
string columns, so all current queries, filters and URLs keep working.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import require_role
from app.models.models import Category, Subcategory, ActivityLog
from app.schemas.schemas import (
    ApiResponse,
    CategoryCreate,
    CategoryOut,
    CategoryUpdate,
    SubcategoryCreate,
    SubcategoryOut,
    SubcategoryUpdate,
)

router = APIRouter(prefix="/categories", tags=["categories"])


# ==================== PUBLIC ENDPOINTS ====================

@router.get("", response_model=ApiResponse)
async def list_categories(
    applies_to: str | None = Query(None, description="Filter: 'product' or 'service'"),
    include_inactive: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    """Return the taxonomy tree (categories with their subcategories)."""
    stmt = (
        select(Category)
        .where(Category.is_deleted == False)  # noqa: E712
        .options(selectinload(Category.subcategories))
        .order_by(Category.sort_order, Category.name_en)
    )
    if not include_inactive:
        stmt = stmt.where(Category.is_active == True)  # noqa: E712

    result = await db.execute(stmt)
    categories = result.scalars().unique().all()

    def serialize(cat: Category) -> dict:
        data = CategoryOut.model_validate(cat).model_dump()
        subs = [s for s in cat.subcategories if not s.is_deleted and (include_inactive or s.is_active)]
        subs.sort(key=lambda s: (s.sort_order, s.name_en))
        data["subcategories"] = [SubcategoryOut.model_validate(s).model_dump() for s in subs]
        return data

    items = [serialize(c) for c in categories]
    if applies_to:
        items = [c for c in items if applies_to in (c.get("applies_to") or [])]

    return ApiResponse(data=items, message="ok")


@router.get("/{slug}", response_model=ApiResponse)
async def get_category(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Category)
        .where(Category.slug == slug, Category.is_deleted == False)  # noqa: E712
        .options(selectinload(Category.subcategories))
    )
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    data = CategoryOut.model_validate(cat).model_dump()
    subs = [s for s in cat.subcategories if not s.is_deleted]
    subs.sort(key=lambda s: (s.sort_order, s.name_en))
    data["subcategories"] = [SubcategoryOut.model_validate(s).model_dump() for s in subs]
    return ApiResponse(data=data, message="ok")


@router.get("/{category_slug}/subcategories/{sub_slug}", response_model=ApiResponse)
async def get_subcategory(
    category_slug: str,
    sub_slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Resolve a nested category/subcategory slug pair (public).

    Powers the /services/{categorySlug}/{subCategorySlug} pages: returns the
    subcategory with its parent category embedded for breadcrumbs/SEO.
    """
    result = await db.execute(
        select(Subcategory)
        .join(Category, Subcategory.category_id == Category.id)
        .where(
            Category.slug == category_slug,
            Category.is_deleted == False,  # noqa: E712
            Subcategory.slug == sub_slug,
            Subcategory.is_deleted == False,  # noqa: E712
        )
        .options(selectinload(Subcategory.category))
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    data = SubcategoryOut.model_validate(sub).model_dump()
    data["category"] = CategoryOut.model_validate(sub.category).model_dump()
    return ApiResponse(data=data, message="ok")


# ==================== ADMIN — CATEGORIES ====================

@router.get("/admin/all", response_model=ApiResponse)
async def admin_list_categories(
    _admin: str = Depends(require_role("products.read")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Category)
        .where(Category.is_deleted == False)  # noqa: E712
        .options(selectinload(Category.subcategories))
        .order_by(Category.sort_order, Category.name_en)
    )
    categories = result.scalars().unique().all()
    data = []
    for cat in categories:
        d = CategoryOut.model_validate(cat).model_dump()
        subs = [s for s in cat.subcategories if not s.is_deleted]
        subs.sort(key=lambda s: (s.sort_order, s.name_en))
        d["subcategories"] = [SubcategoryOut.model_validate(s).model_dump() for s in subs]
        data.append(d)
    return ApiResponse(data=data, message="ok")


async def _slug_taken(db: AsyncSession, slug: str, exclude_id: uuid.UUID | None = None) -> bool:
    stmt = select(func.count()).select_from(Category).where(
        Category.slug == slug, Category.is_deleted == False  # noqa: E712
    )
    if exclude_id:
        stmt = stmt.where(Category.id != exclude_id)
    return (await db.execute(stmt)).scalar_one() > 0


@router.post("/admin", response_model=ApiResponse)
async def create_category(
    payload: CategoryCreate,
    admin_id: str = Depends(require_role("products.write")),
    db: AsyncSession = Depends(get_db),
):
    if await _slug_taken(db, payload.slug):
        raise HTTPException(status_code=400, detail="Slug already exists")
    cat = Category(**payload.model_dump())
    db.add(cat)
    await db.flush()
    db.add(ActivityLog(
        admin_id=uuid.UUID(admin_id), action="create",
        entity_type="category", entity_id=cat.id, new_values=payload.model_dump(),
    ))
    await db.commit()
    result = await db.execute(
        select(Category).where(Category.id == cat.id).options(selectinload(Category.subcategories))
    )
    return ApiResponse(data=CategoryOut.model_validate(result.scalar_one()).model_dump(),
                       message="Category created")


@router.put("/admin/{category_id}", response_model=ApiResponse)
async def update_category(
    category_id: uuid.UUID,
    payload: CategoryUpdate,
    admin_id: str = Depends(require_role("products.write")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Category).where(Category.id == category_id, Category.is_deleted == False)  # noqa: E712
        .options(selectinload(Category.subcategories))
    )
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    changes = payload.model_dump(exclude_unset=True)
    if "slug" in changes and changes["slug"] != cat.slug and await _slug_taken(db, changes["slug"], cat.id):
        raise HTTPException(status_code=400, detail="Slug already exists")
    for k, v in changes.items():
        setattr(cat, k, v)
    db.add(ActivityLog(
        admin_id=uuid.UUID(admin_id), action="update",
        entity_type="category", entity_id=cat.id, new_values=changes,
    ))
    await db.commit()
    result = await db.execute(
        select(Category).where(Category.id == cat.id).options(selectinload(Category.subcategories))
    )
    return ApiResponse(data=CategoryOut.model_validate(result.scalar_one()).model_dump(),
                       message="Category updated")


@router.delete("/admin/{category_id}", response_model=ApiResponse)
async def delete_category(
    category_id: uuid.UUID,
    admin_id: str = Depends(require_role("products.delete")),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a category and its subcategories. Products/services keep
    their string category cache; their FK is cleared by ON DELETE SET NULL only
    on hard delete, so a soft delete leaves existing links intact and
    reversible."""
    result = await db.execute(
        select(Category).where(Category.id == category_id, Category.is_deleted == False)  # noqa: E712
        .options(selectinload(Category.subcategories))
    )
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    cat.is_deleted = True
    cat.is_active = False
    for sub in cat.subcategories:
        sub.is_deleted = True
        sub.is_active = False
    db.add(ActivityLog(
        admin_id=uuid.UUID(admin_id), action="delete",
        entity_type="category", entity_id=cat.id,
    ))
    await db.commit()
    return ApiResponse(data={"id": str(category_id)}, message="Category deleted")


# ==================== ADMIN — SUBCATEGORIES ====================

@router.post("/admin/subcategories", response_model=ApiResponse)
async def create_subcategory(
    payload: SubcategoryCreate,
    admin_id: str = Depends(require_role("products.write")),
    db: AsyncSession = Depends(get_db),
):
    parent = await db.execute(
        select(Category).where(Category.id == payload.category_id, Category.is_deleted == False)  # noqa: E712
    )
    if not parent.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Parent category not found")
    dup = await db.execute(
        select(func.count()).select_from(Subcategory).where(
            Subcategory.category_id == payload.category_id,
            Subcategory.slug == payload.slug,
            Subcategory.is_deleted == False,  # noqa: E712
        )
    )
    if dup.scalar_one() > 0:
        raise HTTPException(status_code=400, detail="Subcategory slug already exists in this category")
    sub = Subcategory(**payload.model_dump())
    db.add(sub)
    await db.flush()
    db.add(ActivityLog(
        admin_id=uuid.UUID(admin_id), action="create",
        entity_type="subcategory", entity_id=sub.id, new_values=payload.model_dump(),
    ))
    await db.commit()
    result = await db.execute(select(Subcategory).where(Subcategory.id == sub.id))
    return ApiResponse(data=SubcategoryOut.model_validate(result.scalar_one()).model_dump(),
                       message="Subcategory created")


@router.put("/admin/subcategories/{subcategory_id}", response_model=ApiResponse)
async def update_subcategory(
    subcategory_id: uuid.UUID,
    payload: SubcategoryUpdate,
    admin_id: str = Depends(require_role("products.write")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Subcategory).where(Subcategory.id == subcategory_id, Subcategory.is_deleted == False)  # noqa: E712
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    changes = payload.model_dump(exclude_unset=True)
    for k, v in changes.items():
        setattr(sub, k, v)
    db.add(ActivityLog(
        admin_id=uuid.UUID(admin_id), action="update",
        entity_type="subcategory", entity_id=sub.id, new_values=changes,
    ))
    await db.commit()
    result = await db.execute(select(Subcategory).where(Subcategory.id == sub.id))
    return ApiResponse(data=SubcategoryOut.model_validate(result.scalar_one()).model_dump(),
                       message="Subcategory updated")


@router.delete("/admin/subcategories/{subcategory_id}", response_model=ApiResponse)
async def delete_subcategory(
    subcategory_id: uuid.UUID,
    admin_id: str = Depends(require_role("products.delete")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Subcategory).where(Subcategory.id == subcategory_id, Subcategory.is_deleted == False)  # noqa: E712
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    sub.is_deleted = True
    sub.is_active = False
    db.add(ActivityLog(
        admin_id=uuid.UUID(admin_id), action="delete",
        entity_type="subcategory", entity_id=sub.id,
    ))
    await db.commit()
    return ApiResponse(data={"id": str(subcategory_id)}, message="Subcategory deleted")
