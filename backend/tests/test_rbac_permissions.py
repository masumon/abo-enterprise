"""Coverage for core/rbac.py's ROLE_PERMISSIONS / has_permission — pure
logic, no database. Pins the exact permission model, including the P1
fix that gave viewer/editor real permission entries for blog/media/reviews
so the "viewer = read-only" promise (shown in the Users admin UI) is
actually backed by the permission table rather than being enforced by
routes simply forgetting to check role at all.
"""
from app.core.rbac import ROLE_PERMISSIONS, has_permission


class TestSuperAdmin:
    def test_wildcard_grants_everything(self):
        assert has_permission("super_admin", "anything.at.all") is True
        assert has_permission("super_admin", "users.delete") is True


class TestAdminRole:
    def test_has_core_commerce_permissions(self):
        for perm in ("orders.write", "products.delete", "services.write", "bookings.delete"):
            assert has_permission("admin", perm) is True

    def test_has_p1_added_governance_permissions(self):
        for perm in (
            "blog.write", "media.write", "reviews.write", "career.write",
            "invoices.write", "email_templates.write", "ops.write", "payments.write",
        ):
            assert has_permission("admin", perm) is True

    def test_has_users_management(self):
        for perm in ("users.read", "users.write", "users.delete"):
            assert has_permission("admin", perm) is True

    def test_has_customer_index_read_permission(self):
        assert has_permission("admin", "customers.read") is True


class TestEditorRole:
    def test_can_manage_catalog_and_content(self):
        for perm in ("products.write", "services.write", "bookings.write", "blog.write", "media.write", "reviews.write"):
            assert has_permission("editor", perm) is True

    def test_cannot_manage_users_or_delete_products(self):
        assert has_permission("editor", "users.write") is False
        assert has_permission("editor", "products.delete") is False

    def test_cannot_touch_admin_only_governance_domains(self):
        for perm in ("career.write", "invoices.write", "email_templates.write", "ops.write", "payments.write"):
            assert has_permission("editor", perm) is False

    def test_cannot_read_customer_index(self):
        assert has_permission("editor", "customers.read") is False


class TestViewerRole:
    def test_is_read_only_across_the_board(self):
        """The Users admin page tells operators 'viewer = read-only'."""
        for perm in ROLE_PERMISSIONS["viewer"]:
            assert not perm.endswith(".write"), f"viewer unexpectedly has write permission: {perm}"
            assert not perm.endswith(".delete"), f"viewer unexpectedly has delete permission: {perm}"

    def test_can_read_content_domains(self):
        for perm in ("orders.read", "products.read", "blog.read", "media.read", "reviews.read"):
            assert has_permission("viewer", perm) is True

    def test_cannot_write_anything(self):
        for perm in ("orders.write", "products.write", "blog.write", "settings.write", "leads.write"):
            assert has_permission("viewer", perm) is False

    def test_cannot_read_customer_index(self):
        assert has_permission("viewer", "customers.read") is False


class TestUnknownRole:
    def test_unknown_role_has_no_permissions(self):
        assert has_permission("not-a-real-role", "orders.read") is False
