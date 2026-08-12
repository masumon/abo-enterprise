"""PaymentReconciliation write path (app.core.reconciliation) — this table
previously had a read-only admin view and nothing ever wrote to it. Verifies
the discrepancy-detection logic (a gateway-confirmed transaction whose order
was never marked paid) since that's the entire point of the feature.
"""
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest

from app.core.reconciliation import reconcile_gateway_day


class _ScalarsResult:
    def __init__(self, rows):
        self._rows = rows

    def scalars(self):
        return SimpleNamespace(all=lambda: self._rows)


class _OneResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value


@pytest.mark.asyncio
async def test_reconcile_flags_transaction_whose_order_was_never_marked_paid():
    txn_matched = SimpleNamespace(
        id=uuid4(), amount=500, status="Completed",
        order_id=uuid4(), booking_id=None, created_at=datetime.now(timezone.utc),
    )
    txn_mismatched = SimpleNamespace(
        id=uuid4(), amount=750, status="Completed",
        order_id=uuid4(), booking_id=None, created_at=datetime.now(timezone.utc),
    )
    order_matched = SimpleNamespace(payment_status="completed")
    order_mismatched = SimpleNamespace(payment_status="pending")

    db = SimpleNamespace(
        execute=AsyncMock(side_effect=[
            _ScalarsResult([txn_matched, txn_mismatched]),  # transaction list
            _OneResult(order_matched),                       # order lookup for txn_matched
            _OneResult(order_mismatched),                    # order lookup for txn_mismatched
            _OneResult(None),                                # no existing reconciliation row
        ]),
        add=Mock(),
        commit=AsyncMock(),
        refresh=AsyncMock(),
    )

    record = await reconcile_gateway_day(db, "bkash", datetime.now(timezone.utc).date())

    assert record.total_transactions == 2
    assert record.successful_count == 2
    assert record.failed_count == 0
    assert record.total_amount == 1250
    assert record.reconciliation_status == "discrepancy"
    assert len(record.discrepancies) == 1
    assert record.discrepancies[0]["type"] == "order_not_marked_paid"
    assert record.discrepancies[0]["transaction_id"] == str(txn_mismatched.id)
    db.add.assert_called_once()
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_reconcile_with_no_transactions_is_clean_and_matched():
    db = SimpleNamespace(
        execute=AsyncMock(side_effect=[
            _ScalarsResult([]),
            _OneResult(None),
        ]),
        add=Mock(),
        commit=AsyncMock(),
        refresh=AsyncMock(),
    )

    record = await reconcile_gateway_day(db, "nagad", datetime.now(timezone.utc).date())

    assert record.total_transactions == 0
    assert record.reconciliation_status == "matched"
    assert record.discrepancies == []


@pytest.mark.asyncio
async def test_reconcile_unknown_gateway_rejected():
    db = SimpleNamespace(execute=AsyncMock())
    with pytest.raises(ValueError):
        await reconcile_gateway_day(db, "unknown_gateway", datetime.now(timezone.utc).date())
