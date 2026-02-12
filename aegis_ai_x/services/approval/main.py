"""Approval service FastAPI application."""

from __future__ import annotations

from fastapi import FastAPI

from libs.config import get_settings
from libs.monitoring.logger import setup_logging
from services.approval.api import router

settings = get_settings()
setup_logging("approval-service")

app = FastAPI(title="Aegis AI X - Approval Service", version="1.0.0")
app.include_router(router)


@app.get("/approval/health")
async def health():
    return {"status": "healthy", "service": "approval"}
