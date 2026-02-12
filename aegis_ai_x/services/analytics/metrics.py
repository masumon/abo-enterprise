"""Analytics metrics collection and aggregation."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from database.models.postgres_models import Task, TaskStatus, Agent, User


class MetricsAggregator:
    """Aggregates platform metrics from the database."""

    async def get_dashboard_metrics(
        self,
        db: AsyncSession,
        project_id: str | None = None,
        days: int = 30,
    ) -> dict[str, Any]:
        """Get aggregated metrics for the dashboard."""
        since = datetime.now(timezone.utc) - timedelta(days=days)

        filters = [Task.created_at >= since]
        if project_id:
            filters.append(Task.project_id == project_id)

        # Total tasks
        total_result = await db.execute(
            select(func.count(Task.id)).where(and_(*filters))
        )
        total_tasks = total_result.scalar() or 0

        # Tasks by status
        status_result = await db.execute(
            select(Task.status, func.count(Task.id))
            .where(and_(*filters))
            .group_by(Task.status)
        )
        tasks_by_status = {row[0].value: row[1] for row in status_result.all()}

        # Success rate
        completed = tasks_by_status.get("completed", 0)
        failed = tasks_by_status.get("failed", 0)
        success_rate = (completed / (completed + failed) * 100) if (completed + failed) > 0 else 0

        # Total cost
        cost_result = await db.execute(
            select(func.sum(Task.cost)).where(and_(*filters))
        )
        total_cost = cost_result.scalar() or 0.0

        # Active agents
        agents_result = await db.execute(
            select(func.count(Agent.id)).where(Agent.is_active.is_(True))
        )
        active_agents = agents_result.scalar() or 0

        # Active users
        users_result = await db.execute(
            select(func.count(User.id)).where(User.is_active.is_(True))
        )
        active_users = users_result.scalar() or 0

        return {
            "period_days": days,
            "total_tasks": total_tasks,
            "tasks_by_status": tasks_by_status,
            "success_rate": round(success_rate, 1),
            "total_cost": round(total_cost, 2),
            "active_agents": active_agents,
            "active_users": active_users,
        }

    async def get_agent_performance(
        self,
        db: AsyncSession,
        days: int = 30,
    ) -> list[dict[str, Any]]:
        """Get performance metrics per agent type."""
        since = datetime.now(timezone.utc) - timedelta(days=days)

        result = await db.execute(
            select(
                Agent.agent_type,
                func.count(Task.id),
                func.avg(
                    func.extract("epoch", Task.completed_at)
                    - func.extract("epoch", Task.started_at)
                ),
                func.sum(Task.cost),
            )
            .join(Task, Task.agent_id == Agent.id)
            .where(Task.created_at >= since)
            .group_by(Agent.agent_type)
        )

        return [
            {
                "agent_type": row[0],
                "total_tasks": row[1],
                "avg_duration_seconds": round(row[2] or 0, 1),
                "total_cost": round(row[3] or 0, 2),
            }
            for row in result.all()
        ]

    async def get_daily_usage(
        self,
        db: AsyncSession,
        days: int = 30,
    ) -> list[dict[str, Any]]:
        """Get daily usage statistics."""
        since = datetime.now(timezone.utc) - timedelta(days=days)

        result = await db.execute(
            select(
                func.date(Task.created_at),
                func.count(Task.id),
                func.sum(Task.cost),
            )
            .where(Task.created_at >= since)
            .group_by(func.date(Task.created_at))
            .order_by(func.date(Task.created_at))
        )

        return [
            {
                "date": str(row[0]),
                "tasks": row[1],
                "cost": round(row[2] or 0, 2),
            }
            for row in result.all()
        ]
