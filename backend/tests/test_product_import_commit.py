"""End-to-end test for the bulk product-import commit path against a REAL
(in-memory SQLite) async DB — proving create / update / skip, category matching,
per-row savepoint isolation (a bad row never aborts the batch), and history
persistence. The rest of the suite mocks the session; this one exercises the
actual writes so the savepoint logic is really run.
"""
import io
import uuid

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from starlette.datastructures import UploadFile

from app.core.database import Base
from app.models.models import Category, Product, ProductImportJob
from app.api.v1.routes import bulk as bulk_routes


@pytest_asyncio.fixture
async def session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    # Only the tables this feature touches — other models use Postgres-only
    # JSONB that SQLite can't compile, and we don't need them here.
    tables = [Category.__table__, Product.__table__, ProductImportJob.__table__]
    async with engine.begin() as conn:
        await conn.run_sync(lambda c: Base.metadata.create_all(c, tables=tables))
    maker = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with maker() as s:
        # Seed: a category and one existing product (for the update case).
        s.add(Category(id=uuid.uuid4(), slug="chargers", name_en="Chargers", name_bn="চার্জার"))
        s.add(Product(slug="existing-prod", name_en="Old Name", name_bn="পুরনো",
                      price=100, category="chargers", stock_quantity=1))
        await s.commit()
        yield s
    await engine.dispose()


def _upload(csv_text: str) -> UploadFile:
    return UploadFile(filename="products.csv", file=io.BytesIO(csv_text.encode("utf-8")))


@pytest.mark.asyncio
async def test_commit_creates_updates_skips_and_records_history(session: AsyncSession):
    csv_text = (
        "slug,name_en,name_bn,category,price,sku,stock_quantity,is_active\n"
        "new-a,New A,নতুন এ,chargers,199,SKU-A,10,true\n"           # create
        "new-b,New B,নতুন বি,chargers,299,SKU-B,5,true\n"           # create
        "existing-prod,Updated Name,আপডেট,chargers,150,,7,true\n"  # update
        "new-a,Dup Slug,ডুপ,chargers,50,,1,true\n"                 # duplicate slug -> skip
        "bad-cat,Bad Cat,খারাপ,does-not-exist,80,,1,true\n"        # bad category -> skip
        "neg,Neg Price,ঋণাত্মক,chargers,-5,,1,true\n"              # negative price -> skip
    )
    admin_id = str(uuid.uuid4())
    resp = await bulk_routes.import_products_commit(
        file=_upload(csv_text), mapping=None, on_existing="update", on_new="create",
        _admin=admin_id, db=session,
    )
    data = resp.data
    assert data["created"] == 2, data
    assert data["updated"] == 1, data
    assert data["skipped"] == 3, data
    # Three skipped rows are reported (dup slug, bad category, negative price).
    assert len(data["errors"]) == 3, data["errors"]

    # The good rows actually persisted, and the update took effect.
    from sqlalchemy import select
    a = (await session.execute(select(Product).where(Product.slug == "new-a"))).scalar_one()
    assert a.name_en == "New A" and float(a.price) == 199 and a.category_id is not None
    upd = (await session.execute(select(Product).where(Product.slug == "existing-prod"))).scalar_one()
    assert upd.name_en == "Updated Name" and float(upd.price) == 150

    # The failed rows were NOT written.
    bad = (await session.execute(select(Product).where(Product.slug == "bad-cat"))).scalar_one_or_none()
    assert bad is None

    # History row recorded with the right counts.
    job = (await session.execute(select(ProductImportJob))).scalar_one()
    assert job.created_count == 2 and job.updated_count == 1 and job.skipped_count == 3
    assert job.total_rows == 6


@pytest.mark.asyncio
async def test_on_existing_skip_leaves_product_unchanged(session: AsyncSession):
    csv_text = (
        "slug,name_en,name_bn,category,price\n"
        "existing-prod,Should Not Apply,না,chargers,999\n"
    )
    resp = await bulk_routes.import_products_commit(
        file=_upload(csv_text), mapping=None, on_existing="skip", on_new="create",
        _admin=str(uuid.uuid4()), db=session,
    )
    assert resp.data["updated"] == 0 and resp.data["skipped"] == 1
    from sqlalchemy import select
    p = (await session.execute(select(Product).where(Product.slug == "existing-prod"))).scalar_one()
    assert p.name_en == "Old Name" and float(p.price) == 100
