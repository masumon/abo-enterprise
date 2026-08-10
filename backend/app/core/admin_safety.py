from fastapi import Request
from fastapi.responses import JSONResponse


async def protect_assistant_audit_logs(request: Request, call_next):
    """Audit logs are retained records; never permit destructive deletion."""
    path = request.url.path.rstrip("/")
    if request.method.upper() == "DELETE" and "/assistant/admin/logs/" in path:
        return JSONResponse(
            status_code=409,
            content={
                "success": False,
                "message": "Assistant automation logs are retained for audit history and cannot be deleted.",
                "error_code": "AUDIT_LOG_RETENTION",
            },
        )
    return await call_next(request)
