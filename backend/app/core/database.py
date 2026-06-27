from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

# Supabase (and other hosted Postgres services) require SSL.
# asyncpg accepts ssl as a connect_arg when not embedded in the URL.
_url = settings.DATABASE_URL
_is_supabase = "supabase.co" in _url or "pooler.supabase.com" in _url
_connect_args = {"ssl": "require"} if _is_supabase else {}

engine = create_async_engine(
    _url,
    pool_size=3,       # keep low for Render Free / Supabase free (max 60 conns)
    max_overflow=5,
    pool_pre_ping=True,
    pool_recycle=300,  # recycle connections every 5 min (avoids stale-conn errors)
    echo=settings.DEBUG,
    connect_args=_connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:  # type: ignore[override]
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
