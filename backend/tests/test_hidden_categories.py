"""A category switched off in the admin hides itself and everything beneath it."""
import uuid
from types import SimpleNamespace

import pytest

from app.core import taxonomy

pytestmark = pytest.mark.asyncio


def _cat(slug, parent=None, active=True):
    return SimpleNamespace(id=uuid.uuid4(), slug=slug, parent_id=parent, is_active=active, sort_order=0, name_en=slug)


async def test_inactive_category_hides_its_whole_subtree(monkeypatch):
    root = _cat("mobile-accessories")
    off = _cat("chargers", root.id, active=False)
    child = _cat("chargers-adapters", off.id)
    other = _cat("cables", root.id)

    async def load(_db, include_inactive=False):
        return [root, off, child, other]

    monkeypatch.setattr(taxonomy, "load_categories", load)
    hidden = set(await taxonomy.hidden_category_ids(None))
    assert hidden == {off.id, child.id}


def test_visible_condition_is_noop_when_nothing_hidden():
    from app.models.models import Product

    assert str(taxonomy.visible_in_categories(Product, [])) == "true"
    assert "NOT IN" in str(taxonomy.visible_in_categories(Product, [uuid.uuid4()]))
