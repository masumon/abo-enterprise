from uuid import UUID
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import require_role
from app.models.models import Review, ActivityLog
from app.schemas.schemas import ReviewCreate, ReviewOut, ApiResponse, PaginatedResponse, PaginatedMeta
from app.core.rate_limit import rate_limit


class ReviewAdminUpdate(BaseModel):
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    is_verified: Optional[bool] = None
    customer_name: Optional[str] = None
    company: Optional[str] = None
    rating: Optional[int] = None
    review_en: Optional[str] = None
    review_bn: Optional[str] = None
    photo_url: Optional[str] = None
    source: Optional[str] = None
    admin_reply: Optional[str] = None

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("", response_model=PaginatedResponse)
async def list_reviews(
    featured: bool | None = Query(None),
    product_id: UUID | None = Query(None),
    service_id: UUID | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    conditions = [Review.is_active == True, Review.is_deleted == False]  # noqa: E712
    if featured is not None:
        conditions.append(Review.is_featured == featured)
    if product_id:
        conditions.append(Review.product_id == product_id)
    if service_id:
        conditions.append(Review.service_id == service_id)

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


@router.post("", response_model=ApiResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(rate_limit("reviews_create", 5, 600))])
async def create_review(payload: ReviewCreate, db: AsyncSession = Depends(get_db)):
    data = payload.model_dump()
    data["is_active"] = False  # Public submissions require admin approval
    review = Review(**data)
    db.add(review)
    await db.flush()
    await db.refresh(review)
    return ApiResponse(data=ReviewOut.model_validate(review), message="Review submitted for moderation")


REVIEW_KINDS = ("product", "service", "site")


def review_kind_conditions(kind: str | None) -> list:
    """Admin tab filter. 'product' = attached to a product, 'service' = to a
    service, 'site' = neither (site-wide testimonial shown on /testimonials and,
    when featured, on the homepage). None/'all' = no extra filter."""
    if kind == "product":
        return [Review.product_id.is_not(None)]
    if kind == "service":
        return [Review.service_id.is_not(None)]
    if kind == "site":
        return [Review.product_id.is_(None), Review.service_id.is_(None)]
    return []


@router.get("/admin", response_model=PaginatedResponse)
async def admin_list_reviews(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    kind: str | None = Query(None, pattern="^(all|product|service|site)$"),
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_role("reviews.read")),
):
    where = [Review.is_deleted == False, *review_kind_conditions(kind)]  # noqa: E712
    total = (await db.execute(select(func.count(Review.id)).where(*where))).scalar_one()
    result = await db.execute(
        select(Review).where(*where)
        .order_by(Review.created_at.desc())
        .offset((page - 1) * per_page).limit(per_page)
    )
    reviews = result.scalars().all()
    return PaginatedResponse(
        data=[ReviewOut.model_validate(r) for r in reviews],
        meta=PaginatedMeta(page=page, per_page=per_page, total=total, total_pages=max(1, -(-total // per_page))),
    )


@router.patch("/{review_id}", response_model=ApiResponse)
async def update_review_admin(
    review_id: UUID,
    payload: ReviewAdminUpdate,
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(require_role("reviews.write")),
):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    updates = payload.model_dump(exclude_unset=True)
    if "admin_reply" in updates:
        review.admin_reply = updates.pop("admin_reply")
        review.admin_reply_at = datetime.now(timezone.utc) if review.admin_reply else None
    for field, value in updates.items():
        setattr(review, field, value)
    db.add(ActivityLog(
        admin_id=UUID(admin_id), action="update",
        entity_type="review", entity_id=review.id,
        new_values=payload.model_dump(exclude_unset=True, mode="json"),
    ))
    await db.commit()
    await db.refresh(review)
    return ApiResponse(data=ReviewOut.model_validate(review))


@router.delete("/{review_id}", response_model=ApiResponse)
async def delete_review_admin(
    review_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(require_role("reviews.write")),
):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.is_deleted = True
    db.add(ActivityLog(
        admin_id=UUID(admin_id), action="delete",
        entity_type="review", entity_id=review.id,
    ))
    await db.commit()
    return ApiResponse(data=None, message="Review deleted")
