"""Enterprise Automation Assistant API routes."""

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings as app_settings
from app.core.database import get_db
from app.core.security import require_admin
from app.assistant import AssistantOrchestrator
from app.assistant.knowledge_base import KnowledgeBase
from app.models.models import AssistantConversation, AssistantActionLog, AssistantMessage, Setting
from app.schemas.schemas import (
    ApiResponse,
    AssistantChatRequest,
    AssistantChatResponse,
    AssistantActionLogOut,
    AssistantConversationOut,
    AssistantConfigOut,
    AssistantConfigUpdate,
    AssistantFaqEntry,
    AssistantFaqUpdate,
    PaginatedResponse,
    PaginatedMeta,
)

router = APIRouter(prefix="/assistant", tags=["assistant"])

_orchestrator = AssistantOrchestrator()
_kb = KnowledgeBase()

from app.core.rate_limit import rate_limit
from app.assistant.feature_flags import (
    ASSISTANT_CONFIG_KEYS,
    ASSISTANT_BOOLEAN_FEATURES,
    parse_bool,
    AssistantFeatureFlags,
)


async def _get_settings_map(db: AsyncSession, keys: tuple[str, ...]) -> dict[str, str]:
    result = await db.execute(
        select(Setting).where(
            Setting.key.in_(keys),
            Setting.is_deleted == False,  # noqa: E712
        )
    )
    return {s.key: s.value for s in result.scalars().all()}


async def _upsert_setting(
    db: AsyncSession,
    key: str,
    value: str,
    data_type: str = "string",
    description: str | None = None,
) -> None:
    result = await db.execute(
        select(Setting).where(Setting.key == key, Setting.is_deleted == False)  # noqa: E712
    )
    setting = result.scalar_one_or_none()
    if setting:
        setting.value = value
        if data_type:
            setting.data_type = data_type
    else:
        db.add(Setting(key=key, value=value, data_type=data_type, description=description, is_editable=True))


@router.post("/chat", response_model=ApiResponse, dependencies=[Depends(rate_limit("assistant_chat", 30, 300))])
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
        page_path=payload.page_path,
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


@router.get("/config", response_model=ApiResponse)
async def get_public_assistant_config(db: AsyncSession = Depends(get_db)):
    """Public — assistant widget configuration (no secrets)."""
    data = await _get_settings_map(db, ASSISTANT_CONFIG_KEYS)
    flags = AssistantFeatureFlags.from_settings(data)
    return ApiResponse(
        data={
            "enabled": flags.chat_enabled,
            "whatsapp_enabled": flags.whatsapp_enabled,
            "whatsapp_number": data.get("whatsapp_number") or app_settings.WHATSAPP_NUMBER,
            "welcome_en": data.get("assistant_welcome_en", ""),
            "welcome_bn": data.get("assistant_welcome_bn", ""),
            "features": flags.public_features(),
        }
    )


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


@router.get("/admin/config", response_model=ApiResponse)
async def get_admin_assistant_config(
    _admin: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin — get assistant configuration."""
    data = await _get_settings_map(db, ASSISTANT_CONFIG_KEYS)
    flags = AssistantFeatureFlags.from_settings(data)
    config = AssistantConfigOut(
        feature_assistant_chat=flags.chat_enabled,
        feature_assistant_whatsapp=flags.whatsapp_enabled,
        whatsapp_number=data.get("whatsapp_number") or app_settings.WHATSAPP_NUMBER,
        assistant_welcome_en=data.get("assistant_welcome_en", ""),
        assistant_welcome_bn=data.get("assistant_welcome_bn", ""),
        **{k: v for k, v in flags.to_dict().items() if k.startswith("assistant_feature_")},
    )
    return ApiResponse(data=config.model_dump())


@router.put("/admin/config", response_model=ApiResponse)
async def update_admin_assistant_config(
    payload: AssistantConfigUpdate,
    _admin: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin — update assistant configuration."""
    updates = payload.model_dump(exclude_none=True)
    bool_keys = set(ASSISTANT_BOOLEAN_FEATURES.keys())
    for key, value in updates.items():
        if key in bool_keys:
            await _upsert_setting(db, key, "true" if value else "false", "boolean")
        else:
            await _upsert_setting(db, key, str(value))
    await db.commit()
    return ApiResponse(message="Assistant configuration updated")


@router.get("/admin/conversations", response_model=PaginatedResponse)
async def list_assistant_conversations(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    _admin: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin — list assistant conversations."""
    conditions = [AssistantConversation.is_deleted == False]  # noqa: E712
    if search:
        term = f"%{search}%"
        conditions.append(
            (AssistantConversation.session_id.ilike(term))
            | (AssistantConversation.customer_name.ilike(term))
            | (AssistantConversation.customer_phone.ilike(term))
        )

    count_q = select(func.count(AssistantConversation.id)).where(and_(*conditions))
    total = (await db.execute(count_q)).scalar() or 0

    msg_count_subq = (
        select(func.count(AssistantMessage.id))
        .where(AssistantMessage.conversation_id == AssistantConversation.id)
        .correlate(AssistantConversation)
        .scalar_subquery()
    )

    query = (
        select(AssistantConversation, msg_count_subq.label("message_count"))
        .where(and_(*conditions))
        .order_by(AssistantConversation.updated_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    rows = (await db.execute(query)).all()

    data = []
    for conv, msg_count in rows:
        item = AssistantConversationOut.model_validate(conv)
        item.message_count = msg_count or 0
        data.append(item)

    return PaginatedResponse(
        data=data,
        meta=PaginatedMeta(page=page, per_page=per_page, total=total, total_pages=max(1, -(-total // per_page))),
    )


@router.get("/admin/conversations/{conversation_id}", response_model=ApiResponse)
async def get_assistant_conversation(
    conversation_id: uuid.UUID,
    _admin: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin — get conversation with full message history."""
    result = await db.execute(
        select(AssistantConversation).where(
            AssistantConversation.id == conversation_id,
            AssistantConversation.is_deleted == False,  # noqa: E712
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    from app.assistant.conversation_manager import ConversationManager

    mgr = ConversationManager()
    history = await mgr.get_history(db, conv.id, limit=100)

    return ApiResponse(
        data={
            "conversation": AssistantConversationOut.model_validate(conv).model_dump(),
            "messages": history,
        }
    )


@router.delete("/admin/conversations/{conversation_id}", response_model=ApiResponse)
async def delete_assistant_conversation(
    conversation_id: uuid.UUID,
    _admin: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin — soft-delete a conversation."""
    result = await db.execute(
        select(AssistantConversation).where(
            AssistantConversation.id == conversation_id,
            AssistantConversation.is_deleted == False,  # noqa: E712
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conv.is_deleted = True
    conv.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return ApiResponse(message="Conversation deleted")


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
        count_q = count_q.where(and_(*conditions))
    total = (await db.execute(count_q)).scalar() or 0

    query = select(AssistantActionLog).order_by(AssistantActionLog.created_at.desc())
    if conditions:
        query = query.where(and_(*conditions))

    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    logs = result.scalars().all()

    return PaginatedResponse(
        data=[AssistantActionLogOut.model_validate(log) for log in logs],
        meta=PaginatedMeta(page=page, per_page=per_page, total=total, total_pages=max(1, -(-total // per_page))),
    )


@router.delete("/admin/logs/{log_id}", response_model=ApiResponse)
async def delete_assistant_log(
    log_id: uuid.UUID,
    _admin: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin — delete an action log entry."""
    result = await db.execute(select(AssistantActionLog).where(AssistantActionLog.id == log_id))
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    await db.delete(log)
    await db.commit()
    return ApiResponse(message="Log deleted")


def _faq_from_flat(flat: dict) -> list[dict]:
    keys = sorted({k.rsplit("_", 1)[0] for k in flat if k.endswith(("_en", "_bn"))})
    entries = []
    for key in keys:
        entries.append({
            "key": key,
            "topic": key.replace("_", " ").title(),
            "answer_en": flat.get(f"{key}_en", ""),
            "answer_bn": flat.get(f"{key}_bn", ""),
            "questions": flat.get(f"{key}_q", ""),
        })
    return entries


def _faq_to_flat(entries: list[dict]) -> dict:
    flat: dict[str, str] = {}
    for entry in entries:
        key = entry["key"].strip().lower().replace(" ", "_")
        if entry.get("answer_en"):
            flat[f"{key}_en"] = entry["answer_en"]
        if entry.get("answer_bn"):
            flat[f"{key}_bn"] = entry["answer_bn"]
    return flat


async def _load_faq_flat(db: AsyncSession) -> dict:
    result = await db.execute(
        select(Setting).where(Setting.key == "assistant_faq_knowledge", Setting.is_deleted == False)  # noqa: E712
    )
    setting = result.scalar_one_or_none()
    if setting and setting.value:
        try:
            return json.loads(setting.value)
        except json.JSONDecodeError:
            pass
    return dict(_kb._faq)  # noqa: SLF001


async def _save_faq_flat(db: AsyncSession, flat: dict) -> None:
    await _upsert_setting(
        db,
        "assistant_faq_knowledge",
        json.dumps(flat, ensure_ascii=False),
        "json",
        "Assistant FAQ knowledge base",
    )
    _kb.reload_faq(flat)


@router.get("/admin/faq", response_model=ApiResponse)
async def list_assistant_faq(
    _admin: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin — list FAQ knowledge entries."""
    flat = await _load_faq_flat(db)
    return ApiResponse(data=_faq_from_flat(flat))


@router.post("/admin/faq", response_model=ApiResponse)
async def create_assistant_faq(
    payload: AssistantFaqEntry,
    _admin: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin — create a FAQ entry."""
    key = payload.key.strip().lower().replace(" ", "_")
    if not key:
        raise HTTPException(status_code=400, detail="FAQ key is required")

    flat = await _load_faq_flat(db)
    if f"{key}_en" in flat or f"{key}_bn" in flat:
        raise HTTPException(status_code=400, detail="FAQ key already exists")

    flat[f"{key}_en"] = payload.answer_en
    if payload.answer_bn:
        flat[f"{key}_bn"] = payload.answer_bn
    if payload.questions and payload.questions.strip():
        flat[f"{key}_q"] = payload.questions.strip()

    await _save_faq_flat(db, flat)
    await db.commit()
    return ApiResponse(data={"key": key}, message="FAQ entry created")


@router.put("/admin/faq/{key}", response_model=ApiResponse)
async def update_assistant_faq(
    key: str,
    payload: AssistantFaqUpdate,
    _admin: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin — update a FAQ entry."""
    key = key.strip().lower().replace(" ", "_")
    flat = await _load_faq_flat(db)
    if f"{key}_en" not in flat and f"{key}_bn" not in flat:
        raise HTTPException(status_code=404, detail="FAQ entry not found")

    if payload.answer_en is not None:
        flat[f"{key}_en"] = payload.answer_en
    if payload.answer_bn is not None:
        flat[f"{key}_bn"] = payload.answer_bn
    if payload.questions is not None:
        if payload.questions.strip():
            flat[f"{key}_q"] = payload.questions.strip()
        else:
            flat.pop(f"{key}_q", None)

    await _save_faq_flat(db, flat)
    await db.commit()
    return ApiResponse(message="FAQ entry updated")


@router.delete("/admin/faq/{key}", response_model=ApiResponse)
async def delete_assistant_faq(
    key: str,
    _admin: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin — delete a FAQ entry."""
    key = key.strip().lower().replace(" ", "_")
    flat = await _load_faq_flat(db)
    removed = False
    for suffix in ("_en", "_bn", "_q"):
        fk = f"{key}{suffix}"
        if fk in flat:
            del flat[fk]
            removed = True

    if not removed:
        raise HTTPException(status_code=404, detail="FAQ entry not found")

    await _save_faq_flat(db, flat)
    await db.commit()
    return ApiResponse(message="FAQ entry deleted")


@router.get("/health", response_model=ApiResponse)
async def assistant_health():
    """Health check for assistant module."""
    return ApiResponse(data={"status": "ok", "module": "enterprise-automation-assistant"})
