"""Safe Steadfast credential/connectivity diagnostics.

This endpoint never creates a consignment. Outbound diagnostics are sanitized:
credential values are never logged or returned.
"""
from __future__ import annotations

import hashlib
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


def _credential_metadata(api_key: str, secret_key: str) -> dict:
    return {
        "api_key_present": bool(api_key),
        "api_key_length": len(api_key),
        "api_key_sha256_16": hashlib.sha256(api_key.encode()).hexdigest()[:16] if api_key else None,
        "secret_key_present": bool(secret_key),
        "secret_key_length": len(secret_key),
        "secret_key_sha256_16": hashlib.sha256(secret_key.encode()).hexdigest()[:16] if secret_key else None,
    }


def _response_metadata(response: httpx.Response, data: object) -> dict:
    metadata = {
        "http_status": response.status_code,
        "content_type": response.headers.get("content-type"),
        "body_length": len(response.content),
    }
    if isinstance(data, dict):
        metadata["response_keys"] = sorted(str(k) for k in data.keys())[:50]
        provider_message = _provider_message(data)
        if provider_message:
            metadata["provider_message"] = provider_message
    else:
        metadata["body_sha256_16"] = hashlib.sha256(response.content).hexdigest()[:16]
    return metadata


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
    logger.info(
        "STEADFAST_OUTBOUND_REQUEST method=GET url=%s headers_present=%s credentials=%s",
        url,
        {"Api-Key": True, "Secret-Key": True, "Content-Type": True},
        _credential_metadata(cfg["api_key"], cfg["secret_key"]),
    )
    started = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(url, headers=headers)
    except httpx.HTTPError as exc:
        logger.warning(
            "STEADFAST_OUTBOUND_NETWORK_ERROR method=GET url=%s error=%s",
            url,
            type(exc).__name__,
        )
        return _result(ok=False, code="NETWORK_ERROR", http_status=None, message="Steadfast server could not be reached.", balance=None, elapsed_ms=round((time.perf_counter() - started) * 1000))

    elapsed_ms = round((time.perf_counter() - started) * 1000)
    try:
        data = response.json()
    except ValueError:
        data = None

    diagnostics = _response_metadata(response, data)
    logger.info(
        "STEADFAST_PROVIDER_RESPONSE endpoint=get_balance diagnostics=%s",
        diagnostics,
    )

    provider_message = _provider_message(data)
    if response.status_code in (401, 403):
        return _result(ok=False, code="AUTH_FAILED", http_status=response.status_code, message="Steadfast rejected the API credentials.", balance=None, elapsed_ms=elapsed_ms, provider_message=provider_message)

    if response.status_code == 200:
        raw_balance = (data or {}).get("current_balance") if isinstance(data, dict) else None
        try:
            balance = float(raw_balance) if raw_balance is not None else None
        except (TypeError, ValueError):
            balance = None
        return _result(ok=True, code="CONNECTED", http_status=response.status_code, message="Steadfast authentication and API connection are working.", balance=balance, elapsed_ms=elapsed_ms, provider_message=provider_message)

    return _result(ok=False, code="API_ERROR", http_status=response.status_code, message="Steadfast returned an unexpected response.", balance=None, elapsed_ms=elapsed_ms, provider_message=provider_message)
