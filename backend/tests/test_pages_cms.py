"""Generic Pages CMS model/route/RBAC contract tests."""
from pathlib import Path

from app.api.v1.routes.pages import RESERVED_SLUGS
from app.core.rbac import has_permission
from app.models.models import Page

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MANUAL_SQL = PROJECT_ROOT / "backend" / "manual_sql" / "0039_pages_cms.sql"


def test_page_schema_supports_draft_publish_and_seo():
    columns = {column.name: column for column in Page.__table__.columns}

    assert Page.__tablename__ == "pages"
    assert columns["slug"].unique is True
    assert columns["slug"].nullable is False
    assert columns["title_en"].nullable is False
    assert columns["content_en"].nullable is False
    assert columns["status"].nullable is False
    assert columns["is_deleted"].nullable is False
    assert "seo_title" in columns
    assert "published_at" in columns


def test_reserved_slugs_cover_every_top_level_app_route():
    # A page can never actually render at these paths — Next.js's static
    # routes always win over the dynamic /[slug] catch — but creating one
    # here would be silently unreachable, so it's rejected at creation time.
    expected = {
        "about", "blog", "book", "booking-success", "career", "cart", "checkout",
        "compare", "contact", "dashboard", "faq", "forgot-password", "gallery",
        "legal", "login", "order-success", "orders", "payment", "products",
        "profile", "projects", "register", "search", "services", "shipping",
        "sumon", "testimonials", "track", "api",
    }
    assert expected.issubset(RESERVED_SLUGS)


def test_pages_rbac_mirrors_blog_grants():
    assert has_permission("admin", "pages.read")
    assert has_permission("admin", "pages.write")
    assert has_permission("editor", "pages.read")
    assert has_permission("editor", "pages.write")
    assert has_permission("viewer", "pages.read")
    assert not has_permission("viewer", "pages.write")


def test_manual_sql_is_additive_only():
    sql = MANUAL_SQL.read_text(encoding="utf-8").upper()

    assert "CREATE TABLE IF NOT EXISTS PAGES" in sql
    assert "DROP TABLE" not in sql
    assert "TRUNCATE" not in sql
    assert "DELETE FROM" not in sql
    assert "UPDATE " not in sql


def test_pages_routes_registered():
    from app.api.v1.router import api_router

    paths = {getattr(r, "path", "") for r in api_router.routes}
    assert "/api/v1/pages/{slug}" in paths
    assert "/api/v1/pages/admin/all" in paths
    assert "/api/v1/pages/admin" in paths
    assert "/api/v1/pages/admin/{page_id}" in paths
