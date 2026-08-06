"""Blog ↔ product / service link helpers.

A single association table (``blog_post_links``) backs a many-to-many
relationship that is edited from both sides in the admin:

* the Product / Service form picks which blog posts an item appears in, and
* the Blog editor picks which products & services a post features.

Both write here, so the linkage has one source of truth. The ``set_*`` helpers
replace the full set for one side of an entity and validate every incoming id
against a live, non-deleted row — an unknown id is silently dropped rather than
raising, so a stale pick in the UI never blocks a save. Duplicate rows are
impossible (partial unique indexes in the DB); we also de-dupe here.
"""

from __future__ import annotations

import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import BlogPost, BlogPostLink, Product, Service


def _coerce_ids(raw: list) -> list[uuid.UUID]:
    """Turn a mixed list of str/UUID into a de-duplicated UUID list, dropping junk."""
    out: list[uuid.UUID] = []
    seen: set[uuid.UUID] = set()
    for item in raw or []:
        try:
            u = item if isinstance(item, uuid.UUID) else uuid.UUID(str(item))
        except (ValueError, TypeError, AttributeError):
            continue
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


async def _valid_ids(db: AsyncSession, model, ids: list[uuid.UUID]) -> list[uuid.UUID]:
    """Keep only ids that point at a live (non-deleted) row of ``model``."""
    if not ids:
        return []
    rows = await db.execute(
        select(model.id).where(model.id.in_(ids), model.is_deleted == False)  # noqa: E712
    )
    live = {r[0] for r in rows.all()}
    # Preserve caller order while filtering to live ids.
    return [i for i in ids if i in live]


# ---- read helpers -------------------------------------------------------

async def get_blog_ids_for_product(db: AsyncSession, product_id: uuid.UUID) -> list[str]:
    rows = await db.execute(
        select(BlogPostLink.blog_post_id).where(BlogPostLink.product_id == product_id)
    )
    return [str(r[0]) for r in rows.all()]


async def get_blog_ids_for_service(db: AsyncSession, service_id: uuid.UUID) -> list[str]:
    rows = await db.execute(
        select(BlogPostLink.blog_post_id).where(BlogPostLink.service_id == service_id)
    )
    return [str(r[0]) for r in rows.all()]


async def get_product_ids_for_blog(db: AsyncSession, blog_post_id: uuid.UUID) -> list[str]:
    rows = await db.execute(
        select(BlogPostLink.product_id).where(
            BlogPostLink.blog_post_id == blog_post_id, BlogPostLink.product_id.isnot(None)
        )
    )
    return [str(r[0]) for r in rows.all()]


async def get_service_ids_for_blog(db: AsyncSession, blog_post_id: uuid.UUID) -> list[str]:
    rows = await db.execute(
        select(BlogPostLink.service_id).where(
            BlogPostLink.blog_post_id == blog_post_id, BlogPostLink.service_id.isnot(None)
        )
    )
    return [str(r[0]) for r in rows.all()]


async def get_linked_products_for_blog(
    db: AsyncSession, blog_post_id: uuid.UUID, limit: int = 6
) -> list[Product]:
    """Active, non-deleted products explicitly linked to a post (for the rail)."""
    rows = await db.execute(
        select(Product)
        .join(BlogPostLink, BlogPostLink.product_id == Product.id)
        .where(
            BlogPostLink.blog_post_id == blog_post_id,
            Product.is_active == True,  # noqa: E712
            Product.is_deleted == False,  # noqa: E712
        )
        .order_by(Product.is_featured.desc(), Product.sort_order.asc())
        .limit(limit)
    )
    return list(rows.scalars().all())


# ---- write helpers (replace the full set for one side) ------------------

async def set_blogs_for_product(db: AsyncSession, product_id: uuid.UUID, blog_ids: list) -> None:
    ids = await _valid_ids(db, BlogPost, _coerce_ids(blog_ids))
    await db.execute(delete(BlogPostLink).where(BlogPostLink.product_id == product_id))
    for bid in ids:
        db.add(BlogPostLink(blog_post_id=bid, product_id=product_id))


async def set_blogs_for_service(db: AsyncSession, service_id: uuid.UUID, blog_ids: list) -> None:
    ids = await _valid_ids(db, BlogPost, _coerce_ids(blog_ids))
    await db.execute(delete(BlogPostLink).where(BlogPostLink.service_id == service_id))
    for bid in ids:
        db.add(BlogPostLink(blog_post_id=bid, service_id=service_id))


async def set_products_for_blog(db: AsyncSession, blog_post_id: uuid.UUID, product_ids: list) -> None:
    ids = await _valid_ids(db, Product, _coerce_ids(product_ids))
    await db.execute(
        delete(BlogPostLink).where(
            BlogPostLink.blog_post_id == blog_post_id, BlogPostLink.product_id.isnot(None)
        )
    )
    for pid in ids:
        db.add(BlogPostLink(blog_post_id=blog_post_id, product_id=pid))


async def set_services_for_blog(db: AsyncSession, blog_post_id: uuid.UUID, service_ids: list) -> None:
    ids = await _valid_ids(db, Service, _coerce_ids(service_ids))
    await db.execute(
        delete(BlogPostLink).where(
            BlogPostLink.blog_post_id == blog_post_id, BlogPostLink.service_id.isnot(None)
        )
    )
    for sid in ids:
        db.add(BlogPostLink(blog_post_id=blog_post_id, service_id=sid))
