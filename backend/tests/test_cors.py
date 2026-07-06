from __future__ import annotations

import importlib
import os

import httpx
import pytest


def _load_app(allowed_origins: str):
    os.environ["SECRET_KEY"] = "cors-test-secret"
    os.environ["DATABASE_URL"] = "postgresql+asyncpg://localhost/test_db"
    os.environ["ALLOWED_ORIGINS"] = allowed_origins

    import app.core.config as config_module  # noqa: WPS433

    importlib.reload(config_module)
    import app.main as app_module  # noqa: WPS433
    return importlib.reload(app_module).app


@pytest.mark.asyncio
async def test_cors_allows_only_explicit_origins():
    app = _load_app("https://aboenterprise.com, https://abo-enterprise-git-main.vercel.app")

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        allowed = await client.get("/", headers={"Origin": "https://aboenterprise.com"})
        assert allowed.headers.get("access-control-allow-origin") == "https://aboenterprise.com"

        disallowed = await client.get("/", headers={"Origin": "https://evil.vercel.app"})
        assert "access-control-allow-origin" not in disallowed.headers


@pytest.mark.asyncio
async def test_cors_preflight_respects_explicit_allowlist():
    app = _load_app("https://aboenterprise.com")

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.options(
            "/",
            headers={
                "Origin": "https://aboenterprise.com",
                "Access-Control-Request-Method": "GET",
            },
        )

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "https://aboenterprise.com"
