from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from app.core.database import get_db
from app.core.security import require_admin
from app.models.models import Product
from app.schemas.schemas import ProductCreate, ProductUpdate, ProductOut, ApiResponse, PaginatedResponse, PaginatedMeta

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=PaginatedResponse)
async def list_products(
    category: str | None = Query(None),
    featured: bool | None = Query(None),
    search: str | None = Query(None),
    sort_by: str | None = Query(None),  # price_asc | price_desc | newest
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    conditions = [Product.is_active == True, Product.is_deleted == False]  # noqa: E712
    if category:
        conditions.append(Product.category == category)
    if featured is not None:
        conditions.append(Product.is_featured == featured)
    if search:
        term = f"%{search}%"
        conditions.append(or_(Product.name_en.ilike(term), Product.name_bn.ilike(term)))

    if sort_by == "price_asc":
        order_clause = Product.price.asc()
    elif sort_by == "price_desc":
        order_clause = Product.price.desc()
    else:
        order_clause = Product.sort_order.asc()

    total_result = await db.execute(select(func.count(Product.id)).where(and_(*conditions)))
    total = total_result.scalar_one()

    result = await db.execute(
        select(Product)
        .where(and_(*conditions))
        .order_by(order_clause, Product.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    products = result.scalars().all()

    return PaginatedResponse(
        data=[ProductOut.model_validate(p) for p in products],
        meta=PaginatedMeta(page=page, per_page=per_page, total=total, total_pages=-(-total // per_page)),
    )


@router.get("/{slug}", response_model=ApiResponse)
async def get_product(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Product).where(Product.slug == slug, Product.is_deleted == False)  # noqa: E712
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return ApiResponse(data=ProductOut.model_validate(product))


@router.post("", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    existing = await db.execute(select(Product).where(Product.slug == payload.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Slug already exists")
    product = Product(**payload.model_dump())
    db.add(product)
    await db.flush()
    await db.refresh(product)
    return ApiResponse(data=ProductOut.model_validate(product), message="Product created")


@router.put("/{product_id}", response_model=ApiResponse)
async def update_product(
    product_id: UUID,
    payload: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    result = await db.execute(select(Product).where(Product.id == product_id, Product.is_deleted == False))  # noqa: E712
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    await db.flush()
    await db.refresh(product)
    return ApiResponse(data=ProductOut.model_validate(product), message="Product updated")


@router.delete("/{product_id}", response_model=ApiResponse)
async def delete_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_deleted = True
    return ApiResponse(message="Product deleted")
