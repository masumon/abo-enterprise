from __future__ import annotations

import importlib
import os
import uuid
from types import SimpleNamespace

import httpx
import pytest


def _load_app():
    os.environ["SECRET_KEY"] = "assistant-admin-test-secret"
    os.environ["DATABASE_URL"] = "postgresql+asyncpg://localhost/test_db"
    os.environ["ALLOWED_ORIGINS"] = "https://aboenterprise.com"
    os.environ["APP_ENV"] = "test"
    os.environ["DEBUG"] = "false"

    import app.core.config as config_module  # noqa: WPS433

    importlib.reload(config_module)
    import app.main as app_module  # noqa: WPS433
    return importlib.reload(app_module).app


async def _fake_db():
    yield object()


@pytest.mark.anyio
async def test_admin_assistant_config_route_still_reads_settings(monkeypatch: pytest.MonkeyPatch):
    app = _load_app()

    import app.core.database as database_module  # noqa: WPS433
    import app.core.security as security_module  # noqa: WPS433
    import app.api.v1.routes.assistant as assistant_routes  # noqa: WPS433

    app.dependency_overrides[database_module.get_db] = _fake_db
    app.dependency_overrides[security_module.require_admin] = lambda: "admin-id"

    async def _fake_get_settings_map(db, keys):
        return {
            "feature_assistant_chat": "true",
            "feature_assistant_whatsapp": "false",
            "whatsapp_number": "8801999000000",
            "assistant_welcome_en": "Hello admin",
            "assistant_welcome_bn": "হ্যালো",
            "assistant_feature_orders": "true",
        }

    monkeypatch.setattr(assistant_routes, "_get_settings_map", _fake_get_settings_map)

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get("/api/v1/assistant/admin/config")

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["feature_assistant_chat"] is True
    assert data["feature_assistant_whatsapp"] is False
    assert data["whatsapp_number"] == "8801999000000"
    assert data["assistant_welcome_en"] == "Hello admin"


@pytest.mark.anyio
async def test_admin_assistant_config_update_route_still_saves_changes(monkeypatch: pytest.MonkeyPatch):
    app = _load_app()

    import app.core.database as database_module  # noqa: WPS433
    import app.core.security as security_module  # noqa: WPS433
    import app.api.v1.routes.assistant as assistant_routes  # noqa: WPS433

    updates: list[tuple[str, str, str]] = []

    class _FakeSession:
        async def commit(self):
            return None

    async def _fake_session_override():
        yield _FakeSession()

    async def _fake_upsert_setting(db, key, value, data_type="string", description=None):
        updates.append((key, value, data_type))

    app.dependency_overrides[database_module.get_db] = _fake_session_override
    app.dependency_overrides[security_module.require_admin] = lambda: "admin-id"
    monkeypatch.setattr(assistant_routes, "_upsert_setting", _fake_upsert_setting)

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.put(
            "/api/v1/assistant/admin/config",
            json={
                "feature_assistant_chat": False,
                "assistant_welcome_en": "Updated welcome",
            },
        )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert ("feature_assistant_chat", "false", "boolean") in updates
    assert ("assistant_welcome_en", "Updated welcome", "string") in updates


@pytest.mark.anyio
async def test_admin_assistant_faq_route_still_returns_entries(monkeypatch: pytest.MonkeyPatch):
    app = _load_app()

    import app.core.database as database_module  # noqa: WPS433
    import app.core.security as security_module  # noqa: WPS433
    import app.api.v1.routes.assistant as assistant_routes  # noqa: WPS433

    app.dependency_overrides[database_module.get_db] = _fake_db
    app.dependency_overrides[security_module.require_admin] = lambda: "admin-id"

    async def _fake_load_faq_flat(db):
        return {
            "delivery_en": "Delivery available nationwide.",
            "delivery_bn": "সারা দেশে ডেলিভারি আছে।",
            "delivery_q": "delivery outside dhaka",
        }

    monkeypatch.setattr(assistant_routes, "_load_faq_flat", _fake_load_faq_flat)

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get("/api/v1/assistant/admin/faq")

    app.dependency_overrides.clear()

    assert response.status_code == 200
    items = response.json()["data"]
    assert len(items) == 1
    assert items[0]["key"] == "delivery"
    assert items[0]["questions"] == "delivery outside dhaka"


@pytest.mark.anyio
async def test_admin_assistant_conversation_detail_still_reads_history(monkeypatch: pytest.MonkeyPatch):
    app = _load_app()

    import app.core.database as database_module  # noqa: WPS433
    import app.core.security as security_module  # noqa: WPS433
    import app.assistant.conversation_manager as conversation_manager_module  # noqa: WPS433

    conversation_id = uuid.uuid4()
    conversation = SimpleNamespace(
        id=conversation_id,
        session_id="assistant-session-1",
        customer_name="Masum",
        customer_phone="01712345678",
        customer_email="masum@example.com",
        language="bn",
        last_intent="faq",
        created_at="2026-07-18T10:00:00+00:00",
        updated_at="2026-07-18T10:05:00+00:00",
        message_count=2,
    )

    class _ScalarResult:
        def scalar_one_or_none(self):
            return conversation

    class _FakeSession:
        async def execute(self, query):
            return _ScalarResult()

    async def _fake_session_override():
        yield _FakeSession()

    async def _fake_history(self, db, conversation_id, limit=100):
        return [
            {"role": "user", "content": "hello", "intent": "greeting"},
            {"role": "assistant", "content": "hi", "intent": "greeting"},
        ]

    app.dependency_overrides[database_module.get_db] = _fake_session_override
    app.dependency_overrides[security_module.require_admin] = lambda: "admin-id"
    monkeypatch.setattr(conversation_manager_module.ConversationManager, "get_history", _fake_history)

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get(f"/api/v1/assistant/admin/conversations/{conversation_id}")

    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["conversation"]["session_id"] == "assistant-session-1"
    assert len(data["messages"]) == 2
    assert data["messages"][1]["content"] == "hi"