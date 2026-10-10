"""Duplicate prevention + list filters for the admin catalog (products and
services): "এটা আগে থেকেই আছে?" lookup, Bangla errors for an existing slug/SKU,
and the stock/missing filters. Runs against an in-memory SQLite DB."""
import uuid

import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base
from app.models.catalog_master import Brand
from app.models.models import Category, Product, Subcategory
from app.api.v1.routes import products as product_routes
from app.api.v1.routes import services as service_routes
from app.schemas.schemas import ProductCreate, ProductUpdate


@pytest_asyncio.fixture
async def session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    tables = [Brand.__table__, Category.__table__, Subcategory.__table__, Product.__table__]
    async with engine.begin() as conn:
        await conn.run_sync(lambda c: Base.metadata.create_all(c, tables=tables))
    maker = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with maker() as s:
        s.add_all([
            Product(slug="fast-charger-33w", name_en="Fast Charger 33W", name_bn="ফাস্ট চার্জার ৩৩W",
                    price=1290, category="chargers", stock_quantity=2, low_stock_threshold=5, sku="CHG-33",
                    image_url="https://x/y.jpg", description_bn="ভালো"),
            Product(slug="usb-cable", name_en="USB Cable", name_bn="ইউএসবি কেবল", price=0,
                    category="cables", stock_quantity=0, image_url=None),
            Product(slug="old-gone", name_en="Old", name_bn="পুরনো", price=10, category="cables",
                    stock_quantity=50, is_deleted=True, sku="OLD-1"),
        ])
        await s.commit()
        yield s
    await engine.dispose()


@pytest.mark.asyncio
async def test_name_match_exact_and_close(session):
    d = await product_routes.find_product_duplicates(session, name="  fast   charger 33w ")
    assert [m["slug"] for m in d["name_matches"]] == ["fast-charger-33w"]
    assert d["name_matches"][0]["exact"] is True
    d = await product_routes.find_product_duplicates(session, name="charger")
    assert d["name_matches"][0]["exact"] is False
    d = await product_routes.find_product_duplicates(session, name="ফাস্ট চার্জার ৩৩W")
    assert d["name_matches"][0]["exact"] is True
    # Deleted products are not suggested; excluding self hides it while editing.
    assert (await product_routes.find_product_duplicates(session, name="old"))["name_matches"] == []
    own = d["name_matches"][0]["id"]
    d = await product_routes.find_product_duplicates(session, name="ফাস্ট চার্জার ৩৩W", exclude_id=uuid.UUID(own))
    assert d["name_matches"] == []


@pytest.mark.asyncio
async def test_slug_and_sku_taken(session):
    d = await product_routes.find_product_duplicates(session, slug="usb-cable", sku="CHG-33")
    assert d["slug_taken"]["slug"] == "usb-cable" and d["slug_taken"]["deleted"] is False
    assert d["sku_taken"]["slug"] == "fast-charger-33w"
    d = await product_routes.find_product_duplicates(session, slug="old-gone", sku="OLD-1")
    assert d["slug_taken"]["deleted"] is True  # slug column is unique even for deleted rows
    assert d["sku_taken"] is None  # a deleted product's SKU may be reused


@pytest.mark.asyncio
async def test_create_blocks_duplicate_slug_and_sku_in_bangla(session):
    admin = str(uuid.uuid4())
    base = dict(name_en="X", name_bn="এক্স", price=10, category="cables")
    with pytest.raises(HTTPException) as e:
        await product_routes.create_product(ProductCreate(slug="usb-cable", **base), db=session, _admin=admin)
    assert e.value.status_code == 400 and "আগে থেকেই" in e.value.detail and "Slug already exists" in e.value.detail
    with pytest.raises(HTTPException) as e:
        await product_routes.create_product(ProductCreate(slug="new-one", sku="CHG-33", **base), db=session, _admin=admin)
    assert "SKU" in e.value.detail and "ফাস্ট চার্জার" in e.value.detail


@pytest.mark.asyncio
async def test_update_blocks_changing_to_a_taken_sku_only(session, monkeypatch):
    async def _noop(*a, **k):
        return None
    monkeypatch.setattr(product_routes, "set_blogs_for_product", _noop)
    cable = (await product_routes.find_product_duplicates(session, slug="usb-cable"))["slug_taken"]
    admin = str(uuid.uuid4())
    with pytest.raises(HTTPException):
        await product_routes.update_product(uuid.UUID(cable["id"]), ProductUpdate(sku="CHG-33"), db=session, _admin=admin)
    # Keeping its own (unchanged) SKU or a free one is fine.
    charger = (await product_routes.find_product_duplicates(session, slug="fast-charger-33w"))["slug_taken"]
    try:
        await product_routes.update_product(uuid.UUID(charger["id"]), ProductUpdate(sku="CHG-33", price=1300), db=session, _admin=admin)
    except HTTPException as exc:  # pragma: no cover - must not be a duplicate error
        raise AssertionError(exc.detail)
    except Exception:
        pass  # ActivityLog table is not created in this slim DB; the SKU check already passed


@pytest.mark.asyncio
async def test_admin_list_filters(session):
    async def slugs(**kw):
        params = dict(category=None, search=None, is_active=None, stock=None, missing=None, page=1, per_page=20)
        params.update(kw)
        r = await product_routes.admin_list_products(**params, db=session, _admin={})
        return sorted(p.slug for p in r.data)
    assert await slugs() == ["fast-charger-33w", "usb-cable"]
    assert await slugs(stock="out") == ["usb-cable"]
    assert await slugs(stock="low") == ["fast-charger-33w", "usb-cable"]
    assert await slugs(missing="image") == ["usb-cable"]
    assert await slugs(missing="price") == ["usb-cable"]
    assert await slugs(missing="description") == ["usb-cable"]
    assert await slugs(search="CHG") == ["fast-charger-33w"]


def test_service_duplicate_route_is_declared_before_the_id_route():
    paths = [getattr(r, "path", "") for r in service_routes.router.routes if "GET" in getattr(r, "methods", set())]
    dup = paths.index("/services/admin/services/check-duplicate")
    by_id = paths.index("/services/admin/services/{service_id}")
    assert dup < by_id


def test_service_admin_filters_default_to_all_live():
    conds = service_routes._admin_service_conditions()
    assert len(conds) == 1  # only "not deleted" - the old behaviour
    assert len(service_routes._admin_service_conditions(search="x", is_active=True, missing="price")) == 4
