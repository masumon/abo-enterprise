from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
from app.core.config import settings
from app.core.exceptions import ABOException, to_http_exception
from app.api.v1.router import api_router

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)


async def _ensure_admin_exists():
    """Create default admin on first startup if ADMIN_PASSWORD is set and no admin exists."""
    if not settings.ADMIN_PASSWORD:
        return
    import asyncio
    from app.core.database import AsyncSessionLocal
    from app.models.models import AdminUser
    from app.core.security import hash_password
    from sqlalchemy import select

    for attempt in range(5):
        try:
            async with AsyncSessionLocal() as db:
                existing = await db.execute(select(AdminUser).limit(1))
                if existing.scalar_one_or_none():
                    return
                admin = AdminUser(
                    email=settings.ADMIN_EMAIL,
                    password_hash=hash_password(settings.ADMIN_PASSWORD),
                    name=settings.ADMIN_NAME,
                    role="super_admin",
                )
                db.add(admin)
                await db.commit()
                logger.info(f"Default admin created: {settings.ADMIN_EMAIL}")
                return
        except Exception as e:
            wait = 2 ** attempt
            logger.warning(f"Admin setup attempt {attempt + 1} failed: {e} — retrying in {wait}s")
            await asyncio.sleep(wait)
    logger.error("Failed to create default admin after 5 attempts")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info(f"Starting {settings.APP_NAME}")
    await _ensure_admin_exists()
    yield
    # Shutdown
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

# Health check (no prefix)
from app.api.v1.routes.health import router as health_router
app.include_router(health_router)


# ==================== EXCEPTION HANDLERS ====================

@app.exception_handler(ABOException)
async def abo_exception_handler(request: Request, exc: ABOException):
    """Handle ABO custom exceptions"""
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
    """Global exception handler"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=exc)

    error_message = "Internal server error"
    if settings.DEBUG:
        error_message = str(exc)

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": error_message,
            "error_code": "INTERNAL_SERVER_ERROR",
            "details": None,
        },
    )


# ==================== ROUTES ====================

@app.get("/", include_in_schema=False)
async def root():
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "status": "ok",
        "docs": "/docs" if settings.DEBUG else "Not available",
    }


@app.get("/health", include_in_schema=False)
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": "1.0.0",
    }
