from starlette.requests import Request

from app.core.rbac import has_permission
from app.core.security import _legacy_route_permission


def _request(method: str, path: str) -> Request:
    return Request({
        "type": "http",
        "method": method,
        "path": path,
        "headers": [],
        "query_string": b"",
        "scheme": "https",
        "server": ("example.com", 443),
        "client": ("127.0.0.1", 12345),
    })


def test_dashboard_uses_analytics_permission():
    assert _legacy_route_permission(_request("GET", "/api/v1/admin/stats")) == "analytics.read"


def test_media_upload_uses_media_write_permission():
    assert _legacy_route_permission(_request("POST", "/api/v1/admin/upload")) == "media.write"


def test_user_list_uses_users_read_permission():
    assert _legacy_route_permission(_request("GET", "/api/v1/admin/users")) == "users.read"


def test_legacy_route_overrides_are_least_privilege():
    assert has_permission("viewer", "analytics.read")
    assert not has_permission("viewer", "media.write")
    assert not has_permission("viewer", "users.read")
    assert has_permission("editor", "media.write")
    assert not has_permission("editor", "users.read")


def test_audit_logs_require_audit_logs_read_permission():
    assert _legacy_route_permission(_request("GET", "/api/v1/admin/audit-logs")) == "audit_logs.read"
    assert _legacy_route_permission(_request("GET", "/api/v1/admin/audit-logs/meta")) == "audit_logs.read"
    assert has_permission("admin", "audit_logs.read")
    assert not has_permission("viewer", "audit_logs.read")
    assert not has_permission("editor", "audit_logs.read")
