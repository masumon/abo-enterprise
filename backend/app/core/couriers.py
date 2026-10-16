"""Bangladesh couriers behind one interface (Admin → কুরিয়ার).

Steadfast keeps its existing settings/code (core/steadfast.py). Pathao and RedX follow
their merchant APIs (endpoints as used by their public SDKs); every account is checked
with "পরীক্ষা করুন" before use, and every failure surfaces the courier's own message in
Bangla. Credentials live encrypted in the settings table (key ``courier.secrets``).

Mode AUTO: when an admin confirms an order, dispatch is scheduled 15 s later
(``orders.courier_dispatch_at``) so it can be undone; MANUAL: a "send" button.
"""
from __future__ import annotations

import json
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.totp_crypto import decrypt_totp_secret, encrypt_totp_secret
from app.models.models import Setting

K_CFG, K_SEC = "courier.config", "courier.secrets"
UNDO_SECONDS = 15
DEFAULT_CFG: dict[str, Any] = {"mode": "manual", "default": "steadfast", "providers": {}}

# provider → {label, fields: [(key, Bangla label, secret?)], sandbox?}
PROVIDERS: dict[str, dict[str, Any]] = {
    "steadfast": {"label": "Steadfast", "fields": [], "note": "সেটিং আগের মতোই সাইট সেটিংসে (API Key/Secret)।"},
    "pathao": {"label": "Pathao Courier", "fields": [
        ("client_id", "Client ID", False), ("client_secret", "Client Secret", True),
        ("username", "লগইন ইমেইল", False), ("password", "লগইন পাসওয়ার্ড", True), ("store_id", "Store ID", False)],
        "sandbox": True},
    "redx": {"label": "RedX", "fields": [("token", "API Access Token", True), ("pickup_store_id", "Pickup Store ID (ঐচ্ছিক)", False)],
             "sandbox": True},
}
SOON = ["Paperfly", "eCourier", "CarryBee", "Sundarban (শুধু ট্র্যাকিং)", "SA Paribahan (শুধু ট্র্যাকিং)"]


class CourierError(Exception):
    def __init__(self, message_bn: str):
        super().__init__(message_bn)
        self.message_bn = message_bn


# ── settings storage ─────────────────────────────────────────────────────────

async def _row(db: AsyncSession, key: str) -> Setting | None:
    return (await db.execute(select(Setting).where(Setting.key == key, Setting.is_deleted == False))).scalar_one_or_none()  # noqa: E712


async def get_config(db: AsyncSession) -> dict[str, Any]:
    row = await _row(db, K_CFG)
    try:
        cfg = json.loads(row.value) if row and row.value else {}
    except ValueError:
        cfg = {}
    return {**DEFAULT_CFG, **cfg, "providers": {**(cfg.get("providers") or {})}}


async def get_secrets(db: AsyncSession) -> dict[str, dict[str, str]]:
    row = await _row(db, K_SEC)
    if not row or not row.value:
        return {}
    try:
        return json.loads(decrypt_totp_secret(row.value))
    except ValueError:
        return {}


async def _put(db: AsyncSession, key: str, raw: str) -> None:
    row = await _row(db, key)
    if row:
        row.value, row.is_secret, row.is_editable = raw, True, False
    else:
        db.add(Setting(key=key, value=raw, data_type="json", is_secret=True, is_editable=False,
                       description="Couriers (managed by Admin → কুরিয়ার)"))


async def save(db: AsyncSession, cfg: dict[str, Any], secrets: dict[str, dict[str, str]]) -> None:
    await _put(db, K_CFG, json.dumps(cfg, ensure_ascii=False))
    await _put(db, K_SEC, encrypt_totp_secret(json.dumps(secrets, ensure_ascii=False)))


# ── helpers ──────────────────────────────────────────────────────────────────

def normalize_phone(raw: str | None) -> str:
    d = re.sub(r"\D", "", raw or "")
    if d.startswith("880"):
        d = d[2:]
    if len(d) == 10 and d.startswith("1"):
        d = "0" + d
    return d


def cod_amount(order) -> float:
    if (order.payment_status or "").lower() in ("paid", "completed"):
        return 0.0
    due = float(order.total or 0) - (float(order.advance_amount or 0) if getattr(order, "advance_paid", False) else 0.0)
    return max(0.0, round(due))


def _match(name_list: list[dict], text: str, key: str = "name") -> dict | None:
    """Pick the entry whose name appears in the address/district text (longest wins)."""
    t = (text or "").lower()
    best = None
    for e in name_list:
        n = str(e.get(key) or "").lower().strip()
        if n and n in t and (best is None or len(n) > len(str(best.get(key)))):
            best = e
    return best


def _err(r: httpx.Response, who: str) -> CourierError:
    try:
        j = r.json()
        msg = j.get("message") or j.get("error") or j.get("errors") or j
    except ValueError:
        msg = r.text[:200]
    if r.status_code in (401, 403):
        return CourierError(f"{who}: লগইন/Token ভুল বা মেয়াদ শেষ — Admin → কুরিয়ার-এ তথ্য ঠিক করে আবার পরীক্ষা করুন। ({msg})")
    return CourierError(f"{who} ত্রুটি ({r.status_code}): {str(msg)[:300]}")


# ── Pathao ───────────────────────────────────────────────────────────────────

_pathao_token: dict[str, tuple[str, float]] = {}


def _pathao_base(sandbox: bool) -> str:
    return "https://courier-api-sandbox.pathao.com" if sandbox else "https://api-hermes.pathao.com"


async def _pathao_auth(c: httpx.AsyncClient, s: dict, sandbox: bool) -> str:
    key = f"{s.get('client_id')}:{s.get('username')}:{sandbox}"
    hit = _pathao_token.get(key)
    if hit and hit[1] > time.time() + 60:
        return hit[0]
    r = await c.post(f"{_pathao_base(sandbox)}/aladdin/api/v1/issue-token", json={
        "client_id": s.get("client_id"), "client_secret": s.get("client_secret"),
        "username": s.get("username"), "password": s.get("password"), "grant_type": "password"})
    if r.status_code >= 400:
        raise _err(r, "Pathao")
    j = r.json()
    _pathao_token[key] = (j["access_token"], time.time() + int(j.get("expires_in", 3600)))
    return j["access_token"]


async def pathao_test(s: dict, sandbox: bool) -> str:
    async with httpx.AsyncClient(timeout=30) as c:
        tok = await _pathao_auth(c, s, sandbox)
        r = await c.get(f"{_pathao_base(sandbox)}/aladdin/api/v1/stores", headers={"Authorization": f"Bearer {tok}"})
        if r.status_code >= 400:
            raise _err(r, "Pathao")
        stores = (r.json().get("data") or {}).get("data") or []
    names = ", ".join(f"{x.get('store_name')} (ID {x.get('store_id')})" for x in stores[:5])
    return f"সংযোগ সফল — স্টোর: {names or 'কোনো স্টোর নেই (Pathao-তে একটি স্টোর খুলুন)'}"


async def pathao_create(order, s: dict, sandbox: bool, area_text: str) -> dict:
    if not s.get("store_id"):
        raise CourierError("Pathao Store ID দেওয়া নেই — Admin → কুরিয়ার-এ দিন (পরীক্ষা করলে ID দেখাবে)।")
    base = _pathao_base(sandbox)
    async with httpx.AsyncClient(timeout=40) as c:
        tok = await _pathao_auth(c, s, sandbox)
        h = {"Authorization": f"Bearer {tok}"}
        payload: dict[str, Any] = {
            "store_id": int(s["store_id"]), "merchant_order_id": order.order_number,
            "recipient_name": (order.customer_name or "N/A")[:100], "recipient_phone": normalize_phone(order.customer_phone),
            "recipient_address": (order.delivery_address or "")[:220], "delivery_type": 48, "item_type": 2,
            "item_quantity": max(1, len(getattr(order, "items", []) or [])), "item_weight": 0.5,
            "amount_to_collect": cod_amount(order), "special_instruction": (order.notes or "")[:200],
        }
        r = await c.get(f"{base}/aladdin/api/v1/city-list", headers=h)
        city = _match(((r.json().get("data") or {}).get("data") or []) if r.status_code < 400 else [], area_text, "city_name")
        if city:
            payload["recipient_city"] = city["city_id"]
            r = await c.get(f"{base}/aladdin/api/v1/cities/{city['city_id']}/zone-list", headers=h)
            zone = _match(((r.json().get("data") or {}).get("data") or []) if r.status_code < 400 else [], area_text, "zone_name")
            if zone:
                payload["recipient_zone"] = zone["zone_id"]
        r = await c.post(f"{base}/aladdin/api/v1/orders", json=payload, headers=h)
        if r.status_code >= 400:
            e = _err(r, "Pathao")
            if not city:
                e = CourierError(e.message_bn + " — ঠিকানায় জেলা/শহরের নাম ইংরেজিতে (যেমন Sylhet) থাকলে এলাকা নিজে মিলে যায়।")
            raise e
        d = r.json().get("data") or {}
    return {"tracking_code": d.get("consignment_id"), "consignment_id": d.get("consignment_id")}


# ── RedX ─────────────────────────────────────────────────────────────────────

def _redx_base(sandbox: bool) -> str:
    return "https://sandbox.redx.com.bd/v1.0.0-beta" if sandbox else "https://openapi.redx.com.bd/v1.0.0-beta"


def _redx_h(s: dict) -> dict[str, str]:
    return {"API-ACCESS-TOKEN": f"Bearer {s.get('token', '')}", "Content-Type": "application/json"}


async def redx_test(s: dict, sandbox: bool) -> str:
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.get(f"{_redx_base(sandbox)}/areas", headers=_redx_h(s))
    if r.status_code >= 400:
        raise _err(r, "RedX")
    return f"সংযোগ সফল — {len(r.json().get('areas') or [])}টি এলাকা পাওয়া গেছে"


async def redx_create(order, s: dict, sandbox: bool, area_text: str) -> dict:
    base = _redx_base(sandbox)
    async with httpx.AsyncClient(timeout=40) as c:
        r = await c.get(f"{base}/areas", headers=_redx_h(s))
        if r.status_code >= 400:
            raise _err(r, "RedX")
        area = _match(r.json().get("areas") or [], area_text, "name") or _match(r.json().get("areas") or [], area_text, "district_name")
        if not area:
            raise CourierError("RedX এলাকা মেলেনি — ঠিকানায় এলাকা/জেলার নাম ইংরেজিতে লিখুন, অথবা RedX-এ হাতে বুক করে ট্র্যাকিং নম্বর বসান।")
        payload = {
            "customer_name": (order.customer_name or "N/A")[:100], "customer_phone": normalize_phone(order.customer_phone),
            "delivery_area": area.get("name"), "delivery_area_id": area.get("id"),
            "customer_address": (order.delivery_address or "")[:220], "merchant_invoice_id": order.order_number,
            "cash_collection_amount": str(int(cod_amount(order))), "parcel_weight": 500,
            "value": str(int(float(order.total or 0))), "instruction": (order.notes or "")[:200],
        }
        if s.get("pickup_store_id"):
            payload["pickup_store_id"] = s["pickup_store_id"]
        r = await c.post(f"{base}/parcel", json=payload, headers=_redx_h(s))
        if r.status_code >= 400:
            raise _err(r, "RedX")
        tid = r.json().get("tracking_id")
    return {"tracking_code": tid, "consignment_id": tid}


# ── public API used by routes ────────────────────────────────────────────────

async def test_provider(db: AsyncSession, provider: str) -> str:
    cfg, sec = await get_config(db), await get_secrets(db)
    pc = cfg["providers"].get(provider) or {}
    if provider == "steadfast":
        from app.core.steadfast import get_settings

        st = await get_settings(db)
        if not st["api_key"] or not st["secret_key"]:
            raise CourierError("Steadfast API Key/Secret সাইট সেটিংসে দেওয়া নেই।")
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.get(f"{st['base_url']}/get_balance", headers={"Api-Key": st["api_key"], "Secret-Key": st["secret_key"]})
        if r.status_code >= 400:
            raise _err(r, "Steadfast")
        return f"সংযোগ সফল — ব্যালেন্স ৳{r.json().get('current_balance', '?')}"
    s = sec.get(provider) or {}
    missing = [lbl for k, lbl, _ in PROVIDERS[provider]["fields"] if not s.get(k) and not pc.get(k) and "ঐচ্ছিক" not in lbl]
    if missing:
        raise CourierError("এগুলো দিন: " + ", ".join(missing))
    merged = {**pc, **s}
    if provider == "pathao":
        return await pathao_test(merged, bool(pc.get("sandbox")))
    return await redx_test(merged, bool(pc.get("sandbox")))


async def create_for_order(db: AsyncSession, order, provider: str) -> dict:
    """Book the parcel with ``provider``; returns {tracking_code, consignment_id}."""
    if provider == "steadfast":
        from app.core.steadfast import SteadfastError, create_consignment

        try:
            return await create_consignment(db, order)
        except SteadfastError as exc:
            raise CourierError(str(exc)) from exc
    cfg, sec = await get_config(db), await get_secrets(db)
    pc = cfg["providers"].get(provider) or {}
    if not pc.get("enabled"):
        raise CourierError(f"{PROVIDERS.get(provider, {}).get('label', provider)} চালু নেই — Admin → কুরিয়ার-এ চালু করুন।")
    phone = normalize_phone(order.customer_phone)
    if len(phone) != 11:
        raise CourierError(f"গ্রাহকের ফোন ১১ সংখ্যার হতে হবে (পেয়েছি '{order.customer_phone}')।")
    area_text = order.delivery_address or ""
    if getattr(order, "customer_id", None):
        from app.models.models import Customer

        cust = (await db.execute(select(Customer).where(Customer.id == order.customer_id))).scalar_one_or_none()
        if cust:
            area_text = f"{getattr(cust, 'upazila', '') or ''} {getattr(cust, 'district', '') or ''} {area_text}"
    merged = {**pc, **(sec.get(provider) or {})}
    if provider == "pathao":
        return await pathao_create(order, merged, bool(pc.get("sandbox")), area_text)
    if provider == "redx":
        return await redx_create(order, merged, bool(pc.get("sandbox")), area_text)
    raise CourierError("এই কুরিয়ার এখনো যুক্ত হয়নি।")


def dispatch_due_at() -> datetime:
    return datetime.now(timezone.utc) + timedelta(seconds=UNDO_SECONDS)
