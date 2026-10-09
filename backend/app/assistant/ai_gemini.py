"""Optional Google Gemini layer for the assistant.

Off unless an admin saves a working API key in Admin → AI Assistant → Google AI.
It is only used when the curated knowledge base has no answer, and it may answer
ONLY from that knowledge base (plus the live contact facts) — never prices or
policies it was not given. Any failure (no key, quota, network, timeout) returns
None and the assistant falls back to its normal reply, so chat never breaks.

The key is stored Fernet-encrypted in the settings table (`is_secret` row, never
returned by any API) and decrypted only in memory.
"""
from __future__ import annotations

import logging
import re
import time
from datetime import date
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.totp_crypto import decrypt_totp_secret, encrypt_totp_secret
from app.models.models import Setting

logger = logging.getLogger(__name__)

API_BASE = "https://generativelanguage.googleapis.com/v1beta"
VERTEX_BASE = "https://aiplatform.googleapis.com/v1"
KEY_SETTING = "ai_gemini_key_enc"
MODEL_SETTING = "ai_gemini_model"
ENABLED_SETTING = "ai_gemini_enabled"
CAP_SETTING = "ai_gemini_daily_cap"
HINT_SETTING = "ai_gemini_key_hint"
VERIFIED_SETTING = "ai_gemini_verified_at"
ALL_SETTINGS = [KEY_SETTING, MODEL_SETTING, ENABLED_SETTING, CAP_SETTING, HINT_SETTING, VERIFIED_SETTING]
DEFAULT_DAILY_CAP = 300
# Newest free-tier "flash" models first; whatever the key can actually use is picked at verify time.
PREFERRED_MODELS = ("gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash")

_cache: dict[str, Any] = {"at": 0.0, "cfg": None}
_usage: dict[str, Any] = {"day": None, "count": 0}


class VerifyResult:
    def __init__(self, ok: bool, model: str = "", message_bn: str = "", message_en: str = "") -> None:
        self.ok, self.model, self.message_bn, self.message_en = ok, model, message_bn, message_en


def key_hint(key: str) -> str:
    key = key.strip()
    return f"{key[:4]}…{key[-4:]}" if len(key) > 10 else "…"


def _error_text(status: int, body: str) -> tuple[str, str]:
    b = body.lower()
    if status in (400, 401) and ("api key" in b or "api_key" in b or "invalid" in b):
        return "API কী সঠিক নয় — কী-টা আবার কপি করে বসান।", "The API key is not valid — copy it again."
    if status == 403:
        return "এই কী দিয়ে Gemini API ব্যবহারের অনুমতি নেই — Google AI Studio থেকে নতুন কী বানান।", "This key is not allowed to use the Gemini API — create a new key in Google AI Studio."
    if status == 429:
        return "Google-এর ফ্রি সীমা এই মুহূর্তে শেষ — কিছুক্ষণ পরে আবার যাচাই করুন।", "Google's free quota is used up right now — verify again later."
    return f"Google থেকে ত্রুটি এসেছে ({status}) — একটু পরে আবার চেষ্টা করুন।", f"Google returned an error ({status}) — please try again later."


async def _pick_model(client: httpx.AsyncClient, key: str) -> str:
    r = await client.get(f"{API_BASE}/models", params={"pageSize": 200}, headers={"x-goog-api-key": key})
    if r.status_code != 200:
        raise httpx.HTTPStatusError("models", request=r.request, response=r)
    names = [
        m.get("name", "").split("/")[-1]
        for m in r.json().get("models", [])
        if "generateContent" in (m.get("supportedGenerationMethods") or [])
    ]
    for wanted in PREFERRED_MODELS:
        if wanted in names:
            return wanted
    flash = [n for n in names if "flash" in n and "exp" not in n and "preview" not in n]
    return flash[0] if flash else (names[0] if names else PREFERRED_MODELS[0])


def _is_vertex_key(key: str) -> bool:
    """Newer Google keys ("AQ.…") are Vertex AI express-mode keys; they use a different endpoint."""
    return key.startswith("AQ.")


async def _generate(client: httpx.AsyncClient, key: str, model: str, system: str, user: str, max_tokens: int = 400) -> str:
    if _is_vertex_key(key):
        url, params, headers = f"{VERTEX_BASE}/publishers/google/models/{model}:generateContent", {"key": key}, {"Content-Type": "application/json"}
    else:
        url, params, headers = f"{API_BASE}/models/{model}:generateContent", None, {"x-goog-api-key": key, "Content-Type": "application/json"}
    r = await client.post(
        url,
        params=params,
        headers=headers,
        json={
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": {"temperature": 0.3, "maxOutputTokens": max_tokens},
        },
    )
    if r.status_code != 200:
        raise httpx.HTTPStatusError("generate", request=r.request, response=r)
    data = r.json()
    parts = ((data.get("candidates") or [{}])[0].get("content") or {}).get("parts") or []
    return "".join(p.get("text", "") for p in parts).strip()


async def verify_key(key: str) -> VerifyResult:
    key = (key or "").strip()
    # Google issues both classic "AIza…" keys and newer "AQ.Ab…" keys (with dots) — accept both;
    # the real check is the call to Google below.
    if not re.fullmatch(r"[A-Za-z0-9_.\-]{20,200}", key):
        return VerifyResult(False, message_bn="কী-এর গঠন ঠিক নেই — Google AI Studio থেকে পুরো কী কপি করুন।", message_en="That doesn't look like an API key — copy the whole key from Google AI Studio.")
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(15.0)) as client:
            # Vertex keys can't list models; for classic keys try the listed best model first.
            first = None if _is_vertex_key(key) else await _pick_model(client, key)
            candidates = [m for m in dict.fromkeys([first, *PREFERRED_MODELS]) if m]
            model, text = "", ""
            for cand in candidates:
                try:
                    text = await _generate(client, key, cand, "Reply with the single word OK.", "Say OK", max_tokens=10)
                    model = cand
                    break
                except httpx.HTTPStatusError as exc:
                    if exc.response.status_code != 404:  # model not available → try the next one
                        raise
            if not model:
                return VerifyResult(False, message_bn="এই কী দিয়ে কোনো Gemini মডেল পাওয়া যায়নি — Google AI Studio-র \"AIza…\" দিয়ে শুরু কী দিন।", message_en="No Gemini model is available for this key — use an \"AIza…\" key from Google AI Studio.")
        if not text:
            return VerifyResult(False, model, "Google উত্তর দেয়নি — একটু পরে আবার যাচাই করুন।", "Google gave no answer — try again shortly.")
        return VerifyResult(True, model, "সফল! Google AI কাজ করছে।", "Success! Google AI is working.")
    except httpx.HTTPStatusError as exc:
        bn, en = _error_text(exc.response.status_code, exc.response.text)
        return VerifyResult(False, message_bn=bn, message_en=en)
    except Exception as exc:  # noqa: BLE001 — network problems, timeouts
        logger.warning("Gemini verify failed: %s", exc)
        return VerifyResult(False, message_bn="Google-এ সংযোগ হয়নি — ইন্টারনেট/সার্ভার ঠিক আছে কিনা দেখে আবার চেষ্টা করুন।", message_en="Could not reach Google — try again.")


async def _settings(db: AsyncSession) -> dict[str, str]:
    rows = await db.execute(select(Setting).where(Setting.key.in_(ALL_SETTINGS), Setting.is_deleted == False))  # noqa: E712
    return {s.key: s.value for s in rows.scalars().all()}


async def save_key(db: AsyncSession, key: str, model: str) -> None:
    from datetime import datetime, timezone

    values = {
        KEY_SETTING: (encrypt_totp_secret(key.strip()), True),
        MODEL_SETTING: (model, False),
        HINT_SETTING: (key_hint(key), False),
        ENABLED_SETTING: ("true", False),
        VERIFIED_SETTING: (datetime.now(timezone.utc).isoformat(timespec="seconds"), False),
    }
    await _write(db, values)
    invalidate()


async def _write(db: AsyncSession, values: dict[str, tuple[str, bool]]) -> None:
    rows = await db.execute(select(Setting).where(Setting.key.in_(list(values)), Setting.is_deleted == False))  # noqa: E712
    existing = {s.key: s for s in rows.scalars().all()}
    for k, (v, secret) in values.items():
        if k in existing:
            existing[k].value = v
            existing[k].is_secret = secret
        else:
            db.add(Setting(key=k, value=v, data_type="string", is_secret=secret, is_editable=False,
                           description="Assistant Google AI (managed by Admin → AI Assistant)"))


async def update_options(db: AsyncSession, enabled: bool | None, daily_cap: int | None) -> None:
    values: dict[str, tuple[str, bool]] = {}
    if enabled is not None:
        values[ENABLED_SETTING] = ("true" if enabled else "false", False)
    if daily_cap is not None:
        values[CAP_SETTING] = (str(max(0, min(daily_cap, 5000))), False)
    if values:
        await _write(db, values)
    invalidate()


async def remove_key(db: AsyncSession) -> None:
    await _write(db, {KEY_SETTING: ("", True), HINT_SETTING: ("", False), ENABLED_SETTING: ("false", False), VERIFIED_SETTING: ("", False)})
    invalidate()


def invalidate() -> None:
    _cache["at"] = 0.0
    _cache["cfg"] = None


async def load_config(db: AsyncSession) -> dict[str, Any]:
    if _cache["cfg"] is not None and time.monotonic() - _cache["at"] < 60:
        return _cache["cfg"]
    s = await _settings(db)
    enc = s.get(KEY_SETTING) or ""
    try:
        cap = int(s.get(CAP_SETTING) or DEFAULT_DAILY_CAP)
    except ValueError:
        cap = DEFAULT_DAILY_CAP
    cfg = {
        "key": decrypt_totp_secret(enc) if enc else "",
        "model": s.get(MODEL_SETTING) or PREFERRED_MODELS[0],
        "enabled": (s.get(ENABLED_SETTING) or "false").lower() == "true",
        "daily_cap": cap,
        "hint": s.get(HINT_SETTING) or "",
        "verified_at": s.get(VERIFIED_SETTING) or "",
    }
    _cache.update(at=time.monotonic(), cfg=cfg)
    return cfg


def usage_today() -> int:
    today = date.today().isoformat()
    if _usage["day"] != today:
        _usage.update(day=today, count=0)
    return _usage["count"]


_DIGITS = re.compile(r"\d[\d\s\-]{6,}\d")
_EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")


def _mask(text: str) -> str:
    """Never forward phone numbers, card/order numbers or e-mails to Google."""
    return _EMAIL.sub("[email]", _DIGITS.sub("[number]", text))


SYSTEM_PROMPT = (
    "You are the friendly, professional customer assistant of {site}, a shop in Beanibazar, Sylhet, Bangladesh. "
    "Answer ONLY with information found in FACTS. If FACTS do not contain the answer, say politely that you are not sure "
    "and ask the customer to call {phone} or WhatsApp {whatsapp}. Never invent prices, fees, stock, dates, policies, "
    "discounts or services that are not in FACTS. Never ask for passwords, OTPs or card numbers. "
    "Keep it short: at most 80 words, plain text, no markdown headings (short bullet lines are fine). "
    "{lang_rule}"
)


async def answer(db: AsyncSession, question: str, lang: str, facts_text: str, facts: dict[str, Any]) -> str | None:
    """Gemini reply grounded in the knowledge base, or None to use the normal fallback."""
    try:
        cfg = await load_config(db)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Gemini config load failed: %s", exc)
        return None
    if not (cfg["enabled"] and cfg["key"]):
        return None
    if cfg["daily_cap"] and usage_today() >= cfg["daily_cap"]:
        return None
    lang_rule = (
        "Reply in natural Bangladeshi Bangla (Bengali script)." if lang == "bn" else "Reply in clear, simple English."
    )
    system = SYSTEM_PROMPT.format(site=facts.get("site") or "ABO Enterprise", phone=facts.get("phone") or "",
                                  whatsapp=facts.get("whatsapp") or "", lang_rule=lang_rule)
    user = f"FACTS:\n{facts_text}\n\nCUSTOMER QUESTION:\n{_mask(question)[:600]}"
    try:
        _usage["count"] = usage_today() + 1
        async with httpx.AsyncClient(timeout=httpx.Timeout(9.0)) as client:
            text = await _generate(client, cfg["key"], cfg["model"], system, user)
    except Exception as exc:  # noqa: BLE001 — quota, network, model gone: fall back quietly
        logger.warning("Gemini answer failed: %s", exc)
        return None
    text = re.sub(r"^#+\s*", "", text, flags=re.M).replace("**", "").strip()
    return text[:1200] or None
