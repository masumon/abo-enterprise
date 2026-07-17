from __future__ import annotations

import importlib
import os

import httpx
import pytest


def _load_app():
    os.environ["SECRET_KEY"] = "assistant-security-test-secret"
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


def test_assistant_session_token_round_trip():
    from app.assistant.session_security import (  # noqa: WPS433
        build_assistant_session_token,
        verify_assistant_session_token,
    )

    token = build_assistant_session_token("session-123")
    assert verify_assistant_session_token("session-123", token) is True
    assert verify_assistant_session_token("session-456", token) is False


@pytest.mark.anyio
async def test_assistant_history_requires_valid_token():
    app = _load_app()

    import app.core.database as database_module  # noqa: WPS433

    app.dependency_overrides[database_module.get_db] = _fake_db

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get("/api/v1/assistant/conversations/test-session/history", params={"session_token": "invalid-token-value-1234"})

    app.dependency_overrides.clear()

    assert response.status_code == 403
    assert response.json()["detail"] == "Invalid conversation token"


@pytest.mark.anyio
async def test_chat_does_not_resume_session_without_valid_token(monkeypatch: pytest.MonkeyPatch):
    app = _load_app()

    import app.core.database as database_module  # noqa: WPS433
    import app.api.v1.routes.assistant as assistant_routes  # noqa: WPS433

    app.dependency_overrides[database_module.get_db] = _fake_db

    captured: dict[str, str | None] = {"session_id": "sentinel"}

    class _FakeOrchestrator:
        async def process_message(self, db, **kwargs):
            captured["session_id"] = kwargs.get("session_id")
            return {
                "message": "OK",
                "intent": "greeting",
                "language": "en",
                "session_id": "fresh-session",
                "session_token": "fresh-token",
            }

    monkeypatch.setattr(assistant_routes, "_orchestrator", _FakeOrchestrator())

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/api/v1/assistant/chat",
            json={
                "message": "hello",
                "session_id": "existing-session",
                "session_token": "bad-token",
            },
        )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert captured["session_id"] is None
    assert response.json()["data"]["session_id"] == "fresh-session"