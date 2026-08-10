import pytest

from app.core.steadfast import SteadfastError, create_consignment, lookup_status


@pytest.mark.asyncio
async def test_lookup_status_parses_real_provider_shape(monkeypatch):
    async def fake_settings(_db):
        return {
            "enabled": True,
            "api_key": "key",
            "secret_key": "secret",
            "base_url": "https://example.test/api/v1",
            "delivery_type": "0",
            "auto_send": False,
        }

    class Response:
        status_code = 200

        def json(self):
            return {"status": 200, "delivery_status": "delivered"}

    class Client:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def request(self, *args, **kwargs):
            return Response()

    monkeypatch.setattr("app.core.steadfast.get_settings", fake_settings)
    monkeypatch.setattr("app.core.steadfast.httpx.AsyncClient", lambda **kwargs: Client())

    result = await lookup_status(object(), tracking_code="SFR123")
    assert result["delivery_status"] == "delivered"


@pytest.mark.asyncio
async def test_create_consignment_requires_provider_tracking_code(monkeypatch):
    async def fake_settings(_db):
        return {
            "enabled": True,
            "api_key": "key",
            "secret_key": "secret",
            "base_url": "https://example.test/api/v1",
            "delivery_type": "0",
            "auto_send": False,
        }

    async def fake_lookup(*args, **kwargs):
        raise SteadfastError("Steadfast-এ shipment পাওয়া যায়নি।")

    class Response:
        status_code = 200

        def json(self):
            return {
                "status": 200,
                "message": "Consignment has been created successfully.",
                "consignment": {
                    "consignment_id": 12345,
                    "tracking_code": "SFR123",
                    "status": "in_review",
                },
            }

    class Client:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def request(self, *args, **kwargs):
            return Response()

    class Order:
        order_number = "ABO-202608-ABC123"
        customer_name = "Test Customer"
        customer_phone = "01712345678"
        delivery_address = "House 1, Dhaka"
        payment_status = "pending"
        total = 500
        notes = ""

    monkeypatch.setattr("app.core.steadfast.get_settings", fake_settings)
    monkeypatch.setattr("app.core.steadfast.lookup_status", fake_lookup)
    monkeypatch.setattr("app.core.steadfast.httpx.AsyncClient", lambda **kwargs: Client())

    result = await create_consignment(object(), Order())
    assert result["tracking_code"] == "SFR123"
    assert result["consignment_id"] == "12345"


@pytest.mark.asyncio
async def test_create_consignment_rejects_malformed_success(monkeypatch):
    async def fake_settings(_db):
        return {
            "enabled": True,
            "api_key": "key",
            "secret_key": "secret",
            "base_url": "https://example.test/api/v1",
            "delivery_type": "0",
            "auto_send": False,
        }

    async def fake_lookup(*args, **kwargs):
        raise SteadfastError("Steadfast-এ shipment পাওয়া যায়নি।")

    class Response:
        status_code = 200

        def json(self):
            return {"status": 200, "message": "ok", "consignment": {}}

    class Client:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def request(self, *args, **kwargs):
            return Response()

    class Order:
        order_number = "ABO-202608-ABC123"
        customer_name = "Test Customer"
        customer_phone = "01712345678"
        delivery_address = "House 1, Dhaka"
        payment_status = "pending"
        total = 500
        notes = ""

    monkeypatch.setattr("app.core.steadfast.get_settings", fake_settings)
    monkeypatch.setattr("app.core.steadfast.lookup_status", fake_lookup)
    monkeypatch.setattr("app.core.steadfast.httpx.AsyncClient", lambda **kwargs: Client())

    with pytest.raises(SteadfastError):
        await create_consignment(object(), Order())
