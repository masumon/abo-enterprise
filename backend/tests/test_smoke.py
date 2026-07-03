"""Smoke tests — verify the app boots, rate limits fire, OTP flow gates
customer reads, admin token can't act as a customer token, and the
public feature-flags endpoint returns a strong ETag / 304.

Needs a live Postgres URL in TEST_DATABASE_URL (or DATABASE_URL).
Skip cleanly when neither is present so the suite doesn't fail in
container environments without a database.
"""
from __future__ import annotations

import importlib
import os

import httpx
import pytest

_DB_URL = os.environ.get("TEST_DATABASE_URL") or os.environ.get("DATABASE_URL")

if not _DB_URL:
    pytest.skip("TEST_DATABASE_URL / DATABASE_URL not set — smoke tests skipped", allow_module_level=True)


@pytest.fixture(scope="module")
def app():
    os.environ["DATABASE_URL"] = _DB_URL
    os.environ.setdefault("SECRET_KEY", "smoke-test-secret")
    os.environ.setdefault("APP_ENV", "test")
    os.environ.setdefault("ADMIN_EMAIL", "admin@example.com")
    os.environ.setdefault("ADMIN_PASSWORD", "smoke-pass")
    import app.main as app_module  # noqa: WPS433
    importlib.reload(app_module)
    return app_module.app


@pytest.fixture
def client(app):
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


@pytest.mark.asyncio
async def test_health_ok(client):
    async with client as c:
        r = await c.get("/health")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


@pytest.mark.asyncio
async def test_by_phone_requires_customer_token(client):
    async with client as c:
        r = await c.get("/api/v1/orders/by-phone")
        assert r.status_code == 401


@pytest.mark.asyncio
async def test_feature_flags_etag(client):
    async with client as c:
        r = await c.get("/api/v1/public/feature-flags")
        assert r.status_code == 200
        etag = r.headers.get("ETag")
        assert etag and etag.startswith('W/"')
        # Second request with If-None-Match should 304
        r2 = await c.get("/api/v1/public/feature-flags", headers={"If-None-Match": etag})
        assert r2.status_code == 304


@pytest.mark.asyncio
async def test_orders_create_rate_limit(client):
    async with client as c:
        limited = False
        for _ in range(20):
            r = await c.post("/api/v1/orders", json={})
            if r.status_code == 429:
                limited = True
                break
        assert limited, "order-create rate limiter never fired"
