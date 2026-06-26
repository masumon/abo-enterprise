"""
AI Lead Scoring Engine v2
Refined scoring algorithm with weighted factors.
"""
from dataclasses import dataclass, field
from typing import Optional
import math


@dataclass
class LeadData:
    lead_type: str = ""
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    company: Optional[str] = None
    company_size: Optional[str] = None
    email: Optional[str] = None
    project_description: Optional[str] = None
    requirements: Optional[str] = None
    timeline: Optional[str] = None
    source: Optional[str] = None
    previous_interactions: int = 0


@dataclass
class ScoreResult:
    total: int = 0
    factors: dict = field(default_factory=dict)
    grade: str = "cold"
    recommendation: str = ""


# ── Weights (total possible = 100) ──────────────────────────
BUDGET_WEIGHT = 30
SERVICE_WEIGHT = 20
COMPLETENESS_WEIGHT = 20
TIMELINE_WEIGHT = 15
ENGAGEMENT_WEIGHT = 15

HIGH_VALUE_SERVICES = {
    "erp", "crm", "hospital_management", "school_management",
    "isp_billing", "custom_software", "ai_solutions", "pos_system",
    "software_development", "mobile_app",
}
MEDIUM_VALUE_SERVICES = {
    "web_development", "website_design", "ecommerce",
    "python_automation", "consulting",
}


def score_budget(budget_min: Optional[float], budget_max: Optional[float]) -> tuple[int, str]:
    avg = None
    if budget_min and budget_max:
        avg = (budget_min + budget_max) / 2
    elif budget_min:
        avg = budget_min
    elif budget_max:
        avg = budget_max

    if avg is None:
        return 5, "No budget specified"
    if avg >= 500_000:
        return 30, f"High budget ৳{avg:,.0f}"
    if avg >= 200_000:
        return 25, f"Good budget ৳{avg:,.0f}"
    if avg >= 100_000:
        return 20, f"Medium budget ৳{avg:,.0f}"
    if avg >= 50_000:
        return 15, f"Low-medium budget ৳{avg:,.0f}"
    if avg >= 10_000:
        return 8, f"Low budget ৳{avg:,.0f}"
    return 3, f"Very low budget ৳{avg:,.0f}"


def score_service_type(lead_type: str) -> tuple[int, str]:
    lt = lead_type.lower()
    if lt in HIGH_VALUE_SERVICES:
        return 20, f"High-value service: {lead_type}"
    if lt in MEDIUM_VALUE_SERVICES:
        return 14, f"Medium-value service: {lead_type}"
    if lt:
        return 8, f"Standard service: {lead_type}"
    return 3, "No service type specified"


def score_completeness(data: LeadData) -> tuple[int, str]:
    filled = sum([
        bool(data.email),
        bool(data.company),
        bool(data.project_description and len(data.project_description) > 50),
        bool(data.requirements and len(data.requirements) > 30),
        bool(data.budget_min or data.budget_max),
        bool(data.timeline),
        bool(data.company_size),
    ])
    score = min(20, round(filled / 7 * 20))
    return score, f"{filled}/7 fields completed"


def score_timeline(timeline: Optional[str]) -> tuple[int, str]:
    urgency_map = {
        "urgent": 15,
        "asap": 15,
        "1_month": 13,
        "1-3_months": 12,
        "3-6_months": 9,
        "6-12_months": 6,
        "12_months_plus": 4,
    }
    if not timeline:
        return 5, "No timeline"
    score = urgency_map.get(timeline.lower(), 5)
    return score, f"Timeline: {timeline}"


def score_engagement(source: Optional[str], interactions: int) -> tuple[int, str]:
    source_scores = {
        "direct": 12,
        "referral": 15,
        "whatsapp": 10,
        "social_media": 8,
        "website": 9,
        "google": 11,
        "csv_import": 4,
    }
    base = source_scores.get((source or "").lower(), 6)
    interaction_bonus = min(3, interactions)
    return min(15, base + interaction_bonus), f"Source: {source}, interactions: {interactions}"


def calculate_lead_score(data: LeadData) -> ScoreResult:
    budget_score, budget_note = score_budget(data.budget_min, data.budget_max)
    service_score, service_note = score_service_type(data.lead_type)
    completeness_score, completeness_note = score_completeness(data)
    timeline_score, timeline_note = score_timeline(data.timeline)
    engagement_score, engagement_note = score_engagement(data.source, data.previous_interactions)

    total = budget_score + service_score + completeness_score + timeline_score + engagement_score
    total = min(100, max(0, total))

    if total >= 75:
        grade, recommendation = "hot", "Contact within 2 hours"
    elif total >= 55:
        grade, recommendation = "warm", "Contact within 24 hours"
    elif total >= 35:
        grade, recommendation = "cool", "Nurture with follow-up email"
    else:
        grade, recommendation = "cold", "Add to newsletter list"

    return ScoreResult(
        total=total,
        factors={
            "budget": {"score": budget_score, "max": BUDGET_WEIGHT, "note": budget_note},
            "service_type": {"score": service_score, "max": SERVICE_WEIGHT, "note": service_note},
            "completeness": {"score": completeness_score, "max": COMPLETENESS_WEIGHT, "note": completeness_note},
            "timeline": {"score": timeline_score, "max": TIMELINE_WEIGHT, "note": timeline_note},
            "engagement": {"score": engagement_score, "max": ENGAGEMENT_WEIGHT, "note": engagement_note},
        },
        grade=grade,
        recommendation=recommendation,
    )


def rescore_lead(lead) -> ScoreResult:
    """Rescore an existing lead model instance"""
    data = LeadData(
        lead_type=lead.lead_type or "",
        budget_min=float(lead.budget_min) if lead.budget_min else None,
        budget_max=float(lead.budget_max) if lead.budget_max else None,
        company=lead.company,
        company_size=lead.company_size,
        email=lead.email,
        project_description=lead.project_description,
        requirements=lead.requirements,
        timeline=lead.timeline,
        source=lead.source,
    )
    return calculate_lead_score(data)
