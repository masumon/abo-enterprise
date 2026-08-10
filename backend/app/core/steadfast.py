"""Steadfast Courier integration.

Credentials are stored in the admin settings table and are never exposed to
clients. This module owns the provider HTTP contract: create, status lookup and
balance checks. It never fabricates a shipment or tracking code.
"""
from __future__ import annotations

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
    """Raised for any provider/configuration failure."""


def _truthy(value: str | None) -> bool:
    return str(value or "").strip().lower() in ("1", "true", "yes", "on")


def _normalize_phone(raw: str | None) -> str:
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 13 and digits.startswith("880"):
        digits = digits[2:]
    elif len(digits) == 14 and digits.startswith("8800"):
        digits = digits[3:]
    return digits


async def get_settings(db: AsyncSession) -> dict:
    rows = (await db.execute(select(Setting).where(Setting.key.in_(CONFIG_KEYS)))).scalars().all()
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
    """Return the amount Steadfast should collect from the recipient."""
    if (order.payment_status or "").lower() in ("paid", "completed"):
        return 0.0
    return float(order.total or 0)


def _headers(cfg: dict) -> dict[str, str]:
    return {
        "Api-Key": cfg["api_key"],
        "Secret-Key": cfg["secret_key"],
        "Content-Type": "application/json",
    }


async def _request_json(
    cfg: dict,
    method: str,
    path: str,
    *,
    json: dict | None = None,
    timeout: float = 20.0,
) -> tuple[httpx.Response, dict]:
    url = f"{cfg['base_url']}/{path.lstrip('/')}"
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.request(method, url, json=json, headers=_headers(cfg))
    except httpx.HTTPError as exc:
        logger.warning("Steadfast %s request failed: %s", path, exc)
        raise SteadfastError("Steadfast সার্ভারে পৌঁছানো যায়নি। ইন্টারনেট/URL যাচাই করুন।") from exc

    try:
        data = response.json()
    except ValueError:
        data = {}
    if not isinstance(data, dict):
        data = {}
    return response, data


def _provider_error(response: httpx.Response, data: dict, fallback: str) -> str:
    if response.status_code in (401, 403):
        return "Steadfast API Key/Secret ভুল। Settings-এ নতুন করে দিন।"
    message = data.get("message") or data.get("error") or data.get("detail")
    if isinstance(message, str) and message.strip():
        return message.strip()[:500]
    return fallback


async def lookup_status(
    db: AsyncSession,
    *,
    tracking_code: str | None = None,
    consignment_id: str | None = None,
    invoice: str | None = None,
) -> dict:
    """Fetch a real provider status by one of Steadfast's supported identifiers."""
    cfg = await get_settings(db)
    if not cfg["api_key"] or not cfg["secret_key"]:
        raise SteadfastError("Steadfast API Key / Secret Key সেট করা নেই।")

    if tracking_code:
        path = f"status_by_trackingcode/{tracking_code.strip()}"
    elif consignment_id:
        path = f"status_by_cid/{consignment_id.strip()}"
    elif invoice:
        path = f"status_by_invoice/{invoice.strip()}"
    else:
        raise SteadfastError("Steadfast tracking-এর জন্য একটি বৈধ identifier প্রয়োজন।")

    response, data = await _request_json(cfg, "GET", path)
    if response.status_code == 404:
        raise SteadfastError("Steadfast-এ shipment পাওয়া যায়নি।")
    if response.status_code in (401, 403):
        raise SteadfastError(_provider_error(response, data, "Steadfast authentication failed."))
    if response.status_code != 200:
        raise SteadfastError(_provider_error(response, data, f"Steadfast status lookup failed (HTTP {response.status_code})."))

    delivery_status = data.get("delivery_status")
    if not isinstance(delivery_status, str) or not delivery_status.strip():
        raise SteadfastError("Steadfast status response malformed: delivery_status missing.")

    return {
        "delivery_status": delivery_status.strip().lower(),
        "tracking_code": data.get("tracking_code"),
        "consignment_id": data.get("consignment_id"),
        "invoice": data.get("invoice"),
        "raw": data,
    }


async def create_consignment(db: AsyncSession, order) -> dict:
    """Create a real Steadfast consignment and return provider identifiers."""
    cfg = await get_settings(db)
    if not cfg["enabled"]:
        raise SteadfastError("Steadfast ইন্টিগ্রেশন বন্ধ আছে। Settings থেকে চালু করুন।")
    if not cfg["api_key"] or not cfg["secret_key"]:
        raise SteadfastError("Steadfast API Key / Secret Key সেট করা নেই। Settings-এ যোগ করুন।")

    phone = _normalize_phone(order.customer_phone)
    if len(phone) != 11:
        raise SteadfastError(f"গ্রাহকের ফোন ১১ সংখ্যার হতে হবে (পেয়েছি: '{order.customer_phone}')।")
    address = (order.delivery_address or "").strip()
    if not address:
        raise SteadfastError("অর্ডারে ডেলিভারি ঠিকানা নেই — Steadfast-এ পাঠানো যাবে না।")

    # Recovery/idempotency guard: if a previous request timed out after the
    # provider accepted it, never blindly create a second consignment for the
    # same unique invoice. If the provider can identify the existing shipment,
    # return its identifiers; otherwise fail safely and require reconciliation.
    try:
        existing = await lookup_status(db, invoice=order.order_number)
        existing_tracking = existing.get("tracking_code")
        existing_cid = existing.get("consignment_id")
        if existing_tracking:
            return {
                "consignment_id": str(existing_cid) if existing_cid is not None else None,
                "tracking_code": str(existing_tracking),
                "status": existing.get("delivery_status"),
                "recovered": True,
            }
        raise SteadfastError(
            "এই invoice-এর shipment Steadfast-এ আগে থেকেই আছে, কিন্তু tracking code পাওয়া যায়নি। "
            "Duplicate shipment তৈরি না করে আগে Steadfast portal-এ যাচাই করুন।"
        )
    except SteadfastError as exc:
        # A normal 404 means the invoice does not exist and creation is safe.
        if "shipment পাওয়া যায়নি" not in str(exc):
            raise

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
        payload["delivery_type"] = 0

    response, data = await _request_json(cfg, "POST", "create_order", json=payload, timeout=30.0)
    consignment = data.get("consignment") if isinstance(data.get("consignment"), dict) else {}
    tracking = consignment.get("tracking_code")
    if response.status_code not in (200, 201) or not tracking:
        raise SteadfastError(
            f"Steadfast consignment তৈরি হয়নি (HTTP {response.status_code}): "
            f"{_provider_error(response, data, 'Provider response malformed or unsuccessful.')}"
        )

    cid = consignment.get("consignment_id")
    return {
        "consignment_id": str(cid) if cid is not None else None,
        "tracking_code": str(tracking),
        "status": consignment.get("status"),
        "recovered": False,
    }


async def check_balance(db: AsyncSession) -> float:
    """Return the current Steadfast account balance (BDT)."""
    cfg = await get_settings(db)
    if not cfg["api_key"] or not cfg["secret_key"]:
        raise SteadfastError("Steadfast API Key / Secret Key সেট করা নেই।")
    response, data = await _request_json(cfg, "GET", "get_balance")
    if response.status_code != 200:
        raise SteadfastError(_provider_error(response, data, f"Steadfast balance lookup failed (HTTP {response.status_code})."))
    raw_balance = data.get("current_balance")
    try:
        return float(raw_balance)
    except (TypeError, ValueError) as exc:
        raise SteadfastError("Steadfast balance response malformed: current_balance missing.") from exc
