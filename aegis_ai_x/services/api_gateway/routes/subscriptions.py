"""Subscription & Billing routes — SUMONIX AI."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models.postgres_models import (
    UserSubscription, BillingTransaction,
    SubscriptionTier, SubscriptionStatus, BillingCycle,
    PLAN_LIMITS, PLAN_PRICING,
)
from database.session import get_db

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


# ─── Schemas ──────────────────────────────────


class PlanInfo(BaseModel):
    tier: str
    name: str
    price_monthly: float
    price_yearly: float
    limits: dict
    is_current: bool = False


class SubscriptionResponse(BaseModel):
    tier: str
    status: str
    billing_cycle: str
    messages_used_today: int
    messages_used_this_month: int
    tokens_used_this_month: int
    limits: dict
    current_period_end: str | None


class UpgradeRequest(BaseModel):
    tier: str
    billing_cycle: str = "monthly"
    payment_method_id: str | None = None  # Stripe payment method


class UsageResponse(BaseModel):
    messages_today: int
    messages_month: int
    tokens_month: int
    daily_limit: int
    monthly_limit: int
    percentage_daily: float
    percentage_monthly: float


# ─── Helpers ──────────────────────────────────


def _get_user_id(request: Request) -> str:
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id


# ─── Routes ───────────────────────────────────


@router.get("/plans", response_model=list[PlanInfo])
async def list_plans(request: Request, db: AsyncSession = Depends(get_db)):
    """List all available subscription plans."""
    user_id = _get_user_id(request)

    result = await db.execute(
        select(UserSubscription).where(UserSubscription.user_id == UUID(user_id))
    )
    sub = result.scalar_one_or_none()
    current_tier = sub.tier if sub else SubscriptionTier.FREE

    plan_names = {
        SubscriptionTier.FREE: "Free",
        SubscriptionTier.GO: "Go",
        SubscriptionTier.PRO: "Pro",
        SubscriptionTier.ULTRA_PRO: "Ultra Pro",
    }

    plans = []
    for tier in SubscriptionTier:
        pricing = PLAN_PRICING[tier]
        plans.append(PlanInfo(
            tier=tier.value,
            name=plan_names[tier],
            price_monthly=pricing["monthly"],
            price_yearly=pricing["yearly"],
            limits=PLAN_LIMITS[tier],
            is_current=(tier == current_tier),
        ))
    return plans


@router.get("/current", response_model=SubscriptionResponse)
async def get_current_subscription(request: Request, db: AsyncSession = Depends(get_db)):
    """Get current user's subscription details."""
    user_id = _get_user_id(request)

    result = await db.execute(
        select(UserSubscription).where(UserSubscription.user_id == UUID(user_id))
    )
    sub = result.scalar_one_or_none()

    if not sub:
        sub = UserSubscription(user_id=UUID(user_id), tier=SubscriptionTier.FREE)
        db.add(sub)
        await db.flush()

    return SubscriptionResponse(
        tier=sub.tier.value,
        status=sub.status.value,
        billing_cycle=sub.billing_cycle.value,
        messages_used_today=sub.messages_used_today,
        messages_used_this_month=sub.messages_used_this_month,
        tokens_used_this_month=sub.tokens_used_this_month,
        limits=PLAN_LIMITS[sub.tier],
        current_period_end=sub.current_period_end.isoformat() if sub.current_period_end else None,
    )


@router.get("/usage", response_model=UsageResponse)
async def get_usage(request: Request, db: AsyncSession = Depends(get_db)):
    """Get current usage statistics."""
    user_id = _get_user_id(request)

    result = await db.execute(
        select(UserSubscription).where(UserSubscription.user_id == UUID(user_id))
    )
    sub = result.scalar_one_or_none()
    if not sub:
        sub = UserSubscription(user_id=UUID(user_id), tier=SubscriptionTier.FREE)
        db.add(sub)
        await db.flush()

    limits = PLAN_LIMITS[sub.tier]
    daily_limit = limits["messages_per_day"]
    monthly_limit = limits["messages_per_month"]

    pct_daily = (sub.messages_used_today / daily_limit * 100) if daily_limit > 0 and daily_limit != -1 else 0
    pct_monthly = (sub.messages_used_this_month / monthly_limit * 100) if monthly_limit > 0 and monthly_limit != -1 else 0

    return UsageResponse(
        messages_today=sub.messages_used_today,
        messages_month=sub.messages_used_this_month,
        tokens_month=sub.tokens_used_this_month,
        daily_limit=daily_limit,
        monthly_limit=monthly_limit,
        percentage_daily=min(pct_daily, 100),
        percentage_monthly=min(pct_monthly, 100),
    )


@router.post("/upgrade", response_model=SubscriptionResponse)
async def upgrade_subscription(
    body: UpgradeRequest, request: Request, db: AsyncSession = Depends(get_db),
):
    """Upgrade or change subscription tier."""
    user_id = _get_user_id(request)

    try:
        new_tier = SubscriptionTier(body.tier)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid tier: {body.tier}")

    try:
        cycle = BillingCycle(body.billing_cycle)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid billing cycle: {body.billing_cycle}")

    result = await db.execute(
        select(UserSubscription).where(UserSubscription.user_id == UUID(user_id))
    )
    sub = result.scalar_one_or_none()
    if not sub:
        sub = UserSubscription(user_id=UUID(user_id))
        db.add(sub)

    pricing = PLAN_PRICING[new_tier]
    amount = pricing["yearly"] if cycle == BillingCycle.YEARLY else pricing["monthly"]

    # In production: Create Stripe checkout session here
    # For now: directly upgrade
    sub.tier = new_tier
    sub.billing_cycle = cycle
    sub.status = SubscriptionStatus.ACTIVE

    if amount > 0:
        txn = BillingTransaction(
            user_id=UUID(user_id),
            amount=amount,
            description=f"Subscription upgrade to {new_tier.value} ({cycle.value})",
            status="succeeded",
        )
        db.add(txn)

    await db.flush()

    return SubscriptionResponse(
        tier=sub.tier.value,
        status=sub.status.value,
        billing_cycle=sub.billing_cycle.value,
        messages_used_today=sub.messages_used_today,
        messages_used_this_month=sub.messages_used_this_month,
        tokens_used_this_month=sub.tokens_used_this_month,
        limits=PLAN_LIMITS[sub.tier],
        current_period_end=sub.current_period_end.isoformat() if sub.current_period_end else None,
    )


@router.post("/cancel")
async def cancel_subscription(request: Request, db: AsyncSession = Depends(get_db)):
    """Cancel subscription (downgrade to free at period end)."""
    user_id = _get_user_id(request)

    result = await db.execute(
        select(UserSubscription).where(UserSubscription.user_id == UUID(user_id))
    )
    sub = result.scalar_one_or_none()
    if not sub or sub.tier == SubscriptionTier.FREE:
        raise HTTPException(status_code=400, detail="No active paid subscription")

    sub.cancel_at_period_end = True
    await db.flush()

    return {"detail": "Subscription will be cancelled at the end of the billing period"}


@router.get("/billing-history")
async def get_billing_history(request: Request, db: AsyncSession = Depends(get_db)):
    """Get user's billing transaction history."""
    user_id = _get_user_id(request)

    result = await db.execute(
        select(BillingTransaction)
        .where(BillingTransaction.user_id == UUID(user_id))
        .order_by(BillingTransaction.created_at.desc())
        .limit(50)
    )
    transactions = result.scalars().all()
    return [
        {
            "id": str(t.id),
            "amount": t.amount,
            "currency": t.currency,
            "description": t.description,
            "status": t.status,
            "created_at": t.created_at.isoformat(),
        }
        for t in transactions
    ]
