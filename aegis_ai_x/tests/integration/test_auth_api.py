"""Integration tests for the auth service API."""

import pytest
from httpx import AsyncClient


class TestAuthAPI:
    @pytest.mark.asyncio
    async def test_health(self, auth_client: AsyncClient):
        resp = await auth_client.get("/auth/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_register_requires_fields(self, auth_client: AsyncClient):
        resp = await auth_client.post("/auth/register", json={})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_login_invalid_credentials(self, auth_client: AsyncClient):
        resp = await auth_client.post("/auth/login", data={
            "username": "nonexistent@example.com",
            "password": "wrongpassword",
        })
        assert resp.status_code in (401, 500)

    @pytest.mark.asyncio
    async def test_me_without_token(self, auth_client: AsyncClient):
        resp = await auth_client.get("/auth/me")
        assert resp.status_code in (401, 403)
