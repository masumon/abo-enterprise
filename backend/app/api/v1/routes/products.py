from uuid import UUID
from app.core.rate_limit import rate_limit
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from app.core.database import get_db
from app.core.http_cache import etag_json_response
from app.core.security import require_role
from app.core.taxonomy import descendant_ids_for_slug, hidden_category_ids, visible_in_categories
from app.models.models import Product, ActivityLog
from app.schemas.schemas import ProductCreate, ProductUpdate, ProductOut, PublicProductOut, ApiResponse, PaginatedResponse, PaginatedMeta
from app.core.blog_links import set_blogs_for_product, get_blog_ids_for_product
from app.core.search import build_search_condition

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
    flash_sale: bool | None = Query(None, description="Only products live in the flash sale"),
    search: str | None = Query(None),
    sort_by: str | None = Query(None),  # price_asc | price_desc | newest
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> Response:
    conditions = [Product.is_active == True, Product.is_deleted == False]  # noqa: E712
    conditions.append(visible_in_categories(Product, await hidden_category_ids(db)))
    if category:
        conditions.append(Product.category == category)
    # Additive taxonomy filters — used only when provided; the legacy string
    # `category` filter above keeps working unchanged.
    if category_id is not None:
        conditions.append(Product.category_id == category_id)
    if subcategory_id is not None:
        conditions.append(Product.subcategory_id == subcategory_id)
    # Slug-based taxonomy filters — same pattern as the services list. A node
    # matches items on itself OR any descendant, so filtering by a parent
    # category shows everything beneath it. The deepest slug wins.
    node_slug = subcategory_slug or category_slug
    if node_slug:
        ids = await descendant_ids_for_slug(db, node_slug)
        conditions.append(
            or_(Product.category_id.in_(ids), Product.subcategory_id.in_(ids))
        )
    if featured is not None:
        conditions.append(Product.is_featured == featured)
    if flash_sale:
        # Live flash-sale stock only: flagged, actually discounted, and either
        # open-ended or not yet expired. Without the expiry check a finished
        # sale would keep advertising its old price.
        from datetime import datetime, timezone

        conditions.extend([
            Product.is_flash_sale == True,  # noqa: E712
            Product.flash_sale_price.isnot(None),
            Product.flash_sale_price < Product.price,  # actually discounted
            or_(
                Product.flash_sale_ends_at.is_(None),
                Product.flash_sale_ends_at > datetime.now(timezone.utc),
            ),
        ])
    if search:
        # Widened well beyond the two name columns (and bilingual/transliterated)
        # so "anything related" surfaces — name, description, category, brand, SKU.
        cond = build_search_condition(
            [
                Product.name_en, Product.name_bn,
                Product.description_en, Product.description_bn,
                Product.category, Product.sub_category,
                Product.brand, Product.sku,
            ],
            search,
        )
        if cond is not None:
            conditions.append(cond)

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
        data=[PublicProductOut.model_validate(p) for p in products],
        meta=PaginatedMeta(page=page, per_page=per_page, total=total, total_pages=-(-total // per_page)),
    )
    # ETag + short public cache: repeat catalog views become 304s — big win on
    # slow mobile networks and Render free-tier bandwidth.
    return etag_json_response(request, payload.model_dump(mode="json"), max_age=60)


def _missing_condition(missing: str):
    """Admin list filter: products that still lack a photo / price / text / category."""
    if missing == "image":
        return or_(Product.image_url.is_(None), Product.image_url == "")
    if missing == "price":
        return or_(Product.price.is_(None), Product.price <= 0)
    if missing == "description":
        return and_(
            or_(Product.description_bn.is_(None), Product.description_bn == ""),
            or_(Product.description_en.is_(None), Product.description_en == ""),
        )
    return or_(Product.category.is_(None), Product.category == "")


def _norm_name(v: str | None) -> str:
    return " ".join((v or "").split()).lower()


async def find_product_duplicates(
    db: AsyncSession, *, name: str | None = None, slug: str | None = None,
    sku: str | None = None, exclude_id: UUID | None = None, limit: int = 5,
) -> dict:
    """Lightweight "does this already exist?" lookup for the admin form.

    - name: same name (Bangla or English, case/space-insensitive) first, then
      close matches (contains), live products only.
    - slug: taken by ANY product (also soft-deleted - the DB column is unique).
    - sku: taken by another live product.
    """
    out: dict = {"name_matches": [], "slug_taken": None, "sku_taken": None}

    def brief(p: Product) -> dict:
        return {"id": str(p.id), "slug": p.slug, "name_en": p.name_en, "name_bn": p.name_bn,
                "image_url": p.image_url, "is_active": p.is_active, "sku": p.sku}

    live = [Product.is_deleted == False]  # noqa: E712
    if exclude_id:
        live.append(Product.id != exclude_id)
    n = _norm_name(name)
    if len(n) >= 2:
        term = f"%{n}%"
        rows = (await db.execute(
            select(Product).where(*live, or_(func.lower(Product.name_en).like(term), func.lower(Product.name_bn).like(term)))
            .order_by(Product.created_at.desc()).limit(25)
        )).scalars().all()
        exact = [p for p in rows if n in (_norm_name(p.name_en), _norm_name(p.name_bn))]
        close = [p for p in rows if p not in exact]
        out["name_matches"] = [{**brief(p), "exact": True} for p in exact][:limit] +             [{**brief(p), "exact": False} for p in close][: max(0, limit - len(exact))]
    if slug and slug.strip():
        cond = [Product.slug == slug.strip().lower()]
        if exclude_id:
            cond.append(Product.id != exclude_id)
        p = (await db.execute(select(Product).where(*cond).limit(1))).scalar_one_or_none()
        if p is not None:
            out["slug_taken"] = {**brief(p), "deleted": bool(p.is_deleted)}
    if sku and sku.strip():
        p = (await db.execute(select(Product).where(*live, Product.sku == sku.strip()).limit(1))).scalar_one_or_none()
        if p is not None:
            out["sku_taken"] = brief(p)
    return out


def _slug_taken_message(deleted: bool) -> str:
    if deleted:
        return "এই ওয়েব ঠিকানা (slug) আগে মুছে ফেলা একটি পণ্যে ব্যবহার হয়েছে — অন্য slug দিন। (Slug already exists)"
    return "এই ওয়েব ঠিকানা (slug) দিয়ে আগে থেকেই একটি পণ্য আছে — অন্য slug দিন বা পুরনো পণ্যটি খুলুন। (Slug already exists)"


def _sku_taken_message(other: dict) -> str:
    return f"এই SKU ({other.get('sku')}) আগে থেকেই \"{other.get('name_bn') or other.get('name_en')}\" পণ্যে আছে — অন্য SKU দিন। (SKU already exists)"


@router.get("/admin/check-duplicate", response_model=ApiResponse)
async def admin_check_duplicate(
    name: str | None = Query(None, max_length=255),
    slug: str | None = Query(None, max_length=255),
    sku: str | None = Query(None, max_length=100),
    exclude_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_role("products.read")),
):
    """"এটা আগে থেকেই আছে?" — used while typing a name/slug/SKU in the admin form."""
    return ApiResponse(data=await find_product_duplicates(db, name=name, slug=slug, sku=sku, exclude_id=exclude_id))


@router.get("/admin", response_model=PaginatedResponse)
async def admin_list_products(
    category: str | None = Query(None),
    search: str | None = Query(None),
    is_active: bool | None = Query(None),
    stock: str | None = Query(None, pattern="^(low|out)$", description="low = at/below the alert level, out = 0"),
    missing: str | None = Query(None, pattern="^(image|price|description|category)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_role("products.read")),
):
    conditions = [Product.is_deleted == False]  # noqa: E712
    if category:
        conditions.append(Product.category == category)
    if is_active is not None:
        conditions.append(Product.is_active == is_active)
    if stock == "out":
        conditions.append(Product.stock_quantity <= 0)
    elif stock == "low":
        conditions.append(Product.stock_quantity <= func.coalesce(Product.low_stock_threshold, 5))
    if missing:
        conditions.append(_missing_condition(missing))
    if search:
        term = f"%{search}%"
        conditions.append(or_(Product.name_en.ilike(term), Product.name_bn.ilike(term), Product.slug.ilike(term), Product.sku.ilike(term)))

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
            visible_in_categories(Product, await hidden_category_ids(db)),
        )
        .order_by(Product.sort_order.asc())
        .limit(limit)
    )
    products = result.scalars().all()
    return ApiResponse(data=[
        {"slug": p.slug, "name_en": p.name_en, "name_bn": p.name_bn, "price": float(p.price), "image_url": p.image_url}
        for p in products
    ])


@router.post("/validate-stock", response_model=ApiResponse, dependencies=[Depends(rate_limit("validate_stock", 120, 300))])
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
            visible_in_categories(Product, await hidden_category_ids(db)),
        )
        .order_by(Product.is_featured.desc(), Product.sort_order.asc())
        .limit(4)
    )
    items = related.scalars().all()
    return ApiResponse(data=[PublicProductOut.model_validate(p) for p in items])


@router.get("/{slug}", response_model=ApiResponse)
async def get_product(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Product).where(Product.slug == slug, Product.is_deleted == False)  # noqa: E712
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return ApiResponse(data=PublicProductOut.model_validate(product))


@router.post("", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_role("products.write")),
):
    dupes = await find_product_duplicates(db, slug=payload.slug, sku=payload.sku)
    if dupes["slug_taken"]:
        raise HTTPException(status_code=400, detail=_slug_taken_message(dupes["slug_taken"]["deleted"]))
    if dupes["sku_taken"]:
        raise HTTPException(status_code=400, detail=_sku_taken_message(dupes["sku_taken"]))
    data = payload.model_dump()
    blog_ids = data.pop("blog_ids", None)
    product = Product(**data)
    db.add(product)
    await db.flush()
    if blog_ids is not None:
        await set_blogs_for_product(db, product.id, blog_ids)
        await db.flush()
    await db.refresh(product)
    db.add(ActivityLog(
        admin_id=UUID(_admin), action="create",
        entity_type="product", entity_id=product.id,
        new_values={"slug": product.slug, "name_en": product.name_en},
    ))
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
    changes = payload.model_dump(exclude_unset=True)
    new_sku = (changes.get("sku") or "").strip()
    if new_sku and new_sku != (product.sku or "").strip():
        dupes = await find_product_duplicates(db, sku=new_sku, exclude_id=product.id)
        if dupes["sku_taken"]:
            raise HTTPException(status_code=400, detail=_sku_taken_message(dupes["sku_taken"]))
    blog_ids = changes.pop("blog_ids", None)
    for field, value in changes.items():
        setattr(product, field, value)
    if blog_ids is not None:
        await set_blogs_for_product(db, product.id, blog_ids)
    await db.flush()
    await db.refresh(product)
    db.add(ActivityLog(
        admin_id=UUID(_admin), action="update",
        entity_type="product", entity_id=product.id,
        new_values=payload.model_dump(exclude_unset=True, mode="json"),
    ))
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
    db.add(ActivityLog(
        admin_id=UUID(_admin), action="delete",
        entity_type="product", entity_id=product.id,
    ))
    return ApiResponse(message="Product deleted")
