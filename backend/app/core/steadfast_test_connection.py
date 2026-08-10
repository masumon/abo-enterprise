"""Safe Steadfast credential/connectivity check.

This module never creates a consignment. It only calls the authenticated
balance endpoint and returns sanitized diagnostics.
"""
from __future__ import annotations

import logging
import time

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.steadfast import get_settings

logger = logging.getLogger(__name__)


def _provider_message(data: object) -> str | None:
    if not isinstance(data, dict):
        return None
    for key in ("message", "error", "detail"):
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()[:300]
    return None


def _result(*, ok: bool, code: str, http_status: int | None, message: str, balance: float | None, elapsed_ms: int, provider_message: str | None = None) -> dict:
    return {
        "ok": ok,
        "code": code,
        "http_status": http_status,
        "message": message,
        "provider_message": provider_message,
        "balance": balance,
        "elapsed_ms": elapsed_ms,
    }


async def test_connection(db: AsyncSession) -> dict:
    """Check credentials without creating a shipment or changing an order."""
    cfg = await get_settings(db)
    if not cfg["enabled"]:
        return _result(ok=False, code="DISABLED", http_status=None, message="Steadfast integration is disabled in Settings.", balance=None, elapsed_ms=0)
    if not cfg["api_key"] or not cfg["secret_key"]:
        return _result(ok=False, code="MISSING_CREDENTIALS", http_status=None, message="Steadfast API Key / Secret Key is not configured.", balance=None, elapsed_ms=0)

    url = f"{cfg['base_url']}/get_balance"
    headers = {
        "Api-Key": cfg["api_key"],
        "Secret-Key": cfg["secret_key"],
        "Content-Type": "application/json",
    }
    started = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(url, headers=headers)
    except httpx.HTTPError as exc:
        logger.warning("Steadfast connection test failed: %s", exc)
        return _result(ok=False, code="NETWORK_ERROR", http_status=None, message="Steadfast server could not be reached.", balance=None, elapsed_ms=round((time.perf_counter() - started) * 1000))

    elapsed_ms = round((time.perf_counter() - started) * 1000)
    try:
        data = response.json()
    except ValueError:
        data = {}
    provider_message = _provider_message(data)

    if response.status_code in (401, 403):
        return _result(ok=False, code="AUTH_FAILED", http_status=response.status_code, message="Steadfast rejected the API credentials.", balance=None, elapsed_ms=elapsed_ms, provider_message=provider_message)

    if response.status_code == 200:
        raw_balance = (data or {}).get("current_balance") if isinstance(data, dict) else None
        try:
            balance = float(raw_balance)
        except (TypeError, ValueError):
            return _result(
                ok=False,
                code="MALFORMED_RESPONSE",
                http_status=response.status_code,
                message="Steadfast returned HTTP 200 but the balance response was malformed.",
                balance=None,
                elapsed_ms=elapsed_ms,
                provider_message=provider_message,
            )
        return _result(ok=True, code="CONNECTED", http_status=response.status_code, message="Steadfast authentication and API connection are working.", balance=balance, elapsed_ms=elapsed_ms, provider_message=provider_message)

    return _result(ok=False, code="API_ERROR", http_status=response.status_code, message="Steadfast returned an unexpected response.", balance=None, elapsed_ms=elapsed_ms, provider_message=provider_message)
