"""Permission checks for assistant actions — respects RBAC for admin, public rules for customers."""

from dataclasses import dataclass

from app.assistant.constants import Intent, SENSITIVE_INTENTS
from app.core.rbac import has_permission


@dataclass
class PermissionResult:
    allowed: bool
    reason: str | None = None
    requires_auth: bool = False


class PermissionEngine:
    ADMIN_ONLY_INTENTS = frozenset()  # extend when admin assistant actions added

    def check_public_intent(self, intent: Intent) -> PermissionResult:
        if intent in self.ADMIN_ONLY_INTENTS:
            return PermissionResult(allowed=False, reason="Admin authentication required", requires_auth=True)
        return PermissionResult(allowed=True)

    def check_automation(
        self,
        intent: Intent,
        has_identity: bool,
        business_blocked: bool,
    ) -> PermissionResult:
        if business_blocked:
            return PermissionResult(allowed=False, reason="Action blocked by business rules")
        if intent in SENSITIVE_INTENTS and not has_identity:
            return PermissionResult(
                allowed=False,
                reason="Name and phone required for this action",
            )
        return PermissionResult(allowed=True)

    def check_admin_permission(self, role: str | None, permission: str) -> PermissionResult:
        if not role:
            return PermissionResult(allowed=False, reason="Not authenticated", requires_auth=True)
        if has_permission(role, permission):
            return PermissionResult(allowed=True)
        return PermissionResult(allowed=False, reason=f"Permission denied: {permission}")
