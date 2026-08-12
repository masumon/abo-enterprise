from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func, or_, and_, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role
from app.models.models import Product, ActivityLog
from app.models.catalog_master import Brand, InventoryMovement
from app.schemas.schemas import ApiResponse, PaginatedResponse, PaginatedMeta

router = APIRouter(tags=["catalog-master"])

class BrandCreate(BaseModel):
    slug: str = Field(min_length=2, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    name_en: str = Field(min_length=1, max_length=255)
    name_bn: str | None = Field(default=None, max_length=255)
    description_en: str | None = None
    description_bn: str | None = None
    logo_url: str | None = None
    website_url: str | None = Field(default=None, max_length=500)
    sort_order: int = 0
    is_active: bool = True

class BrandUpdate(BaseModel):
    slug: str | None = Field(default=None, min_length=2, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    name_en: str | None = Field(default=None, min_length=1, max_length=255)
    name_bn: str | None = Field(default=None, max_length=255)
    description_en: str | None = None
    description_bn: str | None = None
    logo_url: str | None = None
    website_url: str | None = Field(default=None, max_length=500)
    sort_order: int | None = None
    is_active: bool | None = None

class BrandProductLink(BaseModel):
    product_id: UUID

class InventoryAdjust(BaseModel):
    delta: int = Field(ne=0, ge=-1_000_000, le=1_000_000)
    movement_type: str = Field(default="adjustment", pattern=r"^(purchase|adjustment|damage|return|correction)$")
    reason: str = Field(min_length=2, max_length=500)
    note: str | None = Field(default=None, max_length=1000)

def _brand_data(brand: Brand, product_count: int = 0) -> dict:
    return {"id": str(brand.id), "slug": brand.slug, "name_en": brand.name_en, "name_bn": brand.name_bn, "description_en": brand.description_en, "description_bn": brand.description_bn, "logo_url": brand.logo_url, "website_url": brand.website_url, "sort_order": brand.sort_order, "is_active": brand.is_active, "product_count": product_count, "created_at": brand.created_at.isoformat(), "updated_at": brand.updated_at.isoformat()}

@router.get("/brands", response_model=PaginatedResponse)
async def list_brands(search: str | None = Query(None), include_inactive: bool = Query(False), page: int = Query(1, ge=1), per_page: int = Query(50, ge=1, le=100), db: AsyncSession = Depends(get_db), _admin: str = Depends(require_role("products.read"))):
    conditions = [Brand.is_deleted == False]  # noqa: E712
    if not include_inactive: conditions.append(Brand.is_active == True)  # noqa: E712
    if search:
        q = f"%{search.strip()}%"; conditions.append(or_(Brand.name_en.ilike(q), Brand.name_bn.ilike(q), Brand.slug.ilike(q)))
    total = (await db.execute(select(func.count(Brand.id)).where(and_(*conditions)))).scalar_one()
    brands = (await db.execute(select(Brand).where(and_(*conditions)).order_by(Brand.sort_order.asc(), Brand.name_en.asc()).offset((page - 1) * per_page).limit(per_page))).scalars().all()
    data = []
    for brand in brands:
        count = (await db.execute(select(func.count(Product.id)).where(Product.is_deleted == False, Product.brand_id == brand.id))).scalar_one()  # noqa: E712
        data.append(_brand_data(brand, count))
    return PaginatedResponse(data=data, meta=PaginatedMeta(page=page, per_page=per_page, total=total, total_pages=max(1, -(-total // per_page))))

@router.post("/brands", response_model=ApiResponse, status_code=201)
async def create_brand(payload: BrandCreate, db: AsyncSession = Depends(get_db), admin_id: str = Depends(require_role("products.write"))):
    if (await db.execute(select(Brand).where(Brand.slug == payload.slug))).scalar_one_or_none(): raise HTTPException(status_code=409, detail="Brand slug already exists")
    brand = Brand(**payload.model_dump()); db.add(brand); await db.flush()
    db.add(ActivityLog(admin_id=UUID(admin_id), action="create", entity_type="brand", entity_id=brand.id, new_values={"slug": brand.slug, "name_en": brand.name_en}))
    await db.commit(); await db.refresh(brand)
    return ApiResponse(data=_brand_data(brand), message="Brand created")

@router.put("/brands/{brand_id}", response_model=ApiResponse)
async def update_brand(brand_id: UUID, payload: BrandUpdate, db: AsyncSession = Depends(get_db), admin_id: str = Depends(require_role("products.write"))):
    brand = (await db.execute(select(Brand).where(Brand.id == brand_id, Brand.is_deleted == False))).scalar_one_or_none()  # noqa: E712
    if not brand: raise HTTPException(status_code=404, detail="Brand not found")
    changes = payload.model_dump(exclude_unset=True)
    if "slug" in changes and (await db.execute(select(Brand).where(Brand.slug == changes["slug"], Brand.id != brand.id))).scalar_one_or_none(): raise HTTPException(status_code=409, detail="Brand slug already exists")
    old = {"slug": brand.slug, "name_en": brand.name_en, "is_active": brand.is_active}
    for key, value in changes.items(): setattr(brand, key, value)
    db.add(ActivityLog(admin_id=UUID(admin_id), action="update", entity_type="brand", entity_id=brand.id, old_values=old, new_values=changes))
    await db.commit(); await db.refresh(brand)
    return ApiResponse(data=_brand_data(brand), message="Brand updated")

@router.delete("/brands/{brand_id}", response_model=ApiResponse)
async def delete_brand(brand_id: UUID, db: AsyncSession = Depends(get_db), admin_id: str = Depends(require_role("products.delete"))):
    brand = (await db.execute(select(Brand).where(Brand.id == brand_id, Brand.is_deleted == False))).scalar_one_or_none()  # noqa: E712
    if not brand: raise HTTPException(status_code=404, detail="Brand not found")
    brand.is_deleted = True; brand.is_active = False
    db.add(ActivityLog(admin_id=UUID(admin_id), action="delete", entity_type="brand", entity_id=brand.id, old_values={"is_active": True}, new_values={"is_deleted": True}))
    await db.commit()
    return ApiResponse(message="Brand archived; product data was preserved")

@router.post("/brands/{brand_id}/products", response_model=ApiResponse)
async def link_product_to_brand(brand_id: UUID, payload: BrandProductLink, db: AsyncSession = Depends(get_db), admin_id: str = Depends(require_role("products.write"))):
    brand = (await db.execute(select(Brand).where(Brand.id == brand_id, Brand.is_deleted == False, Brand.is_active == True))).scalar_one_or_none()  # noqa: E712
    product = (await db.execute(select(Product).where(Product.id == payload.product_id, Product.is_deleted == False))).scalar_one_or_none()  # noqa: E712
    if not brand or not product: raise HTTPException(status_code=404, detail="Brand or product not found")
    old_brand = product.brand; product.brand = brand.name_en; product.brand_id = brand.id
    db.add(ActivityLog(admin_id=UUID(admin_id), action="update", entity_type="product", entity_id=product.id, old_values={"brand": old_brand}, new_values={"brand": brand.name_en, "brand_master_id": str(brand.id)}))
    await db.commit()
    return ApiResponse(data={"product_id": str(product.id), "brand": brand.name_en}, message="Product linked to brand")

@router.get("/inventory/summary", response_model=ApiResponse)
@router.get("/admin/inventory/summary", response_model=ApiResponse)
async def inventory_summary(db: AsyncSession = Depends(get_db), _admin: str = Depends(require_role("products.read"))):
    total = (await db.execute(select(func.count(Product.id)).where(Product.is_deleted == False))).scalar_one()  # noqa: E712
    low = (await db.execute(select(func.count(Product.id)).where(Product.is_deleted == False, Product.stock_quantity <= Product.low_stock_threshold))).scalar_one()  # noqa: E712
    out = (await db.execute(select(func.count(Product.id)).where(Product.is_deleted == False, Product.stock_quantity <= 0))).scalar_one()  # noqa: E712
    units = (await db.execute(select(func.coalesce(func.sum(Product.stock_quantity), 0)).where(Product.is_deleted == False))).scalar_one()  # noqa: E712
    return ApiResponse(data={"products": total, "low_stock": low, "out_of_stock": out, "units": int(units or 0)})

@router.get("/inventory", response_model=PaginatedResponse)
async def list_inventory(search: str | None = Query(None), low_stock: bool = Query(False), out_of_stock: bool = Query(False), page: int = Query(1, ge=1), per_page: int = Query(50, ge=1, le=100), db: AsyncSession = Depends(get_db), _admin: str = Depends(require_role("products.read"))):
    conditions = [Product.is_deleted == False]  # noqa: E712
    if low_stock: conditions.append(Product.stock_quantity <= Product.low_stock_threshold)
    if out_of_stock: conditions.append(Product.stock_quantity <= 0)
    if search:
        q = f"%{search.strip()}%"; conditions.append(or_(Product.name_en.ilike(q), Product.name_bn.ilike(q), Product.sku.ilike(q), Product.brand.ilike(q)))
    total = (await db.execute(select(func.count(Product.id)).where(and_(*conditions)))).scalar_one()
    products = (await db.execute(select(Product).where(and_(*conditions)).order_by(Product.stock_quantity.asc(), Product.name_en.asc()).offset((page - 1) * per_page).limit(per_page))).scalars().all()
    return PaginatedResponse(data=[{"id": str(p.id), "name_en": p.name_en, "name_bn": p.name_bn, "sku": p.sku, "brand": p.brand, "stock_quantity": p.stock_quantity, "low_stock_threshold": p.low_stock_threshold, "is_active": p.is_active, "image_url": p.image_url} for p in products], meta=PaginatedMeta(page=page, per_page=per_page, total=total, total_pages=max(1, -(-total // per_page))))

@router.get("/inventory/{product_id}/movements", response_model=ApiResponse)
async def inventory_movements(product_id: UUID, limit: int = Query(100, ge=1, le=500), db: AsyncSession = Depends(get_db), _admin: str = Depends(require_role("products.read"))):
    rows = (await db.execute(select(InventoryMovement).where(InventoryMovement.product_id == product_id).order_by(InventoryMovement.created_at.desc()).limit(limit))).scalars().all()
    return ApiResponse(data=[{"id": str(r.id), "movement_type": r.movement_type, "quantity_delta": r.quantity_delta, "quantity_before": r.quantity_before, "quantity_after": r.quantity_after, "reference_type": r.reference_type, "reference_id": str(r.reference_id) if r.reference_id else None, "reason": r.reason, "note": r.note, "admin_id": str(r.admin_id) if r.admin_id else None, "created_at": r.created_at.isoformat()} for r in rows])

@router.post("/inventory/{product_id}/adjust", response_model=ApiResponse)
async def adjust_inventory(product_id: UUID, payload: InventoryAdjust, db: AsyncSession = Depends(get_db), admin_id: str = Depends(require_role("products.write"))):
    result = await db.execute(select(Product).where(Product.id == product_id, Product.is_deleted == False).with_for_update())  # noqa: E712
    product = result.scalar_one_or_none()
    if not product: raise HTTPException(status_code=404, detail="Product not found")
    before = int(product.stock_quantity or 0); after = before + payload.delta
    if after < 0: raise HTTPException(status_code=400, detail=f"Stock cannot be negative. Available: {before}")
    await db.execute(text("SET LOCAL abo.inventory_movement_suppressed = 'true'"))
    product.stock_quantity = after
    db.add(InventoryMovement(product_id=product.id, movement_type=payload.movement_type, quantity_delta=payload.delta, quantity_before=before, quantity_after=after, reference_type="admin_adjustment", reference_id=product.id, reason=payload.reason, note=payload.note, admin_id=UUID(admin_id)))
    db.add(ActivityLog(admin_id=UUID(admin_id), action="update", entity_type="inventory", entity_id=product.id, old_values={"stock_quantity": before}, new_values={"stock_quantity": after, "movement_type": payload.movement_type}))

    threshold = product.low_stock_threshold or 5
    # Only notify on the crossing, not on every adjustment while already low.
    if before > threshold and after <= threshold:
        from app.core.notifications import create_notification
        kind = "out_of_stock" if after <= 0 else "low_stock"
        await create_notification(
            db, commit=False,
            type=kind,
            severity="warning" if after > 0 else "error",
            title=f"{product.name_en} is {'out of stock' if after <= 0 else 'low on stock'}",
            body=f"Stock dropped to {after} (threshold {threshold}) after an admin adjustment.",
            link=f"/sumon/inventory?product={product.id}",
            meta={"product_id": str(product.id), "stock_quantity": after, "threshold": threshold},
        )

    await db.commit(); await db.refresh(product)
    return ApiResponse(data={"product_id": str(product.id), "stock_quantity": after}, message="Stock adjusted")

@router.get("/inventory/alerts", response_model=ApiResponse)
async def inventory_alerts(limit: int = Query(20, ge=1, le=100), db: AsyncSession = Depends(get_db), _admin: str = Depends(require_role("products.read"))):
    rows = (await db.execute(select(Product).where(Product.is_deleted == False, Product.stock_quantity <= Product.low_stock_threshold).order_by(Product.stock_quantity.asc(), Product.name_en.asc()).limit(limit))).scalars().all()  # noqa: E712
    return ApiResponse(data=[{"id": str(p.id), "name_en": p.name_en, "name_bn": p.name_bn, "stock_quantity": p.stock_quantity, "low_stock_threshold": p.low_stock_threshold} for p in rows])
