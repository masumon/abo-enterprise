"""Server-side validation for dynamic service booking forms.

Admins define per-service form fields in ``service_booking_forms`` (type,
required flag, options, JSONB ``validation_rules`` / ``conditional_logic``).
The public booking endpoint calls :func:`validate_form_data` to check the
customer's submitted ``form_data`` dict against that configuration before the
values are persisted on ``bookings_v2.form_data``.

The engine never trusts the client: unknown keys are rejected, select values
must come from the configured options, and ``validation_rules`` (pattern,
min/max, min_length/max_length) are enforced here regardless of what the
frontend rendered.

``conditional_logic`` supports a simple ``show_if`` rule::

    {"show_if": {"field": "delivery_type", "equals": "home"}}

A field whose condition is not met is treated as hidden: it is not required
and any submitted value for it is dropped.
"""

from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any, Iterable


class BookingFormValidationError(Exception):
    """Raised when submitted form_data violates the service's form config.

    ``errors`` maps field_name → human-readable message ("_form" for
    form-level problems such as unknown fields).
    """

    def __init__(self, errors: dict[str, str]):
        self.errors = errors
        super().__init__("; ".join(f"{k}: {v}" for k, v in errors.items()))


_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Field types that accept a list of selected options.
_MULTI_TYPES = {"multiselect", "checkbox_group"}


def _is_empty(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str) and value.strip() == "":
        return True
    if isinstance(value, (list, dict)) and len(value) == 0:
        return True
    return False


def _condition_met(logic: dict | None, form_data: dict) -> bool:
    """Evaluate the field's show_if condition against the submitted data."""
    if not isinstance(logic, dict):
        return True
    show_if = logic.get("show_if")
    if not isinstance(show_if, dict):
        return True
    other = show_if.get("field")
    if not other:
        return True
    actual = form_data.get(other)
    if "equals" in show_if:
        return actual == show_if["equals"]
    if "not_equals" in show_if:
        return actual != show_if["not_equals"]
    if "in" in show_if and isinstance(show_if["in"], list):
        return actual in show_if["in"]
    # Unknown operator — fail open (field stays visible) so a config typo
    # never blocks bookings.
    return True


def _validate_scalar(field: Any, value: Any, errors: dict[str, str]) -> Any:
    """Type-check and coerce one submitted value; returns the cleaned value."""
    name = field.field_name
    ftype = (field.field_type or "text").lower()
    rules = field.validation_rules if isinstance(field.validation_rules, dict) else {}

    if ftype in ("number", "integer"):
        try:
            num = float(value)
        except (TypeError, ValueError):
            errors[name] = "Must be a number"
            return None
        if ftype == "integer":
            if num != int(num):
                errors[name] = "Must be a whole number"
                return None
            num = int(num)
        if rules.get("min") is not None and num < float(rules["min"]):
            errors[name] = f"Must be at least {rules['min']}"
            return None
        if rules.get("max") is not None and num > float(rules["max"]):
            errors[name] = f"Must be at most {rules['max']}"
            return None
        return num

    if ftype == "boolean" or ftype == "checkbox":
        if isinstance(value, bool):
            return value
        if isinstance(value, str) and value.lower() in ("true", "false", "1", "0", "yes", "no"):
            return value.lower() in ("true", "1", "yes")
        errors[name] = "Must be true or false"
        return None

    # Everything else arrives as a string.
    if not isinstance(value, (str, int, float)):
        errors[name] = "Invalid value"
        return None
    text = str(value).strip()

    if ftype == "email":
        if not _EMAIL_RE.match(text):
            errors[name] = "Invalid email address"
            return None
    elif ftype in ("date", "datetime"):
        try:
            if ftype == "date":
                date.fromisoformat(text)
            else:
                datetime.fromisoformat(text.replace("Z", "+00:00"))
        except ValueError:
            errors[name] = "Invalid date"
            return None
    elif ftype in ("select", "radio"):
        options = field.options if isinstance(field.options, list) else []
        if options and text not in [str(o) for o in options]:
            errors[name] = "Invalid option"
            return None

    max_len = rules.get("max_length") or 2000
    if len(text) > int(max_len):
        errors[name] = f"Must be at most {int(max_len)} characters"
        return None
    if rules.get("min_length") is not None and len(text) < int(rules["min_length"]):
        errors[name] = f"Must be at least {int(rules['min_length'])} characters"
        return None
    pattern = rules.get("pattern")
    if pattern:
        try:
            if not re.search(pattern, text):
                errors[name] = rules.get("pattern_message") or "Invalid format"
                return None
        except re.error:
            pass  # bad admin regex must never block a booking

    return text


def validate_form_data(fields: Iterable[Any], form_data: dict | None) -> dict:
    """Validate submitted ``form_data`` against the service's field config.

    ``fields`` are the service's active ``ServiceBookingForm`` rows. Returns
    the cleaned dict to persist; raises :class:`BookingFormValidationError`
    with per-field messages on any violation.
    """
    submitted = dict(form_data or {})
    errors: dict[str, str] = {}
    cleaned: dict[str, Any] = {}

    field_map = {f.field_name: f for f in fields}

    unknown = [k for k in submitted if k not in field_map]
    if unknown:
        errors["_form"] = f"Unknown fields: {', '.join(sorted(unknown))}"

    for name, field in field_map.items():
        visible = _condition_met(field.conditional_logic, submitted)
        value = submitted.get(name)

        if not visible:
            continue  # hidden field: ignore any submitted value

        if _is_empty(value):
            if field.is_required:
                errors[name] = "This field is required"
            continue

        ftype = (field.field_type or "text").lower()
        if ftype in _MULTI_TYPES:
            values = value if isinstance(value, list) else [value]
            options = field.options if isinstance(field.options, list) else []
            allowed = [str(o) for o in options]
            picked: list[str] = []
            for v in values:
                text = str(v).strip()
                if options and text not in allowed:
                    errors[name] = "Invalid option"
                    break
                picked.append(text)
            else:
                cleaned[name] = picked
        else:
            result = _validate_scalar(field, value, errors)
            if name not in errors and result is not None:
                cleaned[name] = result

    if errors:
        raise BookingFormValidationError(errors)

    return cleaned


def summarize_form_data(fields: Iterable[Any], form_data: dict | None) -> str:
    """Human-readable "Label: value" lines (EN labels) for notification emails."""
    if not form_data:
        return ""
    labels = {f.field_name: f.field_label_en for f in fields}
    lines = []
    for key, value in form_data.items():
        label = labels.get(key, key)
        if isinstance(value, list):
            value = ", ".join(str(v) for v in value)
        lines.append(f"{label}: {value}")
    return "\n".join(lines)
