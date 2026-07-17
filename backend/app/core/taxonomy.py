"""Unlimited-depth taxonomy helpers (categories.parent_id tree).

The whole tree is a few hundred small rows at most, so every helper loads it
in one SELECT and walks it in Python — no recursive SQL needed, which keeps
free-tier Postgres happy and the logic testable.

Legacy note: products/services carry both ``category_id`` and (pre-0008)
``subcategory_id``. Migration 0008 copied subcategories into ``categories``
with the *same UUIDs*, so a descendant id-set matches either column.
"""

import uuid
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Category


async def load_categories(db: AsyncSession, include_inactive: bool = False) -> list[Category]:
    stmt = select(Category).where(Category.is_deleted == False)  # noqa: E712
    if not include_inactive:
        stmt = stmt.where(Category.is_active == True)  # noqa: E712
    return list((await db.execute(stmt)).scalars().all())


def children_map(cats: list[Category]) -> dict[uuid.UUID | None, list[Category]]:
    by_parent: dict[uuid.UUID | None, list[Category]] = defaultdict(list)
    for c in cats:
        by_parent[c.parent_id].append(c)
    for lst in by_parent.values():
        lst.sort(key=lambda c: (c.sort_order, c.name_en))
    return by_parent


def subtree_ids(root_id: uuid.UUID, by_parent: dict) -> list[uuid.UUID]:
    """The node itself plus every descendant (BFS, cycle-safe)."""
    ids: list[uuid.UUID] = []
    seen: set[uuid.UUID] = set()
    queue = [root_id]
    while queue:
        nid = queue.pop()
        if nid in seen:
            continue
        seen.add(nid)
        ids.append(nid)
        queue.extend(c.id for c in by_parent.get(nid, []))
    return ids


async def descendant_ids_for_slug(db: AsyncSession, slug: str) -> list[uuid.UUID]:
    """Ids of the active node with this slug + all its descendants.

    Empty list when the slug doesn't exist — callers turn that into an
    empty result set rather than silently ignoring the filter.
    """
    cats = await load_categories(db)
    node = next((c for c in cats if c.slug == slug), None)
    if node is None:
        return []
    return subtree_ids(node.id, children_map(cats))


def ancestors_of(node: Category, cats: list[Category]) -> list[Category]:
    """Root-first ancestor chain (excluding the node itself), cycle-safe."""
    by_id = {c.id: c for c in cats}
    chain: list[Category] = []
    seen: set[uuid.UUID] = set()
    cur = node.parent_id
    while cur and cur in by_id and cur not in seen:
        seen.add(cur)
        parent = by_id[cur]
        chain.append(parent)
        cur = parent.parent_id
    chain.reverse()
    return chain
