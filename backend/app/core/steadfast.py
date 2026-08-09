"""Steadfast Courier (portal.packzy.com) integration.

All credentials and toggles live in the ``settings`` table so the admin can
change them from the panel without a redeploy — nothing here is hard-coded.
Secret keys are stored via the settings API, which masks them in responses
(``is_secret``); this module reads their raw values straight from the DB.

Steadfast API reference (V1):
    Base URL : https://portal.packzy.com/api/v1
    Auth     : headers  Api-Key, Secret-Key, Content-Type: application/json
    Create   : POST /create_order
    Status   : GET  /status_by_cid/{id} | /status_by_invoice/{invoice}
                    | /status_by_trackingcode/{code}
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

# Setting keys used by this integration (all admin-editable).
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


def _normalize_phone(raw: str | None) -> str:
    """Steadfast requires an 11-digit BD number. Strip separators and the
    +880 / 880 country prefix where present."""
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
    """Smart COD: already-paid orders collect nothing; otherwise collect the
    full order total (delivery included, since ``total`` already contains it)."""
    if (order.payment_status or "").lower() in ("paid", "completed"):
        return 0.0
    return float(order.total or 0)


async def create_consignment(db: AsyncSession, order) -> dict:
    """Create a Steadfast consignment for an order. Returns
    ``{consignment_id, tracking_code, status}`` or raises SteadfastError."""
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
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
    except httpx.HTTPError as exc:
        logger.warning("Steadfast request failed: %s", exc)
        raise SteadfastError("Steadfast সার্ভারে পৌঁছানো যায়নি। ইন্টারনেট/URL যাচাই করুন।")

    try:
        data = resp.json()
    except ValueError:
        data = {}

    if resp.status_code in (401, 403):
        raise SteadfastError("Steadfast API Key/Secret ভুল। Settings-এ নতুন করে দিন।")
    consignment = (data or {}).get("consignment") or {}
    tracking = consignment.get("tracking_code")
    if resp.status_code not in (200, 201) or not tracking:
        msg = (data or {}).get("message") or f"HTTP {resp.status_code}"
        raise SteadfastError(f"Steadfast consignment তৈরি হয়নি: {msg}")

    cid = consignment.get("consignment_id")
    return {
        "consignment_id": str(cid) if cid is not None else None,
        "tracking_code": tracking,
        "status": consignment.get("status"),
    }


async def check_balance(db: AsyncSession) -> float:
    """Return the current Steadfast account balance (BDT)."""
    cfg = await get_settings(db)
    if not cfg["api_key"] or not cfg["secret_key"]:
        raise SteadfastError("Steadfast API Key / Secret Key সেট করা নেই।")
    headers = {
        "Api-Key": cfg["api_key"],
        "Secret-Key": cfg["secret_key"],
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(f"{cfg['base_url']}/get_balance", headers=headers)
        data = resp.json()
    except (httpx.HTTPError, ValueError):
        raise SteadfastError("ব্যালেন্স আনা যায়নি।")
    if resp.status_code in (401, 403):
        raise SteadfastError("Steadfast API Key/Secret ভুল।")
    return float((data or {}).get("current_balance") or 0)
