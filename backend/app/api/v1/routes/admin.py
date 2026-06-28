from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import cloudinary
import cloudinary.uploader

from app.core.database import get_db
from app.core.security import require_admin
from app.core.config import settings
from app.models.models import Order, Booking, Lead, Product, AdminUser, ActivityLog
from app.schemas.schemas import ApiResponse, DashboardStats, PaginatedResponse, PaginatedMeta

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
    total_bookings = await db.scalar(select(func.count(Booking.id)).where(Booking.is_deleted == False))
    pending_bookings = await db.scalar(
        select(func.count(Booking.id)).where(Booking.is_deleted == False, Booking.status == "pending")
    )
    total_leads = await db.scalar(select(func.count(Lead.id)).where(Lead.is_deleted == False))
    new_leads = await db.scalar(
        select(func.count(Lead.id)).where(Lead.is_deleted == False, Lead.status == "new")
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
        select(Lead)
        .where(Lead.is_deleted == False)
        .order_by(Lead.created_at.desc())
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
    content_type = file.content_type or ""
    is_image = content_type.startswith("image/")
    is_video = content_type.startswith("video/")

    if not is_image and not is_video:
        raise HTTPException(status_code=400, detail="File must be an image or video")

    max_size = 50 * 1024 * 1024 if is_video else 5 * 1024 * 1024
    if file.size and file.size > max_size:
        limit = "50MB" if is_video else "5MB"
        raise HTTPException(status_code=400, detail=f"File must be under {limit}")

    content = await file.read()
    safe_folder = folder.strip("/").replace("..", "") or "abo-enterprise/uploads"

    upload_opts: dict = {"folder": safe_folder}
    if is_image:
        upload_opts["allowed_formats"] = ["jpg", "jpeg", "png", "webp", "gif", "svg"]
        upload_opts["transformation"] = [{"quality": "auto", "fetch_format": "auto"}]
    else:
        upload_opts["resource_type"] = "video"
        upload_opts["allowed_formats"] = ["mp4", "webm", "mov", "avi"]

    result = cloudinary.uploader.upload(content, **upload_opts)

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


@router.get("/audit-logs", response_model=PaginatedResponse)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_admin),
):
    total = (await db.execute(select(func.count(ActivityLog.id)))).scalar_one()
    result = await db.execute(
        select(ActivityLog).order_by(ActivityLog.created_at.desc())
        .offset((page - 1) * per_page).limit(per_page)
    )
    logs = result.scalars().all()
    return PaginatedResponse(
        data=[
            {
                "id": str(log.id),
                "admin_id": str(log.admin_id),
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": str(log.entity_id) if log.entity_id else None,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ],
        meta=PaginatedMeta(page=page, per_page=per_page, total=total, total_pages=max(1, -(-total // per_page))),
    )
