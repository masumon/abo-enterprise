"""Tool registry for assistant plugin discovery and invocation metadata."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Callable

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class ToolSpec:
    name: str
    handler: Callable[..., Any]
    description: str = ""
    enabled: bool = True
    metadata: dict[str, Any] = field(default_factory=dict)


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, ToolSpec] = {}

    def register(self, spec: ToolSpec) -> None:
        if not spec.name:
            raise ValueError("tool name is required")
        self._tools[spec.name] = spec

    def get(self, name: str) -> ToolSpec | None:
        return self._tools.get(name)

    def list_enabled(self) -> list[ToolSpec]:
        return [tool for tool in self._tools.values() if tool.enabled]
