"""IMPORT_CONTRACT.md columns: cost_price, specifications, short descriptions,
category auto-create, images by file name, SKU match, template help rows."""
import io
import uuid
from types import SimpleNamespace as NS

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from starlette.datastructures import UploadFile

from app.core import product_import as pi
from app.core.database import Base
from app.models.catalog_master import Brand
from app.models.models import Category, Product, ProductImportJob, Subcategory
from app.api.v1.routes import bulk as bulk_routes

HEAD = ",".join(bulk_routes.CONTRACT_COLUMNS)


def _index():
    chg = NS(id="cat-1", slug="chargers", name_en="Chargers", name_bn="চার্জার", parent_id=None)
    return pi.CategoryIndex(by_slug={"chargers": chg}, by_name={"chargers": chg}, by_id={"cat-1": chg})


def _row(**kw):
    base = {c: "" for c in bulk_routes.CONTRACT_COLUMNS}
    base.update(kw)
    return base


def test_specifications_parse():
    assert pi.parse_specifications("Output: 33W; Port: USB-A;  Warranty: 6 months") == {
        "Output": "33W", "Port": "USB-A", "Warranty": "6 months"}
    assert pi.parse_specifications("Time: 10:30; plain") == {"Time": "10:30", "Note 2": "plain"}


def test_comment_rows_are_skipped_and_bom_ok():
    text = HEAD + "\n# help,x\n#example,y\n" + ",".join(["a"] * len(bulk_routes.CONTRACT_COLUMNS)) + "\n"
    headers, rows = pi.parse_file("p.csv", text.encode("utf-8-sig"))
    assert headers[0] == "slug" and len(rows) == 1


def test_contract_row_validation():
    mapping = {c: c for c in bulk_routes.CONTRACT_COLUMNS}
    rows = [
        _row(name_bn="চার্জার", name_en="Fast Charger 33W", category="chargers", price="1290", cost_price="950",
             short_description_bn="ছোট", description_bn="• বড়", specifications="Output: 33W",
             images="A.JPG|b.jpg"),
        _row(name_bn="কেবল", name_en="Cable", category="cables", category_name_bn="কেবল", category_name_en="Cables", price="200"),
        _row(name_bn="কেবল ২", name_en="Cable 2", category="cables", price="250"),  # names given on another row
        _row(name_bn="অজানা", name_en="Unknown", category="mystery", price="10"),     # no names -> error
        _row(name_en="By Sku", sku="SKU-OLD", price="99"),                            # update by SKU
        _row(name_bn="ক", name_en="K", category="chargers", price="10", cost_price="-1"),
    ]
    res = pi.validate_rows(rows, mapping, _index(), existing_slugs={"old-prod"},
                           existing_sku_to_slug={"SKU-OLD": "old-prod"}, image_names={"a.jpg"})
    r0 = res[0]
    assert r0.action == "create" and r0.data["cost_price"] == 950.0
    assert r0.data["specifications"] == {"Output": "33W"}
    assert r0.data["description_bn"] == "ছোট\n\n• বড়" and "short_description_bn" not in r0.data
    assert r0.data["stock_quantity"] == 10  # contract default
    assert r0.missing_images == ["b.jpg"] and r0.errors == []
    assert res[1].new_category == {"slug": "cables", "name_en": "Cables", "name_bn": "কেবল"}
    assert res[2].new_category and res[2].action == "create"
    assert res[3].action == "skip" and any("পাওয়া যায়নি" in e for e in res[3].errors)
    assert res[4].action == "update" and res[4].data["slug"] == "old-prod"
    assert res[5].action == "skip"
    assert pi.new_categories(res) == [{"slug": "cables", "name_en": "Cables", "name_bn": "কেবল"}]


def test_apply_images_maps_names_to_urls():
    data = {"images": ["A.jpg", "https://x/y.png", "missing.jpg"]}
    missing = pi.apply_images(data, {"a.jpg": "https://cdn/a.jpg"})
    assert data["image_url"] == "https://cdn/a.jpg" and data["images"] == ["https://x/y.png"]
    assert missing == ["missing.jpg"]


@pytest_asyncio.fixture
async def session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    tables = [Brand.__table__, Category.__table__, Subcategory.__table__, Product.__table__, ProductImportJob.__table__]
    async with engine.begin() as conn:
        await conn.run_sync(lambda c: Base.metadata.create_all(c, tables=tables))
    maker = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with maker() as s:
        s.add(Category(id=uuid.uuid4(), slug="chargers", name_en="Chargers", name_bn="চার্জার"))
        await s.commit()
        yield s
    await engine.dispose()


@pytest.mark.asyncio
async def test_commit_creates_category_and_uses_uploaded_images(session: AsyncSession):
    csv_text = (
        HEAD + "\n"
        + ",".join(_row(name_bn="কেবল", name_en="USB Cable", category="cables", category_name_bn="কেবল",
                        category_name_en="Cables", price="200", cost_price="120", specifications="Length: 1m",
                        images="cable.jpg|cable-2.jpg").values()) + "\n"
    )
    resp = await bulk_routes.import_products_commit(
        file=UploadFile(filename="products.csv", file=io.BytesIO(csv_text.encode("utf-8-sig"))),
        mapping=None, on_existing="update", on_new="create",
        image_map='{"cable.jpg": "https://res.cloudinary.com/x/cable.jpg"}',
        _admin=str(uuid.uuid4()), db=session,
    )
    assert resp.data["created"] == 1 and resp.data["categories_created"] == 1, resp.data
    cat = (await session.execute(select(Category).where(Category.slug == "cables"))).scalar_one()
    assert cat.name_bn == "কেবল" and cat.applies_to == ["product"]
    p = (await session.execute(select(Product).where(Product.slug == "usb-cable"))).scalar_one()
    assert p.category_id == cat.id and float(p.cost_price) == 120
    assert p.image_url == "https://res.cloudinary.com/x/cable.jpg" and p.images == []
    assert p.specifications == {"Length": "1m"} and p.stock_quantity == 10
    assert any("cable-2.jpg" in w for e in resp.data["errors"] for w in e["warnings"])


def test_public_product_schema_never_serializes_cost_price():
    from datetime import datetime, timezone
    from app.schemas.schemas import ApiResponse, PaginatedResponse, PaginatedMeta, ProductOut, PublicProductOut
    obj = NS(id=uuid.uuid4(), created_at=datetime.now(timezone.utc), slug="p", name_en="P", name_bn="প", price=100,
             cost_price=60, category="chargers", images=[], specifications={}, tags=[])
    pub = PublicProductOut.model_validate(obj, from_attributes=True)
    assert "cost_price" not in ApiResponse(data=pub).model_dump(mode="json")["data"]
    page = PaginatedResponse(data=[pub], meta=PaginatedMeta(page=1, per_page=1, total=1, total_pages=1))
    assert "cost_price" not in page.model_dump(mode="json")["data"][0]
    # Admin view still has it.
    assert ProductOut.model_validate(obj, from_attributes=True).model_dump()["cost_price"] == 60
