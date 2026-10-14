"""Smart translation keeps links, numbers and rich-text marks intact."""
import asyncio

import pytest

from app.core import translate_smart as ts

SAMPLE = "# শিরোনাম\n• **দ্রুত** চার্জ {red}অফার{/red} :phone: 01825007977\n১. [দেখুন](https://aboenterprise.com/x) www.abc.com/a_b"


def test_protect_restore_round_trip():
    safe, pieces = ts.protect(SAMPLE)
    assert "https://" not in safe and "01825007977" not in safe and "{red}" not in safe
    assert ts.restore(safe, pieces) == SAMPLE


def test_restore_rejects_lost_placeholder():
    safe, pieces = ts.protect("call 01825007977 now")
    with pytest.raises(ValueError):
        ts.restore(safe.replace("⟦0⟧", ""), pieces)


def test_free_fallback_keeps_marks(monkeypatch):
    async def no_ai(db, text, s, t):
        return None
    monkeypatch.setattr(ts, "_ai_translate", no_ai)
    # Fake provider: upper-cases words, leaves placeholders alone.
    monkeypatch.setattr(ts, "translate_text", lambda text, s, t: text.replace("দেখুন", "See").replace("শিরোনাম", "Title"))
    out = asyncio.run(ts.smart_translate(object(), "# শিরোনাম\n[দেখুন](https://x.com) 01825007977", "bn", "en"))
    assert out == "# Title\n[See](https://x.com) 01825007977"


def test_ai_result_used_and_restored(monkeypatch):
    async def ai(db, text, s, t):
        return text.replace("দ্রুত চার্জ", "Fast charge")
    monkeypatch.setattr(ts, "_ai_translate", ai)
    out = asyncio.run(ts.smart_translate(object(), "• **দ্রুত চার্জ** :zap:", "bn", "en"))
    assert out == "• **Fast charge** :zap:"


def test_ai_failure_falls_back(monkeypatch):
    async def boom(db, text, s, t):
        raise RuntimeError("quota")
    monkeypatch.setattr(ts, "_ai_translate", boom)
    monkeypatch.setattr(ts, "translate_text", lambda text, s, t: "Hello")
    assert asyncio.run(ts.smart_translate(object(), "হ্যালো", "bn", "en")) == "Hello"
