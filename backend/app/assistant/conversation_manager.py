"""Conversation persistence — load/save messages and context."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import AssistantConversation, AssistantMessage
from app.assistant.context_manager import ContextManager, ConversationContext


class ConversationManager:
    def __init__(self) -> None:
        self._context_mgr = ContextManager()

    async def get_or_create_session(
        self, db: AsyncSession, session_id: str | None, customer_phone: str | None = None
    ) -> tuple[AssistantConversation, ConversationContext]:
        if session_id:
            result = await db.execute(
                select(AssistantConversation).where(
                    AssistantConversation.session_id == session_id,
                    AssistantConversation.is_deleted == False,  # noqa: E712
                )
            )
            conv = result.scalar_one_or_none()
            if conv:
                ctx = self._context_mgr.from_dict(conv.context or {})
                ctx.session_id = conv.session_id
                return conv, ctx

        new_session_id = session_id or uuid.uuid4().hex[:32]
        conv = AssistantConversation(
            session_id=new_session_id,
            customer_phone=customer_phone,
            context={},
            language="en",
        )
        db.add(conv)
        await db.flush()
        return conv, ConversationContext(session_id=new_session_id)

    async def save_turn(
        self,
        db: AsyncSession,
        conv: AssistantConversation,
        ctx: ConversationContext,
        user_message: str,
        assistant_message: str,
        intent: str,
        metadata: dict | None = None,
    ) -> None:
        conv.context = self._context_mgr.to_dict(ctx)
        conv.language = ctx.language
        conv.customer_phone = ctx.customer_phone or conv.customer_phone
        conv.customer_name = ctx.customer_name or conv.customer_name
        conv.customer_email = ctx.customer_email or conv.customer_email
        conv.last_intent = intent
        conv.updated_at = datetime.now(timezone.utc)

        db.add(AssistantMessage(
            conversation_id=conv.id,
            role="user",
            content=user_message,
            intent=intent,
            meta=metadata or {},
        ))
        db.add(AssistantMessage(
            conversation_id=conv.id,
            role="assistant",
            content=assistant_message,
            intent=intent,
            meta=metadata or {},
        ))

    async def get_history(self, db: AsyncSession, conversation_id: uuid.UUID, limit: int = 10) -> list[dict]:
        result = await db.execute(
            select(AssistantMessage)
            .where(AssistantMessage.conversation_id == conversation_id)
            .order_by(AssistantMessage.created_at.desc())
            .limit(limit)
        )
        messages = list(reversed(result.scalars().all()))
        return [{"role": m.role, "content": m.content, "intent": m.intent} for m in messages]
