"""Offline tests for the DB-backed email/SMTP config resolver."""
from __future__ import annotations

import os

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://x:x@localhost/x")

import pytest

from app.core import email_config


class _FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def scalars(self):
        return self

    def all(self):
        return self._rows


class _FakeSetting:
    def __init__(self, key, value):
        self.key = key
        self.value = value


class _FakeDB:
    def __init__(self, rows):
        self._rows = rows

    async def execute(self, _query):
        return _FakeResult(self._rows)


def test_is_smtp_configured():
    assert email_config.is_smtp_configured({"host": "h", "user": "u", "password": "p"})
    assert not email_config.is_smtp_configured({"host": "h", "user": "u", "password": ""})
    assert not email_config.is_smtp_configured({})


@pytest.mark.asyncio
async def test_db_settings_override_env(monkeypatch):
    monkeypatch.setattr(email_config.settings, "SMTP_HOST", "env-host", raising=False)
    monkeypatch.setattr(email_config.settings, "SMTP_USER", "env-user", raising=False)
    db = _FakeDB([
        _FakeSetting("smtp_host", "smtp.gmail.com"),
        _FakeSetting("smtp_user", "info.aboenterprise@gmail.com"),
        _FakeSetting("smtp_password", "app-pass"),
        _FakeSetting("smtp_port", "587"),
        _FakeSetting("admin_notify_email", "info.aboenterprise@gmail.com"),
    ])
    cfg = await email_config.resolve_email_config(db)
    assert cfg["host"] == "smtp.gmail.com"          # DB wins over env
    assert cfg["user"] == "info.aboenterprise@gmail.com"
    assert cfg["password"] == "app-pass"
    assert cfg["port"] == 587
    assert cfg["notify"] == "info.aboenterprise@gmail.com"
    assert email_config.is_smtp_configured(cfg)


@pytest.mark.asyncio
async def test_hidden_secret_is_ignored(monkeypatch):
    monkeypatch.setattr(email_config.settings, "SMTP_PASSWORD", "env-pass", raising=False)
    db = _FakeDB([_FakeSetting("smtp_password", "***HIDDEN***")])
    cfg = await email_config.resolve_email_config(db)
    # masked placeholder must not overwrite the real env value
    assert cfg["password"] == "env-pass"


@pytest.mark.asyncio
async def test_env_fallback_when_no_db_rows(monkeypatch):
    monkeypatch.setattr(email_config.settings, "SMTP_HOST", "env-host", raising=False)
    monkeypatch.setattr(email_config.settings, "SMTP_USER", "env-user", raising=False)
    cfg = await email_config.resolve_email_config(_FakeDB([]))
    assert cfg["host"] == "env-host"
    assert cfg["user"] == "env-user"


def test_smtp_username_alias(monkeypatch):
    """Render env may use SMTP_USERNAME instead of SMTP_USER — both must work."""
    monkeypatch.setenv("SECRET_KEY", "x")
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://x:x@localhost/x")
    monkeypatch.setenv("SMTP_USERNAME", "info.aboenterprise@gmail.com")
    monkeypatch.delenv("SMTP_USER", raising=False)
    from app.core.config import Settings

    s = Settings()  # type: ignore[call-arg]
    assert s.SMTP_USER == "info.aboenterprise@gmail.com"


@pytest.mark.asyncio
async def test_from_falls_back_to_user(monkeypatch):
    monkeypatch.setattr(email_config.settings, "SMTP_FROM", "", raising=False)
    db = _FakeDB([_FakeSetting("smtp_user", "info.aboenterprise@gmail.com")])
    cfg = await email_config.resolve_email_config(db)
    assert cfg["from_addr"] == "info.aboenterprise@gmail.com"
