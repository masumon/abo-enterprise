"""Enterprise Automation Assistant API routes."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_admin
from app.assistant import AssistantOrchestrator
from app.models.models import AssistantConversation, AssistantActionLog
from app.schemas.schemas import (
    ApiResponse,
    AssistantChatRequest,
    AssistantChatResponse,
    AssistantMessageOut,
    AssistantActionLogOut,
    PaginatedResponse,
    PaginatedMeta,
)

router = APIRouter(prefix="/assistant", tags=["assistant"])

_orchestrator = AssistantOrchestrator()


@router.post("/chat", response_model=ApiResponse)
async def chat(
    payload: AssistantChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — process a customer message through the automation assistant."""
    result = await _orchestrator.process_message(
        db,
        message=payload.message,
        session_id=payload.session_id,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        customer_email=payload.customer_email,
        language=payload.language,
    )

    if result.get("success") is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result.get("message"))

    response = AssistantChatResponse(
        message=result["message"],
        intent=result["intent"],
        language=result["language"],
        session_id=result.get("session_id", payload.session_id or ""),
        data=result.get("data"),
        suggestions=result.get("suggestions"),
    )

    return ApiResponse(data=response.model_dump(), message="OK")


@router.get("/conversations/{session_id}/history", response_model=ApiResponse)
async def get_conversation_history(
    session_id: str,
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Public — retrieve recent messages for a session."""
    result = await db.execute(
        select(AssistantConversation).where(
            AssistantConversation.session_id == session_id,
            AssistantConversation.is_deleted == False,  # noqa: E712
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    from app.assistant.conversation_manager import ConversationManager

    mgr = ConversationManager()
    history = await mgr.get_history(db, conv.id, limit=limit)
    return ApiResponse(data=history)


@router.get("/admin/logs", response_model=PaginatedResponse)
async def list_assistant_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    session_id: str | None = Query(None),
    _admin: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin — view assistant action logs."""
    conditions = []
    if session_id:
        conditions.append(AssistantActionLog.session_id == session_id)

    count_q = select(func.count(AssistantActionLog.id))
    if conditions:
        from sqlalchemy import and_
        count_q = count_q.where(and_(*conditions))
    total = (await db.execute(count_q)).scalar() or 0

    query = select(AssistantActionLog).order_by(AssistantActionLog.created_at.desc())
    if conditions:
        from sqlalchemy import and_
        query = query.where(and_(*conditions))

    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    logs = result.scalars().all()

    return PaginatedResponse(
        data=[AssistantActionLogOut.model_validate(log) for log in logs],
        meta=PaginatedMeta(page=page, per_page=per_page, total=total, total_pages=-(-total // per_page)),
    )


@router.get("/health", response_model=ApiResponse)
async def assistant_health():
    """Health check for assistant module."""
    return ApiResponse(data={"status": "ok", "module": "enterprise-automation-assistant"})
