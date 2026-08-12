import logging

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer

logger = logging.getLogger(__name__)


def _alternate_phone_forms(phone: str) -> list[str]:
    """Local <-> +880 international equivalents of an already bd_phone()-
    validated BD number, so a lookup matches a Customer row stored in either
    valid representation (the customer_master backfill and bd_phone() both
    accept — and therefore may have stored — either form)."""
    forms = [phone]
    if phone.startswith("+880") and len(phone) == 14:
        forms.append("0" + phone[4:])
    elif phone.startswith("880") and len(phone) == 13:
        forms.append("0" + phone[3:])
    elif phone.startswith("0") and len(phone) == 11:
        forms.append("+880" + phone[1:])
    return forms


async def get_or_create_customer(
    db: AsyncSession,
    *,
    phone: str,
    name: str | None = None,
    email: str | None = None,
    company: str | None = None,
    address: str | None = None,
) -> Customer | None:
    """Resolve the canonical Customer row for a phone used on a new order,
    booking or lead — creating one the first time this phone is seen.

    Never overwrites an existing customer's profile fields; the admin
    customer profile (PATCH /admin/customers/{id}) is the source of truth
    once a row exists. This only fills in the identity link and creates a
    minimal row when one doesn't exist yet, so new activity keeps rolling
    up into /admin/customers instead of drifting out of sync the way it did
    before (customer master only grew via a one-time manual SQL backfill).

    Uses INSERT ... ON CONFLICT DO NOTHING + re-select rather than a plain
    add()+flush()+catch, so a race with a concurrent request for the same
    new phone can't force a rollback of the caller's own in-progress
    transaction (this is typically called before the order/booking/lead's
    own commit).
    """
    phone = (phone or "").strip()
    if not phone:
        return None

    candidates = _alternate_phone_forms(phone)
    existing = (
        await db.execute(
            select(Customer).where(Customer.phone.in_(candidates), Customer.is_deleted == False)  # noqa: E712
        )
    ).scalars().first()
    if existing:
        return existing

    stmt = (
        pg_insert(Customer)
        .values(
            phone=phone,
            name=(name or "").strip() or phone,
            email=email or None,
            company=company or None,
            address=address or None,
        )
        .on_conflict_do_nothing(index_elements=["phone"])
    )
    await db.execute(stmt)

    return (
        await db.execute(
            select(Customer).where(Customer.phone.in_(candidates), Customer.is_deleted == False)  # noqa: E712
        )
    ).scalars().first()
