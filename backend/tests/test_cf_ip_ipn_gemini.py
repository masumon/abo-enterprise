"""Cloudflare-aware client IP, SSLCommerz amount check, Gemini busy fallback."""
import asyncio
import types

import httpx

from app.api.v1.routes.payments import ipn_amount_ok
from app.assistant import ai_gemini as ai
from app.core.rate_limit import client_ip


def _req(headers: dict, host: str = "10.0.0.1"):
    return types.SimpleNamespace(headers={k.lower(): v for k, v in headers.items()}, client=types.SimpleNamespace(host=host))


def test_client_ip_prefers_cloudflare_header():
    r = _req({"CF-Connecting-IP": "203.0.113.7", "X-Forwarded-For": "1.2.3.4, 172.70.1.1"})
    assert client_ip(r) == "203.0.113.7"


def test_client_ip_ignores_garbage_and_falls_back():
    assert client_ip(_req({"CF-Connecting-IP": "not-an-ip", "X-Forwarded-For": "198.51.100.9, 1.1.1.1"})) == "198.51.100.9"
    assert client_ip(_req({"X-Forwarded-For": "<script>"})) == "10.0.0.1"


def test_ipn_amount_must_match():
    assert ipn_amount_ok({"amount": "1290.00", "currency": "BDT"}, 1290)
    assert not ipn_amount_ok({"amount": "10.00", "currency": "BDT"}, 1290)
    assert not ipn_amount_ok({"amount": "1290.00", "currency": "USD"}, 1290)
    assert not ipn_amount_ok({}, 1290)


def test_gemini_busy_falls_back_to_next_model(monkeypatch):
    calls = []

    async def no_wait(*_a, **_k):
        return None
    monkeypatch.setattr(asyncio, "sleep", no_wait)

    def handler(request):
        calls.append(request.url.path)
        return httpx.Response(503) if len(calls) < 3 else httpx.Response(200, json={"ok": True})

    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as c:
            return await ai._post_with_fallback(c, "gemini-x", None, {}, {})

    r = asyncio.run(run())
    assert r.status_code == 200 and len(calls) == 3 and "gemini-x" not in calls[2]
