"""Admin → Backup: connect any drive, automatic/manual/local backups, verify, restore test.

Super-admin only (permission "backup.manage" is in no other role). Sensitive
actions also re-check the admin's password.
"""
from __future__ import annotations

import asyncio
import hmac
import json
import hashlib
import os
import secrets
import shutil
import tempfile
import time
import uuid
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, RedirectResponse
from urllib.parse import quote
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.backup import crypto, engine, providers, store
from app.core.config import settings
from app.core.database import get_db
from app.core.rate_limit import rate_limit
from app.core.security import require_role, verify_password
from app.models.models import ActivityLog, AdminUser
from app.schemas.schemas import ApiResponse

router = APIRouter(tags=["admin-backup"])
PERM = "backup.manage"
OAUTH_TTL = 15 * 60
MAX_UPLOAD = 300 * 1024 * 1024
_pending: dict[str, dict[str, Any]] = {}
_jobs: dict[str, dict[str, Any]] = {}


def _err(exc: Exception) -> HTTPException:
    return HTTPException(status_code=getattr(exc, "status", 400), detail=getattr(exc, "message_bn", str(exc)))


def cron_token() -> str:
    return hmac.new(settings.SECRET_KEY.encode(), b"db-backup-cron", hashlib.sha256).hexdigest()[:32]


def _api_base() -> str:
    return os.environ.get("BACKUP_API_URL", "https://api.aboenterprise.com").rstrip("/")


def redirect_uri() -> str:
    return f"{_api_base()}/api/v1/backup/oauth/callback"


async def _confirm_password(db: AsyncSession, admin_id: str, password: str) -> None:
    admin = (await db.execute(select(AdminUser).where(AdminUser.id == UUID(admin_id)))).scalar_one_or_none()
    if not admin or not password or not verify_password(password, admin.password_hash):
        raise HTTPException(status_code=403, detail="আপনার অ্যাডমিন পাসওয়ার্ড ভুল।")


def _audit(db: AsyncSession, admin_id: str, action: str, values: dict[str, Any]) -> None:
    db.add(ActivityLog(admin_id=UUID(admin_id), action=action[:50], entity_type="backup", new_values=values))


async def _app_client(db: AsyncSession, kind: str) -> tuple[str, str, bool] | None:
    """(client_id, client_secret, from_env) for one-click connect: Render env first, else the
    file uploaded once in Admin → Backup (stored encrypted in the database)."""
    env = providers.app_client(kind)
    if env:
        return env[0], env[1], True
    saved = (await store.get_app_clients(db)).get(kind) or {}
    if saved.get("client_id") and saved.get("client_secret"):
        return saved["client_id"], saved["client_secret"], False
    return None


# ── summary ──────────────────────────────────────────────────────────────────

@router.get("/admin/backup", response_model=ApiResponse)
async def summary(db: AsyncSession = Depends(get_db), admin_id: str = Depends(require_role(PERM))):
    cfg, keys = await store.get_config(db), await store.get_keys(db)
    secs = await store.get_secrets(db)
    hist = engine._settle_stale(await store.get_history(db))
    dests = [{**d, "connected": bool(secs.get(d["id"]))} for d in cfg["destinations"]]
    return ApiResponse(data={
        "keys": {"set": bool(keys), "fingerprint": keys.get("fingerprint") if keys else None,
                 "created_at": keys.get("created_at") if keys else None},
        "destinations": dests, "schedule": cfg["schedule"], "retention": cfg["retention"],
        "health": engine.health(cfg, hist), "history": hist[:60],
        "cron_url": f"{_api_base()}/api/v1/backup/cron?token={cron_token()}",
        "redirect_uri": redirect_uri(), "custom_db_url": bool(os.environ.get("BACKUP_DATABASE_URL")),
        "one_click": {k: bool(await _app_client(db, k)) for k in ("google_drive", "onedrive", "dropbox")},
    })


# ── encryption key ───────────────────────────────────────────────────────────

class KeysIn(BaseModel):
    passphrase: str = Field(min_length=crypto.MIN_PASSPHRASE, max_length=200)
    old_passphrase: str = Field(default="", max_length=200)
    password: str = Field(max_length=200)


@router.post("/admin/backup/keys", response_model=ApiResponse)
async def set_keys(body: KeysIn, db: AsyncSession = Depends(get_db), admin_id: str = Depends(require_role(PERM))):
    await _confirm_password(db, admin_id, body.password)
    old = await store.get_keys(db)
    if old and not crypto.check_passphrase(crypto.KeyBundle(old["public_b64"], old["sealed_private"]), body.old_passphrase):
        raise HTTPException(status_code=403, detail="পুরোনো Backup পাসওয়ার্ড ভুল।")
    bundle = await asyncio.to_thread(crypto.generate_keys, body.passphrase)
    await store.put_keys(db, {"public_b64": bundle.public_b64, "sealed_private": bundle.sealed_private,
                              "fingerprint": bundle.fingerprint, "created_at": store.now_iso()})
    _audit(db, admin_id, "backup_key_set", {"fingerprint": bundle.fingerprint, "rotated": bool(old)})
    await db.commit()
    return ApiResponse(data={"fingerprint": bundle.fingerprint}, message="Backup পাসওয়ার্ড সেট হয়েছে")


# ── destinations ─────────────────────────────────────────────────────────────

class DestIn(BaseModel):
    kind: str = Field(max_length=20)
    label: str = Field(default="", max_length=60)
    password: str = Field(max_length=200)
    client_id: str = Field(default="", max_length=300)
    client_secret: str = Field(default="", max_length=300)
    # S3-compatible
    endpoint: str = Field(default="", max_length=300)
    region: str = Field(default="", max_length=40)
    bucket: str = Field(default="", max_length=100)
    prefix: str = Field(default="", max_length=100)
    access_key: str = Field(default="", max_length=200)
    secret_key: str = Field(default="", max_length=300)
    # WebDAV
    url: str = Field(default="", max_length=300)
    username: str = Field(default="", max_length=200)
    dav_password: str = Field(default="", max_length=300)
    folder: str = Field(default="", max_length=100)


def _start_oauth(admin_id: str, kind: str, label: str, client_id: str, client_secret: str, dest_id: str | None,
                 use_app: bool = False) -> str:
    """use_app=True: the client lives in Render env, so only the refresh token is stored per drive."""
    now = time.time()
    for k, v in list(_pending.items()):
        if v["expires"] < now:
            _pending.pop(k, None)
    verifier, challenge = providers.pkce_pair()
    state = secrets.token_urlsafe(24)
    _pending[state] = {"admin_id": admin_id, "kind": kind, "label": label, "client_id": client_id,
                       "client_secret": client_secret, "verifier": verifier, "dest_id": dest_id, "app": use_app,
                       "expires": now + OAUTH_TTL}
    return providers.authorize_url(kind, client_id, redirect_uri(), state, challenge)


@router.post("/admin/backup/destinations", response_model=ApiResponse)
async def add_destination(body: DestIn, db: AsyncSession = Depends(get_db), admin_id: str = Depends(require_role(PERM))):
    await _confirm_password(db, admin_id, body.password)
    if body.kind not in providers.KINDS:
        raise HTTPException(status_code=400, detail="এই ধরনের ড্রাইভ সমর্থিত নয়।")
    label = body.label.strip() or {"google_drive": "Google Drive", "onedrive": "OneDrive", "dropbox": "Dropbox",
                                   "s3": "S3 Storage", "webdav": "WebDAV"}[body.kind]
    if providers.KINDS[body.kind].oauth:
        cid, csec, use_app = body.client_id.strip(), body.client_secret.strip(), False
        if not cid and not csec:
            app = await _app_client(db, body.kind)
            if not app:
                raise HTTPException(status_code=400, detail="এই ড্রাইভের এক-ক্লিক সংযোগ এখনো চালু হয়নি — Google-এর JSON ফাইলটি দিন বা Client ID/Secret দিন।")
            cid, csec, use_app = app
        elif not cid or not csec:
            raise HTTPException(status_code=400, detail="Client ID ও Client Secret দুটোই দিন।")
        url = _start_oauth(admin_id, body.kind, label, cid, csec, None, use_app)
        return ApiResponse(data={"authorize_url": url}, message="ড্রাইভে লগইন করে অনুমতি দিন")
    try:
        if body.kind == "s3":
            cfg = {"endpoint": providers.check_public_https(body.endpoint), "region": body.region.strip() or "auto",
                   "bucket": body.bucket.strip(), "prefix": body.prefix.strip() or "abo-backups/"}
            secret = {"access_key": body.access_key.strip(), "secret_key": body.secret_key.strip()}
            if not (cfg["bucket"] and secret["access_key"] and secret["secret_key"]):
                raise HTTPException(status_code=400, detail="Endpoint, Bucket, Access Key ও Secret Key দিন।")
        else:
            cfg = {"url": providers.check_public_https(body.url), "username": body.username.strip(),
                   "folder": body.folder.strip() or "ABO-Backups"}
            secret = {"password": body.dav_password}
            if not (cfg["username"] and secret["password"]):
                raise HTTPException(status_code=400, detail="WebDAV ঠিকানা, ইউজারনেম ও পাসওয়ার্ড দিন।")
        account = await providers.make(body.kind, dict(cfg), dict(secret)).check()
    except providers.ProviderError as exc:
        raise _err(exc) from exc
    dest = await _save_destination(db, None, body.kind, label, {**cfg, "account": account}, secret)
    _audit(db, admin_id, "backup_dest_add", {"kind": body.kind, "label": label})
    await db.commit()
    return ApiResponse(data=dest, message="ড্রাইভ যুক্ত হয়েছে ও পরীক্ষায় পাস করেছে")


async def _save_destination(db: AsyncSession, dest_id: str | None, kind: str, label: str, cfg: dict[str, Any],
                            secret: dict[str, Any]) -> dict[str, Any]:
    conf, secs = await store.get_config(db), await store.get_secrets(db)
    existing = next((d for d in conf["destinations"] if d["id"] == dest_id), None) if dest_id else None
    if existing:
        existing["cfg"] = {**existing.get("cfg", {}), **cfg}
        dest = existing
    else:
        dest = {"id": uuid.uuid4().hex[:10], "kind": kind, "label": label, "enabled": True, "cfg": cfg,
                "created_at": store.now_iso()}
        conf["destinations"].append(dest)
    secs[dest["id"]] = {**secs.get(dest["id"], {}), **secret}
    await store.put_config(db, conf)
    await store.put_secrets(db, secs)
    return dest


@router.get("/backup/oauth/callback")
async def oauth_callback(state: str = Query(default="", max_length=100), code: str = Query(default="", max_length=2000),
                         error: str = Query(default="", max_length=200), db: AsyncSession = Depends(get_db)):
    site = settings.FRONTEND_URL.rstrip("/")
    p = _pending.pop(state, None)
    if not p or p["expires"] < time.time():
        return RedirectResponse(f"{site}/sumon/backup?oauth=expired")
    if error or not code:
        return RedirectResponse(f"{site}/sumon/backup?oauth=denied&reason={quote(error[:40] or 'access_denied')}")
    try:
        tok = await providers.exchange_code(p["kind"], p["client_id"], p["client_secret"], code, redirect_uri(), p["verifier"])
        account = providers.account_from_tokens(p["kind"], tok) or await providers.fetch_account(p["kind"], tok["access_token"])
        # One-click (server app client): only the refresh token is stored; the client comes from env.
        secret = ({"refresh_token": tok["refresh_token"]} if p.get("app") else
                  {"client_id": p["client_id"], "client_secret": p["client_secret"], "refresh_token": tok["refresh_token"]})
        prov = providers.make(p["kind"], {"account": account}, dict(secret))
        await prov.check()  # creates the app folder and proves access before saving
        dest = await _save_destination(db, p["dest_id"], p["kind"], p["label"], {**prov.cfg, "account": account}, secret)
        _audit(db, p["admin_id"], "backup_dest_oauth", {"kind": p["kind"], "dest": dest["id"]})
        await db.commit()
    except providers.ProviderError as exc:
        return RedirectResponse(f"{site}/sumon/backup?oauth=failed&reason={quote(exc.code or 'failed')}")
    return RedirectResponse(f"{site}/sumon/backup?oauth=ok")


class DestPatch(BaseModel):
    enabled: bool | None = None
    label: str | None = Field(default=None, max_length=60)


@router.patch("/admin/backup/destinations/{dest_id}", response_model=ApiResponse)
async def patch_destination(dest_id: str, body: DestPatch, db: AsyncSession = Depends(get_db),
                            admin_id: str = Depends(require_role(PERM))):
    conf = await store.get_config(db)
    d = next((x for x in conf["destinations"] if x["id"] == dest_id), None)
    if not d:
        raise HTTPException(status_code=404, detail="ড্রাইভটি পাওয়া যায়নি।")
    if body.enabled is not None:
        d["enabled"] = body.enabled
    if body.label:
        d["label"] = body.label.strip()
    await store.put_config(db, conf)
    await db.commit()
    return ApiResponse(data=d, message="সংরক্ষিত হয়েছে")


@router.post("/admin/backup/destinations/{dest_id}/test", response_model=ApiResponse)
async def test_destination(dest_id: str, db: AsyncSession = Depends(get_db), admin_id: str = Depends(require_role(PERM))):
    conf, secs = await store.get_config(db), await store.get_secrets(db)
    d = next((x for x in conf["destinations"] if x["id"] == dest_id), None)
    if not d:
        raise HTTPException(status_code=404, detail="ড্রাইভটি পাওয়া যায়নি।")
    try:
        account = await engine._make_provider(d, secs.get(dest_id, {})).check()
    except providers.ProviderError as exc:
        raise _err(exc) from exc
    return ApiResponse(data={"account": account}, message="ড্রাইভ ঠিকমতো কাজ করছে")


class PasswordIn(BaseModel):
    password: str = Field(max_length=200)


@router.post("/admin/backup/destinations/{dest_id}/reconnect", response_model=ApiResponse)
async def reconnect_destination(dest_id: str, body: PasswordIn, db: AsyncSession = Depends(get_db),
                                admin_id: str = Depends(require_role(PERM))):
    await _confirm_password(db, admin_id, body.password)
    conf, secs = await store.get_config(db), await store.get_secrets(db)
    d = next((x for x in conf["destinations"] if x["id"] == dest_id), None)
    s = secs.get(dest_id, {})
    app = await _app_client(db, d["kind"]) if d and not s.get("client_id") else None
    if not d or not providers.KINDS[d["kind"]].oauth or not (s.get("client_id") or app):
        raise HTTPException(status_code=400, detail="এই ড্রাইভটি আবার সংযোগ করা যায় না — মুছে নতুন করে যোগ করুন।")
    cid, csec, use_app = (s["client_id"], s.get("client_secret", ""), False) if s.get("client_id") else app
    url = _start_oauth(admin_id, d["kind"], d["label"], cid, csec, dest_id, use_app)
    return ApiResponse(data={"authorize_url": url})


@router.post("/admin/backup/destinations/{dest_id}/remove", response_model=ApiResponse)
async def remove_destination(dest_id: str, body: PasswordIn, db: AsyncSession = Depends(get_db),
                             admin_id: str = Depends(require_role(PERM))):
    await _confirm_password(db, admin_id, body.password)
    conf, secs = await store.get_config(db), await store.get_secrets(db)
    conf["destinations"] = [d for d in conf["destinations"] if d["id"] != dest_id]
    secs.pop(dest_id, None)
    await store.put_config(db, conf)
    await store.put_secrets(db, secs)
    _audit(db, admin_id, "backup_dest_remove", {"dest": dest_id})
    await db.commit()
    return ApiResponse(data=None, message="ড্রাইভ সংযোগ সরানো হয়েছে (ড্রাইভের ফাইল মোছা হয়নি)")


# ── one-click app client (upload the JSON file Google gives, once) ─────────

@router.post("/admin/backup/app-client", response_model=ApiResponse)
async def set_app_client(kind: str = Form(default="google_drive", max_length=20), password: str = Form(max_length=200),
                         client_id: str = Form(default="", max_length=300), client_secret: str = Form(default="", max_length=300),
                         file: UploadFile | None = File(default=None),
                         db: AsyncSession = Depends(get_db), admin_id: str = Depends(require_role(PERM))):
    await _confirm_password(db, admin_id, password)
    if kind not in ("google_drive", "onedrive", "dropbox"):
        raise HTTPException(status_code=400, detail="এই ড্রাইভের জন্য এটি দরকার নেই।")
    if file is not None:
        try:
            data = json.loads(await file.read(20_000))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="এটি Google-এর JSON ফাইল নয়।") from exc
        if "installed" in data:
            raise HTTPException(status_code=400, detail="ভুল ধরনের client — Google-এ “Web application” ধরনের client বানান।")
        web = data.get("web") or {}
        client_id, client_secret = web.get("client_id", ""), web.get("client_secret", "")
        if redirect_uri() not in (web.get("redirect_uris") or []):
            raise HTTPException(status_code=400, detail="এই ফাইলে সঠিক Redirect URI নেই — Google-এ client-এর “Authorized redirect URIs”-এ "
                                f"{redirect_uri()} যোগ করে নতুন ফাইল ডাউনলোড করুন।")
    client_id, client_secret = client_id.strip(), client_secret.strip()
    if not client_id or not client_secret:
        raise HTTPException(status_code=400, detail="Client ID ও Client Secret পাওয়া যায়নি।")
    if kind == "google_drive" and not client_id.endswith(".apps.googleusercontent.com"):
        raise HTTPException(status_code=400, detail="এটি Google-এর Client ID নয়।")
    apps = await store.get_app_clients(db)
    apps[kind] = {"client_id": client_id, "client_secret": client_secret, "set_at": store.now_iso()}
    await store.put_app_clients(db, apps)
    _audit(db, admin_id, "backup_app_client_set", {"kind": kind, "client": client_id[:12] + "…"})
    await db.commit()
    return ApiResponse(data={"kind": kind}, message="এক-ক্লিক সংযোগ চালু হয়েছে")


class AppClientRemove(BaseModel):
    kind: str = Field(max_length=20)
    password: str = Field(max_length=200)


@router.post("/admin/backup/app-client/remove", response_model=ApiResponse)
async def remove_app_client(body: AppClientRemove, db: AsyncSession = Depends(get_db),
                            admin_id: str = Depends(require_role(PERM))):
    await _confirm_password(db, admin_id, body.password)
    apps = await store.get_app_clients(db)
    apps.pop(body.kind, None)
    await store.put_app_clients(db, apps)
    _audit(db, admin_id, "backup_app_client_remove", {"kind": body.kind})
    await db.commit()
    return ApiResponse(data=None, message="সরানো হয়েছে")


# ── GitHub Actions extra copy (on/off + status) ──────────────────────────────

_GH_REPO = os.environ.get("GITHUB_REPO", "masumon/abo-enterprise")
_GH_WORKFLOW = "db-backup.yml"
_gh_cache: dict[str, Any] = {"at": 0.0, "data": None}


@router.get("/backup/github-enabled", response_model=None)
async def github_enabled(db: AsyncSession = Depends(get_db)):
    """Asked by .github/workflows/db-backup.yml before it dumps (a plain yes/no)."""
    return {"enabled": bool((await store.get_config(db))["github"].get("enabled", True))}


async def _github_status() -> dict[str, Any]:
    """Last runs of the workflow from the public GitHub API (cached 10 min — 60 calls/h limit)."""
    import httpx

    if _gh_cache["data"] is not None and time.time() - _gh_cache["at"] < 600:
        return _gh_cache["data"]
    base = f"https://api.github.com/repos/{_GH_REPO}"
    out: dict[str, Any] = {"runs": [], "reason_bn": "", "url": f"https://github.com/{_GH_REPO}/actions/workflows/{_GH_WORKFLOW}"}
    try:
        async with httpx.AsyncClient(timeout=15, headers={"Accept": "application/vnd.github+json"}) as c:
            r = await c.get(f"{base}/actions/workflows/{_GH_WORKFLOW}/runs", params={"per_page": 5})
            runs = r.json().get("workflow_runs", []) if r.status_code == 200 else []
            out["runs"] = [{"at": x.get("created_at"), "status": x.get("status"), "result": x.get("conclusion"),
                            "url": x.get("html_url")} for x in runs]
            last = runs[0] if runs else None
            if last and last.get("conclusion") == "failure":
                jr = await c.get(f"{base}/actions/runs/{last['id']}/jobs")
                jobs = jr.json().get("jobs", []) if jr.status_code == 200 else []
                if jobs:
                    ar = await c.get(f"{base}/check-runs/{jobs[0]['id']}/annotations")
                    msgs = " ".join(a.get("message", "") for a in (ar.json() if ar.status_code == 200 else []))
                    if "billing" in msgs.lower():
                        out["reason_bn"] = "GitHub অ্যাকাউন্টে বিলিং সমস্যা (account locked) — github.com/settings/billing-এ ঠিক না করা পর্যন্ত GitHub backup চলবে না। ওয়েবসাইটের নিজস্ব Drive backup আলাদাভাবে চলছে।"
                    elif msgs:
                        out["reason_bn"] = msgs[:200]
    except Exception:  # noqa: BLE001 — status is informational only
        out["reason_bn"] = "GitHub-এর অবস্থা এখন আনা যায়নি — পরে আবার দেখুন।"
    _gh_cache.update(at=time.time(), data=out)
    return out


@router.get("/admin/backup/github", response_model=ApiResponse)
async def github_status(db: AsyncSession = Depends(get_db), admin_id: str = Depends(require_role(PERM))):
    return ApiResponse(data={"enabled": bool((await store.get_config(db))["github"].get("enabled", True)),
                             **(await _github_status())})


class GithubIn(BaseModel):
    enabled: bool


@router.put("/admin/backup/github", response_model=ApiResponse)
async def set_github(body: GithubIn, db: AsyncSession = Depends(get_db), admin_id: str = Depends(require_role(PERM))):
    conf = await store.get_config(db)
    conf["github"] = {"enabled": body.enabled}
    await store.put_config(db, conf)
    _audit(db, admin_id, "backup_github_toggle", {"enabled": body.enabled})
    await db.commit()
    return ApiResponse(data={"enabled": body.enabled}, message="GitHub backup চালু হলো" if body.enabled else "GitHub backup বন্ধ হলো")


# ── schedule ─────────────────────────────────────────────────────────────────

class ScheduleIn(BaseModel):
    enabled: bool
    hour: int = Field(ge=0, le=23)
    minute: int = Field(ge=0, le=59)
    daily: int = Field(default=14, ge=1, le=90)
    weekly: int = Field(default=8, ge=0, le=52)
    monthly: int = Field(default=6, ge=0, le=36)


@router.put("/admin/backup/schedule", response_model=ApiResponse)
async def set_schedule(body: ScheduleIn, db: AsyncSession = Depends(get_db), admin_id: str = Depends(require_role(PERM))):
    conf = await store.get_config(db)
    conf["schedule"] = {"enabled": body.enabled, "hour": body.hour, "minute": body.minute}
    conf["retention"] = {"daily": body.daily, "weekly": body.weekly, "monthly": body.monthly}
    await store.put_config(db, conf)
    _audit(db, admin_id, "backup_schedule", {**conf["schedule"], **conf["retention"]})
    await db.commit()
    return ApiResponse(data=conf, message="সময়সূচি সংরক্ষিত হয়েছে")


# ── run now / local ──────────────────────────────────────────────────────────

class RunIn(BaseModel):
    dest_ids: list[str] | None = None


async def _bg_run(trigger: str, dest_ids: list[str] | None, keep_local: bool, admin_id: str | None, run_id: str) -> None:
    try:
        await engine.run_backup(trigger, dest_ids, keep_local=keep_local, admin_id=admin_id, run_id=run_id)
    except engine.BackupError:
        pass  # another run started first; nothing to record


@router.post("/admin/backup/run", response_model=ApiResponse)
async def run_now(body: RunIn, background: BackgroundTasks, db: AsyncSession = Depends(get_db),
                  admin_id: str = Depends(require_role(PERM))):
    if engine.is_running():
        raise HTTPException(status_code=409, detail="একটি backup এখন চলছে — শেষ হলে আবার চেষ্টা করুন।")
    run_id = uuid.uuid4().hex[:12]
    _audit(db, admin_id, "backup_run_manual", {"run": run_id})
    await db.commit()
    background.add_task(_bg_run, "manual", body.dest_ids, False, admin_id, run_id)
    return ApiResponse(data={"run_id": run_id}, message="Backup শুরু হয়েছে")


@router.post("/admin/backup/local", response_model=ApiResponse)
async def run_local(background: BackgroundTasks, db: AsyncSession = Depends(get_db),
                    admin_id: str = Depends(require_role(PERM))):
    if engine.is_running():
        raise HTTPException(status_code=409, detail="একটি backup এখন চলছে — শেষ হলে আবার চেষ্টা করুন।")
    run_id = uuid.uuid4().hex[:12]
    _audit(db, admin_id, "backup_run_local", {"run": run_id})
    await db.commit()
    background.add_task(_bg_run, "local", [], True, admin_id, run_id)
    return ApiResponse(data={"run_id": run_id}, message="Backup তৈরি হচ্ছে — তৈরি হলে ডাউনলোড হবে")


@router.get("/admin/backup/local/{run_id}")
async def download_local(run_id: str, admin_id: str = Depends(require_role(PERM))):
    try:
        f = engine.take_local(run_id, admin_id)
    except engine.BackupError as exc:
        raise _err(exc) from exc
    return FileResponse(f["path"], media_type="application/octet-stream", filename=f["name"])


# ── verify & restore test (background jobs; polled) ─────────────────────────

def _job(kind: str) -> str:
    now = time.time()
    for k, v in list(_jobs.items()):
        if v["started"] < now - 3600:
            _jobs.pop(k, None)
    jid = uuid.uuid4().hex[:12]
    _jobs[jid] = {"id": jid, "kind": kind, "status": "running", "started": now}
    return jid


def _expected_sha(hist: list[dict[str, Any]], file_id: str) -> tuple[str | None, str]:
    for r in hist:
        for d in r.get("destinations", []):
            if d.get("file_id") == file_id:
                return r.get("sha256"), r.get("name", "")
    return None, ""


async def _bg_job(jid: str, path: Path, coro_factory) -> None:
    try:
        _jobs[jid].update(status="ok", result=await coro_factory())
    except Exception as exc:  # noqa: BLE001
        _jobs[jid].update(status="failed", error_bn=getattr(exc, "message_bn", None) or "পরীক্ষা ব্যর্থ হয়েছে।")
    finally:
        shutil.rmtree(path.parent, ignore_errors=True)


async def _source(dest_id: str, file_id: str, upload: UploadFile | None) -> Path:
    engine.WORK.mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix="job-", dir=engine.WORK))
    path = work / "backup.abobak"
    if upload is not None:
        size = 0
        with open(path, "wb") as f:
            while chunk := await upload.read(1 << 20):
                size += len(chunk)
                if size > MAX_UPLOAD:
                    shutil.rmtree(work, ignore_errors=True)
                    raise HTTPException(status_code=413, detail="ফাইল অনেক বড় (সর্বোচ্চ ৩০০ MB)।")
                f.write(chunk)
        return path
    if not (dest_id and file_id):
        shutil.rmtree(work, ignore_errors=True)
        raise HTTPException(status_code=400, detail="কোনো backup ফাইল পৌঁছায়নি — ফাইলটি আবার বেছে নিয়ে চেষ্টা করুন।")
    try:
        await engine.fetch_file(dest_id, file_id, path)
    except Exception as exc:  # noqa: BLE001
        shutil.rmtree(work, ignore_errors=True)
        raise _err(exc) from exc
    return path


@router.post("/admin/backup/verify", response_model=ApiResponse,
             dependencies=[Depends(rate_limit("backup_verify", 20, 3600))])
async def verify(background: BackgroundTasks, dest_id: str = Form(default=""), file_id: str = Form(default=""),
                 passphrase: str = Form(default=""), file: UploadFile | None = File(default=None),
                 db: AsyncSession = Depends(get_db), admin_id: str = Depends(require_role(PERM))):
    expected, _ = _expected_sha(await store.get_history(db), file_id) if file_id else (None, "")
    path = await _source(dest_id, file_id, file)
    jid = _job("verify")
    background.add_task(_bg_job, jid, path, lambda: engine.verify_file(path, passphrase or None, expected))
    return ApiResponse(data={"job_id": jid}, message="যাচাই শুরু হয়েছে")


@router.post("/admin/backup/restore-test", response_model=ApiResponse,
             dependencies=[Depends(rate_limit("backup_restore_test", 10, 3600))])
async def restore_test(background: BackgroundTasks, target_url: str = Form(max_length=500), passphrase: str = Form(max_length=200),
                       password: str = Form(max_length=200), confirm: bool = Form(default=False),
                       dest_id: str = Form(default=""), file_id: str = Form(default=""),
                       file: UploadFile | None = File(default=None),
                       db: AsyncSession = Depends(get_db), admin_id: str = Depends(require_role(PERM))):
    await _confirm_password(db, admin_id, password)
    if not confirm:
        raise HTTPException(status_code=400, detail="পরীক্ষার ডাটাবেসের সব ডেটা মুছে যাবে — নিশ্চিত করার বক্সে টিক দিন।")
    try:
        engine.guard_target(target_url)  # refuse production before touching anything
    except Exception as exc:  # noqa: BLE001
        raise _err(exc) from exc
    expected, name = _expected_sha(await store.get_history(db), file_id) if file_id else (None, "")
    path = await _source(dest_id, file_id, file)
    jid = _job("restore_test")
    _audit(db, admin_id, "backup_restore_test", {"job": jid, "file": name or (file.filename if file else "")})
    await db.commit()

    async def work() -> dict[str, Any]:
        res = await engine.restore_test(path, passphrase, target_url, expected)
        await engine._save_run({"id": jid, "trigger": "restore_test", "status": "ok" if res["ok"] else "failed",
                                "started_at": store.now_iso(), "finished_at": store.now_iso(), "name": name,
                                "target": res["target"], "tables": len(res["tables"]), "missing": res["missing"],
                                "destinations": [], "error_bn": "" if res["ok"] else "কিছু টেবিল মেলেনি — বিস্তারিত দেখুন।"})
        return res

    background.add_task(_bg_job, jid, path, work)
    return ApiResponse(data={"job_id": jid}, message="পরীক্ষা-restore শুরু হয়েছে")


@router.get("/admin/backup/jobs/{job_id}", response_model=ApiResponse)
async def job_status(job_id: str, admin_id: str = Depends(require_role(PERM))):
    j = _jobs.get(job_id)
    if not j:
        raise HTTPException(status_code=404, detail="কাজটি পাওয়া যায়নি (সার্ভার রিস্টার্ট হয়ে থাকতে পারে)।")
    return ApiResponse(data=j)


# ── cron-job.org ─────────────────────────────────────────────────────────────

@router.get("/backup/cron", response_model=ApiResponse)
async def cron(background: BackgroundTasks, token: str = Query(default="", max_length=64),
               db: AsyncSession = Depends(get_db)):
    """Call every hour from cron-job.org; starts the daily backup when it is due.
    Answers at once (cron-job.org waits only 30 s)."""
    if not hmac.compare_digest(token, cron_token()):
        raise HTTPException(status_code=403, detail="forbidden")
    try:
        from app.core.service_health import mark_cron

        await mark_cron(db, "backup")
    except Exception:  # noqa: BLE001 — health bookkeeping must never block the backup
        await db.rollback()
    cfg, hist = await store.get_config(db), engine._settle_stale(await store.get_history(db))
    if engine.is_running() or not engine.is_due(cfg, hist):
        return ApiResponse(data={"started": False}, message="এখন backup-এর সময় নয়")
    background.add_task(_bg_run, "auto", None, False, None, uuid.uuid4().hex[:12])
    return ApiResponse(data={"started": True}, message="Backup শুরু হয়েছে")
