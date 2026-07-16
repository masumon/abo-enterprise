from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from app.core.database import get_db
from app.core.http_cache import etag_json_response
from app.core.security import require_admin, require_role
from app.models.models import Category, Product, Subcategory
from app.schemas.schemas import ProductCreate, ProductUpdate, ProductOut, ApiResponse, PaginatedResponse, PaginatedMeta

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=PaginatedResponse)
async def list_products(
    request: Request,
    category: str | None = Query(None),
    category_id: UUID | None = Query(None),
    subcategory_id: UUID | None = Query(None),
    category_slug: str | None = Query(None),
    subcategory_slug: str | None = Query(None),
    featured: bool | None = Query(None),
    search: str | None = Query(None),
    sort_by: str | None = Query(None),  # price_asc | price_desc | newest
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> Response:
    conditions = [Product.is_active == True, Product.is_deleted == False]  # noqa: E712
    if category:
        conditions.append(Product.category == category)
    # Additive taxonomy filters — used only when provided; the legacy string
    # `category` filter above keeps working unchanged.
    if category_id is not None:
        conditions.append(Product.category_id == category_id)
    if subcategory_id is not None:
        conditions.append(Product.subcategory_id == subcategory_id)
    # Slug-based taxonomy filters — same pattern as the services list; power
    # the taxonomy-driven category chips on the public products page.
    if category_slug:
        conditions.append(
            Product.category_id.in_(
                select(Category.id).where(
                    Category.slug == category_slug,
                    Category.is_deleted == False,  # noqa: E712
                    Category.is_active == True,  # noqa: E712
                )
            )
        )
    if subcategory_slug:
        sub_query = (
            select(Subcategory.id)
            .join(Category, Subcategory.category_id == Category.id)
            .where(
                Subcategory.slug == subcategory_slug,
                Subcategory.is_deleted == False,  # noqa: E712
                Subcategory.is_active == True,  # noqa: E712
            )
        )
        if category_slug:
            sub_query = sub_query.where(Category.slug == category_slug)
        conditions.append(Product.subcategory_id.in_(sub_query))
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

    payload = PaginatedResponse(
        data=[ProductOut.model_validate(p) for p in products],
        meta=PaginatedMeta(page=page, per_page=per_page, total=total, total_pages=-(-total // per_page)),
    )
    # ETag + short public cache: repeat catalog views become 304s — big win on
    # slow mobile networks and Render free-tier bandwidth.
    return etag_json_response(request, payload.model_dump(mode="json"), max_age=60)


@router.get("/admin", response_model=PaginatedResponse)
async def admin_list_products(
    category: str | None = Query(None),
    search: str | None = Query(None),
    is_active: bool | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    conditions = [Product.is_deleted == False]  # noqa: E712
    if category:
        conditions.append(Product.category == category)
    if is_active is not None:
        conditions.append(Product.is_active == is_active)
    if search:
        term = f"%{search}%"
        conditions.append(or_(Product.name_en.ilike(term), Product.name_bn.ilike(term), Product.slug.ilike(term)))

    total_result = await db.execute(select(func.count(Product.id)).where(and_(*conditions)))
    total = total_result.scalar_one()

    result = await db.execute(
        select(Product)
        .where(and_(*conditions))
        .order_by(Product.sort_order.asc(), Product.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    products = result.scalars().all()

    return PaginatedResponse(
        data=[ProductOut.model_validate(p) for p in products],
        meta=PaginatedMeta(page=page, per_page=per_page, total=total, total_pages=max(1, -(-total // per_page))),
    )


@router.get("/suggest", response_model=ApiResponse)
async def suggest_products(
    q: str = Query(..., min_length=1),
    limit: int = Query(8, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    term = f"%{q}%"
    result = await db.execute(
        select(Product)
        .where(
            Product.is_active == True,  # noqa: E712
            Product.is_deleted == False,  # noqa: E712
            or_(Product.name_en.ilike(term), Product.name_bn.ilike(term)),
        )
        .order_by(Product.sort_order.asc())
        .limit(limit)
    )
    products = result.scalars().all()
    return ApiResponse(data=[
        {"slug": p.slug, "name_en": p.name_en, "name_bn": p.name_bn, "price": float(p.price), "image_url": p.image_url}
        for p in products
    ])


@router.post("/validate-stock", response_model=ApiResponse)
async def validate_stock(
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    """Validate cart items against current stock levels (public)."""
    items = payload.get("items", [])
    issues = []
    for item in items:
        product_id = item.get("product_id")
        quantity = int(item.get("quantity", 1))
        if not product_id:
            continue
        try:
            product_uuid = UUID(str(product_id))
        except (ValueError, TypeError):
            result = await db.execute(
                select(Product).where(Product.slug == str(product_id), Product.is_deleted == False)  # noqa: E712
            )
        else:
            result = await db.execute(
                select(Product).where(Product.id == product_uuid, Product.is_deleted == False)  # noqa: E712
            )
        product = result.scalar_one_or_none()
        if not product:
            issues.append({"product_id": product_id, "error": "not_found", "available": 0})
        elif product.stock_quantity < quantity:
            issues.append({
                "product_id": str(product.id),
                "slug": product.slug,
                "name_en": product.name_en,
                "error": "insufficient_stock",
                "available": product.stock_quantity,
                "requested": quantity,
            })
        else:
            issues.append({
                "product_id": str(product.id),
                "slug": product.slug,
                "available": product.stock_quantity,
                "valid": True,
            })
    ok_items = [i for i in issues if "error" not in i]
    is_valid = bool(ok_items) and all(i.get("valid") for i in ok_items) and not any("error" in i for i in issues)
    return ApiResponse(data={"valid": is_valid, "items": issues})


@router.get("/{slug}/related", response_model=ApiResponse)
async def related_products(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Product).where(Product.slug == slug, Product.is_deleted == False)  # noqa: E712
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    related = await db.execute(
        select(Product)
        .where(
            Product.category == product.category,
            Product.id != product.id,
            Product.is_active == True,  # noqa: E712
            Product.is_deleted == False,  # noqa: E712
        )
        .order_by(Product.is_featured.desc(), Product.sort_order.asc())
        .limit(4)
    )
    items = related.scalars().all()
    return ApiResponse(data=[ProductOut.model_validate(p) for p in items])


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
    _admin: str = Depends(require_role("products.write")),
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
    _admin: str = Depends(require_role("products.write")),
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
    _admin: str = Depends(require_role("products.delete")),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_deleted = True
    return ApiResponse(message="Product deleted")
