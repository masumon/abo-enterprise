"""Daily payment reconciliation — the write path PaymentReconciliation was
always missing (it only had a read-only admin list view). For a gateway and
a calendar day, tallies that gateway's transaction rows and cross-checks each
successful one against the Order/BookingV2 it's linked to, so a transaction
the gateway confirmed but the order/booking never got marked paid for shows
up as a discrepancy instead of silently going unnoticed.
"""
from __future__ import annotations

import uuid
from datetime import date as date_type, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import (
    BkashTransaction,
    BookingV2,
    NagadTransaction,
    Order,
    PaymentReconciliation,
    SslcommerzTransaction,
)

_GATEWAY_MODELS = {
    "bkash": BkashTransaction,
    "nagad": NagadTransaction,
    "sslcommerz": SslcommerzTransaction,
}

_SUCCESS_STATUSES = {"completed", "valid", "validated"}
_FAILED_STATUSES = {"failed", "cancelled"}


async def reconcile_gateway_day(
    db: AsyncSession,
    gateway: str,
    day: date_type,
    admin_id: uuid.UUID | None = None,
) -> PaymentReconciliation:
    if gateway not in _GATEWAY_MODELS:
        raise ValueError(f"Unknown gateway: {gateway}")
    model = _GATEWAY_MODELS[gateway]

    day_start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)

    rows = (await db.execute(
        select(model).where(model.created_at >= day_start, model.created_at < day_end)
    )).scalars().all()

    total_amount = sum(float(r.amount) for r in rows)
    successful = [r for r in rows if (r.status or "").lower() in _SUCCESS_STATUSES]
    failed = [r for r in rows if (r.status or "").lower() in _FAILED_STATUSES]
    pending_count = len(rows) - len(successful) - len(failed)

    discrepancies: list[dict] = []
    for txn in successful:
        order_id = getattr(txn, "order_id", None)
        booking_id = getattr(txn, "booking_id", None)
        if order_id:
            order = (await db.execute(select(Order).where(Order.id == order_id))).scalar_one_or_none()
            if order and order.payment_status != "completed":
                discrepancies.append({
                    "type": "order_not_marked_paid",
                    "transaction_id": str(txn.id),
                    "order_id": str(order_id),
                    "order_payment_status": order.payment_status,
                })
            elif not order:
                discrepancies.append({
                    "type": "order_missing",
                    "transaction_id": str(txn.id),
                    "order_id": str(order_id),
                })
        elif booking_id:
            booking = (await db.execute(select(BookingV2).where(BookingV2.id == booking_id))).scalar_one_or_none()
            if booking and booking.payment_status not in ("paid", "completed"):
                discrepancies.append({
                    "type": "booking_not_marked_paid",
                    "transaction_id": str(txn.id),
                    "booking_id": str(booking_id),
                    "booking_payment_status": booking.payment_status,
                })
            elif not booking:
                discrepancies.append({
                    "type": "booking_missing",
                    "transaction_id": str(txn.id),
                    "booking_id": str(booking_id),
                })
        else:
            discrepancies.append({
                "type": "transaction_unlinked",
                "transaction_id": str(txn.id),
            })

    existing = (await db.execute(
        select(PaymentReconciliation).where(
            PaymentReconciliation.payment_gateway == gateway,
            PaymentReconciliation.reconciliation_date == day_start,
        )
    )).scalar_one_or_none()

    record = existing or PaymentReconciliation(payment_gateway=gateway, reconciliation_date=day_start)
    record.total_transactions = len(rows)
    record.total_amount = total_amount
    record.successful_count = len(successful)
    record.failed_count = len(failed)
    record.pending_count = pending_count
    record.discrepancies = discrepancies
    # The payment_reconciliation table's DB-level CHECK constraint
    # (reconciliation_status_idx, migrations/007) only allows pending/
    # in_progress/completed/failed — not "matched"/"discrepancy".
    record.reconciliation_status = "failed" if discrepancies else "completed"
    record.processed_by = admin_id
    if not existing:
        db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


async def reconcile_all_gateways(
    db: AsyncSession, day: date_type, admin_id: uuid.UUID | None = None
) -> list[PaymentReconciliation]:
    return [await reconcile_gateway_day(db, gateway, day, admin_id) for gateway in _GATEWAY_MODELS]
