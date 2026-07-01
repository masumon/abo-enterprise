from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import CareerApplication
from app.schemas.schemas import (
    ApiResponse,
    PaginatedResponse,
    PaginatedMeta,
    CareerApplicationCreate,
    CareerApplicationUpdate,
    CareerApplicationResponse,
)
from app.core.security import require_admin

router = APIRouter(prefix="/career", tags=["career"])


@router.post("", response_model=ApiResponse)
async def submit_career_application(payload: CareerApplicationCreate, db: AsyncSession = Depends(get_db)):
    """Public endpoint for career applications."""
    app = CareerApplication(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        position=payload.position,
        cover_letter=payload.cover_letter,
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return ApiResponse(
        data=CareerApplicationResponse.model_validate(app),
        message="Application submitted successfully",
    )


@router.get("/admin/applications", response_model=PaginatedResponse)
async def list_career_applications(
    page: int = 1,
    per_page: int = 20,
    status: str | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(require_admin),
):
    """Admin endpoint to list all career applications."""
    query = select(CareerApplication).where(CareerApplication.is_deleted == False)  # noqa: E712

    if status:
        query = query.where(CareerApplication.status == status)

    if search:
        search_term = f"%{search.lower()}%"
        from sqlalchemy import or_
        query = query.where(
            or_(
                CareerApplication.name.ilike(search_term),
                CareerApplication.email.ilike(search_term),
                CareerApplication.phone.ilike(search_term),
                CareerApplication.position.ilike(search_term),
            )
        )

    total = (await db.execute(select(func.count(CareerApplication.id)).where(CareerApplication.is_deleted == False))).scalar() or 0  # noqa: E712

    query = query.order_by(CareerApplication.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    applications = (await db.execute(query)).scalars().all()

    return PaginatedResponse(
        data=[CareerApplicationResponse.model_validate(app) for app in applications],
        meta=PaginatedMeta(
            page=page,
            per_page=per_page,
            total=total,
            total_pages=(total + per_page - 1) // per_page,
        ),
    )


@router.get("/admin/applications/{app_id}", response_model=ApiResponse)
async def get_career_application(
    app_id: str,
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(require_admin),
):
    """Get a specific career application."""
    import uuid
    try:
        app_uuid = uuid.UUID(app_id)
    except ValueError:
        return ApiResponse(success=False, message="Invalid application ID")

    query = select(CareerApplication).where(
        CareerApplication.id == app_uuid,
        CareerApplication.is_deleted == False,  # noqa: E712
    )
    result = await db.execute(query)
    app = result.scalar_one_or_none()

    if not app:
        return ApiResponse(success=False, message="Application not found")

    return ApiResponse(data=CareerApplicationResponse.model_validate(app))


@router.patch("/admin/applications/{app_id}", response_model=ApiResponse)
async def update_career_application(
    app_id: str,
    payload: CareerApplicationUpdate,
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(require_admin),
):
    """Update career application status and notes."""
    import uuid
    try:
        app_uuid = uuid.UUID(app_id)
    except ValueError:
        return ApiResponse(success=False, message="Invalid application ID")

    query = select(CareerApplication).where(
        CareerApplication.id == app_uuid,
        CareerApplication.is_deleted == False,  # noqa: E712
    )
    result = await db.execute(query)
    app = result.scalar_one_or_none()

    if not app:
        return ApiResponse(success=False, message="Application not found")

    if payload.status:
        app.status = payload.status
    if payload.notes is not None:
        app.notes = payload.notes

    await db.commit()
    await db.refresh(app)

    return ApiResponse(
        data=CareerApplicationResponse.model_validate(app),
        message="Application updated",
    )


@router.delete("/admin/applications/{app_id}", response_model=ApiResponse)
async def delete_career_application(
    app_id: str,
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(require_admin),
):
    """Delete (soft) a career application."""
    import uuid
    try:
        app_uuid = uuid.UUID(app_id)
    except ValueError:
        return ApiResponse(success=False, message="Invalid application ID")

    query = select(CareerApplication).where(
        CareerApplication.id == app_uuid,
        CareerApplication.is_deleted == False,  # noqa: E712
    )
    result = await db.execute(query)
    app = result.scalar_one_or_none()

    if not app:
        return ApiResponse(success=False, message="Application not found")

    app.is_deleted = True
    await db.commit()

    return ApiResponse(message="Application deleted")
