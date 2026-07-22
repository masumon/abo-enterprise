import logging
import re
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.core.database import get_db
from app.core.security import require_admin
from app.models.models import BlogPost, ActivityLog
from app.schemas.schemas import (
    BlogPostOut,
    BlogPostCreate,
    BlogPostUpdate,
    PaginatedResponse,
    PaginatedMeta,
    ApiResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/blog", tags=["blog"])

# Google's translate endpoint caps each request; stay safely under it.
_TRANSLATE_MAX_CHARS = 4500


class TranslateRequest(BaseModel):
    text: str
    source: str = "bn"
    target: str = "en"


def _translate(text: str, source: str, target: str) -> str:
    """Server-side Bangla↔English translation.

    Runs on the backend (no browser CORS / MyMemory length limits). Short text
    goes in one request (best structure preservation); long text is translated
    line-by-line so paragraph breaks survive. Google first, MyMemory as a
    fallback. Raises on total failure so the caller never writes a failed
    translation (or the source text) into the English field.
    """
    from deep_translator import GoogleTranslator, MyMemoryTranslator

    def _mymemory(chunk: str) -> str:
        # MyMemory rejects requests over ~500 chars, so split on sentence
        # boundaries into <=480-char pieces (Google's fallback used to send the
        # whole 4500-char chunk here and always failed on long text).
        if len(chunk) <= 480:
            return MyMemoryTranslator(source=source, target=target).translate(chunk)
        pieces, buf = [], ""
        for p in re.split(r"(?<=[।.!?])\s+", chunk):
            if len(buf) + len(p) + 1 > 480:
                if buf:
                    pieces.append(buf)
                buf = p[:480]
            else:
                buf = f"{buf} {p}".strip()
        if buf:
            pieces.append(buf)
        return " ".join(MyMemoryTranslator(source=source, target=target).translate(x) for x in pieces if x.strip())

    def _one(chunk: str) -> str:
        try:
            out = GoogleTranslator(source=source, target=target).translate(chunk)
            if out and out.strip():
                return out
            raise ValueError("empty result")
        except Exception as exc:  # noqa: BLE001 — fall back to MyMemory
            logger.warning("Google translate failed (%s); trying MyMemory", exc)
            return _mymemory(chunk)

    text = text.strip()
    if not text:
        return ""
    if len(text) <= _TRANSLATE_MAX_CHARS:
        return _one(text)

    # Long content: preserve line breaks, translate non-blank lines (chunking
    # any single very long line on sentence boundaries).
    out: list[str] = []
    for line in text.split("\n"):
        if not line.strip():
            out.append("")
            continue
        if len(line) <= _TRANSLATE_MAX_CHARS:
            out.append(_one(line))
            continue
        parts = re.split(r"(?<=[।.!?])\s+", line)
        buf, chunks = "", []
        for p in parts:
            if len(buf) + len(p) + 1 > _TRANSLATE_MAX_CHARS:
                chunks.append(buf)
                buf = p
            else:
                buf = f"{buf} {p}".strip()
        if buf:
            chunks.append(buf)
        out.append(" ".join(_one(c) for c in chunks))
    return "\n".join(out)


@router.post("/admin/translate", response_model=ApiResponse)
async def translate_blog_text(
    payload: TranslateRequest,
    admin_id: str = Depends(require_admin),
):
    """Translate blog text (admin only). Returns {translated}; 502 on failure so
    the admin UI can prompt for a manual English entry instead of saving Bangla."""
    try:
        translated = _translate(payload.text, payload.source, payload.target)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Blog translate failed: %s", exc)
        raise HTTPException(status_code=502, detail="Translation service unavailable")
    return ApiResponse(data={"translated": translated}, message="ok")


# ==================== PUBLIC ENDPOINTS ====================

@router.get("", response_model=PaginatedResponse)
async def list_posts(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    category: str | None = None,
    featured: bool | None = None,
):
    """List published blog posts (public)"""
    base_filter = and_(BlogPost.is_deleted == False, BlogPost.status == "published")
    query = select(BlogPost).where(base_filter)

    if category:
        query = query.where(BlogPost.category == category)
    if featured is not None:
        query = query.where(BlogPost.is_featured == featured)

    count_query = select(func.count(BlogPost.id)).where(base_filter)
    if category:
        count_query = count_query.where(BlogPost.category == category)
    if featured is not None:
        count_query = count_query.where(BlogPost.is_featured == featured)

    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0
    total_pages = max(1, (total + per_page - 1) // per_page)

    query = (
        query.order_by(BlogPost.published_at.desc(), BlogPost.sort_order)
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    result = await db.execute(query)
    posts = result.scalars().all()

    return PaginatedResponse(
        data=[BlogPostOut.model_validate(p).model_dump() for p in posts],
        message="Posts fetched successfully",
        meta=PaginatedMeta(page=page, per_page=per_page, total=total, total_pages=total_pages),
    )


@router.get("/{slug}", response_model=ApiResponse)
async def get_post(slug: str, db: AsyncSession = Depends(get_db)):
    """Get published blog post by slug (public)"""
    result = await db.execute(
        select(BlogPost).where(
            and_(BlogPost.slug == slug, BlogPost.is_deleted == False, BlogPost.status == "published")
        )
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    return ApiResponse(data=BlogPostOut.model_validate(post).model_dump(), message="Post fetched successfully")


# ==================== ADMIN ENDPOINTS ====================

@router.get("/admin/posts", response_model=PaginatedResponse)
async def list_posts_admin(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: str | None = None,
):
    """List all blog posts (admin)"""
    query = select(BlogPost).where(BlogPost.is_deleted == False)
    count_query = select(func.count(BlogPost.id)).where(BlogPost.is_deleted == False)

    if status:
        query = query.where(BlogPost.status == status)
        count_query = count_query.where(BlogPost.status == status)

    total = (await db.execute(count_query)).scalar() or 0
    total_pages = max(1, (total + per_page - 1) // per_page)

    query = (
        query.order_by(BlogPost.updated_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    result = await db.execute(query)
    posts = result.scalars().all()

    return PaginatedResponse(
        data=[BlogPostOut.model_validate(p).model_dump() for p in posts],
        message="Posts fetched successfully",
        meta=PaginatedMeta(page=page, per_page=per_page, total=total, total_pages=total_pages),
    )


@router.post("/admin/posts", response_model=ApiResponse)
async def create_post(
    payload: BlogPostCreate,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create blog post (admin only)"""
    existing = await db.execute(select(BlogPost).where(BlogPost.slug == payload.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Slug already exists")

    data = payload.model_dump()
    if data.get("status") == "published" and not data.get("published_at"):
        data["published_at"] = datetime.now(timezone.utc)

    post = BlogPost(**data)
    db.add(post)
    await db.commit()
    await db.refresh(post)

    log = ActivityLog(
        admin_id=uuid.UUID(admin_id),
        action="create",
        entity_type="blog_post",
        entity_id=post.id,
        new_values={"slug": post.slug, "title_en": post.title_en},
    )
    db.add(log)
    await db.commit()

    return ApiResponse(data=BlogPostOut.model_validate(post).model_dump(), message="Post created successfully")


@router.get("/admin/posts/{post_id}", response_model=ApiResponse)
async def get_post_admin(
    post_id: uuid.UUID,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get any blog post (admin)"""
    result = await db.execute(
        select(BlogPost).where(and_(BlogPost.id == post_id, BlogPost.is_deleted == False))
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    return ApiResponse(data=BlogPostOut.model_validate(post).model_dump(), message="Post fetched successfully")


@router.put("/admin/posts/{post_id}", response_model=ApiResponse)
async def update_post(
    post_id: uuid.UUID,
    payload: BlogPostUpdate,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update blog post (admin only)"""
    result = await db.execute(
        select(BlogPost).where(and_(BlogPost.id == post_id, BlogPost.is_deleted == False))
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    update_data = payload.model_dump(exclude_unset=True)

    if update_data.get("status") == "published" and not post.published_at and not update_data.get("published_at"):
        update_data["published_at"] = datetime.now(timezone.utc)

    for field, value in update_data.items():
        setattr(post, field, value)

    await db.commit()
    await db.refresh(post)

    log = ActivityLog(
        admin_id=uuid.UUID(admin_id),
        action="update",
        entity_type="blog_post",
        entity_id=post.id,
        new_values={k: (v.isoformat() if hasattr(v, "isoformat") else v) for k, v in update_data.items()},
    )
    db.add(log)
    await db.commit()

    return ApiResponse(data=BlogPostOut.model_validate(post).model_dump(), message="Post updated successfully")


@router.delete("/admin/posts/{post_id}", response_model=ApiResponse)
async def delete_post(
    post_id: uuid.UUID,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete blog post (admin only)"""
    result = await db.execute(
        select(BlogPost).where(and_(BlogPost.id == post_id, BlogPost.is_deleted == False))
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    post.is_deleted = True
    await db.commit()

    log = ActivityLog(
        admin_id=uuid.UUID(admin_id),
        action="delete",
        entity_type="blog_post",
        entity_id=post.id,
    )
    db.add(log)
    await db.commit()

    return ApiResponse(message="Post deleted successfully")
