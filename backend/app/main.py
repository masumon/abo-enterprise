from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
from app.core.config import settings
from app.core.exceptions import ABOException, to_http_exception
from app.core.security import require_admin
from app.core.bootstrap import bootstrap_admin
from app.core.content_bootstrap import bootstrap_content
from app.api.v1.router import api_router

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)


async def _init_db_and_bootstrap() -> None:
    """Create any missing tables, sync columns, then bootstrap the admin account."""
    from app.core.database import engine, Base
    from app.core.schema_sync import sync_schema
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables verified/created.")
    except Exception as exc:
        logger.error("Database table creation failed: %s", exc, exc_info=exc)
        return
    try:
        await sync_schema(engine)
    except Exception as exc:
        logger.error("Schema sync failed: %s", exc, exc_info=exc)
    await bootstrap_admin()
    await bootstrap_content()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME}")
    await _init_db_and_bootstrap()
    yield
    logger.info(f"Shutting down {settings.APP_NAME}")


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="ABO Enterprise — Backend API",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_EXTRA_ORIGINS = [
    "https://aboenterprise.vercel.app",   # production (no hyphen)
    "https://abo-enterprise.vercel.app",  # alternative slug
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(settings.allowed_origins_list + _EXTRA_ORIGINS)),
    allow_origin_regex=r"https://.*\.vercel\.app",  # all Vercel preview & production URLs
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(api_router)

from app.api.v1.routes.health import router as health_router
app.include_router(health_router)


# ==================== EXCEPTION HANDLERS ====================

@app.exception_handler(ABOException)
async def abo_exception_handler(request: Request, exc: ABOException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.message,
            "error_code": exc.error_code,
            "details": exc.details if exc.details else None,
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error" if not settings.DEBUG else str(exc),
            "error_code": "INTERNAL_SERVER_ERROR",
            "details": None,
        },
    )


# ==================== ROUTES ====================

@app.get("/", include_in_schema=False)
async def root():
    return {"name": settings.APP_NAME, "version": "1.0.0", "status": "ok"}


@app.get("/health", include_in_schema=False)
async def health():
    return {"status": "healthy", "service": settings.APP_NAME, "version": "1.0.0"}


@app.get("/api/v1/auth/ping", include_in_schema=False)
async def auth_ping(admin_id: str = Depends(require_admin)):
    """Diagnostic: check DB connectivity and admin existence. Requires admin auth."""
    import bcrypt
    from urllib.parse import urlparse
    try:
        parsed = urlparse(settings.DATABASE_URL)
        db_host = f"{parsed.hostname}:{parsed.port or 5432}"
    except Exception:
        db_host = "unknown"

    try:
        from app.core.database import AsyncSessionLocal
        from app.models.models import AdminUser
        from sqlalchemy import select, func
        async with AsyncSessionLocal() as db:
            count_result = await db.execute(select(func.count()).select_from(AdminUser))
            admin_count = count_result.scalar()
            active_result = await db.execute(
                select(func.count()).select_from(AdminUser).where(AdminUser.is_active == True)  # noqa: E712
            )
            active_count = active_result.scalar()
        return {
            "db": "connected",
            "db_host": db_host,
            "admin_total": admin_count,
            "admin_active": active_count,
            "bcrypt_version": bcrypt.__version__,
            "status": "ok" if active_count > 0 else "no_active_admin",
        }
    except Exception as e:
        return {"db": "error", "db_host": db_host, "detail": str(e), "status": "error"}
