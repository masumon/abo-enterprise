"""Offline tests for the GA4 integration helpers (no network, no credentials)."""
from __future__ import annotations

import os

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://x:x@localhost/x")

import httpx
import pytest

from app.core import ga4


def _status_error(code: int, body: dict | None = None) -> httpx.HTTPStatusError:
    request = httpx.Request("POST", "https://analyticsdata.googleapis.com/v1beta/x")
    response = httpx.Response(code, json=body or {}, request=request)
    return httpx.HTTPStatusError("boom", request=request, response=response)


def test_parse_google_error_permission_denied():
    exc = _status_error(403, {"error": {"message": "User does not have sufficient permissions"}})
    result = ga4.parse_google_error(exc)
    assert result["ok"] is False
    assert result["status_code"] == 403
    assert "sufficient permissions" in result["error"]
    assert "Viewer" in result["hint"]


def test_parse_google_error_bad_property():
    exc = _status_error(400, {"error": {"message": "Invalid property"}})
    result = ga4.parse_google_error(exc)
    assert result["status_code"] == 400
    assert "GA4_PROPERTY_ID" in result["hint"]


def test_parse_google_error_network_failure():
    result = ga4.parse_google_error(RuntimeError("dns down"))
    assert result["ok"] is False
    assert result["status_code"] is None
    assert "dns down" in result["error"]


@pytest.mark.asyncio
async def test_check_connection_reports_unconfigured(monkeypatch):
    monkeypatch.setattr(ga4.settings, "GA4_PROPERTY_ID", "", raising=False)
    monkeypatch.setattr(ga4.settings, "GA4_CLIENT_EMAIL", "", raising=False)
    monkeypatch.setattr(ga4.settings, "GA4_PRIVATE_KEY", "", raising=False)
    result = await ga4.check_connection()
    assert result["ok"] is False
    assert result["configured"] is False
    assert "GA4_PROPERTY_ID" in result["hint"]


def _set_creds(monkeypatch, pid="987654321", email="svc@proj.iam.gserviceaccount.com",
               key="-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----"):
    monkeypatch.setattr(ga4.settings, "GA4_PROPERTY_ID", pid, raising=False)
    monkeypatch.setattr(ga4.settings, "GA4_CLIENT_EMAIL", email, raising=False)
    monkeypatch.setattr(ga4.settings, "GA4_PRIVATE_KEY", key, raising=False)


def test_format_check_catches_measurement_id(monkeypatch):
    _set_creds(monkeypatch, pid="G-AB12CD34")
    problem = ga4.validate_config_format()
    assert problem and "Measurement ID" in problem["error"]
    assert "NUMERIC" in problem["hint"]


def test_format_check_catches_full_json_key(monkeypatch):
    _set_creds(monkeypatch, key='{"type": "service_account", "private_key": "..."}')
    problem = ga4.validate_config_format()
    assert problem and "JSON" in problem["error"]


def test_format_check_catches_wrong_email(monkeypatch):
    _set_creds(monkeypatch, email="me@gmail.com")
    problem = ga4.validate_config_format()
    assert problem and "service-account" in problem["error"]


def test_format_check_accepts_valid_config(monkeypatch):
    _set_creds(monkeypatch)
    assert ga4.validate_config_format() is None


def test_no_exits_metric_requested():
    """GA4's Data API has no 'exits' metric; requesting it 400s the whole
    batch and used to blank Landing Pages as collateral damage."""
    import inspect

    source = inspect.getsource(ga4.fetch_visitor_analytics)
    assert '["exits"]' not in source


def test_realtime_uses_only_supported_dimensions():
    """The GA4 Realtime API supports only a small dimension set. pagePath,
    browser and sessionSource are NOT in it — requesting them silently
    blanked the live panels (the regression that killed live data)."""
    import inspect

    source = inspect.getsource(ga4.fetch_live_analytics)
    for unsupported in ("pagePath", "browser", "sessionSource"):
        pattern = f'{{"name": "{unsupported}"}}'
        assert pattern not in source, f"realtime request uses unsupported dimension {unsupported}"
    assert '{"name": "unifiedScreenName"}' in source
