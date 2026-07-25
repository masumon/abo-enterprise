"""Promo slides — admin-managed image/video carousels.

One table drives every carousel on the site; `placement` selects the surface
("hero", "flash_sale"), so adding a new one needs no new endpoint.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role
from app.models.models import ActivityLog, PromoSlide
from app.schemas.schemas import (
    ApiResponse,
    PromoSlideCreate,
    PromoSlideOut,
    PromoSlideUpdate,
)

router = APIRouter(prefix="/promo-slides", tags=["promo-slides"])


def _serialize(row: PromoSlide) -> dict:
    return PromoSlideOut.model_validate(row).model_dump(mode="json")


@router.get("", response_model=ApiResponse)
async def list_promo_slides(
    placement: str = Query("hero", description="hero | flash_sale"),
    db: AsyncSession = Depends(get_db),
):
    """Live slides for one surface (public).

    Filters out inactive slides and anything outside its scheduling window, so
    a slide can be queued in advance and expires on its own.
    """
    now = datetime.now(timezone.utc)
    rows = (await db.execute(
        select(PromoSlide)
        .where(
            PromoSlide.placement == placement,
            PromoSlide.is_deleted == False,  # noqa: E712
            PromoSlide.is_active == True,  # noqa: E712
            or_(PromoSlide.starts_at.is_(None), PromoSlide.starts_at <= now),
            or_(PromoSlide.ends_at.is_(None), PromoSlide.ends_at >= now),
        )
        .order_by(PromoSlide.sort_order, PromoSlide.created_at)
    )).scalars().all()
    # A slide with no media would render an empty frame in the carousel.
    return ApiResponse(
        data=[_serialize(r) for r in rows if r.image_url or r.video_url],
        message="ok",
    )


# ==================== ADMIN ====================

@router.get("/admin/all", response_model=ApiResponse)
async def admin_list_promo_slides(
    placement: str | None = None,
    _admin: str = Depends(require_role("settings.read")),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(PromoSlide).where(PromoSlide.is_deleted == False)  # noqa: E712
    if placement:
        stmt = stmt.where(PromoSlide.placement == placement)
    rows = (await db.execute(
        stmt.order_by(PromoSlide.placement, PromoSlide.sort_order, PromoSlide.created_at)
    )).scalars().all()
    return ApiResponse(data=[_serialize(r) for r in rows], message="ok")


def _assert_has_media(image_url: str | None, video_url: str | None) -> None:
    if not (image_url or video_url):
        raise HTTPException(status_code=422, detail="Add an image or a video for this slide")


@router.post("/admin", response_model=ApiResponse)
async def create_promo_slide(
    payload: PromoSlideCreate,
    admin_id: str = Depends(require_role("settings.write")),
    db: AsyncSession = Depends(get_db),
):
    _assert_has_media(payload.image_url, payload.video_url)
    slide = PromoSlide(**payload.model_dump())
    db.add(slide)
    await db.flush()
    db.add(ActivityLog(
        admin_id=uuid.UUID(admin_id), action="create",
        entity_type="promo_slide", entity_id=slide.id,
        new_values=payload.model_dump(mode="json"),
    ))
    await db.commit()
    await db.refresh(slide)
    return ApiResponse(data=_serialize(slide), message="Slide created")


@router.put("/admin/{slide_id}", response_model=ApiResponse)
async def update_promo_slide(
    slide_id: uuid.UUID,
    payload: PromoSlideUpdate,
    admin_id: str = Depends(require_role("settings.write")),
    db: AsyncSession = Depends(get_db),
):
    slide = (await db.execute(
        select(PromoSlide).where(PromoSlide.id == slide_id, PromoSlide.is_deleted == False)  # noqa: E712
    )).scalar_one_or_none()
    if not slide:
        raise HTTPException(status_code=404, detail="Slide not found")

    changes = payload.model_dump(exclude_unset=True)
    _assert_has_media(
        changes.get("image_url", slide.image_url),
        changes.get("video_url", slide.video_url),
    )
    for key, value in changes.items():
        setattr(slide, key, value)

    db.add(ActivityLog(
        admin_id=uuid.UUID(admin_id), action="update",
        entity_type="promo_slide", entity_id=slide.id,
        new_values=payload.model_dump(exclude_unset=True, mode="json"),
    ))
    await db.commit()
    await db.refresh(slide)
    return ApiResponse(data=_serialize(slide), message="Slide updated")


@router.delete("/admin/{slide_id}", response_model=ApiResponse)
async def delete_promo_slide(
    slide_id: uuid.UUID,
    admin_id: str = Depends(require_role("settings.write")),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete — the row stays so an accidental removal is recoverable."""
    slide = (await db.execute(
        select(PromoSlide).where(PromoSlide.id == slide_id, PromoSlide.is_deleted == False)  # noqa: E712
    )).scalar_one_or_none()
    if not slide:
        raise HTTPException(status_code=404, detail="Slide not found")
    slide.is_deleted = True
    slide.is_active = False
    db.add(ActivityLog(
        admin_id=uuid.UUID(admin_id), action="delete",
        entity_type="promo_slide", entity_id=slide.id,
    ))
    await db.commit()
    return ApiResponse(data={"id": str(slide_id)}, message="Slide deleted")
