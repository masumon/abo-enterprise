"""Plugin manager for controlled execution of assistant extension tools."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from app.assistant.tool_registry import ToolRegistry

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class PluginManagerConfig:
    fail_closed: bool = True


class PluginManager:
    def __init__(self, registry: ToolRegistry | None = None, config: PluginManagerConfig | None = None) -> None:
        self.registry = registry or ToolRegistry()
        self.config = config or PluginManagerConfig()

    def execute(self, name: str, **kwargs: Any) -> Any:
        spec = self.registry.get(name)
        if spec is None or not spec.enabled:
            logger.info("plugin_not_available name=%s", name)
            if self.config.fail_closed:
                return None
            raise KeyError(f"plugin not available: {name}")
        try:
            return spec.handler(**kwargs)
        except Exception as exc:
            logger.warning("plugin_execution_failed name=%s err=%s", name, exc)
            if self.config.fail_closed:
                return None
            raise
