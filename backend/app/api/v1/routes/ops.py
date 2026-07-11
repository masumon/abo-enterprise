"""Admin Operations endpoints — System Health, Error Center, Security
Overview, Backup export/restore, Notification feed.

Free-tier, zero-schema-change design: live checks + in-process ring
buffers (app.core.ops_events) + existing tables (ActivityLog,
AssistantActionLog, Order, AdminUser, MediaAsset, Setting).
"""
from __future__ import annotations

import json
import time
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Body, Depends, Query
from fastapi.responses import Response
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.ops_events import failed_emails, failed_logins, recent_errors, started_at
from app.core.security import require_admin
from app.models.models import (
    ActivityLog,
    AdminUser,
    AssistantActionLog,
    BookingV2,
    MediaAsset,
    Order,
    Product,
    Service,
    Setting,
)

router = APIRouter(prefix="/admin/ops", tags=["ops"])


def _iso(ts: float) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()


# ─── System Health ──────────────────────────────────────────────────────────

@router.get("/health")
async def system_health(
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    """Live status of every integration the platform depends on."""
    checks: dict[str, dict] = {}

    # API — if we are answering, it's up; include uptime.
    checks["api"] = {"ok": True, "uptime_seconds": int(time.time() - started_at())}

    # Database + latency
    t0 = time.time()
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = {"ok": True, "latency_ms": int((time.time() - t0) * 1000)}
    except Exception as exc:  # noqa: BLE001
        checks["database"] = {"ok": False, "error": str(exc)[:200]}

    # SMTP — effective config (admin DB settings → env) + TCP reachability
    from app.core.email_config import is_smtp_configured, resolve_email_config

    mail_cfg = await resolve_email_config(db)
    # The configured sender address, shown so the admin can confirm WHICH
    # account is active (password is never exposed).
    mail_email = mail_cfg.get("user") or mail_cfg.get("from_addr") or ""
    if is_smtp_configured(mail_cfg):
        import asyncio
        import smtplib

        _h, _p = mail_cfg["host"], int(mail_cfg["port"] or 587)

        def _smtp_probe() -> str | None:
            """Return None on success, error string on failure."""
            try:
                with smtplib.SMTP(_h, _p, timeout=8) as _s:
                    _s.ehlo()
                return None
            except Exception as _e:  # noqa: BLE001
                return str(_e)[:200]

        try:
            smtp_err = await asyncio.wait_for(
                asyncio.get_running_loop().run_in_executor(None, _smtp_probe),
                timeout=12,
            )
            if smtp_err is None:
                checks["smtp"] = {"ok": True, "host": _h, "email": mail_email}
            else:
                checks["smtp"] = {"ok": False, "error": smtp_err, "email": mail_email}
        except Exception as exc:  # noqa: BLE001
            checks["smtp"] = {"ok": False, "error": str(exc)[:200], "email": mail_email}
    else:
        checks["smtp"] = {"ok": False, "error": "SMTP not configured — set SMTP_* env vars or Settings → Email & SMTP"}

    # Cloudinary — config + API ping
    if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY:
        try:
            import asyncio

            import cloudinary.api

            await asyncio.wait_for(asyncio.get_event_loop().run_in_executor(None, cloudinary.api.ping), timeout=8)
            checks["cloudinary"] = {"ok": True}
        except Exception as exc:  # noqa: BLE001
            checks["cloudinary"] = {"ok": False, "error": str(exc)[:200]}
    else:
        checks["cloudinary"] = {"ok": False, "error": "Cloudinary env vars not configured"}

    # GA4 — reuse the existing end-to-end connection test
    try:
        from app.core.ga4 import check_connection

        ga4 = await check_connection()
        checks["ga4"] = {"ok": bool(ga4.get("ok")), **({"error": ga4.get("error", "")[:200]} if not ga4.get("ok") else {})}
    except Exception as exc:  # noqa: BLE001
        checks["ga4"] = {"ok": False, "error": str(exc)[:200]}

    # Sentry (error monitoring)
    import os

    checks["sentry"] = {"ok": bool(os.environ.get("SENTRY_DSN", "").strip()),
                        **({} if os.environ.get("SENTRY_DSN") else {"error": "SENTRY_DSN not set — errors kept in-memory only"})}

    # Cache — in-process report caches
    try:
        from app.core.ga4 import _report_cache  # noqa: PLC2701 — introspection only

        checks["cache"] = {"ok": True, "ga4_cached_reports": len(_report_cache)}
    except Exception:  # noqa: BLE001
        checks["cache"] = {"ok": True, "ga4_cached_reports": 0}

    # Storage — DB size + media footprint
    try:
        db_size = (await db.execute(text("SELECT pg_database_size(current_database())"))).scalar_one()
        media_count = (await db.execute(select(func.count(MediaAsset.id)).where(MediaAsset.is_deleted == False))).scalar_one()  # noqa: E712
        media_bytes = (await db.execute(select(func.coalesce(func.sum(MediaAsset.file_size), 0)).where(MediaAsset.is_deleted == False))).scalar_one()  # noqa: E712
        checks["storage"] = {
            "ok": True,
            "database_mb": round(int(db_size) / 1024 / 1024, 1),
            "media_files": int(media_count),
            "media_mb": round(int(media_bytes) / 1024 / 1024, 1),
        }
    except Exception as exc:  # noqa: BLE001
        checks["storage"] = {"ok": False, "error": str(exc)[:200]}

    # Cron/backup — the scheduled dump runs in GitHub Actions (external)
    checks["backup_cron"] = {
        "ok": True,
        "note": "Weekly pg_dump runs in GitHub Actions (repo → Actions → Weekly DB Backup). Requires BACKUP_DATABASE_URL secret.",
        "external": True,
    }

    healthy = sum(1 for c in checks.values() if c.get("ok"))
    return {"success": True, "data": {"checks": checks, "healthy": healthy, "total": len(checks)}}


# ─── Error Center ────────────────────────────────────────────────────────────

@router.get("/errors")
async def error_center(
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    since = datetime.now(timezone.utc) - timedelta(days=7)

    failed_orders = (await db.execute(
        select(Order.order_number, Order.customer_name, Order.total, Order.payment_status, Order.created_at)
        .where(Order.payment_status == "failed", Order.is_deleted == False)  # noqa: E712
        .order_by(Order.created_at.desc()).limit(20)
    )).all()

    assistant_errors = (await db.execute(
        select(AssistantActionLog.action, AssistantActionLog.status, AssistantActionLog.details, AssistantActionLog.created_at)
        .where(AssistantActionLog.status.in_(["error", "failed"]), AssistantActionLog.created_at >= since)
        .order_by(AssistantActionLog.created_at.desc()).limit(20)
    )).all()

    return {"success": True, "data": {
        "runtime_errors": [
            {"at": _iso(e["at"]), "logger": e["logger"], "level": e["level"],
             "message": e["message"], "count": e.get("count", 1)}
            for e in list(recent_errors)[:50]
        ],
        "failed_emails": [{**e, "at": _iso(e["at"])} for e in list(failed_emails)[:20]],
        "failed_payments": [
            {"order_number": r.order_number, "customer": r.customer_name, "total": float(r.total or 0),
             "at": r.created_at.isoformat()} for r in failed_orders
        ],
        "assistant_errors": [
            {"action": r.action, "status": r.status, "at": r.created_at.isoformat()} for r in assistant_errors
        ],
        "note": "Runtime errors are held in memory since the last restart. Set SENTRY_DSN for persistent history.",
    }}


# ─── Security Overview ───────────────────────────────────────────────────────

@router.get("/security")
async def security_overview(
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    since = datetime.now(timezone.utc) - timedelta(days=7)

    admins = (await db.execute(
        select(AdminUser.email, AdminUser.role, AdminUser.totp_enabled, AdminUser.last_login, AdminUser.is_active)
        .order_by(AdminUser.last_login.desc().nullslast())
    )).all()

    audit_tail = (await db.execute(
        select(ActivityLog.action, ActivityLog.entity_type, ActivityLog.created_at, AdminUser.email)
        .outerjoin(AdminUser, ActivityLog.admin_id == AdminUser.id)
        .order_by(ActivityLog.created_at.desc()).limit(10)
    )).all()

    suspicious = (await db.execute(
        select(AssistantActionLog.action, AssistantActionLog.details, AssistantActionLog.created_at)
        .where(AssistantActionLog.action == "business_rule_block", AssistantActionLog.created_at >= since)
        .order_by(AssistantActionLog.created_at.desc()).limit(10)
    )).all()

    return {"success": True, "data": {
        "failed_logins": [{**e, "at": _iso(e["at"])} for e in list(failed_logins)[:30]],
        "admin_accounts": [
            {"email": a.email, "role": a.role, "totp_enabled": bool(a.totp_enabled),
             "active": bool(a.is_active), "last_login": a.last_login.isoformat() if a.last_login else None}
            for a in admins
        ],
        "audit_tail": [
            {"action": r.action, "entity": r.entity_type, "by": r.email, "at": r.created_at.isoformat()}
            for r in audit_tail
        ],
        "suspicious_activity": [
            {"action": r.action, "at": r.created_at.isoformat()} for r in suspicious
        ],
        "note": "Failed logins are in-memory since last restart. Full history: Admin → Audit Logs.",
    }}


# ─── Backup & Restore ────────────────────────────────────────────────────────

_EXPORT_TABLES = {"settings": Setting, "products": Product, "services": Service}


def _row_to_dict(obj) -> dict:
    out = {}
    for col in obj.__table__.columns:
        val = getattr(obj, col.name)
        if isinstance(val, datetime):
            val = val.isoformat()
        elif hasattr(val, "hex"):  # UUID
            val = str(val)
        elif val is not None and col.type.__class__.__name__ == "Numeric":
            val = float(val)
        out[col.name] = val
    return out


@router.get("/backup/export")
async def backup_export(
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(require_admin),
):
    """Download a JSON snapshot of CMS settings + catalog (content backup).

    Complements the weekly full pg_dump (GitHub Actions) — this covers the
    hand-edited content an admin most fears losing, restorable in-panel.
    """
    payload: dict = {"exported_at": datetime.now(timezone.utc).isoformat(), "version": 1}
    for name, model in _EXPORT_TABLES.items():
        rows = (await db.execute(select(model))).scalars().all()
        payload[name] = [_row_to_dict(r) for r in rows]

    from uuid import UUID as _UUID
    db.add(ActivityLog(admin_id=_UUID(admin_id), action="backup_export", entity_type="ops",
                       new_values={"tables": list(_EXPORT_TABLES), "counts": {k: len(payload[k]) for k in _EXPORT_TABLES}}))
    await db.commit()

    body = json.dumps(payload, ensure_ascii=False, default=str)
    fname = f"abo-content-backup-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M')}.json"
    return Response(
        content=body,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@router.post("/backup/restore-settings")
async def backup_restore_settings(
    payload: dict = Body(...),
    dry_run: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(require_admin),
):
    """Restore CMS settings from a content-backup JSON.

    SAFE BY DESIGN: settings only (no order/customer data is ever touched),
    upsert-only (nothing is deleted), and dry_run=true by default returns
    what WOULD change without writing.
    """
    rows = payload.get("settings") or []
    if not isinstance(rows, list):
        return {"success": False, "message": "Invalid backup file: 'settings' list missing"}

    existing = {s.key: s for s in (await db.execute(select(Setting))).scalars().all()}
    to_update, to_create = [], []
    for row in rows:
        key = row.get("key")
        if not key:
            continue
        value = row.get("value")
        if key in existing:
            if existing[key].value != value:
                to_update.append(key)
                if not dry_run:
                    existing[key].value = value
        else:
            to_create.append(key)
            if not dry_run:
                db.add(Setting(key=key, value=value, data_type=row.get("data_type") or "string"))

    if not dry_run:
        from uuid import UUID as _UUID
        db.add(ActivityLog(admin_id=_UUID(admin_id), action="backup_restore_settings", entity_type="ops",
                           new_values={"updated": len(to_update), "created": len(to_create)}))
        await db.commit()

    return {"success": True, "data": {
        "dry_run": dry_run,
        "would_update" if dry_run else "updated": to_update[:50],
        "would_create" if dry_run else "created": to_create[:50],
        "update_count": len(to_update),
        "create_count": len(to_create),
    }}


# ─── Notification Center ─────────────────────────────────────────────────────

@router.get("/notifications")
async def notification_center(
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    """Aggregated feed of things that need an admin's attention."""
    items: list[dict] = []
    now = datetime.now(timezone.utc)
    since24h = now - timedelta(hours=24)

    for e in list(recent_errors)[:5]:
        n = e.get("count", 1)
        suffix = f" (×{n})" if n > 1 else ""
        items.append({"severity": "error", "kind": "runtime_error", "at": _iso(e["at"]), "text": e["message"][:160] + suffix})
    for e in list(failed_emails)[:5]:
        items.append({"severity": "error", "kind": "failed_email", "at": _iso(e["at"]),
                      "text": f"Email failed: {e['subject'][:60]} → {e['to']}"})
    for e in list(failed_logins)[:5]:
        items.append({"severity": "warning", "kind": "failed_login", "at": _iso(e["at"]),
                      "text": f"Failed admin login from {e['ip']} ({e['email']})"})

    failed_pay = (await db.execute(
        select(func.count(Order.id)).where(Order.payment_status == "failed", Order.created_at >= since24h, Order.is_deleted == False)  # noqa: E712
    )).scalar_one()
    if failed_pay:
        items.append({"severity": "error", "kind": "failed_payments", "at": now.isoformat(),
                      "text": f"{failed_pay} failed payment(s) in the last 24h"})

    pending_orders = (await db.execute(
        select(func.count(Order.id)).where(Order.order_status == "pending", Order.is_deleted == False)  # noqa: E712
    )).scalar_one()
    if pending_orders:
        items.append({"severity": "info", "kind": "pending_orders", "at": now.isoformat(),
                      "text": f"{pending_orders} order(s) awaiting processing"})

    pending_bookings = (await db.execute(
        select(func.count(BookingV2.id)).where(BookingV2.status == "pending", BookingV2.is_deleted == False)  # noqa: E712
    )).scalar_one()
    if pending_bookings:
        items.append({"severity": "info", "kind": "pending_bookings", "at": now.isoformat(),
                      "text": f"{pending_bookings} booking(s) awaiting confirmation"})

    low_stock = (await db.execute(
        select(func.count(Product.id)).where(
            Product.is_active == True, Product.is_deleted == False,  # noqa: E712
            Product.stock_quantity <= func.coalesce(Product.low_stock_threshold, 5),
        )
    )).scalar_one()
    if low_stock:
        items.append({"severity": "warning", "kind": "low_stock", "at": now.isoformat(),
                      "text": f"{low_stock} product(s) at or below low-stock threshold"})

    import os
    if not os.environ.get("SENTRY_DSN", "").strip():
        items.append({"severity": "info", "kind": "system", "at": now.isoformat(),
                      "text": "Sentry is not configured — set SENTRY_DSN for persistent error alerts"})

    order = {"error": 0, "warning": 1, "info": 2}
    items.sort(key=lambda x: (order.get(x["severity"], 3), x["at"]), reverse=False)
    return {"success": True, "data": {"items": items[:40], "counts": {
        "error": sum(1 for i in items if i["severity"] == "error"),
        "warning": sum(1 for i in items if i["severity"] == "warning"),
        "info": sum(1 for i in items if i["severity"] == "info"),
    }}}
