from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.api.v1.routes.admin_settings import delete_payment_method
from app.api.v1.routes.assistant import delete_assistant_log, list_assistant_logs, router
from app.api.v1.routes.email_templates import delete_email_template
from app.core.admin_safety import (
    AssistantActionLogRetentionError,
    prevent_assistant_action_log_deletion,
    protect_assistant_audit_logs,
)
from app.core.security import require_admin
from app.models.models import AssistantActionLog


class _Result:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


@pytest.mark.asyncio
async def test_payment_method_delete_only_disables_record():
    method = SimpleNamespace(id=uuid4(), is_active=True, is_deleted=False)
    db = SimpleNamespace(
        execute=AsyncMock(return_value=_Result(method)),
        add=Mock(),
        commit=AsyncMock(),
        refresh=AsyncMock(),
    )

    response = await delete_payment_method(method.id, str(uuid4()), db)

    assert method.is_active is False
    assert method.is_deleted is False
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(method)
    assert "preserved" in response.message


@pytest.mark.asyncio
async def test_email_template_delete_only_disables_record():
    template = SimpleNamespace(id=uuid4(), is_active=True, is_deleted=False)
    db = SimpleNamespace(
        execute=AsyncMock(return_value=_Result(template)),
        add=Mock(),
        commit=AsyncMock(),
        refresh=AsyncMock(),
    )

    response = await delete_email_template(template.id, db=db, admin_id=str(uuid4()))

    assert template.is_active is False
    assert template.is_deleted is False
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(template)
    assert "preserved" in response.message


@pytest.mark.asyncio
async def test_assistant_audit_log_delete_is_blocked_by_http_retention_guard():
    scope = {
        "type": "http",
        "method": "DELETE",
        "path": "/api/v1/assistant/admin/logs/00000000-0000-0000-0000-000000000000",
        "headers": [],
        "query_string": b"",
        "server": ("testserver", 80),
        "client": ("testclient", 1234),
        "scheme": "http",
    }
    request = Request(scope)
    call_next = AsyncMock()

    response = await protect_assistant_audit_logs(request, call_next)

    assert response.status_code == 409
    assert response.body and b"AUDIT_LOG_RETENTION" in response.body
    call_next.assert_not_awaited()


def test_assistant_action_log_orm_delete_is_blocked_at_operation_boundary():
    log = AssistantActionLog(
        id=uuid4(),
        action="test_action",
        status="success",
        details={},
        is_deleted=False,
    )
    session = SimpleNamespace(deleted={log})

    with pytest.raises(AssistantActionLogRetentionError, match="AUDIT_LOG_RETENTION"):
        prevent_assistant_action_log_deletion(session, None, None)

    assert log in session.deleted
    assert log.is_deleted is False


def test_assistant_action_log_retention_guard_is_registered_on_sqlalchemy_session():
    from sqlalchemy import event

    assert event.contains(Session, "before_flush", prevent_assistant_action_log_deletion)


@pytest.mark.asyncio
async def test_direct_assistant_log_route_invocation_cannot_bypass_retention():
    log = AssistantActionLog(
        id=uuid4(),
        action="test_action",
        status="success",
        details={},
        is_deleted=False,
    )

    class RetentionGuardedSession:
        def __init__(self):
            self.deleted = set()
            self.commit = AsyncMock(side_effect=self._guarded_commit)

        async def execute(self, _query):
            return _Result(log)

        async def delete(self, obj):
            self.deleted.add(obj)

        async def _guarded_commit(self):
            prevent_assistant_action_log_deletion(self, None, None)

    db = RetentionGuardedSession()

    with pytest.raises(AssistantActionLogRetentionError, match="AUDIT_LOG_RETENTION"):
        await delete_assistant_log(log.id, _admin="admin", db=db)

    assert log in db.deleted
    db.commit.assert_awaited_once()
    assert log.is_deleted is False


def test_assistant_log_delete_route_remains_admin_gated():
    route = next(r for r in router.routes if getattr(r, "path", None) == "/assistant/admin/logs/{log_id}")
    dependency_calls = {dependency.call for dependency in route.dependant.dependencies}
    assert require_admin in dependency_calls


@pytest.mark.asyncio
async def test_assistant_log_list_route_remains_read_only():
    log = SimpleNamespace(
        id=uuid4(),
        session_id="session-test",
        intent="test",
        action="test_action",
        status="success",
        details={},
        admin_id=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        is_deleted=False,
    )

    class ListResult:
        def __init__(self, scalar_value=None, rows=None):
            self.scalar_value = scalar_value
            self.rows = rows or []

        def scalar(self):
            return self.scalar_value

        def scalars(self):
            return self

        def all(self):
            return self.rows

    db = SimpleNamespace(
        execute=AsyncMock(
            side_effect=[
                ListResult(scalar_value=1),
                ListResult(rows=[log]),
            ]
        )
    )

    response = await list_assistant_logs(page=1, per_page=20, session_id=None, _admin="admin", db=db)

    assert response.meta.total == 1
    assert len(response.data) == 1
    assert response.data[0].id == log.id
    db.execute.assert_awaited()
