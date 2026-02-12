"""Report generation for analytics."""

from __future__ import annotations

import csv
import io
import json
from datetime import datetime, timezone
from typing import Any

from services.analytics.metrics import MetricsAggregator


class ReportGenerator:
    """Generates analytics reports in various formats."""

    def __init__(self, metrics: MetricsAggregator) -> None:
        self.metrics = metrics

    async def generate_summary_report(
        self,
        db: Any,
        days: int = 30,
        format: str = "json",
    ) -> str:
        """Generate a summary report."""
        dashboard = await self.metrics.get_dashboard_metrics(db, days=days)
        agent_perf = await self.metrics.get_agent_performance(db, days=days)
        daily_usage = await self.metrics.get_daily_usage(db, days=days)

        report = {
            "report_type": "summary",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "period_days": days,
            "dashboard_metrics": dashboard,
            "agent_performance": agent_perf,
            "daily_usage": daily_usage,
        }

        if format == "json":
            return json.dumps(report, indent=2)
        elif format == "csv":
            return self._to_csv(daily_usage)
        else:
            return json.dumps(report, indent=2)

    @staticmethod
    def _to_csv(data: list[dict[str, Any]]) -> str:
        """Convert a list of dicts to CSV format."""
        if not data:
            return ""
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
        return output.getvalue()
