from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest
from starlette.requests import Request

from app.api.v1.routes.admin_settings import delete_payment_method
from app.api.v1.routes.email_templates import delete_email_template
from app.main import protect_assistant_audit_logs


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
async def test_assistant_audit_log_delete_is_blocked():
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
    call_next.assert_not_awaited()
