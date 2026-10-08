"""The translator must survive one provider being rate-limited and must never return source text."""
import httpx
import pytest

from app.core import translate as tr


@pytest.fixture(autouse=True)
def _clean(monkeypatch):
    tr._cache.clear()
    tr._cooldown_until.clear()
    yield
    tr._cache.clear()
    tr._cooldown_until.clear()


def _status_error(code: int) -> httpx.HTTPStatusError:
    req = httpx.Request("GET", "https://example.test")
    return httpx.HTTPStatusError("boom", request=req, response=httpx.Response(code, request=req))


def test_falls_back_when_first_provider_is_rate_limited(monkeypatch):
    def limited(*_a, **_k):
        raise _status_error(429)

    monkeypatch.setattr(tr, "_PROVIDERS", (("a", limited), ("b", lambda t, s, g: "Hello")))
    assert tr.translate_text("হ্যালো") == "Hello"
    # the limited provider is now cooling down and is skipped next time
    assert tr._cooldown_until["a"] > 0


def test_raises_when_every_provider_fails(monkeypatch):
    def bad(*_a, **_k):
        raise RuntimeError("down")

    monkeypatch.setattr(tr, "_PROVIDERS", (("a", bad), ("b", bad)))
    with pytest.raises(RuntimeError):
        tr.translate_text("হ্যালো")


def test_keeps_line_breaks_and_caches(monkeypatch):
    calls: list[str] = []

    def fake(text, s, g):
        calls.append(text)
        return text.upper()

    monkeypatch.setattr(tr, "_PROVIDERS", (("a", fake),))
    assert tr.translate_text("one\n\ntwo", "en", "bn") == "ONE\n\nTWO"
    tr.translate_text("one", "en", "bn")
    assert calls == ["one", "two"]  # second call for "one" came from the cache


def test_same_language_and_empty_are_passthrough():
    assert tr.translate_text("   ") == ""
    assert tr.translate_text("abc", "en", "en") == "abc"
