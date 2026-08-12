"""One-time backfill: populate customer_id on historical orders, bookings_v2
and leads_v2 rows (added NULL-only by alembic 0036 / manual_sql
0036_transaction_customer_fk.sql — the migration deliberately did not
backfill, per its own comment, because that needs this same phone-matching
logic run and reviewed separately against real data).

NOT run automatically anywhere (not in startup, not in a migration). A human
runs this deliberately, reviews the dry-run output first, then re-runs with
--apply. This is exactly the kind of "execute against production data"
action that requires the owner's own hands on it, not an agent's.

Matching rule: identical to app.core.customer_master.get_or_create_customer
— match an existing Customer by phone, trying both the local (01XXXXXXXXX)
and +880 international form. Deliberately does NOT create new Customer rows
for unmatched phones (that would fabricate customer-count history); rows
with no matching Customer are left with customer_id = NULL and reported.

Usage (from backend/):
    python -m scripts.backfill_customer_ids            # dry run, no writes
    python -m scripts.backfill_customer_ids --apply     # commits the backfill
"""
from __future__ import annotations

import argparse
import asyncio
import logging

from sqlalchemy import select

from app.core.customer_master import _alternate_phone_forms
from app.core.database import AsyncSessionLocal
from app.models.customer import Customer
from app.models.models import BookingV2, LeadV2, Order

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("backfill_customer_ids")

# (model, phone column name, label)
_TARGETS = [
    (Order, "customer_phone", "orders"),
    (BookingV2, "customer_phone", "bookings_v2"),
    (LeadV2, "phone", "leads_v2"),
]


async def _backfill_table(db, model, phone_attr: str, label: str, apply: bool) -> None:
    phone_col = getattr(model, phone_attr)
    rows = (
        await db.execute(select(model).where(model.customer_id.is_(None)))
    ).scalars().all()

    matched = 0
    unmatched = 0
    for row in rows:
        phone = (getattr(row, phone_attr, None) or "").strip()
        if not phone:
            unmatched += 1
            continue
        candidates = _alternate_phone_forms(phone)
        customer = (
            await db.execute(
                select(Customer).where(Customer.phone.in_(candidates), Customer.is_deleted == False)  # noqa: E712
            )
        ).scalars().first()
        if customer:
            matched += 1
            if apply:
                row.customer_id = customer.id
        else:
            unmatched += 1

    logger.info(
        "%s: %d row(s) with no customer_id — %d matched to an existing customer, %d unmatched (left NULL)",
        label, len(rows), matched, unmatched,
    )
    if apply and matched:
        await db.commit()


async def main(apply: bool) -> None:
    logger.info("Mode: %s", "APPLY (will write customer_id)" if apply else "DRY RUN (no writes — pass --apply to commit)")
    async with AsyncSessionLocal() as db:
        for model, phone_attr, label in _TARGETS:
            await _backfill_table(db, model, phone_attr, label, apply)
    logger.info("Done.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Commit the backfill (default: dry run only)")
    args = parser.parse_args()
    asyncio.run(main(args.apply))
