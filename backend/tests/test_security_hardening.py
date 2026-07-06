from __future__ import annotations

import importlib
import os

import httpx
import pytest


def _load_app(app_env: str = "test", debug: str = "false"):
    os.environ["SECRET_KEY"] = "security-test-secret"
    os.environ["DATABASE_URL"] = "postgresql+asyncpg://localhost/test_db"
    os.environ["ALLOWED_ORIGINS"] = "https://aboenterprise.com"
    os.environ["APP_ENV"] = app_env
    os.environ["DEBUG"] = debug

    import app.core.config as config_module  # noqa: WPS433

    importlib.reload(config_module)
    import app.main as app_module  # noqa: WPS433
    return importlib.reload(app_module).app


def _reload_database(app_env: str, debug: str):
    os.environ["SECRET_KEY"] = "security-test-secret"
    os.environ["DATABASE_URL"] = "postgresql+asyncpg://localhost/test_db"
    os.environ["APP_ENV"] = app_env
    os.environ["DEBUG"] = debug

    import app.core.config as config_module  # noqa: WPS433

    importlib.reload(config_module)
    import app.core.database as database_module  # noqa: WPS433
    return importlib.reload(database_module)


@pytest.mark.asyncio
async def test_root_sets_security_headers():
    app = _load_app()

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get("/")

    assert response.status_code == 200
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "strict-transport-security" not in response.headers


@pytest.mark.asyncio
async def test_root_sets_hsts_for_https_requests():
    app = _load_app()

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="https://test",
    ) as client:
        response = await client.get("/")

    assert response.headers["strict-transport-security"] == "max-age=31536000; includeSubDomains"


@pytest.mark.asyncio
async def test_auth_ping_response_is_sanitized(monkeypatch: pytest.MonkeyPatch):
    app = _load_app()

    import app.core.database as database_module  # noqa: WPS433
    import app.core.security as security_module  # noqa: WPS433

    class _ScalarResult:
        def __init__(self, value: int):
            self._value = value

        def scalar(self) -> int:
            return self._value

    class _Session:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def execute(self, query):
            return _ScalarResult(1)

    monkeypatch.setattr(database_module, "AsyncSessionLocal", lambda: _Session())
    app.dependency_overrides[security_module.require_admin] = lambda: "admin-id"

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get("/api/v1/auth/ping")

    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "db": "connected",
        "admin_total": 1,
        "admin_active": 1,
        "status": "ok",
    }
    assert "db_host" not in response.json()
    assert "detail" not in response.json()
    assert "bcrypt_version" not in response.json()


@pytest.mark.asyncio
async def test_auth_ping_error_response_is_sanitized(monkeypatch: pytest.MonkeyPatch):
    app = _load_app()

    import app.core.database as database_module  # noqa: WPS433
    import app.core.security as security_module  # noqa: WPS433

    class _FailingSession:
        async def __aenter__(self):
            raise RuntimeError("db connection secret")

        async def __aexit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr(database_module, "AsyncSessionLocal", lambda: _FailingSession())
    app.dependency_overrides[security_module.require_admin] = lambda: "admin-id"

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get("/api/v1/auth/ping")

    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {"db": "error", "status": "error"}


def test_sql_echo_is_disabled_in_production():
    database_module = _reload_database(app_env="production", debug="true")

    assert database_module.engine.echo is False


def test_sql_echo_follows_debug_outside_production():
    database_module = _reload_database(app_env="development", debug="true")

    assert database_module.engine.echo is True
