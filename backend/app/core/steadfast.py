"""Steadfast Courier (portal.packzy.com) integration.

Credentials are loaded from the database settings table. Diagnostic logging is
strictly sanitized: credential values are never written to logs.
"""
from __future__ import annotations

import hashlib
import json
import logging
import re

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Setting

logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = "https://portal.packzy.com/api/v1"
CONFIG_KEYS = [
    "steadfast_enabled",
    "steadfast_auto_send",
    "steadfast_api_key",
    "steadfast_secret_key",
    "steadfast_base_url",
    "steadfast_delivery_type",
]


class SteadfastError(Exception):
    """Raised for any config or API failure; message is admin-friendly."""


def _truthy(value: str | None) -> bool:
    return str(value or "").strip().lower() in ("1", "true", "yes", "on")


def _fingerprint(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]


def _credential_metadata(api_key: str, secret_key: str) -> dict:
    return {
        "api_key_present": bool(api_key),
        "api_key_length": len(api_key),
        "api_key_sha256_16": _fingerprint(api_key) if api_key else None,
        "secret_key_present": bool(secret_key),
        "secret_key_length": len(secret_key),
        "secret_key_sha256_16": _fingerprint(secret_key) if secret_key else None,
    }


def _safe_response_metadata(response: httpx.Response, data: object) -> dict:
    """Return provider diagnostics without logging credentials or full bodies."""
    metadata: dict = {
        "http_status": response.status_code,
        "content_type": response.headers.get("content-type"),
        "body_length": len(response.content),
    }
    if isinstance(data, dict):
        metadata["response_keys"] = sorted(str(k) for k in data.keys())[:50]
        for key in ("message", "error", "detail"):
            value = data.get(key)
            if isinstance(value, str) and value.strip():
                metadata["provider_message"] = value.strip()[:300]
                break
    else:
        metadata["response_sha256_16"] = hashlib.sha256(response.content).hexdigest()[:16]
    return metadata


def _normalize_phone(raw: str | None) -> str:
    """Steadfast requires an 11-digit BD number."""
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 13 and digits.startswith("880"):
        digits = digits[2:]
    elif len(digits) == 14 and digits.startswith("8800"):
        digits = digits[3:]
    return digits


async def get_settings(db: AsyncSession) -> dict:
    rows = (
        await db.execute(select(Setting).where(Setting.key.in_(CONFIG_KEYS)))
    ).scalars().all()
    cfg = {r.key: r.value for r in rows}
    return {
        "enabled": _truthy(cfg.get("steadfast_enabled")),
        "auto_send": _truthy(cfg.get("steadfast_auto_send")),
        "api_key": (cfg.get("steadfast_api_key") or "").strip(),
        "secret_key": (cfg.get("steadfast_secret_key") or "").strip(),
        "base_url": (cfg.get("steadfast_base_url") or DEFAULT_BASE_URL).strip().rstrip("/"),
        "delivery_type": (cfg.get("steadfast_delivery_type") or "0").strip(),
    }


def compute_cod_amount(order) -> float:
    if (order.payment_status or "").lower() in ("paid", "completed"):
        return 0.0
    return float(order.total or 0)


async def create_consignment(db: AsyncSession, order) -> dict:
    cfg = await get_settings(db)
    if not cfg["enabled"]:
        raise SteadfastError("Steadfast ইন্টিগ্রেশন বন্ধ আছে। Settings থেকে চালু করুন।")
    if not cfg["api_key"] or not cfg["secret_key"]:
        raise SteadfastError("Steadfast API Key / Secret Key সেট করা নেই। Settings-এ যোগ করুন।")

    phone = _normalize_phone(order.customer_phone)
    if len(phone) != 11:
        raise SteadfastError(
            f"গ্রাহকের ফোন ১১ সংখ্যার হতে হবে (পেয়েছি: '{order.customer_phone}')।"
        )
    address = (order.delivery_address or "").strip()
    if not address:
        raise SteadfastError("অর্ডারে ডেলিভারি ঠিকানা নেই — Steadfast-এ পাঠানো যাবে না।")

    payload = {
        "invoice": order.order_number,
        "recipient_name": (order.customer_name or "N/A")[:100],
        "recipient_phone": phone,
        "recipient_address": address[:250],
        "cod_amount": compute_cod_amount(order),
    }
    note = (order.notes or "").strip()
    if note:
        payload["note"] = note[:250]
    try:
        payload["delivery_type"] = int(cfg["delivery_type"])
    except (TypeError, ValueError):
        pass

    headers = {
        "Api-Key": cfg["api_key"],
        "Secret-Key": cfg["secret_key"],
        "Content-Type": "application/json",
    }
    url = f"{cfg['base_url']}/create_order"
    logger.info(
        "STEADFAST_OUTBOUND_REQUEST method=POST url=%s headers_present=%s credentials=%s payload=%s",
        url,
        {"Api-Key": True, "Secret-Key": True, "Content-Type": True},
        _credential_metadata(cfg["api_key"], cfg["secret_key"]),
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
    )
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
    except httpx.HTTPError as exc:
        logger.warning("STEADFAST_OUTBOUND_NETWORK_ERROR url=%s error=%s", url, type(exc).__name__)
        raise SteadfastError("Steadfast সার্ভারে পৌঁছানো যায়নি। ইন্টারনেট/URL যাচাই করুন।") from exc

    try:
        data = resp.json()
    except ValueError:
        data = None
    logger.info(
        "STEADFAST_PROVIDER_RESPONSE endpoint=create_order diagnostics=%s",
        _safe_response_metadata(resp, data),
    )

    if resp.status_code in (401, 403):
        raise SteadfastError(f"Steadfast authentication rejected (HTTP {resp.status_code}).")
    consignment = (data or {}).get("consignment") if isinstance(data, dict) else None
    consignment = consignment or {}
    tracking = consignment.get("tracking_code")
    if resp.status_code not in (200, 201) or not tracking:
        msg = (data or {}).get("message") if isinstance(data, dict) else None
        msg = msg or ((data or {}).get("error") if isinstance(data, dict) else None)
        if not msg:
            msg = f"HTTP {resp.status_code}"
        raise SteadfastError(f"Steadfast consignment তৈরি হয়নি (HTTP {resp.status_code}): {str(msg)[:300]}")

    cid = consignment.get("consignment_id")
    return {
        "consignment_id": str(cid) if cid is not None else None,
        "tracking_code": tracking,
        "status": consignment.get("status"),
    }


async def check_balance(db: AsyncSession) -> float:
    cfg = await get_settings(db)
    if not cfg["api_key"] or not cfg["secret_key"]:
        raise SteadfastError("Steadfast API Key / Secret Key সেট করা নেই।")
    headers = {
        "Api-Key": cfg["api_key"],
        "Secret-Key": cfg["secret_key"],
        "Content-Type": "application/json",
    }
    url = f"{cfg['base_url']}/get_balance"
    logger.info(
        "STEADFAST_OUTBOUND_REQUEST method=GET url=%s headers_present=%s credentials=%s",
        url,
        {"Api-Key": True, "Secret-Key": True, "Content-Type": True},
        _credential_metadata(cfg["api_key"], cfg["secret_key"]),
    )
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(url, headers=headers)
        try:
            data = resp.json()
        except ValueError:
            data = None
    except httpx.HTTPError as exc:
        logger.warning("STEADFAST_OUTBOUND_NETWORK_ERROR url=%s error=%s", url, type(exc).__name__)
        raise SteadfastError("ব্যালেন্স আনা যায়নি।") from exc

    logger.info(
        "STEADFAST_PROVIDER_RESPONSE endpoint=get_balance diagnostics=%s",
        _safe_response_metadata(resp, data),
    )
    if resp.status_code in (401, 403):
        raise SteadfastError(f"Steadfast authentication rejected (HTTP {resp.status_code}).")
    return float((data or {}).get("current_balance") or 0) if isinstance(data, dict) else 0.0
