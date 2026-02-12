"""Analytics service FastAPI application."""

from __future__ import annotations

from fastapi import FastAPI, Depends, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_db
from libs.config import get_settings
from libs.monitoring.logger import setup_logging
from services.analytics.metrics import MetricsAggregator
from services.analytics.reports import ReportGenerator

settings = get_settings()
setup_logging("analytics-service")

app = FastAPI(title="Aegis AI X - Analytics Service", version="1.0.0")

metrics_aggregator = MetricsAggregator()
report_generator = ReportGenerator(metrics_aggregator)


@app.get("/analytics/dashboard")
async def dashboard_metrics(
    project_id: str | None = None,
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    """Get dashboard metrics."""
    return await metrics_aggregator.get_dashboard_metrics(db, project_id, days)


@app.get("/analytics/agents")
async def agent_performance(
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    """Get agent performance metrics."""
    return await metrics_aggregator.get_agent_performance(db, days)


@app.get("/analytics/usage")
async def daily_usage(
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    """Get daily usage statistics."""
    return await metrics_aggregator.get_daily_usage(db, days)


@app.get("/analytics/report")
async def generate_report(
    days: int = Query(default=30, ge=1, le=365),
    format: str = Query(default="json", regex="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Generate an analytics report."""
    report = await report_generator.generate_summary_report(db, days, format)
    if format == "csv":
        return PlainTextResponse(report, media_type="text/csv")
    return {"report": report}


@app.get("/analytics/health")
async def health():
    return {"status": "healthy", "service": "analytics"}
