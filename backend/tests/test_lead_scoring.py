"""Unit tests for leads_v2.calculate_lead_score — pure scoring logic, no
database involved. Uses SimpleNamespace fakes for the LeadV2 row, matching
the convention in test_booking_form.py.
"""
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from app.api.v1.routes.leads_v2 import calculate_lead_score


def make_lead(**kwargs) -> SimpleNamespace:
    base = dict(
        budget_min=None,
        company_size=None,
        project_description=None,
        requirements=None,
        created_at=datetime.now(timezone.utc),
        lead_type="general",
    )
    base.update(kwargs)
    return SimpleNamespace(**base)


class TestCalculateLeadScore:
    def test_empty_lead_scores_from_recency_only(self):
        # A brand new lead with nothing filled in still gets the "fresh"
        # response-time bonus (created just now).
        lead = make_lead()
        assert calculate_lead_score(lead) == 15

    def test_high_budget_adds_max_points(self):
        lead = make_lead(budget_min=600_000)
        assert calculate_lead_score(lead) >= 30 + 15  # budget + freshness

    def test_budget_tiers_are_distinct(self):
        assert calculate_lead_score(make_lead(budget_min=600_000)) > calculate_lead_score(make_lead(budget_min=150_000))
        assert calculate_lead_score(make_lead(budget_min=150_000)) > calculate_lead_score(make_lead(budget_min=60_000))
        assert calculate_lead_score(make_lead(budget_min=60_000)) > calculate_lead_score(make_lead(budget_min=10_000))

    def test_enterprise_company_size_scores_highest(self):
        assert calculate_lead_score(make_lead(company_size="enterprise")) > calculate_lead_score(make_lead(company_size="large"))
        assert calculate_lead_score(make_lead(company_size="large")) > calculate_lead_score(make_lead(company_size="medium"))
        assert calculate_lead_score(make_lead(company_size="medium")) > calculate_lead_score(make_lead(company_size=None))

    def test_detailed_description_and_requirements_add_points(self):
        short = make_lead(project_description="short")
        long = make_lead(project_description="x" * 150, requirements="y" * 150)
        assert calculate_lead_score(long) > calculate_lead_score(short)

    def test_stale_lead_scores_lower_than_fresh(self):
        fresh = make_lead(created_at=datetime.now(timezone.utc))
        within_week = make_lead(created_at=datetime.now(timezone.utc) - timedelta(hours=48))
        stale = make_lead(created_at=datetime.now(timezone.utc) - timedelta(days=30))
        assert calculate_lead_score(fresh) > calculate_lead_score(within_week) > calculate_lead_score(stale)

    def test_high_value_service_type_adds_points(self):
        assert calculate_lead_score(make_lead(lead_type="software")) > calculate_lead_score(make_lead(lead_type="general"))
        assert calculate_lead_score(make_lead(lead_type="ai")) > calculate_lead_score(make_lead(lead_type="general"))

    def test_score_never_exceeds_100(self):
        maxed = make_lead(
            budget_min=1_000_000,
            company_size="enterprise",
            project_description="x" * 200,
            requirements="y" * 200,
            created_at=datetime.now(timezone.utc),
            lead_type="ai",
        )
        assert calculate_lead_score(maxed) == 100

    def test_no_created_at_does_not_crash(self):
        lead = make_lead(created_at=None)
        assert calculate_lead_score(lead) == 0
