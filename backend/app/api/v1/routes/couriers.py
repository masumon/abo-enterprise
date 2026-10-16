"""Admin → কুরিয়ার: connect couriers, test, choose AUTO/MANUAL; send / undo per order."""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import couriers as C
from app.core.database import get_db
from app.core.security import require_role
from app.models.models import ActivityLog, Order
from app.schemas.schemas import ApiResponse, OrderOut

router = APIRouter(tags=["admin-couriers"])
logger = logging.getLogger(__name__)


@router.get("/admin/couriers", response_model=ApiResponse)
async def get_couriers(db: AsyncSession = Depends(get_db), _a: str = Depends(require_role("settings.read"))):
    cfg, sec = await C.get_config(db), await C.get_secrets(db)
    providers = []
    for key, meta in C.PROVIDERS.items():
        pc = cfg["providers"].get(key) or {}
        s = sec.get(key) or {}
        providers.append({
            "key": key, "label": meta["label"], "note": meta.get("note", ""), "sandbox_supported": bool(meta.get("sandbox")),
            "enabled": bool(pc.get("enabled")) if key != "steadfast" else None, "sandbox": bool(pc.get("sandbox")),
            "fields": [{"key": k, "label": lbl, "secret": secret,
                        "value": "" if secret else (pc.get(k) or s.get(k) or ""), "set": bool(s.get(k) or pc.get(k))}
                       for k, lbl, secret in meta["fields"]],
        })
    return ApiResponse(data={"mode": cfg["mode"], "default": cfg["default"], "providers": providers,
                             "soon": C.SOON, "undo_seconds": C.UNDO_SECONDS})


class ProviderIn(BaseModel):
    enabled: bool | None = None
    sandbox: bool | None = None
    values: dict[str, str] = Field(default_factory=dict)


class CouriersIn(BaseModel):
    mode: str | None = Field(default=None, pattern="^(auto|manual)$")
    default: str | None = None
    providers: dict[str, ProviderIn] = Field(default_factory=dict)


@router.put("/admin/couriers", response_model=ApiResponse)
async def save_couriers(body: CouriersIn, db: AsyncSession = Depends(get_db),
                        admin_id: str = Depends(require_role("settings.write"))):
    cfg, sec = await C.get_config(db), await C.get_secrets(db)
    if body.mode:
        cfg["mode"] = body.mode
    if body.default:
        if body.default not in C.PROVIDERS:
            raise HTTPException(status_code=400, detail="এই কুরিয়ার সমর্থিত নয়।")
        cfg["default"] = body.default
    for key, p in body.providers.items():
        if key not in C.PROVIDERS:
            continue
        pc = cfg["providers"].setdefault(key, {})
        if p.enabled is not None:
            pc["enabled"] = p.enabled
        if p.sandbox is not None:
            pc["sandbox"] = p.sandbox
        secret_keys = {k for k, _, s in C.PROVIDERS[key]["fields"] if s}
        for k, v in p.values.items():
            v = (v or "").strip()
            if k in secret_keys:
                if v:  # empty = keep the saved secret
                    sec.setdefault(key, {})[k] = v
            elif k in {f[0] for f in C.PROVIDERS[key]["fields"]}:
                pc[k] = v
    await C.save(db, cfg, sec)
    db.add(ActivityLog(admin_id=UUID(admin_id), action="couriers_update", entity_type="setting",
                       new_values={"mode": cfg["mode"], "default": cfg["default"]}))
    await db.commit()
    return ApiResponse(data={"mode": cfg["mode"], "default": cfg["default"]}, message="সংরক্ষিত হয়েছে")


@router.post("/admin/couriers/{provider}/test", response_model=ApiResponse)
async def test_courier(provider: str, db: AsyncSession = Depends(get_db), _a: str = Depends(require_role("settings.write"))):
    if provider not in C.PROVIDERS:
        raise HTTPException(status_code=404, detail="এই কুরিয়ার সমর্থিত নয়।")
    try:
        msg = await C.test_provider(db, provider)
    except C.CourierError as exc:
        raise HTTPException(status_code=400, detail=exc.message_bn) from exc
    except Exception as exc:  # noqa: BLE001 — network errors etc. → clear Bangla message
        raise HTTPException(status_code=502, detail=f"কুরিয়ারের সার্ভারে পৌঁছানো যায়নি — একটু পরে আবার চেষ্টা করুন। ({str(exc)[:120]})") from exc
    return ApiResponse(data={"ok": True}, message=msg)


# ── per order ────────────────────────────────────────────────────────────────

async def dispatch(db: AsyncSession, order: Order, provider: str, admin_id: str | None) -> dict:
    """Book the parcel and record it on the order (shared by manual send and auto)."""
    result = await C.create_for_order(db, order, provider)
    old = order.order_status
    order.courier_provider = provider
    order.courier_tracking_id = str(result.get("tracking_code") or "")[:100] or None
    order.courier_consignment_id = str(result.get("consignment_id") or "")[:50] or None
    order.courier_dispatch_at = None
    order.courier_error = None
    if order.order_status in ("pending", "confirmed", "processing"):
        order.order_status = "shipped"
    if admin_id:  # the start-up sweeper has no admin; activity_logs.admin_id is required
        db.add(ActivityLog(admin_id=uuid.UUID(admin_id), action="courier_send", entity_type="order",
                           entity_id=order.id, old_values={"order_status": old},
                           new_values={"provider": provider, "tracking": order.courier_tracking_id}))
    await db.commit()
    return result


async def run_due_dispatch(order_id: UUID, admin_id: str | None) -> None:
    """Send an auto-scheduled order once its undo window has passed (unless undone)."""
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        order = (await db.execute(select(Order).where(Order.id == order_id))).scalar_one_or_none()
        if not order or not order.courier_dispatch_at or order.courier_tracking_id:
            return
        if order.courier_dispatch_at > datetime.now(timezone.utc):
            return
        cfg = await C.get_config(db)
        try:
            await dispatch(db, order, order.courier_provider or cfg["default"], admin_id)
        except Exception as exc:  # noqa: BLE001 — keep the error on the order for the admin
            order.courier_dispatch_at = None
            order.courier_error = getattr(exc, "message_bn", None) or str(exc)[:300]
            await db.commit()
            logger.warning("auto courier send failed for %s: %s", order.order_number, exc)


async def schedule_if_auto(db: AsyncSession, order: Order, background: BackgroundTasks, admin_id: str) -> bool:
    """Called when an admin confirms an order. AUTO mode → send after the undo window."""
    if order.courier_tracking_id or order.courier_dispatch_at:
        return False
    cfg = await C.get_config(db)
    auto = cfg["mode"] == "auto"
    if not auto and cfg["default"] == "steadfast":  # keep the old "Steadfast auto-send" switch working
        from app.core.steadfast import get_settings

        st = await get_settings(db)
        auto = st["enabled"] and st["auto_send"]
    if not auto:
        return False
    order.courier_provider = order.courier_provider or cfg["default"]
    order.courier_dispatch_at = C.dispatch_due_at()
    order.courier_error = None
    await db.commit()

    async def later() -> None:
        await asyncio.sleep(C.UNDO_SECONDS + 1)
        await run_due_dispatch(order.id, admin_id)

    background.add_task(later)
    return True


class SendIn(BaseModel):
    provider: str | None = None


@router.post("/orders/{order_id}/courier/send", response_model=ApiResponse)
async def send_now(order_id: UUID, body: SendIn, db: AsyncSession = Depends(get_db),
                   admin_id: str = Depends(require_role("orders.write"))):
    order = (await db.execute(select(Order).where(Order.id == order_id, Order.is_deleted == False))).scalar_one_or_none()  # noqa: E712
    if not order:
        raise HTTPException(status_code=404, detail="অর্ডার পাওয়া যায়নি")
    if order.courier_tracking_id:
        raise HTTPException(status_code=400, detail="এই অর্ডার আগেই কুরিয়ারে পাঠানো হয়েছে।")
    provider = body.provider or (await C.get_config(db))["default"]
    try:
        await dispatch(db, order, provider, admin_id)
    except C.CourierError as exc:
        order.courier_error = exc.message_bn
        await db.commit()
        raise HTTPException(status_code=400, detail=exc.message_bn) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"কুরিয়ারের সার্ভারে পৌঁছানো যায়নি — একটু পরে আবার চেষ্টা করুন। ({str(exc)[:120]})") from exc
    await db.refresh(order)
    return ApiResponse(data=OrderOut.model_validate(order), message=f"কুরিয়ারে পাঠানো হয়েছে — ট্র্যাকিং {order.courier_tracking_id}")


@router.post("/orders/{order_id}/courier/undo", response_model=ApiResponse)
async def undo_auto(order_id: UUID, db: AsyncSession = Depends(get_db), admin_id: str = Depends(require_role("orders.write"))):
    order = (await db.execute(select(Order).where(Order.id == order_id))).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="অর্ডার পাওয়া যায়নি")
    if order.courier_tracking_id:
        raise HTTPException(status_code=400, detail="দেরি হয়ে গেছে — অর্ডার ইতিমধ্যে কুরিয়ারে চলে গেছে।")
    order.courier_dispatch_at = None
    db.add(ActivityLog(admin_id=UUID(admin_id), action="courier_undo", entity_type="order", entity_id=order.id))
    await db.commit()
    return ApiResponse(data=None, message="কুরিয়ারে পাঠানো বাতিল হয়েছে")


async def sweeper_loop() -> None:
    """Safety net: if the server restarted inside an undo window, still send due orders."""
    from app.core.database import AsyncSessionLocal

    while True:
        await asyncio.sleep(60)
        try:
            async with AsyncSessionLocal() as db:
                ids = [r[0] for r in await db.execute(select(Order.id).where(
                    Order.courier_dispatch_at.isnot(None), Order.courier_dispatch_at <= datetime.now(timezone.utc),
                    Order.courier_tracking_id.is_(None)).limit(20))]
            for oid in ids:
                await run_due_dispatch(oid, None)
        except Exception as exc:  # noqa: BLE001
            logger.warning("courier sweeper failed: %s", exc)


def start_sweeper() -> Any:
    from app.core.config import settings

    if settings.APP_ENV.strip().lower() != "production":
        return None
    return asyncio.get_running_loop().create_task(sweeper_loop())
