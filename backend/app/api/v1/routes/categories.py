"""Commerce taxonomy API — unlimited-depth category tree.

Public endpoints expose the active taxonomy tree (consumed by product/service
category pages and navigation). Admin endpoints provide full CRUD, guarded by
the existing RBAC (`require_role`) using the catalog (`products.*`)
permissions.

Since alembic 0008 the tree lives entirely in ``categories`` via
``parent_id`` (legacy subcategories were unified in with the same UUIDs).
Children are still serialized under the ``subcategories`` key so every
existing consumer keeps working; nesting is simply recursive now. The legacy
``/admin/subcategories`` endpoints remain but operate on the unified table.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role
from app.core.taxonomy import ancestors_of, children_map, load_categories, subtree_ids
from app.models.models import ActivityLog, Category, Product, Service
from app.schemas.schemas import (
    ApiResponse,
    CategoryCreate,
    CategoryUpdate,
    SubcategoryCreate,
    SubcategoryUpdate,
)

router = APIRouter(prefix="/categories", tags=["categories"])


def _node_dict(cat: Category) -> dict:
    """Manual serialization — never touches the legacy ORM relationship."""
    return {
        "id": str(cat.id),
        "parent_id": str(cat.parent_id) if cat.parent_id else None,
        # Back-compat alias: legacy Subcategory consumers read `category_id`.
        "category_id": str(cat.parent_id) if cat.parent_id else None,
        "slug": cat.slug,
        "name_en": cat.name_en,
        "name_bn": cat.name_bn,
        "description_en": cat.description_en,
        "description_bn": cat.description_bn,
        "icon": cat.icon,
        "image_url": cat.image_url,
        "applies_to": cat.applies_to or [],
        "sort_order": cat.sort_order,
        "is_active": cat.is_active,
        "created_at": cat.created_at.isoformat() if cat.created_at else None,
        "updated_at": cat.updated_at.isoformat() if cat.updated_at else None,
    }


def _serialize_tree(cat: Category, by_parent: dict) -> dict:
    d = _node_dict(cat)
    d["subcategories"] = [_serialize_tree(c, by_parent) for c in by_parent.get(cat.id, [])]
    return d


# ==================== PUBLIC ENDPOINTS ====================

@router.get("", response_model=ApiResponse)
async def list_categories(
    applies_to: str | None = Query(None, description="Filter: 'product' or 'service'"),
    include_inactive: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    """Return the taxonomy tree (roots with recursively nested children)."""
    cats = await load_categories(db, include_inactive=include_inactive)
    by_parent = children_map(cats)
    roots = by_parent.get(None, [])
    if applies_to:
        roots = [c for c in roots if applies_to in (c.applies_to or [])]
    return ApiResponse(data=[_serialize_tree(c, by_parent) for c in roots], message="ok")


@router.get("/{slug}", response_model=ApiResponse)
async def get_category(slug: str, db: AsyncSession = Depends(get_db)):
    """A single node with its subtree plus an `ancestors` breadcrumb chain."""
    cats = await load_categories(db, include_inactive=True)
    node = next((c for c in cats if c.slug == slug and not c.is_deleted), None)
    if not node:
        raise HTTPException(status_code=404, detail="Category not found")
    active = [c for c in cats if c.is_active]
    by_parent = children_map(active)
    data = _serialize_tree(node, by_parent)
    data["ancestors"] = [_node_dict(a) for a in ancestors_of(node, cats)]
    return ApiResponse(data=data, message="ok")


# ==================== ADMIN — CATEGORIES ====================

@router.get("/admin/all", response_model=ApiResponse)
async def admin_list_categories(
    _admin: str = Depends(require_role("products.read")),
    db: AsyncSession = Depends(get_db),
):
    cats = await load_categories(db, include_inactive=True)
    by_parent = children_map(cats)
    return ApiResponse(
        data=[_serialize_tree(c, by_parent) for c in by_parent.get(None, [])],
        message="ok",
    )


async def _slug_taken(db: AsyncSession, slug: str, exclude_id: uuid.UUID | None = None) -> bool:
    stmt = select(func.count()).select_from(Category).where(
        Category.slug == slug, Category.is_deleted == False  # noqa: E712
    )
    if exclude_id:
        stmt = stmt.where(Category.id != exclude_id)
    return (await db.execute(stmt)).scalar_one() > 0


async def _get_node(db: AsyncSession, node_id: uuid.UUID) -> Category | None:
    result = await db.execute(
        select(Category).where(Category.id == node_id, Category.is_deleted == False)  # noqa: E712
    )
    return result.scalar_one_or_none()


async def _assert_valid_parent(
    db: AsyncSession, parent_id: uuid.UUID, moving_id: uuid.UUID | None
) -> Category:
    parent = await _get_node(db, parent_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent category not found")
    if moving_id:
        # Cycle guard: the new parent must not sit inside the moved subtree.
        cats = await load_categories(db, include_inactive=True)
        if parent_id in set(subtree_ids(moving_id, children_map(cats))):
            raise HTTPException(status_code=400, detail="Cannot move a category inside itself")
    return parent


@router.post("/admin", response_model=ApiResponse)
async def create_category(
    payload: CategoryCreate,
    admin_id: str = Depends(require_role("products.write")),
    db: AsyncSession = Depends(get_db),
):
    if await _slug_taken(db, payload.slug):
        raise HTTPException(status_code=400, detail="Slug already exists")
    values = payload.model_dump()
    if values.get("parent_id"):
        parent = await _assert_valid_parent(db, values["parent_id"], None)
        # Children inherit the vertical's kind unless explicitly set.
        if not values.get("applies_to"):
            values["applies_to"] = parent.applies_to or []
    cat = Category(**values)
    db.add(cat)
    await db.flush()
    db.add(ActivityLog(
        admin_id=uuid.UUID(admin_id), action="create",
        entity_type="category", entity_id=cat.id, new_values=payload.model_dump(mode="json"),
    ))
    await db.commit()
    return ApiResponse(data=_node_dict(cat) | {"subcategories": []}, message="Category created")


@router.put("/admin/{category_id}", response_model=ApiResponse)
async def update_category(
    category_id: uuid.UUID,
    payload: CategoryUpdate,
    admin_id: str = Depends(require_role("products.write")),
    db: AsyncSession = Depends(get_db),
):
    cat = await _get_node(db, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    changes = payload.model_dump(exclude_unset=True)
    if "slug" in changes and changes["slug"] != cat.slug and await _slug_taken(db, changes["slug"], cat.id):
        raise HTTPException(status_code=400, detail="Slug already exists")
    if changes.get("parent_id"):
        await _assert_valid_parent(db, changes["parent_id"], cat.id)
    for k, v in changes.items():
        setattr(cat, k, v)
    db.add(ActivityLog(
        admin_id=uuid.UUID(admin_id), action="update",
        entity_type="category", entity_id=cat.id,
        new_values=payload.model_dump(exclude_unset=True, mode="json"),
    ))
    await db.commit()
    return ApiResponse(data=_node_dict(cat), message="Category updated")


async def _items_in_subtree(db: AsyncSession, ids: list[uuid.UUID]) -> int:
    cond = lambda model: or_(model.category_id.in_(ids), model.subcategory_id.in_(ids))  # noqa: E731
    products = (await db.execute(
        select(func.count()).select_from(Product).where(cond(Product), Product.is_deleted == False)  # noqa: E712
    )).scalar_one()
    services = (await db.execute(
        select(func.count()).select_from(Service).where(cond(Service), Service.is_deleted == False)  # noqa: E712
    )).scalar_one()
    return products + services


@router.delete("/admin/{category_id}", response_model=ApiResponse)
async def delete_category(
    category_id: uuid.UUID,
    admin_id: str = Depends(require_role("products.delete")),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a node and its whole subtree. Refuses while any product or
    service still lives in the subtree so the admin moves items first."""
    cat = await _get_node(db, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    cats = await load_categories(db, include_inactive=True)
    ids = subtree_ids(cat.id, children_map(cats))
    item_count = await _items_in_subtree(db, ids)
    if item_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"{item_count} product(s)/service(s) still use this category tree — move them first",
        )
    by_id = {c.id: c for c in cats}
    for nid in ids:
        node = by_id.get(nid)
        if node:
            node.is_deleted = True
            node.is_active = False
    db.add(ActivityLog(
        admin_id=uuid.UUID(admin_id), action="delete",
        entity_type="category", entity_id=cat.id,
    ))
    await db.commit()
    return ApiResponse(data={"id": str(category_id)}, message="Category deleted")


# ==================== ADMIN — LEGACY SUBCATEGORY ENDPOINTS ====================
# Kept for backward compatibility; they now operate on the unified tree
# (a "subcategory" is simply a category with a parent).

@router.post("/admin/subcategories", response_model=ApiResponse)
async def create_subcategory(
    payload: SubcategoryCreate,
    admin_id: str = Depends(require_role("products.write")),
    db: AsyncSession = Depends(get_db),
):
    parent = await _assert_valid_parent(db, payload.category_id, None)
    if await _slug_taken(db, payload.slug):
        raise HTTPException(status_code=400, detail="Slug already exists")
    values = payload.model_dump()
    values["parent_id"] = values.pop("category_id")
    cat = Category(**values, applies_to=parent.applies_to or [])
    db.add(cat)
    await db.flush()
    db.add(ActivityLog(
        admin_id=uuid.UUID(admin_id), action="create",
        entity_type="category", entity_id=cat.id, new_values=payload.model_dump(mode="json"),
    ))
    await db.commit()
    return ApiResponse(data=_node_dict(cat), message="Subcategory created")


@router.put("/admin/subcategories/{subcategory_id}", response_model=ApiResponse)
async def update_subcategory(
    subcategory_id: uuid.UUID,
    payload: SubcategoryUpdate,
    admin_id: str = Depends(require_role("products.write")),
    db: AsyncSession = Depends(get_db),
):
    cat = await _get_node(db, subcategory_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Subcategory not found")
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
    return ApiResponse(data=_node_dict(cat), message="Subcategory updated")


@router.delete("/admin/subcategories/{subcategory_id}", response_model=ApiResponse)
async def delete_subcategory(
    subcategory_id: uuid.UUID,
    admin_id: str = Depends(require_role("products.delete")),
    db: AsyncSession = Depends(get_db),
):
    return await delete_category(subcategory_id, admin_id, db)  # same unified logic
