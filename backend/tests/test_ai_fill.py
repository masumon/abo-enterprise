import pytest
from fastapi import HTTPException

from app.api.v1.routes import ai_catalog as ai


@pytest.mark.asyncio
async def test_fill_keeps_only_requested_keys_and_types(monkeypatch):
    async def fake_json(db, system, user, max_tokens=4096, **kw):
        assert "Fields:" in user and "Owner's input" in user
        return {"items": [{"title_bn": "দ্রুত সেবা", "title_en": "Fast service", "n": "3", "evil": "x"}, "bad"]}
    monkeypatch.setattr(ai.ai_gemini, "generate_json", fake_json)
    body = ai.FillIn(context="why choose us", input="fast", count=2,
                     fields=[ai.FillField(key="title_bn"), ai.FillField(key="title_en"), ai.FillField(key="n", type="number")])
    r = await ai.ai_fill(body, _admin="a", db=None)
    assert r.data["items"] == [{"title_bn": "দ্রুত সেবা", "title_en": "Fast service", "n": 3}]


@pytest.mark.asyncio
async def test_fill_needs_some_input():
    with pytest.raises(HTTPException):
        await ai.ai_fill(ai.FillIn(context="faq", fields=[ai.FillField(key="q_bn")]), _admin="a", db=None)
