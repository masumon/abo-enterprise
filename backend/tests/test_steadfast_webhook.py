"""Auth + status-mapping coverage for the Steadfast delivery-status webhook
(POST /orders/steadfast/webhook). This endpoint is intentionally unauthenticated
by RBAC (external callback, like the bKash/Nagad/SSLCommerz webhooks) and
relies entirely on the Bearer-token comparison, so a broken check here lets
anyone flip any order to "delivered" — real-money-adjacent, gets its own test.
"""
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest
from starlette.requests import Request

from app.api.v1.routes import orders as orders_module


class _Result:
    def __init__(self, value):
        self._value = value

    def scalars(self):
        return SimpleNamespace(first=lambda: self._value)


def _request(body: dict, token: str | None) -> Request:
    headers = [(b"content-type", b"application/json")]
    if token is not None:
        headers.append((b"authorization", f"Bearer {token}".encode()))
    payload = json.dumps(body).encode()

    async def receive():
        return {"type": "http.request", "body": payload, "more_body": False}

    scope = {
        "type": "http",
        "method": "POST",
        "path": "/api/v1/orders/steadfast/webhook",
        "headers": headers,
        "query_string": b"",
        "server": ("testserver", 80),
        "client": ("testclient", 1234),
        "scheme": "http",
    }
    return Request(scope, receive)


@pytest.mark.asyncio
async def test_missing_configured_token_rejects_everything(monkeypatch):
    monkeypatch.setattr(orders_module, "steadfast_settings", AsyncMock(return_value={"webhook_token": ""}))
    db = SimpleNamespace(execute=AsyncMock())
    request = _request({"consignment_id": "1", "status": "delivered"}, token="anything")

    with pytest.raises(Exception) as exc_info:
        await orders_module.steadfast_status_webhook(request, db)
    assert getattr(exc_info.value, "status_code", None) == 503


@pytest.mark.asyncio
async def test_wrong_token_rejected(monkeypatch):
    monkeypatch.setattr(orders_module, "steadfast_settings", AsyncMock(return_value={"webhook_token": "correct-token"}))
    db = SimpleNamespace(execute=AsyncMock())
    request = _request({"consignment_id": "1", "status": "delivered"}, token="wrong-token")

    with pytest.raises(Exception) as exc_info:
        await orders_module.steadfast_status_webhook(request, db)
    assert getattr(exc_info.value, "status_code", None) == 401


@pytest.mark.asyncio
async def test_no_authorization_header_rejected(monkeypatch):
    monkeypatch.setattr(orders_module, "steadfast_settings", AsyncMock(return_value={"webhook_token": "correct-token"}))
    db = SimpleNamespace(execute=AsyncMock())
    request = _request({"consignment_id": "1", "status": "delivered"}, token=None)

    with pytest.raises(Exception) as exc_info:
        await orders_module.steadfast_status_webhook(request, db)
    assert getattr(exc_info.value, "status_code", None) == 401


@pytest.mark.asyncio
async def test_valid_token_delivered_status_updates_order(monkeypatch):
    monkeypatch.setattr(orders_module, "steadfast_settings", AsyncMock(return_value={"webhook_token": "correct-token"}))
    order = SimpleNamespace(
        id=uuid4(), order_number="ABO-1", order_status="shipped",
        courier_status=None, courier_status_updated_at=None,
    )
    db = SimpleNamespace(execute=AsyncMock(return_value=_Result(order)), commit=AsyncMock())
    request = _request({"consignment_id": "999", "invoice": "ABO-1", "status": "delivered", "cod_amount": "0"}, token="correct-token")

    response = await orders_module.steadfast_status_webhook(request, db)

    assert response.success is True
    assert order.courier_status == "delivered"
    assert order.order_status == "delivered"
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_valid_token_never_overrides_already_cancelled_order(monkeypatch):
    monkeypatch.setattr(orders_module, "steadfast_settings", AsyncMock(return_value={"webhook_token": "correct-token"}))
    order = SimpleNamespace(
        id=uuid4(), order_number="ABO-2", order_status="cancelled",
        courier_status=None, courier_status_updated_at=None,
    )
    db = SimpleNamespace(execute=AsyncMock(return_value=_Result(order)), commit=AsyncMock())
    request = _request({"consignment_id": "998", "invoice": "ABO-2", "status": "delivered"}, token="correct-token")

    await orders_module.steadfast_status_webhook(request, db)

    assert order.order_status == "cancelled"
    assert order.courier_status == "delivered"


@pytest.mark.asyncio
async def test_unknown_order_is_ignored_not_errored(monkeypatch):
    monkeypatch.setattr(orders_module, "steadfast_settings", AsyncMock(return_value={"webhook_token": "correct-token"}))
    db = SimpleNamespace(execute=AsyncMock(return_value=_Result(None)))
    request = _request({"consignment_id": "unknown", "status": "delivered"}, token="correct-token")

    response = await orders_module.steadfast_status_webhook(request, db)

    assert response.success is True
