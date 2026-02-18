"""Chat API routes — SUMONIX AI ChatGPT-style conversations."""

from __future__ import annotations

from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database.models.postgres_models import (
    Conversation, ChatMessage, UserSubscription, SubscriptionTier, PLAN_LIMITS,
)
from database.session import get_db

router = APIRouter(prefix="/chat", tags=["Chat"])


# ─── Schemas ──────────────────────────────────


class CreateConversationRequest(BaseModel):
    title: str = "New Chat"
    model: str = "gpt-4o-mini"
    system_prompt: Optional[str] = None


class SendMessageRequest(BaseModel):
    content: str
    model: Optional[str] = None


class ConversationResponse(BaseModel):
    id: str
    title: str
    model: str
    is_pinned: bool
    is_archived: bool
    message_count: int
    total_tokens: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    model: Optional[str]
    tokens_used: int
    created_at: str

    class Config:
        from_attributes = True


class ChatCompletionResponse(BaseModel):
    user_message: MessageResponse
    assistant_message: MessageResponse
    tokens_used: int
    remaining_today: int
    remaining_month: int


# ─── Helpers ──────────────────────────────────


def _get_user_id(request: Request) -> str:
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id


async def _check_limits(db: AsyncSession, user_id: str) -> tuple[UserSubscription, dict]:
    result = await db.execute(
        select(UserSubscription).where(UserSubscription.user_id == UUID(user_id))
    )
    sub = result.scalar_one_or_none()
    if not sub:
        sub = UserSubscription(user_id=UUID(user_id), tier=SubscriptionTier.FREE)
        db.add(sub)
        await db.flush()

    # Auto-reset daily counter if last reset was before today
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    if sub.last_usage_reset and sub.last_usage_reset.date() < now.date():
        sub.messages_used_today = 0
        sub.last_usage_reset = now

    limits = PLAN_LIMITS[sub.tier]
    daily_limit = limits["messages_per_day"]
    monthly_limit = limits["messages_per_month"]

    if daily_limit != -1 and sub.messages_used_today >= daily_limit:
        raise HTTPException(
            status_code=429,
            detail=f"Daily message limit reached ({daily_limit}). Upgrade your plan for more.",
        )
    if monthly_limit != -1 and sub.messages_used_this_month >= monthly_limit:
        raise HTTPException(
            status_code=429,
            detail=f"Monthly message limit reached ({monthly_limit}). Upgrade your plan for more.",
        )
    return sub, limits


# ─── Routes ───────────────────────────────────


@router.post("/conversations", response_model=ConversationResponse, status_code=201)
async def create_conversation(
    body: CreateConversationRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    user_id = _get_user_id(request)

    # Check conversation limit
    result = await db.execute(
        select(UserSubscription).where(UserSubscription.user_id == UUID(user_id))
    )
    sub = result.scalar_one_or_none()
    tier = sub.tier if sub else SubscriptionTier.FREE
    limits = PLAN_LIMITS[tier]
    max_convos = limits["max_conversations"]

    if max_convos != -1:
        count_result = await db.execute(
            select(func.count(Conversation.id)).where(
                Conversation.user_id == UUID(user_id),
                Conversation.is_archived == False,
            )
        )
        count = count_result.scalar()
        if count >= max_convos:
            raise HTTPException(
                status_code=429,
                detail=f"Conversation limit reached ({max_convos}). Archive old chats or upgrade.",
            )

    convo = Conversation(
        user_id=UUID(user_id),
        title=body.title,
        model=body.model,
        system_prompt=body.system_prompt,
    )
    db.add(convo)
    await db.flush()

    return ConversationResponse(
        id=str(convo.id),
        title=convo.title,
        model=convo.model,
        is_pinned=convo.is_pinned,
        is_archived=convo.is_archived,
        message_count=0,
        total_tokens=0,
        created_at=convo.created_at.isoformat(),
        updated_at=convo.updated_at.isoformat(),
    )


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    request: Request,
    archived: bool = False,
    db: AsyncSession = Depends(get_db),
):
    user_id = _get_user_id(request)
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == UUID(user_id), Conversation.is_archived == archived)
        .order_by(desc(Conversation.is_pinned), desc(Conversation.updated_at))
        .limit(200)
    )
    convos = result.scalars().all()
    return [
        ConversationResponse(
            id=str(c.id), title=c.title, model=c.model,
            is_pinned=c.is_pinned, is_archived=c.is_archived,
            message_count=c.message_count, total_tokens=c.total_tokens,
            created_at=c.created_at.isoformat(), updated_at=c.updated_at.isoformat(),
        )
        for c in convos
    ]


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(conversation_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _get_user_id(request)
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == UUID(conversation_id), Conversation.user_id == UUID(user_id)
        )
    )
    convo = result.scalar_one_or_none()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return ConversationResponse(
        id=str(convo.id), title=convo.title, model=convo.model,
        is_pinned=convo.is_pinned, is_archived=convo.is_archived,
        message_count=convo.message_count, total_tokens=convo.total_tokens,
        created_at=convo.created_at.isoformat(), updated_at=convo.updated_at.isoformat(),
    )


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageResponse])
async def get_messages(conversation_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _get_user_id(request)
    # Verify ownership
    convo_result = await db.execute(
        select(Conversation).where(
            Conversation.id == UUID(conversation_id), Conversation.user_id == UUID(user_id)
        )
    )
    if not convo_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Conversation not found")

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == UUID(conversation_id))
        .order_by(ChatMessage.created_at)
    )
    messages = result.scalars().all()
    return [
        MessageResponse(
            id=str(m.id), role=m.role, content=m.content, model=m.model,
            tokens_used=m.tokens_used, created_at=m.created_at.isoformat(),
        )
        for m in messages
    ]


@router.post("/conversations/{conversation_id}/messages", response_model=ChatCompletionResponse)
async def send_message(
    conversation_id: str,
    body: SendMessageRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    user_id = _get_user_id(request)

    # Verify ownership
    convo_result = await db.execute(
        select(Conversation).where(
            Conversation.id == UUID(conversation_id), Conversation.user_id == UUID(user_id)
        )
    )
    convo = convo_result.scalar_one_or_none()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check usage limits
    sub, limits = await _check_limits(db, user_id)

    model = body.model or convo.model
    allowed_models = limits["models"]
    if model not in allowed_models and "ollama" not in allowed_models:
        raise HTTPException(
            status_code=403,
            detail=f"Model '{model}' not available on your plan. Available: {allowed_models}",
        )

    # Save user message
    user_msg = ChatMessage(
        conversation_id=convo.id,
        role="user",
        content=body.content,
        tokens_used=len(body.content.split()) * 2,  # rough estimate
    )
    db.add(user_msg)

    # Generate AI response (simulated — real integration uses LLM router)
    ai_content = _generate_response(body.content, model)
    ai_tokens = len(ai_content.split()) * 2

    assistant_msg = ChatMessage(
        conversation_id=convo.id,
        role="assistant",
        content=ai_content,
        model=model,
        tokens_used=ai_tokens,
        finish_reason="stop",
    )
    db.add(assistant_msg)

    # Update usage
    total_tokens = user_msg.tokens_used + ai_tokens
    sub.messages_used_today += 1
    sub.messages_used_this_month += 1
    sub.tokens_used_this_month += total_tokens
    convo.message_count += 2
    convo.total_tokens += total_tokens
    if convo.message_count == 2:
        # Auto-title from first message
        convo.title = body.content[:80] + ("..." if len(body.content) > 80 else "")

    await db.flush()

    daily_remaining = limits["messages_per_day"] - sub.messages_used_today if limits["messages_per_day"] != -1 else -1
    monthly_remaining = limits["messages_per_month"] - sub.messages_used_this_month if limits["messages_per_month"] != -1 else -1

    return ChatCompletionResponse(
        user_message=MessageResponse(
            id=str(user_msg.id), role="user", content=user_msg.content,
            model=None, tokens_used=user_msg.tokens_used,
            created_at=user_msg.created_at.isoformat() if user_msg.created_at else "",
        ),
        assistant_message=MessageResponse(
            id=str(assistant_msg.id), role="assistant", content=assistant_msg.content,
            model=model, tokens_used=ai_tokens,
            created_at=assistant_msg.created_at.isoformat() if assistant_msg.created_at else "",
        ),
        tokens_used=total_tokens,
        remaining_today=daily_remaining,
        remaining_month=monthly_remaining,
    )


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _get_user_id(request)
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == UUID(conversation_id), Conversation.user_id == UUID(user_id)
        )
    )
    convo = result.scalar_one_or_none()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await db.delete(convo)
    return {"detail": "Conversation deleted"}


@router.patch("/conversations/{conversation_id}/pin")
async def toggle_pin(conversation_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _get_user_id(request)
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == UUID(conversation_id), Conversation.user_id == UUID(user_id)
        )
    )
    convo = result.scalar_one_or_none()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    convo.is_pinned = not convo.is_pinned
    await db.flush()
    return {"is_pinned": convo.is_pinned}


@router.patch("/conversations/{conversation_id}/archive")
async def toggle_archive(conversation_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _get_user_id(request)
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == UUID(conversation_id), Conversation.user_id == UUID(user_id)
        )
    )
    convo = result.scalar_one_or_none()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    convo.is_archived = not convo.is_archived
    await db.flush()
    return {"is_archived": convo.is_archived}


@router.patch("/conversations/{conversation_id}/rename")
async def rename_conversation(
    conversation_id: str, request: Request, title: str = "Untitled", db: AsyncSession = Depends(get_db)
):
    user_id = _get_user_id(request)
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == UUID(conversation_id), Conversation.user_id == UUID(user_id)
        )
    )
    convo = result.scalar_one_or_none()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    convo.title = title
    await db.flush()
    return {"title": convo.title}


def _generate_response(user_message: str, model: str) -> str:
    """Placeholder AI response generator.

    In production, this calls the LLM router with the selected model.
    Replace this with actual LLM integration for live responses.
    """
    return (
        f"Hello! I'm SUMONIX AI powered by {model}. "
        f"You said: \"{user_message[:100]}\" — "
        "I'm ready to help you with coding, analysis, writing, math, and much more. "
        "This is a demo response. Connect your LLM API keys in .env to enable real AI responses."
    )
