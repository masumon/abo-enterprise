import pytest

from app.core.steadfast_test_connection import test_connection as run_test_connection


class DummyDB:
    pass


@pytest.mark.asyncio
async def test_disabled(monkeypatch):
    async def fake_settings(_db):
        return {"enabled": False, "api_key": "", "secret_key": "", "base_url": "https://example.test/api/v1"}

    monkeypatch.setattr("app.core.steadfast_test_connection.get_settings", fake_settings)
    result = await run_test_connection(DummyDB())
    assert result["code"] == "DISABLED"
    assert result["ok"] is False


@pytest.mark.asyncio
async def test_missing_credentials(monkeypatch):
    async def fake_settings(_db):
        return {"enabled": True, "api_key": "", "secret_key": "", "base_url": "https://example.test/api/v1"}

    monkeypatch.setattr("app.core.steadfast_test_connection.get_settings", fake_settings)
    result = await run_test_connection(DummyDB())
    assert result["code"] == "MISSING_CREDENTIALS"


@pytest.mark.asyncio
async def test_auth_failed(monkeypatch):
    async def fake_settings(_db):
        return {"enabled": True, "api_key": "x", "secret_key": "y", "base_url": "https://example.test/api/v1"}

    class Response:
        status_code = 401

        def json(self):
            return {"message": "unauthorized"}

    class Client:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def get(self, *args, **kwargs):
            return Response()

    monkeypatch.setattr("app.core.steadfast_test_connection.get_settings", fake_settings)
    monkeypatch.setattr("app.core.steadfast_test_connection.httpx.AsyncClient", lambda **kwargs: Client())
    result = await run_test_connection(DummyDB())
    assert result["code"] == "AUTH_FAILED"
    assert result["http_status"] == 401
    assert "unauthorized" not in result["message"]


@pytest.mark.asyncio
async def test_connected(monkeypatch):
    async def fake_settings(_db):
        return {"enabled": True, "api_key": "x", "secret_key": "y", "base_url": "https://example.test/api/v1"}

    class Response:
        status_code = 200

        def json(self):
            return {"current_balance": 123.45}

    class Client:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def get(self, *args, **kwargs):
            return Response()

    monkeypatch.setattr("app.core.steadfast_test_connection.get_settings", fake_settings)
    monkeypatch.setattr("app.core.steadfast_test_connection.httpx.AsyncClient", lambda **kwargs: Client())
    result = await run_test_connection(DummyDB())
    assert result["ok"] is True
    assert result["code"] == "CONNECTED"
    assert result["balance"] == 123.45


@pytest.mark.asyncio
async def test_http_200_with_malformed_balance_is_not_success(monkeypatch):
    async def fake_settings(_db):
        return {"enabled": True, "api_key": "x", "secret_key": "y", "base_url": "https://example.test/api/v1"}

    class Response:
        status_code = 200

        def json(self):
            return {"status": 200, "message": "ok"}

    class Client:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def get(self, *args, **kwargs):
            return Response()

    monkeypatch.setattr("app.core.steadfast_test_connection.get_settings", fake_settings)
    monkeypatch.setattr("app.core.steadfast_test_connection.httpx.AsyncClient", lambda **kwargs: Client())
    result = await run_test_connection(DummyDB())
    assert result["ok"] is False
    assert result["code"] == "MALFORMED_RESPONSE"
