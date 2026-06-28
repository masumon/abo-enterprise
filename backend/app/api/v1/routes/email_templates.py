from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import require_admin
from app.models.models import EmailTemplate, ActivityLog
from app.schemas.schemas import (
    ApiResponse,
    PaginatedResponse,
    PaginatedMeta,
    EmailTemplateCreate,
    EmailTemplateUpdate,
    EmailTemplateOut,
)

router = APIRouter(prefix="/admin/email-templates", tags=["email-templates"])


@router.get("", response_model=PaginatedResponse)
async def list_email_templates(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_admin),
):
    total = (await db.execute(select(func.count(EmailTemplate.id)))).scalar_one()
    result = await db.execute(
        select(EmailTemplate)
        .order_by(EmailTemplate.template_name.asc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    templates = result.scalars().all()
    return PaginatedResponse(
        data=[EmailTemplateOut.model_validate(t).model_dump() for t in templates],
        meta=PaginatedMeta(page=page, per_page=per_page, total=total, total_pages=max(1, -(-total // per_page))),
    )


@router.get("/{template_id}", response_model=ApiResponse)
async def get_email_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(require_admin),
):
    result = await db.execute(select(EmailTemplate).where(EmailTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return ApiResponse(data=EmailTemplateOut.model_validate(template).model_dump())


@router.post("", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
async def create_email_template(
    payload: EmailTemplateCreate,
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(require_admin),
):
    existing = await db.execute(
        select(EmailTemplate).where(EmailTemplate.template_name == payload.template_name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Template name already exists")

    template = EmailTemplate(**payload.model_dump())
    db.add(template)
    await db.flush()
    await db.refresh(template)

    log = ActivityLog(
        admin_id=UUID(admin_id),
        action="create",
        entity_type="email_template",
        entity_id=template.id,
        new_values={"template_name": template.template_name},
    )
    db.add(log)
    await db.commit()

    return ApiResponse(
        data=EmailTemplateOut.model_validate(template).model_dump(),
        message="Template created",
    )


@router.put("/{template_id}", response_model=ApiResponse)
async def update_email_template(
    template_id: UUID,
    payload: EmailTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(require_admin),
):
    result = await db.execute(select(EmailTemplate).where(EmailTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(template, field, value)

    log = ActivityLog(
        admin_id=UUID(admin_id),
        action="update",
        entity_type="email_template",
        entity_id=template.id,
    )
    db.add(log)
    await db.commit()
    await db.refresh(template)

    return ApiResponse(
        data=EmailTemplateOut.model_validate(template).model_dump(),
        message="Template updated",
    )


@router.delete("/{template_id}", response_model=ApiResponse)
async def delete_email_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(require_admin),
):
    result = await db.execute(select(EmailTemplate).where(EmailTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    await db.delete(template)

    log = ActivityLog(
        admin_id=UUID(admin_id),
        action="delete",
        entity_type="email_template",
        entity_id=template_id,
    )
    db.add(log)
    await db.commit()

    return ApiResponse(message="Template deleted")
