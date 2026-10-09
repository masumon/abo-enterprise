"""Google AI layer: verify before save, never break chat, never leak numbers."""
import httpx
import pytest

from app.assistant import ai_gemini as ai

pytestmark = pytest.mark.asyncio

FACTS = {"site": "ABO Enterprise", "phone": "01885411007", "whatsapp": "01885411007"}
GOOD_KEY = "AIzaSyA1234567890abcdefghijklmnopqrstuv"


@pytest.fixture(autouse=True)
def _reset():
    ai.invalidate()
    ai._usage.update(day=None, count=0)
    yield
    ai.invalidate()


def _cfg(**over):
    cfg = {"key": GOOD_KEY, "model": "gemini-2.5-flash", "enabled": True, "daily_cap": 300, "hint": "AIza…stuv", "verified_at": ""}
    cfg.update(over)

    async def load(_db):
        return cfg

    return load


async def test_malformed_key_is_rejected_without_calling_google(monkeypatch):
    async def boom(*a, **k):
        raise AssertionError("must not call Google")

    monkeypatch.setattr(ai, "_pick_model", boom)
    res = await ai.verify_key("not a key")
    assert not res.ok and "কী" in res.message_bn


async def test_verify_success_picks_model(monkeypatch):
    async def pick(client, key):
        return "gemini-2.5-flash"

    async def gen(client, key, model, system, user, max_tokens=400):
        return "OK"

    monkeypatch.setattr(ai, "_pick_model", pick)
    monkeypatch.setattr(ai, "_generate", gen)
    res = await ai.verify_key(GOOD_KEY)
    assert res.ok and res.model == "gemini-2.5-flash"


@pytest.mark.parametrize("status,needle", [(400, "সঠিক নয়"), (403, "অনুমতি নেই"), (429, "সীমা")])
async def test_verify_maps_google_errors_to_plain_bangla(monkeypatch, status, needle):
    async def pick(client, key):
        req = httpx.Request("GET", "https://x")
        raise httpx.HTTPStatusError("x", request=req, response=httpx.Response(status, request=req, text="API key not valid"))

    monkeypatch.setattr(ai, "_pick_model", pick)
    res = await ai.verify_key(GOOD_KEY)
    assert not res.ok and needle in res.message_bn


async def test_answer_is_none_when_disabled_or_without_key(monkeypatch):
    monkeypatch.setattr(ai, "load_config", _cfg(enabled=False))
    assert await ai.answer(None, "q", "bn", "facts", FACTS) is None
    monkeypatch.setattr(ai, "load_config", _cfg(key=""))
    assert await ai.answer(None, "q", "bn", "facts", FACTS) is None


async def test_answer_falls_back_quietly_on_google_failure(monkeypatch):
    monkeypatch.setattr(ai, "load_config", _cfg())

    async def gen(*a, **k):
        raise httpx.ConnectError("down")

    monkeypatch.setattr(ai, "_generate", gen)
    assert await ai.answer(None, "q", "bn", "facts", FACTS) is None


async def test_answer_masks_numbers_and_emails_and_respects_daily_cap(monkeypatch):
    monkeypatch.setattr(ai, "load_config", _cfg(daily_cap=1))
    sent = {}

    async def gen(client, key, model, system, user, max_tokens=400):
        sent["user"], sent["system"] = user, system
        return "## উত্তর\n**হ্যাঁ**, আমরা করি।"

    monkeypatch.setattr(ai, "_generate", gen)
    out = await ai.answer(None, "আমার নম্বর 01712345678, mail me@x.com", "bn", "FACTS", FACTS)
    assert out == "উত্তর\nহ্যাঁ, আমরা করি।"
    assert "01712345678" not in sent["user"] and "me@x.com" not in sent["user"]
    assert "Bangla" in sent["system"] and "01885411007" in sent["system"]
    # cap reached → no second call
    assert await ai.answer(None, "again", "bn", "FACTS", FACTS) is None


async def test_new_style_keys_with_dots_reach_google(monkeypatch):
    called = {}

    async def pick(client, key):
        called["key"] = key
        return "gemini-2.5-flash"

    async def gen(*a, **k):
        return "OK"

    monkeypatch.setattr(ai, "_pick_model", pick)
    monkeypatch.setattr(ai, "_generate", gen)
    res = await ai.verify_key("AQ.Ab8RN6Lx2kQ9vT3mPz7wY1cD4fG6hJ8kL0nB")
    assert res.ok and "key" not in called  # Vertex-style keys skip model listing


async def test_vertex_keys_use_vertex_endpoint_and_skip_model_listing(monkeypatch):
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen.setdefault("urls", []).append(str(request.url))
        if "gemini-2.5-flash:" in str(request.url):
            return httpx.Response(404, json={"error": "not found"})
        return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": "OK"}]}}]})

    real = httpx.AsyncClient
    monkeypatch.setattr(ai.httpx, "AsyncClient", lambda **kw: real(transport=httpx.MockTransport(handler)))
    res = await ai.verify_key("AQ.Ab8RN6Lx2kQ9vT3mPz7wY1cD4fG6hJ8kL0nB")
    assert res.ok and res.model == "gemini-2.5-flash-lite"
    assert all("aiplatform.googleapis.com" in u for u in seen["urls"])
    assert not any("/models?" in u for u in seen["urls"])
