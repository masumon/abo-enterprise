"""Admin-facing newsletter subscriber management — real table (0024),
replacing the newsletter_subscribers Setting JSON blob. Public signup stays
in public.py (POST /api/v1/public/newsletter); this file only covers the
admin list/delete surface."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role
from app.models.models import NewsletterSubscriber, ActivityLog
from app.schemas.schemas import ApiResponse, PaginatedResponse, PaginatedMeta

router = APIRouter(prefix="/admin/newsletter", tags=["newsletter"])


@router.get("/subscribers", response_model=PaginatedResponse)
async def list_subscribers(
    page: int = Query(1, ge=1),
    per_page: int = Query(100, ge=1, le=500),
    search: str | None = None,
    status: str = Query("active", pattern="^(active|unsubscribed)$"),
    admin_id: str = Depends(require_role("settings.read")),
    db: AsyncSession = Depends(get_db),
):
    conditions = [NewsletterSubscriber.is_active == (status == "active")]
    if search:
        conditions.append(NewsletterSubscriber.email.ilike(f"%{search}%"))

    total = (await db.execute(
        select(func.count(NewsletterSubscriber.id)).where(*conditions)
    )).scalar() or 0

    result = await db.execute(
        select(NewsletterSubscriber).where(*conditions)
        .order_by(NewsletterSubscriber.subscribed_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    subs = result.scalars().all()

    return PaginatedResponse(
        data=[
            {
                "id": str(s.id),
                "email": s.email,
                "subscribed_at": s.subscribed_at.isoformat(),
                "source": s.source,
                "unsubscribed_at": s.unsubscribed_at.isoformat() if s.unsubscribed_at else None,
            }
            for s in subs
        ],
        message="Subscribers fetched successfully",
        meta=PaginatedMeta(page=page, per_page=per_page, total=total, total_pages=max(1, -(-total // per_page))),
    )


@router.delete("/subscribers/{subscriber_id}", response_model=ApiResponse)
async def remove_subscriber(
    subscriber_id: uuid.UUID,
    admin_id: str = Depends(require_role("settings.write")),
    db: AsyncSession = Depends(get_db),
):
    """Unsubscribe (soft) — keeps the historical row instead of deleting it."""
    result = await db.execute(select(NewsletterSubscriber).where(NewsletterSubscriber.id == subscriber_id))
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    from datetime import datetime, timezone
    sub.is_active = False
    sub.unsubscribed_at = datetime.now(timezone.utc)

    db.add(ActivityLog(
        admin_id=uuid.UUID(admin_id), action="delete",
        entity_type="newsletter_subscriber", entity_id=sub.id,
        old_values={"email": sub.email},
    ))
    await db.commit()

    return ApiResponse(message="Subscriber removed")



# ── Stats, manual add, restore ───────────────────────────────────────────────
import asyncio  # noqa: E402
import hashlib  # noqa: E402
import hmac  # noqa: E402
import html as _html  # noqa: E402
import logging  # noqa: E402
import re  # noqa: E402
from datetime import datetime, timedelta, timezone  # noqa: E402

from fastapi import BackgroundTasks  # noqa: E402
from fastapi.responses import HTMLResponse  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

from app.core.config import settings  # noqa: E402

logger = logging.getLogger(__name__)
_EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")


@router.get("/stats", response_model=ApiResponse)
async def newsletter_stats(admin_id: str = Depends(require_role("settings.read")), db: AsyncSession = Depends(get_db)):
    month_ago = datetime.now(timezone.utc) - timedelta(days=30)
    active = (await db.execute(select(func.count(NewsletterSubscriber.id)).where(NewsletterSubscriber.is_active == True))).scalar() or 0  # noqa: E712
    gone = (await db.execute(select(func.count(NewsletterSubscriber.id)).where(NewsletterSubscriber.is_active == False))).scalar() or 0  # noqa: E712
    new30 = (await db.execute(select(func.count(NewsletterSubscriber.id)).where(
        NewsletterSubscriber.is_active == True, NewsletterSubscriber.subscribed_at >= month_ago))).scalar() or 0  # noqa: E712
    return ApiResponse(data={"active": active, "unsubscribed": gone, "new_30_days": new30})


class AddSubscribersIn(BaseModel):
    emails: str = Field(..., max_length=20000)


@router.post("/subscribers", response_model=ApiResponse)
async def add_subscribers(payload: AddSubscribersIn, admin_id: str = Depends(require_role("settings.write")),
                          db: AsyncSession = Depends(get_db)):
    """Add e-mails by hand (one per line or comma-separated). Returns counts."""
    emails = list(dict.fromkeys(e.strip().lower() for e in re.split(r"[\s,;]+", payload.emails) if e.strip()))
    valid = [e for e in emails if _EMAIL_RE.match(e)][:2000]
    added = restored = existing = 0
    for e in valid:
        sub = (await db.execute(select(NewsletterSubscriber).where(NewsletterSubscriber.email == e))).scalar_one_or_none()
        if sub is None:
            db.add(NewsletterSubscriber(email=e, source="admin"))
            added += 1
        elif not sub.is_active:
            sub.is_active, sub.unsubscribed_at = True, None
            restored += 1
        else:
            existing += 1
    await db.commit()
    return ApiResponse(data={"added": added, "restored": restored, "already": existing, "invalid": len(emails) - len(valid)})


@router.post("/subscribers/{subscriber_id}/restore", response_model=ApiResponse)
async def restore_subscriber(subscriber_id: uuid.UUID, admin_id: str = Depends(require_role("settings.write")),
                             db: AsyncSession = Depends(get_db)):
    sub = (await db.execute(select(NewsletterSubscriber).where(NewsletterSubscriber.id == subscriber_id))).scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    sub.is_active, sub.unsubscribed_at = True, None
    await db.commit()
    return ApiResponse(message="Subscriber restored")


# ── Campaign: e-mail every active subscriber (with unsubscribe link) ─────────
def unsubscribe_token(email: str) -> str:
    return hmac.new(settings.SECRET_KEY.encode(), f"unsub:{email.lower()}".encode(), hashlib.sha256).hexdigest()[:32]


def body_to_html(text: str) -> str:
    """Plain text (with **bold**, links, bullet lines) → safe e-mail HTML."""
    out = _html.escape(text or "")
    out = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", out)
    out = re.sub(r"\[([^\]]+)\]\((https?://[^\s)]+)\)", r'<a href="\2">\1</a>', out)
    out = re.sub(r'(?<!href=")(?<!">)(https?://[^\s<]+)', r'<a href="\1">\1</a>', out)
    out = re.sub(r"\{/?[a-z]+\}|:[a-z]+:", "", out)
    return out.replace("\n", "<br>")


def campaign_html(body: str, email: str) -> str:
    api = settings.FRONTEND_URL.rstrip("/").replace("://www.", "://api.")
    link = f"{api}/api/v1/public/newsletter/unsubscribe?e={_html.escape(email)}&t={unsubscribe_token(email)}"
    return (
        '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;max-width:600px;margin:auto">'
        f"{body_to_html(body)}"
        '<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">'
        '<p style="font-size:12px;color:#6b7280">ABO Enterprise, Beanibazar, Sylhet · '
        f'<a href="{settings.FRONTEND_URL}" style="color:#6b7280">aboenterprise.com</a><br>'
        f'আর ইমেইল পেতে না চাইলে <a href="{link}" style="color:#6b7280">এখানে চাপুন (Unsubscribe)</a></p></div>'
    )


class CampaignIn(BaseModel):
    subject: str = Field(..., min_length=3, max_length=200)
    body: str = Field(..., min_length=10, max_length=20000)
    test_email: str | None = Field(None, max_length=255)


async def _send_campaign(subject: str, body: str, emails: list[str]) -> None:
    from app.core.email import send_email

    for i, e in enumerate(emails):
        try:
            await send_email(e, subject, campaign_html(body, e), retries=1)
        except Exception as exc:  # noqa: BLE001 — never stop the batch
            logger.warning("newsletter send to %s failed: %s", e, exc)
        await asyncio.sleep(0.6)  # stay under provider rate limits
        if i and i % 50 == 0:
            logger.info("newsletter: %d/%d sent", i, len(emails))


@router.post("/send", response_model=ApiResponse)
async def send_campaign(payload: CampaignIn, background: BackgroundTasks,
                        admin_id: str = Depends(require_role("settings.write")), db: AsyncSession = Depends(get_db)):
    """Send to a test address only, or to every active subscriber in the background."""
    if payload.test_email:
        if not _EMAIL_RE.match(payload.test_email.strip()):
            raise HTTPException(status_code=400, detail="সঠিক ইমেইল ঠিকানা দিন।")
        background.add_task(_send_campaign, "[TEST] " + payload.subject, payload.body, [payload.test_email.strip()])
        return ApiResponse(data={"queued": 1, "test": True}, message="Test e-mail queued")
    emails = (await db.execute(select(NewsletterSubscriber.email).where(NewsletterSubscriber.is_active == True).limit(5000))).scalars().all()  # noqa: E712
    if not emails:
        raise HTTPException(status_code=400, detail="কোনো সক্রিয় সাবস্ক্রাইবার নেই।")
    db.add(ActivityLog(admin_id=uuid.UUID(admin_id), action="send", entity_type="newsletter_campaign",
                       new_values={"subject": payload.subject, "recipients": len(emails)}))
    await db.commit()
    background.add_task(_send_campaign, payload.subject, payload.body, list(emails))
    return ApiResponse(data={"queued": len(emails), "test": False}, message="Campaign queued")


# ── Public one-click unsubscribe (link in every campaign e-mail) ─────────────
public_router = APIRouter(prefix="/public/newsletter", tags=["newsletter"])


@public_router.get("/unsubscribe", response_class=HTMLResponse)
async def public_unsubscribe(e: str = Query(..., max_length=255), t: str = Query(..., max_length=64),
                             db: AsyncSession = Depends(get_db)):
    ok = hmac.compare_digest(t, unsubscribe_token(e))
    if ok:
        sub = (await db.execute(select(NewsletterSubscriber).where(NewsletterSubscriber.email == e.lower()))).scalar_one_or_none()
        if sub and sub.is_active:
            sub.is_active, sub.unsubscribed_at = False, datetime.now(timezone.utc)
            await db.commit()
    msg = "আপনাকে তালিকা থেকে সরানো হয়েছে — আর নিউজলেটার যাবে না।<br>You have been unsubscribed." if ok else "লিংকটি সঠিক নয় / Invalid link."
    return HTMLResponse(
        '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>ABO Enterprise</title><div style="font-family:Arial,sans-serif;max-width:480px;margin:60px auto;padding:24px;'
        f'text-align:center;line-height:1.7">{msg}<p><a href="{settings.FRONTEND_URL}">aboenterprise.com</a></p></div>',
        status_code=200 if ok else 400,
    )
