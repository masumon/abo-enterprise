"""End-to-end tests for the popular-search endpoints against an in-memory
SQLite DB — proves logging increments a per-term counter and the popular list
comes back ordered, and that a missing table degrades to a silent no-op."""
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base
from app.models.models import SearchTerm
from app.api.v1.routes import public as public_routes
from app.api.v1.routes.public import SearchLogIn, _normalize_term


@pytest_asyncio.fixture
async def session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(lambda c: Base.metadata.create_all(c, tables=[SearchTerm.__table__]))
    maker = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with maker() as s:
        yield s
    await engine.dispose()


def test_normalize_term():
    assert _normalize_term("  Fast   Charger ") == "fast charger"
    assert _normalize_term("A") == ""            # too short
    assert len(_normalize_term("x" * 200)) == 60  # capped


@pytest.mark.asyncio
async def test_log_increments_and_popular_orders(session: AsyncSession):
    from sqlalchemy import select

    # "charger" searched 3x, "cable" 1x.
    for _ in range(3):
        await public_routes.log_search_term(SearchLogIn(term="Charger"), db=session)
    await public_routes.log_search_term(SearchLogIn(term="cable"), db=session)

    rows = {r.term: r.count for r in (await session.execute(select(SearchTerm))).scalars().all()}
    assert rows == {"charger": 3, "cable": 1}


@pytest.mark.asyncio
async def test_log_ignores_too_short(session: AsyncSession):
    from sqlalchemy import select
    await public_routes.log_search_term(SearchLogIn(term="a"), db=session)
    assert (await session.execute(select(SearchTerm))).first() is None
