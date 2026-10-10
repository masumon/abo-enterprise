"""Admin review tabs: product / service / site-testimonial filter."""
import os

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://x:x@localhost/x")

from app.api.v1.routes.reviews import REVIEW_KINDS, review_kind_conditions # noqa: E402


def _sql(kind):
    return " AND ".join(str(c) for c in review_kind_conditions(kind))


def test_all_kind_has_no_filter():
    assert review_kind_conditions(None) == []
    assert review_kind_conditions("all") == []


def test_product_and_service_filters():
    assert "product_id IS NOT NULL" in _sql("product")
    assert "service_id IS NOT NULL" in _sql("service")


def test_site_testimonials_have_no_product_or_service():
    sql = _sql("site")
    assert "product_id IS NULL" in sql and "service_id IS NULL" in sql
    assert REVIEW_KINDS == ("product", "service", "site")


def test_category_counts_attach_to_whole_tree():
    from app.api.v1.routes.categories import _with_counts  # noqa: E402

    tree = {"id": "a", "subcategories": [{"id": "b", "subcategories": []}]}
    out = _with_counts(tree, {"b": {"product": 3, "service": 1}})
    assert out["product_count"] == 0 and out["service_count"] == 0
    assert out["subcategories"][0]["product_count"] == 3
    assert out["subcategories"][0]["service_count"] == 1
