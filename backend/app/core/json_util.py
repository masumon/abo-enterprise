"""Minimal JSON-safe conversion for ActivityLog old_values / new_values.

Converts Python types that the stdlib `json` module cannot handle
(UUID, datetime/date, Decimal, Enum) to their JSON-safe equivalents.
Works recursively through dicts and lists so nested structures are covered.
"""
from __future__ import annotations

import uuid
import decimal
import datetime
import enum
from typing import Any


def to_json_safe(obj: Any) -> Any:
    """Return a JSON-serializable version of *obj*.

    Handles ``uuid.UUID``, ``datetime.datetime``, ``datetime.date``,
    ``decimal.Decimal``, and ``enum.Enum``.  Recurses into ``dict`` and
    ``list`` / ``tuple`` values.  Everything else is returned unchanged.
    """
    if isinstance(obj, dict):
        return {k: to_json_safe(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [to_json_safe(i) for i in obj]
    if isinstance(obj, uuid.UUID):
        return str(obj)
    if isinstance(obj, (datetime.datetime, datetime.date)):
        return obj.isoformat()
    if isinstance(obj, decimal.Decimal):
        return float(obj)
    if isinstance(obj, enum.Enum):
        return obj.value
    return obj
