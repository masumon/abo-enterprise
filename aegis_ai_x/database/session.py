"""Database session management."""

from __future__ import annotations

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from motor.motor_asyncio import AsyncIOMotorClient

from libs.config import get_settings

settings = get_settings()

# ─── PostgreSQL ───────────────────────────────

engine = create_async_engine(
    settings.postgres_dsn,
    echo=settings.app_debug,
    pool_size=20,
    max_overflow=10,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for FastAPI - yields an async database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# ─── MongoDB ──────────────────────────────────

mongo_client = AsyncIOMotorClient(settings.mongo_dsn)
mongo_db = mongo_client[settings.mongo_db]


def get_mongo_db():
    """Get MongoDB database instance."""
    return mongo_db
