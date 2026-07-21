"""Session memory engine for assistant turn recall and write-through updates."""

from __future__ import annotations

import logging
from dataclasses import asdict, dataclass
from datetime import datetime, timezone

from app.assistant.context_manager import ConversationContext

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class MemoryConfig:
    slot_key: str = "memory"
    max_turns: int = 20


@dataclass(slots=True)
class MemoryTurn:
    user_message: str
    assistant_message: str
    intent: str
    created_at: str


class MemoryEngine:
    """Stores compact turn history in session context slots."""

    def __init__(self, config: MemoryConfig | None = None) -> None:
        self.config = config or MemoryConfig()

    def recall(self, ctx: ConversationContext) -> list[MemoryTurn]:
        try:
            raw_items = ctx.slots.get(self.config.slot_key, [])
            if not isinstance(raw_items, list):
                return []
            turns: list[MemoryTurn] = []
            for item in raw_items:
                if not isinstance(item, dict):
                    continue
                turns.append(
                    MemoryTurn(
                        user_message=str(item.get("user_message", "")),
                        assistant_message=str(item.get("assistant_message", "")),
                        intent=str(item.get("intent", "unknown")),
                        created_at=str(item.get("created_at", "")),
                    )
                )
            return turns
        except Exception as exc:
            logger.warning("memory_recall_failed: %s", exc)
            return []

    def remember_turn(
        self,
        ctx: ConversationContext,
        *,
        user_message: str,
        assistant_message: str,
        intent: str,
    ) -> None:
        try:
            turn = MemoryTurn(
                user_message=user_message,
                assistant_message=assistant_message,
                intent=intent,
                created_at=datetime.now(timezone.utc).isoformat(),
            )
            items = ctx.slots.get(self.config.slot_key, [])
            if not isinstance(items, list):
                items = []
            items.append(asdict(turn))
            if len(items) > self.config.max_turns:
                items = items[-self.config.max_turns :]
            ctx.slots[self.config.slot_key] = items
        except Exception as exc:
            logger.warning("memory_write_failed: %s", exc)
