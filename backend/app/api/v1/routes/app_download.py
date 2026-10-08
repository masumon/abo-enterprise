"""Mobile-app ("Apon") download: public info + math captcha + one-time download ticket +
website-served file, and the admin tools to manage releases.

The APK itself lives at a private address (e.g. a GitHub Release asset). Visitors never see
that address: the API streams the file under the website's own domain after a captcha.
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import re
from datetime import datetime, timedelta, timezone
from urllib.parse import unquote, urlparse
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.app_download import (
    hash_ip,
    is_allowed_source_url,
    make_captcha,
    make_ticket,
    safe_filename,
    verify_captcha,
    verify_ticket,
)
from app.core.database import get_db
from app.core.rate_limit import client_ip, rate_limit
from app.core.security import require_role
from app.models.models import ActivityLog, AppDownloadEvent, AppRelease, Setting
from app.schemas.schemas import ApiResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/app", tags=["app-download"])

# The free API instance is small: never serve more than a few downloads at once.
_MAX_CONCURRENT_STREAMS = 3
_stream_slots = asyncio.Semaphore(_MAX_CONCURRENT_STREAMS)
_INSPECT_MAX_BYTES = 250 * 1024 * 1024
_CHUNK = 64 * 1024


# ------------------------------------------------------------------- helpers ----
async def _apon_settings(db: AsyncSession) -> dict[str, str]:
    rows = (
        await db.execute(select(Setting.key, Setting.value).where(Setting.key.like("apon\\_%", escape="\\"), Setting.is_deleted == False))  # noqa: E712
    ).all()
    return {k: (v or "") for k, v in rows}


def _flag(values: dict[str, str], key: str, default: bool) -> bool:
    raw = values.get(key)
    if raw is None or raw == "":
        return default
    return raw.strip().lower() in ("true", "1", "yes", "on")


def _int(values: dict[str, str], key: str, default: int) -> int:
    try:
        return max(0, int((values.get(key) or "").strip()))
    except ValueError:
        return default


async def _current_release(db: AsyncSession) -> AppRelease | None:
    return (
        await db.execute(
            select(AppRelease)
            .where(AppRelease.is_deleted == False, AppRelease.status == "published", AppRelease.is_current == True)  # noqa: E712
            .order_by(AppRelease.version_code.desc())
            .limit(1)
        )
    ).scalar_one_or_none()


def _public_release(r: AppRelease) -> dict:
    return {
        "version_name": r.version_name,
        "version_code": r.version_code,
        "file_name": safe_filename(r.file_name),
        "size_bytes": r.size_bytes,
        "sha256": r.sha256,
        "min_android": r.min_android,
        "changelog_bn": r.changelog_bn,
        "changelog_en": r.changelog_en,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        "download_count": r.download_count,
    }


def _admin_release(r: AppRelease) -> dict:
    return {**_public_release(r), "id": str(r.id), "source_url": r.source_url, "status": r.status, "is_current": r.is_current,
            "created_at": r.created_at.isoformat() if r.created_at else None}


# --------------------------------------------------------------------- public ----
@router.get("/info", response_model=ApiResponse)
async def app_info(db: AsyncSession = Depends(get_db)):
    """What the public page needs: is the download on, and which build is current.
    Never fails the page: if the tables are not set up yet it simply reports 'not available'."""
    try:
        values = await _apon_settings(db)
        release = await _current_release(db)
    except Exception:
        logger.exception("app info lookup failed (tables missing?)")
        return ApiResponse(data={"enabled": False, "captcha": True, "release": None})
    enabled = _flag(values, "apon_enabled", False) and release is not None and _flag(values, "apon_downloads_enabled", True)
    return ApiResponse(
        data={
            "enabled": enabled,
            "captcha": _flag(values, "apon_captcha_enabled", True),
            "release": _public_release(release) if release else None,
        }
    )


@router.get("/captcha", response_model=ApiResponse, dependencies=[Depends(rate_limit("apon_captcha", 60, 600))])
async def app_captcha(db: AsyncSession = Depends(get_db)):
    values = await _apon_settings(db)
    level = "medium" if (values.get("apon_captcha_level") or "").strip().lower() == "medium" else "easy"
    return ApiResponse(data=make_captcha(level))


class TicketRequest(BaseModel):
    token: str = Field("", max_length=200)
    answer: str = Field("", max_length=12)
    website: str | None = Field(None, max_length=200)  # honeypot: real visitors never fill it


@router.post("/download-ticket", response_model=ApiResponse, dependencies=[Depends(rate_limit("apon_ticket", 20, 600))])
async def download_ticket(payload: TicketRequest, request: Request, db: AsyncSession = Depends(get_db)):
    if payload.website:
        raise HTTPException(status_code=400, detail="Request rejected")
    values = await _apon_settings(db)
    release = await _current_release(db)
    if not (_flag(values, "apon_enabled", False) and _flag(values, "apon_downloads_enabled", True) and release):
        raise HTTPException(status_code=503, detail="Downloads are not available right now")
    if _flag(values, "apon_captcha_enabled", True) and not verify_captcha(payload.token, payload.answer):
        raise HTTPException(status_code=400, detail="captcha_failed")

    now = datetime.now(timezone.utc)
    daily = _int(values, "apon_daily_limit_per_ip", 5)
    if daily:
        used = (
            await db.execute(
                select(func.count(AppDownloadEvent.id)).where(
                    AppDownloadEvent.ip_hash == hash_ip(client_ip(request)),
                    AppDownloadEvent.created_at > now - timedelta(hours=24),
                )
            )
        ).scalar_one()
        if used >= daily:
            raise HTTPException(status_code=429, detail="daily_limit")
    monthly = _int(values, "apon_monthly_cap", 1500)
    if monthly:
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        total = (await db.execute(select(func.count(AppDownloadEvent.id)).where(AppDownloadEvent.created_at >= month_start))).scalar_one()
        if total >= monthly:
            raise HTTPException(status_code=503, detail="monthly_limit")

    name = safe_filename(release.file_name)
    return ApiResponse(
        data={
            "url": f"/api/v1/app/file/{make_ticket(str(release.id))}/{name}",
            "filename": name,
            "size_bytes": release.size_bytes,
            "sha256": release.sha256,
        }
    )


@router.get("/file/{ticket}/{filename}")
async def download_file(ticket: str, filename: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Streams the APK from its private address under our own URL (supports resume)."""
    release_id = verify_ticket(ticket)
    if not release_id:
        raise HTTPException(status_code=403, detail="This download link has expired. Please start again from the Apon page.")
    try:
        release = (await db.execute(select(AppRelease).where(AppRelease.id == UUID(release_id), AppRelease.is_deleted == False))).scalar_one_or_none()  # noqa: E712
    except ValueError:
        release = None
    if not release or release.status != "published" or not is_allowed_source_url(release.source_url):
        raise HTTPException(status_code=404, detail="File not found")

    if _stream_slots.locked():
        raise HTTPException(status_code=503, detail="Many people are downloading right now. Please try again in a minute.", headers={"Retry-After": "60"})
    await _stream_slots.acquire()
    client = httpx.AsyncClient(timeout=httpx.Timeout(20.0, read=60.0), follow_redirects=True)
    try:
        range_header = request.headers.get("range")
        upstream_req = client.build_request("GET", release.source_url, headers={"Range": range_header} if range_header else None)
        upstream = await client.send(upstream_req, stream=True)
    except Exception:
        _stream_slots.release()
        await client.aclose()
        logger.exception("apk upstream connection failed")
        raise HTTPException(status_code=502, detail="The file is temporarily unavailable. Please try again shortly.")
    if upstream.status_code not in (200, 206):
        await upstream.aclose()
        await client.aclose()
        _stream_slots.release()
        logger.error("apk upstream returned %s", upstream.status_code)
        raise HTTPException(status_code=502, detail="The file is temporarily unavailable. Please try again shortly.")

    # Count a download when the transfer starts from the beginning (a resume is not a new download).
    if not range_header or re.match(r"bytes=0-", range_header):
        try:
            db.add(AppDownloadEvent(release_id=release.id, ip_hash=hash_ip(client_ip(request)), user_agent=(request.headers.get("user-agent") or "")[:255]))
            await db.execute(update(AppRelease).where(AppRelease.id == release.id).values(download_count=AppRelease.download_count + 1))
            await db.commit()
        except Exception:
            logger.exception("could not record download event")
            await db.rollback()

    headers = {
        "Content-Disposition": f'attachment; filename="{safe_filename(release.file_name)}"',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Accept-Ranges": "bytes",
    }
    for h in ("content-length", "content-range"):
        if upstream.headers.get(h):
            headers[h.title()] = upstream.headers[h]

    async def body():
        try:
            async for chunk in upstream.aiter_raw(_CHUNK):
                yield chunk
        finally:
            await upstream.aclose()
            await client.aclose()
            _stream_slots.release()

    return StreamingResponse(body(), status_code=upstream.status_code, media_type="application/vnd.android.package-archive", headers=headers)


# ---------------------------------------------------------------------- admin ----
class ReleaseIn(BaseModel):
    version_name: str = Field(..., min_length=1, max_length=40)
    version_code: int = Field(..., ge=1)
    source_url: str = Field(..., min_length=10, max_length=1000)
    file_name: str | None = Field(None, max_length=120)
    size_bytes: int | None = Field(None, ge=0)
    sha256: str | None = Field(None, max_length=64)
    min_android: str | None = Field(None, max_length=20)
    changelog_bn: str | None = None
    changelog_en: str | None = None


class ReleaseUpdate(BaseModel):
    version_name: str | None = Field(None, min_length=1, max_length=40)
    version_code: int | None = Field(None, ge=1)
    source_url: str | None = Field(None, min_length=10, max_length=1000)
    file_name: str | None = Field(None, max_length=120)
    size_bytes: int | None = Field(None, ge=0)
    sha256: str | None = Field(None, max_length=64)
    min_android: str | None = Field(None, max_length=20)
    changelog_bn: str | None = None
    changelog_en: str | None = None


def _check_source(url: str) -> str:
    if not is_allowed_source_url(url):
        raise HTTPException(status_code=422, detail="The file link must be an https link from GitHub (github.com) or Supabase Storage.")
    return url.strip()


def _file_from_url(url: str) -> str:
    return safe_filename(unquote(urlparse(url).path.rsplit("/", 1)[-1]))


@router.get("/admin/releases", response_model=ApiResponse)
async def admin_list_releases(_a: str = Depends(require_role("app.read")), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(AppRelease).where(AppRelease.is_deleted == False).order_by(AppRelease.version_code.desc()))).scalars().all()  # noqa: E712
    return ApiResponse(data=[_admin_release(r) for r in rows])


@router.post("/admin/releases", response_model=ApiResponse, status_code=201)
async def admin_create_release(payload: ReleaseIn, admin_id: str = Depends(require_role("app.write")), db: AsyncSession = Depends(get_db)):
    url = _check_source(payload.source_url)
    exists = (await db.execute(select(AppRelease.id).where(AppRelease.version_code == payload.version_code, AppRelease.is_deleted == False))).first()  # noqa: E712
    if exists:
        raise HTTPException(status_code=409, detail="A release with this version code already exists")
    release = AppRelease(
        version_name=payload.version_name.strip(),
        version_code=payload.version_code,
        source_url=url,
        file_name=safe_filename(payload.file_name or _file_from_url(url)),
        size_bytes=payload.size_bytes,
        sha256=(payload.sha256 or "").lower() or None,
        min_android=payload.min_android,
        changelog_bn=payload.changelog_bn,
        changelog_en=payload.changelog_en,
        status="draft",
        is_current=False,
    )
    db.add(release)
    await db.flush()
    db.add(ActivityLog(admin_id=UUID(admin_id), action="create", entity_type="app_release", entity_id=release.id, new_values={"version": release.version_name}))
    await db.commit()
    return ApiResponse(data=_admin_release(release), message="Release saved as a draft")


async def _get_release(db: AsyncSession, release_id: UUID) -> AppRelease:
    release = (await db.execute(select(AppRelease).where(AppRelease.id == release_id, AppRelease.is_deleted == False))).scalar_one_or_none()  # noqa: E712
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    return release


@router.put("/admin/releases/{release_id}", response_model=ApiResponse)
async def admin_update_release(release_id: UUID, payload: ReleaseUpdate, admin_id: str = Depends(require_role("app.write")), db: AsyncSession = Depends(get_db)):
    release = await _get_release(db, release_id)
    changes = payload.model_dump(exclude_unset=True)
    if "source_url" in changes:
        changes["source_url"] = _check_source(changes["source_url"])
    if "version_code" in changes and changes["version_code"] != release.version_code:
        dup = (await db.execute(select(AppRelease.id).where(AppRelease.version_code == changes["version_code"], AppRelease.is_deleted == False))).first()  # noqa: E712
        if dup:
            raise HTTPException(status_code=409, detail="A release with this version code already exists")
    if "file_name" in changes and changes["file_name"]:
        changes["file_name"] = safe_filename(changes["file_name"])
    if "sha256" in changes and changes["sha256"]:
        changes["sha256"] = changes["sha256"].lower()
    for k, v in changes.items():
        setattr(release, k, v)
    db.add(ActivityLog(admin_id=UUID(admin_id), action="update", entity_type="app_release", entity_id=release.id, new_values={"fields": sorted(changes)}))
    await db.commit()
    return ApiResponse(data=_admin_release(release), message="Release updated")


@router.post("/admin/releases/{release_id}/publish", response_model=ApiResponse)
async def admin_publish_release(release_id: UUID, admin_id: str = Depends(require_role("app.write")), db: AsyncSession = Depends(get_db)):
    release = await _get_release(db, release_id)
    if not is_allowed_source_url(release.source_url):
        raise HTTPException(status_code=422, detail="Fix the file link before publishing")
    await db.execute(update(AppRelease).where(AppRelease.is_current == True).values(is_current=False))  # noqa: E712
    release.status = "published"
    release.is_current = True
    db.add(ActivityLog(admin_id=UUID(admin_id), action="publish", entity_type="app_release", entity_id=release.id, new_values={"version": release.version_name}))
    await db.commit()
    return ApiResponse(data=_admin_release(release), message="This version is now the one visitors download")


@router.post("/admin/releases/{release_id}/unpublish", response_model=ApiResponse)
async def admin_unpublish_release(release_id: UUID, admin_id: str = Depends(require_role("app.write")), db: AsyncSession = Depends(get_db)):
    release = await _get_release(db, release_id)
    release.status = "draft"
    release.is_current = False
    db.add(ActivityLog(admin_id=UUID(admin_id), action="unpublish", entity_type="app_release", entity_id=release.id))
    await db.commit()
    return ApiResponse(data=_admin_release(release), message="Release is no longer public")


@router.delete("/admin/releases/{release_id}", response_model=ApiResponse)
async def admin_delete_release(release_id: UUID, admin_id: str = Depends(require_role("app.write")), db: AsyncSession = Depends(get_db)):
    release = await _get_release(db, release_id)
    release.is_deleted = True
    release.is_current = False
    release.status = "draft"
    db.add(ActivityLog(admin_id=UUID(admin_id), action="delete", entity_type="app_release", entity_id=release.id))
    await db.commit()
    return ApiResponse(data=None, message="Release deleted")


class InspectIn(BaseModel):
    url: str = Field(..., min_length=10, max_length=1000)


@router.post("/admin/inspect", response_model=ApiResponse, dependencies=[Depends(rate_limit("apon_inspect", 10, 600))])
async def admin_inspect_link(payload: InspectIn, _a: str = Depends(require_role("app.write"))):
    """Download the file once from the pasted link to read its size and SHA-256 (so the admin
    does not have to type them) and check that it really looks like an APK."""
    url = _check_source(payload.url)
    digest, size, first = hashlib.sha256(), 0, b""
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, read=60.0), follow_redirects=True) as client:
            async with client.stream("GET", url) as resp:
                if resp.status_code != 200:
                    raise HTTPException(status_code=422, detail=f"The link did not open (status {resp.status_code}). Check that the release is public.")
                async for chunk in resp.aiter_raw(_CHUNK):
                    if not first:
                        first = chunk[:4]
                    size += len(chunk)
                    if size > _INSPECT_MAX_BYTES:
                        raise HTTPException(status_code=422, detail="The file is larger than 250 MB.")
                    digest.update(chunk)
    except HTTPException:
        raise
    except Exception:
        logger.exception("inspect failed")
        raise HTTPException(status_code=502, detail="Could not read the file from that link right now.")
    return ApiResponse(
        data={
            "size_bytes": size,
            "sha256": digest.hexdigest(),
            "file_name": _file_from_url(url),
            "looks_like_apk": first == b"PK\x03\x04",
        }
    )


@router.get("/admin/stats", response_model=ApiResponse)
async def admin_stats(_a: str = Depends(require_role("app.read")), db: AsyncSession = Depends(get_db)):
    since = datetime.now(timezone.utc) - timedelta(days=30)
    total = (await db.execute(select(func.count(AppDownloadEvent.id)))).scalar_one()
    last30 = (await db.execute(select(func.count(AppDownloadEvent.id)).where(AppDownloadEvent.created_at >= since))).scalar_one()
    day = func.date(AppDownloadEvent.created_at)
    per_day = (await db.execute(select(day, func.count(AppDownloadEvent.id)).where(AppDownloadEvent.created_at >= since).group_by(day).order_by(day))).all()
    releases = (await db.execute(select(AppRelease.version_name, AppRelease.download_count).where(AppRelease.is_deleted == False).order_by(AppRelease.version_code.desc()))).all()  # noqa: E712
    return ApiResponse(
        data={
            "total": total,
            "last_30_days": last30,
            "per_day": [{"date": str(d), "count": c} for d, c in per_day],
            "per_release": [{"version": v, "count": c} for v, c in releases],
        }
    )
