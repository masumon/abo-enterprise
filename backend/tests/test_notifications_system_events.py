"""Persistent Notification and SystemEvent model/route contract tests.

These two tables replace what were previously purely in-memory, restart-
losing signals (app.core.ops_events ring buffers) with durable storage.
"""
from pathlib import Path

from app.models.models import Notification, SystemEvent

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MANUAL_SQL = PROJECT_ROOT / "backend" / "manual_sql" / "0037_notifications_system_events.sql"


def test_notification_schema_supports_targeted_and_broadcast_alerts():
    columns = {column.name: column for column in Notification.__table__.columns}

    assert Notification.__tablename__ == "notifications"
    assert columns["type"].nullable is False
    assert columns["title"].nullable is False
    # NULL target_admin_id is the broadcast case — must stay nullable.
    assert columns["target_admin_id"].nullable is True
    assert columns["is_read"].nullable is False
    assert columns["is_deleted"].nullable is False
    fk_targets = {fk.column.table.name for fk in columns["target_admin_id"].foreign_keys}
    assert fk_targets == {"admin_users"}


def test_system_event_schema_captures_severity_and_source():
    columns = {column.name: column for column in SystemEvent.__table__.columns}

    assert SystemEvent.__tablename__ == "system_events"
    assert columns["event_type"].nullable is False
    assert columns["severity"].nullable is False
    assert columns["message"].nullable is False
    assert columns["is_deleted"].nullable is False


def test_manual_sql_is_additive_only():
    sql = MANUAL_SQL.read_text(encoding="utf-8").upper()

    assert "CREATE TABLE IF NOT EXISTS NOTIFICATIONS" in sql
    assert "CREATE TABLE IF NOT EXISTS SYSTEM_EVENTS" in sql
    assert "DROP TABLE" not in sql
    assert "TRUNCATE" not in sql
    assert "DELETE FROM" not in sql
    assert "UPDATE " not in sql


def test_notifications_router_registered():
    from app.api.v1.router import api_router

    paths = {getattr(r, "path", "") for r in api_router.routes}
    assert "/api/v1/admin/notifications" in paths
    assert "/api/v1/admin/notifications/unread-count" in paths
    assert "/api/v1/admin/notifications/read-all" in paths


def test_system_events_routes_registered():
    from app.api.v1.router import api_router

    paths = {getattr(r, "path", "") for r in api_router.routes}
    assert "/api/v1/admin/ops/events" in paths
    assert "/api/v1/admin/ops/events/meta" in paths
