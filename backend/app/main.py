"""ABO Enterprise Backend API - v1.0.1 (migration hotfix)"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
from app.core.config import settings
from app.core.monitoring import init_sentry

# Best-effort — no-op unless SENTRY_DSN is configured.
init_sentry()
# Ring-buffer capture of ERROR-level logs for the admin Operations panel.
from app.core.ops_events import install_error_capture  # noqa: E402

install_error_capture()
from app.core.exceptions import ABOException, to_http_exception
from app.core.security import require_admin
from app.core.bootstrap import bootstrap_admin
from app.core.content_bootstrap import bootstrap_content
from app.api.v1.router import api_router

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)


async def _init_db_and_bootstrap() -> None:
    """Bootstrap the admin account and seed content.

    Schema creation and column patches are handled exclusively by Alembic
    migrations (alembic upgrade head) which run at build time before the
    service starts.  Runtime DDL (create_all, schema_sync) has been removed
    to prevent unsafe schema mutations on every cold start.
    """
    if not settings.STARTUP_BOOTSTRAP_ENABLED:
        logger.info("Startup bootstrap disabled (STARTUP_BOOTSTRAP_ENABLED=false)")
        return

    await bootstrap_admin()
    await bootstrap_content()

    from app.core.maintenance import prune_old_activity_logs
    await prune_old_activity_logs()


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(api_router)

from app.api.v1.routes.health import router as health_router
app.include_router(health_router)


# ==================== EXCEPTION HANDLERS ====================

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    forwarded_proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    if forwarded_proto == "https":
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response


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

@app.get("/api/v1/auth/ping", include_in_schema=False)
async def auth_ping(admin_id: str = Depends(require_admin)):
    """Diagnostic: check DB connectivity and admin existence. Requires admin auth."""
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
            "admin_total": admin_count,
            "admin_active": active_count,
            "status": "ok" if active_count > 0 else "no_active_admin",
        }
    except Exception:
        logger.exception("Admin auth ping failed")
        return {"db": "error", "status": "error"}
