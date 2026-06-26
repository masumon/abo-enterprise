from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.core.database import get_db
from app.core.security import require_admin
from app.models.models import Review
from app.schemas.schemas import ReviewCreate, ReviewOut, ApiResponse, PaginatedResponse, PaginatedMeta

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("", response_model=PaginatedResponse)
async def list_reviews(
    featured: bool | None = Query(None),
    product_id: UUID | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    conditions = [Review.is_active == True]  # noqa: E712
    if featured is not None:
        conditions.append(Review.is_featured == featured)
    if product_id:
        conditions.append(Review.product_id == product_id)

    total = (await db.execute(select(func.count(Review.id)).where(and_(*conditions)))).scalar_one()
    result = await db.execute(
        select(Review).where(and_(*conditions))
        .order_by(Review.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    reviews = result.scalars().all()
    return PaginatedResponse(
        data=[ReviewOut.model_validate(r) for r in reviews],
        meta=PaginatedMeta(page=page, per_page=per_page, total=total, total_pages=max(1, -(-total // per_page))),
    )


@router.post("", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
async def create_review(payload: ReviewCreate, db: AsyncSession = Depends(get_db)):
    review = Review(**payload.model_dump())
    db.add(review)
    await db.flush()
    await db.refresh(review)
    return ApiResponse(data=ReviewOut.model_validate(review), message="Review submitted for moderation")


@router.get("/admin", response_model=PaginatedResponse)
async def admin_list_reviews(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    total = (await db.execute(select(func.count(Review.id)))).scalar_one()
    result = await db.execute(
        select(Review).order_by(Review.created_at.desc())
        .offset((page - 1) * per_page).limit(per_page)
    )
    reviews = result.scalars().all()
    return PaginatedResponse(
        data=[ReviewOut.model_validate(r) for r in reviews],
        meta=PaginatedMeta(page=page, per_page=per_page, total=total, total_pages=max(1, -(-total // per_page))),
    )
