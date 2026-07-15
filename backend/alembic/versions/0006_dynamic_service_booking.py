"""dynamic_service_booking — JSONB booking answers, per-service CTA, taxonomy seed.

Three additive pieces that complete the nested Service Booking architecture:

1. ``bookings_v2.form_data`` (JSONB) — stores the customer's answers to the
   admin-defined dynamic booking form (``service_booking_forms``). Existing
   rows default to ``{}``; nothing about the current booking flow changes.

2. ``services.cta_type`` / ``cta_label_en`` / ``cta_label_bn`` — optional
   per-service Call-To-Action override. NULL (default for every existing row)
   means "infer from pricing_type + capabilities", exactly today's behaviour.

3. Seed of the 9-category service taxonomy (Category → Subcategory) into the
   ``categories`` / ``subcategories`` tables from migration 0004. Fully
   idempotent (ON CONFLICT DO NOTHING) and non-destructive: existing rows are
   never updated or deleted.

Idempotent (IF NOT EXISTS / ON CONFLICT) and additive; no-op downgrade.

Revision ID: 0006
Revises: 0005
Create Date: 2026-07-15
"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


# (slug, name_en, name_bn, icon, sort_order, [(sub_slug, sub_en, sub_bn), ...])
SERVICE_TAXONOMY_SEED: list[tuple[str, str, str, str, int, list[tuple[str, str, str]]]] = [
    (
        "digital-e-services", "Digital & E-Services", "ডিজিটাল ও ই-সেবা", "FileText", 1,
        [
            ("passport", "Passport", "পাসপোর্ট"),
            ("nid", "NID", "NID"),
            ("birth-death-registration", "Birth/Death Registration", "জন্ম/মৃত্যু নিবন্ধন"),
            ("travel-visa", "Travel & Visa", "ট্রাভেল ও ভিসা"),
            ("online-application", "Online Application", "অনলাইন আবেদন"),
            ("payment-recharge", "Payment/Recharge", "পেমেন্ট/রিচার্জ"),
        ],
    ),
    (
        "printing-documentation", "Printing & Documentation", "প্রিন্টিং ও ডকুমেন্টেশন", "Printer", 2,
        [
            ("printing-photocopy", "Printing/Photocopy", "প্রিন্টিং/ফটোকপি"),
            ("plastic-id-card", "Plastic ID Card", "প্লাস্টিক আইডি কার্ড"),
            ("scanning-lamination", "Scanning/Lamination", "স্ক্যানিং/ল্যামিনেশন"),
            ("cv-writing", "CV Writing", "সিভি তৈরি"),
            ("legal-drafting", "Legal Drafting", "লিগ্যাল ড্রাফটিং"),
        ],
    ),
    (
        "web-software", "Web & Software", "ওয়েব ও সফটওয়্যার", "Globe", 3,
        [
            ("website-design", "Website Design", "ওয়েবসাইট ডিজাইন"),
            ("custom-software", "Custom Software", "কাস্টম সফটওয়্যার"),
            ("sports-tracking-app", "Sports Tracking App", "স্পোর্টস ট্র্যাকিং অ্যাপ"),
            ("web-maintenance", "Web Maintenance", "ওয়েব মেইনটেন্যান্স"),
        ],
    ),
    (
        "mobile-lab", "Mobile Lab", "মোবাইল ল্যাব", "Smartphone", 4,
        [
            ("software-unlock", "Software Unlock", "সফটওয়্যার আনলক"),
            ("flashing-repair", "Flashing/Repair", "ফ্ল্যাশিং/রিপেয়ার"),
            ("data-recovery", "Data Recovery", "ডেটা রিকভারি"),
            ("app-development", "App Development", "অ্যাপ ডেভেলপমেন্ট"),
            ("parts-sales", "Parts Sales", "পার্টস সেলস"),
        ],
    ),
    (
        "it-support", "IT Support", "আইটি সাপোর্ট", "Headphones", 5,
        [
            ("os-installation", "OS Installation", "ওএস ইন্সটলেশন"),
            ("pc-optimization", "PC Optimization", "পিসি অপটিমাইজেশন"),
            ("networking", "Networking", "নেটওয়ার্কিং"),
            ("cctv", "CCTV", "সিসিটিভি"),
            ("hardware-servicing", "Hardware Servicing", "হার্ডওয়্যার সার্ভিসিং"),
            ("corporate-amc", "Corporate AMC", "কর্পোরেট AMC"),
        ],
    ),
    (
        "marketing-design", "Marketing & Design", "মার্কেটিং ও ডিজাইন", "Megaphone", 6,
        [
            ("logo-branding", "Logo & Branding", "লোগো ব্র্যান্ডিং"),
            ("social-media-campaign", "Social Media Campaign", "সোশ্যাল মিডিয়া ক্যাম্পেইন"),
            ("graphic-design", "Graphic Design", "গ্রাফিক ডিজাইন"),
            ("seo", "SEO", "এসইও (SEO)"),
        ],
    ),
    (
        "business-consultancy", "Business Consultancy", "বিজনেস কনসালটেন্সি", "Briefcase", 7,
        [
            ("showroom-interior-planning", "Showroom Interior Planning", "শোরুম ইন্টেরিয়র প্ল্যানিং"),
            ("wholesale-sourcing", "Wholesale Sourcing", "হোলসেল সোর্সিং"),
            ("pos-erp-solution", "POS/ERP Solution", "POS/ERP সল্যুশন"),
            ("isp-iptv-server", "ISP/IPTV Server", "ISP/IPTV সার্ভার"),
        ],
    ),
    (
        "ai-automation", "AI & Automation", "এআই ও অটোমেশন", "Bot", 8,
        [
            ("python-automation", "Python Automation", "পাইথন অটোমেশন"),
            ("chatbot", "Chatbot", "চ্যাটবট"),
            ("business-ai-tools", "Business AI Tools", "বিজনেস এআই টুলস"),
        ],
    ),
    (
        "others", "Others", "অন্যান্য", "Cog", 9,
        [
            ("future-services", "Future Services", "ভবিষ্যৎ সেবা"),
        ],
    ),
]


def upgrade() -> None:
    # 1. Dynamic booking answers (admin-defined form fields → customer values).
    op.execute(
        "ALTER TABLE bookings_v2 ADD COLUMN IF NOT EXISTS form_data JSONB NOT NULL DEFAULT '{}'::jsonb"
    )

    # 2. Per-service CTA override (NULL = infer from pricing_type/capabilities).
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS cta_type VARCHAR(20)")
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS cta_label_en VARCHAR(120)")
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS cta_label_bn VARCHAR(120)")

    # 3. Service taxonomy seed (only inserts what is missing).
    bind = op.get_bind()
    cat_sql = sa.text(
        """
        INSERT INTO categories (slug, name_en, name_bn, icon, applies_to, sort_order, is_active)
        VALUES (:slug, :name_en, :name_bn, :icon, '["service"]'::jsonb, :sort_order, TRUE)
        ON CONFLICT (slug) DO NOTHING
        """
    )
    sub_sql = sa.text(
        """
        INSERT INTO subcategories (category_id, slug, name_en, name_bn, sort_order, is_active)
        SELECT c.id, :slug, :name_en, :name_bn, :sort_order, TRUE
        FROM categories c
        WHERE c.slug = :category_slug
        ON CONFLICT (category_id, slug) DO NOTHING
        """
    )
    for slug, name_en, name_bn, icon, sort_order, subs in SERVICE_TAXONOMY_SEED:
        bind.execute(
            cat_sql,
            {"slug": slug, "name_en": name_en, "name_bn": name_bn, "icon": icon, "sort_order": sort_order},
        )
        for i, (sub_slug, sub_en, sub_bn) in enumerate(subs, start=1):
            bind.execute(
                sub_sql,
                {
                    "slug": sub_slug,
                    "name_en": sub_en,
                    "name_bn": sub_bn,
                    "sort_order": i,
                    "category_slug": slug,
                },
            )


def downgrade() -> None:
    # Additive-only; leaving columns and seeded taxonomy in place is safe. No-op by design.
    pass
