"""Integration tests for the auth service API."""

import pytest
from httpx import AsyncClient, ASGITransport

from services.auth.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


class TestAuthAPI:
    @pytest.mark.asyncio
    async def test_health(self, client):
        resp = await client.get("/auth/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_register_requires_fields(self, client):
        resp = await client.post("/auth/register", json={})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_login_invalid_credentials(self, client):
        resp = await client.post("/auth/login", data={
            "username": "nonexistent@example.com",
            "password": "wrongpassword",
        })
        assert resp.status_code in (401, 500)

    @pytest.mark.asyncio
    async def test_me_without_token(self, client):
        resp = await client.get("/auth/me")
        assert resp.status_code in (401, 403)
