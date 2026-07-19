import html as _html
from uuid import UUID
from fastapi import APIRouter, BackgroundTasks, Depends, UploadFile, File, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import cloudinary
import cloudinary.uploader

from app.core.database import get_db
from app.core.security import require_admin, require_role, hash_password
from app.core.config import settings
from app.core.email import send_email
from app.models.models import (
    Order, BookingV2, LeadV2, Product, AdminUser, ActivityLog,
    BkashTransaction, NagadTransaction, PaymentReconciliation,
)
from app.schemas.schemas import (
    ApiResponse, DashboardStats, PaginatedResponse, PaginatedMeta,
    AdminUserCreate, AdminUserUpdate,
)

router = APIRouter(prefix="/admin", tags=["admin"])

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
)


@router.get("/stats", response_model=ApiResponse)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_admin),
):
    total_orders = await db.scalar(select(func.count(Order.id)).where(Order.is_deleted == False))
    pending_orders = await db.scalar(
        select(func.count(Order.id)).where(Order.is_deleted == False, Order.order_status == "pending")
    )
    total_bookings = await db.scalar(select(func.count(BookingV2.id)).where(BookingV2.is_deleted == False))
    pending_bookings = await db.scalar(
        select(func.count(BookingV2.id)).where(BookingV2.is_deleted == False, BookingV2.status == "pending")
    )
    total_leads = await db.scalar(select(func.count(LeadV2.id)).where(LeadV2.is_deleted == False))
    new_leads = await db.scalar(
        select(func.count(LeadV2.id)).where(LeadV2.is_deleted == False, LeadV2.status == "new")
    )
    total_products = await db.scalar(
        select(func.count(Product.id)).where(Product.is_deleted == False, Product.is_active == True)
    )

    recent_orders_result = await db.execute(
        select(Order)
        .where(Order.is_deleted == False)
        .order_by(Order.created_at.desc())
        .limit(5)
    )
    recent_orders = recent_orders_result.scalars().all()

    recent_leads_result = await db.execute(
        select(LeadV2)
        .where(LeadV2.is_deleted == False)
        .order_by(LeadV2.created_at.desc())
        .limit(5)
    )
    recent_leads = recent_leads_result.scalars().all()

    stats = DashboardStats(
        total_orders=total_orders or 0,
        pending_orders=pending_orders or 0,
        total_bookings=total_bookings or 0,
        pending_bookings=pending_bookings or 0,
        total_leads=total_leads or 0,
        new_leads=new_leads or 0,
        total_products=total_products or 0,
        recent_orders=[
            {
                "id": str(o.id),
                "order_number": o.order_number,
                "customer_name": o.customer_name,
                "total": float(o.total),
                "order_status": o.order_status,
                "created_at": o.created_at.isoformat(),
            }
            for o in recent_orders
        ],
        recent_leads=[
            {
                "id": str(l.id),
                "name": l.name,
                "lead_type": l.lead_type,
                "phone": l.phone,
                "status": l.status,
                "created_at": l.created_at.isoformat(),
            }
            for l in recent_leads
        ],
    )

    return ApiResponse(data=stats.model_dump(), message="Stats retrieved")


@router.post("/upload", response_model=ApiResponse)
async def upload_media(
    file: UploadFile = File(...),
    folder: str = Query("abo-enterprise/uploads"),
    _: dict = Depends(require_admin),
):
    ALLOWED_IMAGE_MIMES = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"}
    ALLOWED_VIDEO_MIMES = {"video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"}

    content_type = (file.content_type or "").lower().strip()
    is_image = content_type in ALLOWED_IMAGE_MIMES
    is_video = content_type in ALLOWED_VIDEO_MIMES

    if not is_image and not is_video:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type. Allowed: "
                "images (jpg, png, webp, gif, svg) or videos (mp4, webm, mov, avi)."
            ),
        )

    max_size = 50 * 1024 * 1024 if is_video else 5 * 1024 * 1024
    if file.size and file.size > max_size:
        limit = "50MB" if is_video else "5MB"
        raise HTTPException(status_code=400, detail=f"File must be under {limit}")

    # file.size is optional — measure the actual read to enforce the limit
    content = await file.read()
    if len(content) > max_size:
        limit = "50MB" if is_video else "5MB"
        raise HTTPException(status_code=413, detail=f"File must be under {limit}")
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    safe_folder = folder.strip("/").replace("..", "") or "abo-enterprise/uploads"

    upload_opts: dict = {"folder": safe_folder}
    if is_image:
        upload_opts["allowed_formats"] = ["jpg", "jpeg", "png", "webp", "gif", "svg"]
        upload_opts["transformation"] = [{"quality": "auto", "fetch_format": "auto"}]
    else:
        upload_opts["resource_type"] = "video"
        upload_opts["allowed_formats"] = ["mp4", "webm", "mov", "avi"]

    if not settings.CLOUDINARY_CLOUD_NAME or not settings.CLOUDINARY_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Cloudinary is not configured. Paste an image URL in settings instead.",
        )

    try:
        result = cloudinary.uploader.upload(content, **upload_opts)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Upload failed. Check Cloudinary credentials or paste a direct image URL.",
        ) from exc

    return ApiResponse(
        data={
            "url": result["secure_url"],
            "public_id": result["public_id"],
            "resource_type": "video" if is_video else "image",
        },
        message="File uploaded",
    )


@router.get("/users", response_model=PaginatedResponse)
async def list_admin_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_admin),
):
    total = (await db.execute(select(func.count(AdminUser.id)))).scalar_one()
    result = await db.execute(
        select(AdminUser).order_by(AdminUser.created_at.desc())
        .offset((page - 1) * per_page).limit(per_page)
    )
    users = result.scalars().all()
    return PaginatedResponse(
        data=[
            {
                "id": str(u.id),
                "email": u.email,
                "name": u.name,
                "role": u.role,
                "is_active": u.is_active,
                "last_login": u.last_login.isoformat() if u.last_login else None,
                "created_at": u.created_at.isoformat(),
            }
            for u in users
        ],
        meta=PaginatedMeta(page=page, per_page=per_page, total=total, total_pages=max(1, -(-total // per_page))),
    )


@router.post("/users", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
async def create_admin_user(
    payload: AdminUserCreate,
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(require_role("users.write")),
):
    existing = await db.execute(select(AdminUser).where(AdminUser.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = AdminUser(
        email=payload.email,
        password_hash=hash_password(payload.password),
        name=payload.name,
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    log = ActivityLog(
        admin_id=UUID(admin_id),
        action="create",
        entity_type="admin_user",
        entity_id=user.id,
        new_values={"email": user.email, "role": user.role},
    )
    db.add(log)
    await db.commit()

    return ApiResponse(
        data={
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "is_active": user.is_active,
            "last_login": None,
            "created_at": user.created_at.isoformat(),
        },
        message="User created",
    )


@router.put("/users/{user_id}", response_model=ApiResponse)
async def update_admin_user(
    user_id: UUID,
    payload: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(require_role("users.write")),
):
    result = await db.execute(select(AdminUser).where(AdminUser.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_values: dict = {}
    updates = payload.model_dump(exclude_unset=True)
    if "password" in updates:
        password = updates.pop("password")
        if password:
            user.password_hash = hash_password(password)
            old_values["password"] = "[redacted]"

    for field, value in updates.items():
        old_values[field] = getattr(user, field)
        setattr(user, field, value)

    log = ActivityLog(
        admin_id=UUID(admin_id),
        action="update",
        entity_type="admin_user",
        entity_id=user.id,
        old_values=old_values,
        new_values=updates,
    )
    db.add(log)
    await db.commit()
    await db.refresh(user)

    return ApiResponse(
        data={
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "is_active": user.is_active,
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "created_at": user.created_at.isoformat(),
        },
        message="User updated",
    )


@router.delete("/users/{user_id}", response_model=ApiResponse)
async def deactivate_admin_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(require_role("users.delete")),
):
    if str(user_id) == admin_id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

    result = await db.execute(select(AdminUser).where(AdminUser.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = False
    log = ActivityLog(
        admin_id=UUID(admin_id),
        action="deactivate",
        entity_type="admin_user",
        entity_id=user.id,
    )
    db.add(log)
    await db.commit()

    return ApiResponse(message="User deactivated")


@router.get("/payment-transactions", response_model=PaginatedResponse)
async def list_payment_transactions(
    gateway: str = Query("bkash", pattern="^(bkash|nagad|all)$"),
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_admin),
):
    rows: list[dict] = []

    if gateway in ("bkash", "all"):
        q = select(BkashTransaction).where(BkashTransaction.is_deleted == False)  # noqa: E712
        if status_filter:
            q = q.where(BkashTransaction.status.ilike(f"%{status_filter}%"))
        q = q.order_by(BkashTransaction.created_at.desc())
        result = await db.execute(q)
        for t in result.scalars().all():
            rows.append({
                "id": str(t.id),
                "gateway": "bkash",
                "reference_id": t.bkash_transaction_id,
                "payment_id": t.payment_id,
                "order_id": str(t.order_id) if t.order_id else None,
                "amount": float(t.amount),
                "status": t.status,
                "created_at": t.created_at.isoformat(),
            })

    if gateway in ("nagad", "all"):
        q = select(NagadTransaction).where(NagadTransaction.is_deleted == False)  # noqa: E712
        if status_filter:
            q = q.where(NagadTransaction.status.ilike(f"%{status_filter}%"))
        q = q.order_by(NagadTransaction.created_at.desc())
        result = await db.execute(q)
        for t in result.scalars().all():
            rows.append({
                "id": str(t.id),
                "gateway": "nagad",
                "reference_id": t.nagad_reference_id,
                "payment_id": t.merchant_order_id,
                "order_id": str(t.order_id) if t.order_id else None,
                "amount": float(t.amount),
                "status": t.status,
                "created_at": t.created_at.isoformat(),
            })

    rows.sort(key=lambda r: r["created_at"], reverse=True)
    total = len(rows)
    start = (page - 1) * per_page
    page_rows = rows[start : start + per_page]

    return PaginatedResponse(
        data=page_rows,
        meta=PaginatedMeta(
            page=page,
            per_page=per_page,
            total=total,
            total_pages=max(1, -(-total // per_page)),
        ),
    )


@router.get("/payment-reconciliation", response_model=PaginatedResponse)
async def list_payment_reconciliation(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_admin),
):
    total = (await db.execute(
        select(func.count(PaymentReconciliation.id)).where(PaymentReconciliation.is_deleted == False)  # noqa: E712
    )).scalar_one()
    result = await db.execute(
        select(PaymentReconciliation)
        .where(PaymentReconciliation.is_deleted == False)  # noqa: E712
        .order_by(PaymentReconciliation.reconciliation_date.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    records = result.scalars().all()
    return PaginatedResponse(
        data=[
            {
                "id": str(r.id),
                "reconciliation_date": r.reconciliation_date.isoformat(),
                "payment_gateway": r.payment_gateway,
                "total_transactions": r.total_transactions,
                "total_amount": float(r.total_amount),
                "successful_count": r.successful_count,
                "failed_count": r.failed_count,
                "pending_count": r.pending_count,
                "reconciliation_status": r.reconciliation_status,
                "notes": r.notes,
                "created_at": r.created_at.isoformat(),
            }
            for r in records
        ],
        meta=PaginatedMeta(page=page, per_page=per_page, total=total, total_pages=max(1, -(-total // per_page))),
    )


@router.get("/audit-logs", response_model=PaginatedResponse)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_admin),
):
    total = (await db.execute(select(func.count(ActivityLog.id)))).scalar_one()
    result = await db.execute(
        select(ActivityLog, AdminUser.email)
        .outerjoin(AdminUser, ActivityLog.admin_id == AdminUser.id)
        .order_by(ActivityLog.created_at.desc())
        .offset((page - 1) * per_page).limit(per_page)
    )
    rows = result.all()
    return PaginatedResponse(
        data=[
            {
                "id": str(log.id),
                "admin_id": str(log.admin_id),
                "admin_email": email,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": str(log.entity_id) if log.entity_id else None,
                "created_at": log.created_at.isoformat(),
            }
            for log, email in rows
        ],
        meta=PaginatedMeta(page=page, per_page=per_page, total=total, total_pages=max(1, -(-total // per_page))),
    )


# ── Manual admin → customer email ─────────────────────────────────────────
class AdminEmailSend(BaseModel):
    to: EmailStr
    subject: str
    message: str

    @field_validator("subject", "message")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("Subject and message are required")
        return v


def _admin_email_html(subject: str, message: str) -> str:
    """Branded wrapper for a free-text admin message (plain text → safe HTML)."""
    safe = _html.escape(message).replace("\n", "<br>")
    safe_subject = _html.escape(subject)
    return (
        '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;'
        'border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">'
        '<div style="background:#1e5ba8;padding:20px 24px;color:#fff">'
        '<div style="font-size:18px;font-weight:bold">ABO Enterprise</div>'
        '<div style="font-size:12px;opacity:.85">ABO ENTERPRISE : Simple Solution</div>'
        '</div>'
        f'<div style="padding:24px;color:#1e293b;font-size:14px;line-height:1.6">'
        f'<h2 style="font-size:16px;margin:0 0 12px;color:#153e75">{safe_subject}</h2>'
        f'<div>{safe}</div>'
        '</div>'
        '<div style="padding:16px 24px;background:#f8faff;color:#64748b;font-size:12px;'
        'border-top:1px solid #e2e8f0">ABO Enterprise · info@aboenterprise.com</div>'
        '</div>'
    )


@router.post("/email/send", response_model=ApiResponse)
async def admin_send_email(
    payload: AdminEmailSend,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(require_admin),
):
    """Send a manual, admin-composed email to a customer.

    Delivered server-side through the configured business (no-reply) sender —
    the same channel as the automatic notifications — so it reaches the
    customer from ABO Enterprise's address rather than the admin's own inbox.
    Used across Orders, Bookings and Leads in the admin panel.
    """
    html = _admin_email_html(payload.subject, payload.message)
    background_tasks.add_task(send_email, str(payload.to), payload.subject, html)
    db.add(ActivityLog(
        admin_id=UUID(admin_id),
        action="email",
        entity_type="email",
        new_values={"to": str(payload.to), "subject": payload.subject},
    ))
    await db.commit()
    return ApiResponse(message=f"Email sent to {payload.to}")
