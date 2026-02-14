"""API Gateway - main entry point for the SUMONIX AI platform."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app

from libs.config import get_settings
from libs.monitoring.logger import setup_logging, get_logger
from services.api_gateway.middleware.rate_limiter import RateLimiterMiddleware
from services.api_gateway.middleware.auth import AuthMiddleware
from services.api_gateway.middleware.request_id import RequestIDMiddleware
from services.api_gateway.routes import projects, tasks, agents, health, chat, subscriptions

settings = get_settings()
setup_logging("api-gateway", level="DEBUG" if settings.app_debug else "INFO")
logger = get_logger("api-gateway")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("api_gateway_starting", port=settings.api_gateway_port)
    yield
    logger.info("api_gateway_stopping")


app = FastAPI(
    title="SUMONIX AI",
    description="Next-Generation AI Platform — Chat, Code, Create, Automate",
    version="2.0.0",
    lifespan=lifespan,
)

# ─── Middleware (order matters: outermost first) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.app_env == "development" else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(RateLimiterMiddleware, rate_limit=settings.api_rate_limit, window=settings.api_rate_limit_window)
app.add_middleware(AuthMiddleware)

# ─── Routes ───────────────────────────────────
app.include_router(health.router, tags=["Health"])
app.include_router(chat.router, prefix="/api/v1", tags=["Chat"])
app.include_router(subscriptions.router, prefix="/api/v1", tags=["Subscriptions"])
app.include_router(projects.router, prefix="/api/v1", tags=["Projects"])
app.include_router(tasks.router, prefix="/api/v1", tags=["Tasks"])
app.include_router(agents.router, prefix="/api/v1", tags=["Agents"])

# ─── Prometheus Metrics ──────────────────────
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)
