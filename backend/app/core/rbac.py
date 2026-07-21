from fastapi import HTTPException, status
from functools import wraps

ROLE_PERMISSIONS = {
    "super_admin": ["*"],
    "admin": [
        "orders.read", "orders.write", "orders.delete",
        "products.read", "products.write", "products.delete",
        "bookings.read", "bookings.write",
        "leads.read", "leads.write",
        "analytics.read",
        "bulk.read", "bulk.write",
        "settings.read", "settings.write",
        "users.read", "users.write", "users.delete",
    ],
    "editor": [
        "orders.read", "products.read", "products.write",
        "bookings.read", "leads.read", "analytics.read",
    ],
    "viewer": [
        "orders.read", "products.read",
        "bookings.read", "leads.read", "analytics.read",
    ],
}


def has_permission(role: str, permission: str) -> bool:
    perms = ROLE_PERMISSIONS.get(role, [])
    return "*" in perms or permission in perms


def require_permission(permission: str):
    """Decorator for route-level permission check"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # In real use, extract role from JWT token in dependency
            # This is a placeholder — wire with actual auth dependency
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def check_role(user_role: str, required_permission: str):
    if not has_permission(user_role, required_permission):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: {required_permission} required"
        )
