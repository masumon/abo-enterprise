"""Optional appointment scheduling for services.

Off by default. A service with ``scheduling_enabled = False`` behaves exactly
as before: ``booking_date`` stays a free "preferred date" with no constraints,
which is what every existing service and every existing booking relies on.

When an admin turns it on, the service declares:

- ``working_hours``  — per weekday open ranges, e.g.
  ``{"mon": [["09:00", "13:00"], ["14:00", "18:00"]], "fri": []}``
- ``slot_duration_minutes`` — how long one appointment takes
- ``slot_capacity`` — how many bookings may share one slot (1 = exclusive)
- ``holidays`` — ISO dates the service is closed, e.g. ``["2026-12-16"]``
- ``min_notice_hours`` — how far ahead a customer must book
- ``booking_horizon_days`` — how far ahead booking is allowed

Everything here is pure apart from :func:`slot_availability`, which counts
existing bookings. The same functions back the public availability endpoint and
the server-side validation on booking creation, so the slots a customer is
offered and the slots the server accepts can never diverge.

All times are Asia/Dhaka (the business operates in one timezone); slots are
returned and stored as timezone-aware UTC instants.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from typing import Any, Iterable

# The business runs on Bangladesh time. Fixed offset rather than a tz database
# lookup: Bangladesh has had no DST since 2009, so UTC+6 is exact.
BD_TZ = timezone(timedelta(hours=6))

WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

DEFAULT_SLOT_MINUTES = 60
DEFAULT_CAPACITY = 1
DEFAULT_HORIZON_DAYS = 60


class SchedulingError(ValueError):
    """Raised when a requested slot is not bookable. Message is customer-safe."""


def is_enabled(service: Any) -> bool:
    return bool(getattr(service, "scheduling_enabled", False))


def _parse_hhmm(value: str) -> time | None:
    try:
        hh, mm = str(value).strip().split(":")[:2]
        return time(int(hh), int(mm))
    except (ValueError, AttributeError):
        return None  # a malformed range is skipped, never fatal


def _ranges_for(service: Any, day: date) -> list[tuple[time, time]]:
    """Open ranges for one weekday, normalised and validated."""
    hours = getattr(service, "working_hours", None)
    if not isinstance(hours, dict):
        return []
    raw = hours.get(WEEKDAY_KEYS[day.weekday()]) or []
    if not isinstance(raw, list):
        return []
    ranges: list[tuple[time, time]] = []
    for item in raw:
        if not isinstance(item, (list, tuple)) or len(item) < 2:
            continue
        start, end = _parse_hhmm(item[0]), _parse_hhmm(item[1])
        if start and end and start < end:
            ranges.append((start, end))
    return sorted(ranges)


def is_holiday(service: Any, day: date) -> bool:
    holidays = getattr(service, "holidays", None)
    if not isinstance(holidays, list):
        return False
    iso = day.isoformat()
    return any(str(h).strip()[:10] == iso for h in holidays)


def generate_slots(service: Any, day: date) -> list[datetime]:
    """Every slot start on ``day``, as timezone-aware UTC datetimes.

    Empty when the service is closed that day, the day is a holiday, or the
    working hours are unset/malformed — a misconfigured service offers nothing
    rather than offering something wrong.
    """
    if is_holiday(service, day):
        return []

    minutes = int(getattr(service, "slot_duration_minutes", None) or DEFAULT_SLOT_MINUTES)
    if minutes <= 0:
        return []
    step = timedelta(minutes=minutes)

    slots: list[datetime] = []
    for start, end in _ranges_for(service, day):
        cursor = datetime.combine(day, start, tzinfo=BD_TZ)
        closing = datetime.combine(day, end, tzinfo=BD_TZ)
        # A slot must finish within the range, so a 90-minute appointment can't
        # be booked into the last hour before closing.
        while cursor + step <= closing:
            slots.append(cursor.astimezone(timezone.utc))
            cursor += step
    return slots


def bookable_window(service: Any, now: datetime | None = None) -> tuple[datetime, datetime]:
    """Earliest and latest instant a customer may book, in UTC."""
    now = now or datetime.now(timezone.utc)
    notice = int(getattr(service, "min_notice_hours", None) or 0)
    horizon = int(getattr(service, "booking_horizon_days", None) or DEFAULT_HORIZON_DAYS)
    return now + timedelta(hours=notice), now + timedelta(days=horizon)


def slot_availability(
    service: Any, day: date, taken: dict[datetime, int], now: datetime | None = None
) -> list[dict]:
    """Slots for ``day`` annotated with remaining capacity.

    ``taken`` maps a slot start (UTC) to how many bookings already hold it —
    supplied by the caller so this stays free of DB access and easy to test.
    """
    capacity = max(1, int(getattr(service, "slot_capacity", None) or DEFAULT_CAPACITY))
    earliest, latest = bookable_window(service, now)

    out: list[dict] = []
    for slot in generate_slots(service, day):
        used = taken.get(slot, 0)
        remaining = max(0, capacity - used)
        out.append(
            {
                "start": slot.isoformat(),
                "label": slot.astimezone(BD_TZ).strftime("%I:%M %p").lstrip("0"),
                "capacity": capacity,
                "remaining": remaining,
                "available": remaining > 0 and earliest <= slot <= latest,
            }
        )
    return out


def assert_slot_bookable(
    service: Any, requested: datetime, taken: dict[datetime, int], now: datetime | None = None
) -> datetime:
    """Validate a requested slot server-side; returns the normalised UTC slot.

    Raises :class:`SchedulingError` with a customer-safe message. Called on
    every booking so a stale page or a crafted request can't take a slot that
    was never offered.
    """
    if requested.tzinfo is None:
        requested = requested.replace(tzinfo=timezone.utc)
    requested = requested.astimezone(timezone.utc)

    earliest, latest = bookable_window(service, now)
    if requested < earliest:
        notice = int(getattr(service, "min_notice_hours", None) or 0)
        raise SchedulingError(
            f"Please choose a time at least {notice} hour(s) from now"
            if notice
            else "Please choose a time in the future"
        )
    if requested > latest:
        raise SchedulingError("That date is too far ahead — please choose a nearer date")

    local_day = requested.astimezone(BD_TZ).date()
    if is_holiday(service, local_day):
        raise SchedulingError("We are closed on that date — please choose another day")

    if requested not in set(generate_slots(service, local_day)):
        raise SchedulingError("That time slot is not available — please pick one from the list")

    capacity = max(1, int(getattr(service, "slot_capacity", None) or DEFAULT_CAPACITY))
    if taken.get(requested, 0) >= capacity:
        raise SchedulingError("That time slot has just been filled — please pick another")

    return requested


def taken_counts(rows: Iterable[tuple[datetime, int]]) -> dict[datetime, int]:
    """Normalise (booking_date, count) rows into a UTC-keyed lookup."""
    counts: dict[datetime, int] = {}
    for slot, count in rows:
        if slot is None:
            continue
        if slot.tzinfo is None:
            slot = slot.replace(tzinfo=timezone.utc)
        counts[slot.astimezone(timezone.utc)] = int(count or 0)
    return counts
