"""Health check endpoints."""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check."""
    return {
        "status": "healthy",
        "service": "api-gateway",
        "version": "1.0.0",
    }


@router.get("/health/ready")
async def readiness_check():
    """Readiness probe for Kubernetes."""
    # TODO: check database, redis, etc.
    return {"status": "ready"}


@router.get("/health/live")
async def liveness_check():
    """Liveness probe for Kubernetes."""
    return {"status": "alive"}
