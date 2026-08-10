from fastapi import HTTPException
from starlette.requests import Request

from app.core.rbac import check_role, has_permission
from app.core.security import _legacy_route_permission


def _request(method: str, path: str) -> Request:
    return Request({
        "type": "http",
        "method": method,
        "path": path,
        "headers": [],
        "query_string": b"",
        "scheme": "https",
        "server": ("test", 443),
        "client": ("test", 1234),
    })


def test_assistant_admin_routes_use_existing_ops_permissions():
    assert _legacy_route_permission(_request("GET", "/api/v1/assistant/admin/config")) == "ops.read"
    assert _legacy_route_permission(_request("PUT", "/api/v1/assistant/admin/config")) == "ops.write"
    assert _legacy_route_permission(_request("GET", "/api/v1/assistant/admin/conversations")) == "ops.read"
    assert _legacy_route_permission(_request("GET", "/api/v1/assistant/admin/conversations/abc")) == "ops.read"
    assert _legacy_route_permission(_request("DELETE", "/api/v1/assistant/admin/conversations/abc")) == "ops.write"
    assert _legacy_route_permission(_request("GET", "/api/v1/assistant/admin/logs")) == "ops.read"
    assert _legacy_route_permission(_request("DELETE", "/api/v1/assistant/admin/logs/abc")) == "ops.write"
    assert _legacy_route_permission(_request("GET", "/api/v1/assistant/admin/faq")) == "ops.read"
    assert _legacy_route_permission(_request("POST", "/api/v1/assistant/admin/faq")) == "ops.write"
    assert _legacy_route_permission(_request("PUT", "/api/v1/assistant/admin/faq/delivery")) == "ops.write"
    assert _legacy_route_permission(_request("DELETE", "/api/v1/assistant/admin/faq/delivery")) == "ops.write"


def test_combo_admin_listing_uses_catalog_read_permission():
    assert _legacy_route_permission(_request("GET", "/api/v1/combos/admin/all")) == "products.read"


def test_existing_roles_keep_least_privilege_for_ops_permissions():
    assert has_permission("super_admin", "ops.read") is True
    assert has_permission("super_admin", "ops.write") is True
    assert has_permission("admin", "ops.read") is True
    assert has_permission("admin", "ops.write") is True
    assert has_permission("editor", "ops.read") is False
    assert has_permission("editor", "ops.write") is False
    assert has_permission("viewer", "ops.read") is False
    assert has_permission("viewer", "ops.write") is False


def test_unauthorized_roles_receive_403_from_canonical_rbac():
    for role in ("viewer", "editor"):
        try:
            check_role(role, "ops.read")
        except HTTPException as exc:
            assert exc.status_code == 403
        else:
            raise AssertionError(f"{role} unexpectedly received ops.read access")


def test_authorized_roles_pass_canonical_rbac():
    check_role("admin", "ops.read")
    check_role("admin", "ops.write")
    check_role("super_admin", "ops.read")
    check_role("super_admin", "ops.write")
