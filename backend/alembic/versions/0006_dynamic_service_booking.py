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
   idempotent (ON CONFLICT DO NOTHING).

4. Re-link: migration 0004 auto-generated categories from the legacy
   ``services.category`` strings (slug/name like ``printing``, ``web``,
   ``digital-services``) and pointed ``services.category_id`` at them. Those
   machine rows are superseded by the curated seed, so services are re-pointed
   onto the new taxonomy — but ONLY where ``category_id`` is NULL or still
   points at a known machine-generated row, so any manual admin assignment is
   preserved. Superseded machine categories that end up unreferenced are
   deactivated (``is_active = FALSE`` — reversible, never deleted).

Idempotent (IF NOT EXISTS / ON CONFLICT / guarded UPDATEs); no-op downgrade.

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


# legacy `services.category` string → (0004 machine slug, new seed category slug).
# Covers both the original seed strings (printing, web, ...) and the admin-UI
# values (digital_services, print_documentation, ...).
LEGACY_CATEGORY_MAP: list[tuple[str, str, str]] = [
    ("printing", "printing", "printing-documentation"),
    ("legal", "legal", "printing-documentation"),
    ("documents", "documents", "digital-e-services"),
    ("web", "web", "web-software"),
    ("software", "software", "web-software"),
    ("marketing", "marketing", "marketing-design"),
    ("design", "design", "marketing-design"),
    ("consulting", "consulting", "business-consultancy"),
    ("ai", "ai", "ai-automation"),
    ("automation", "automation", "ai-automation"),
    ("other", "other", "others"),
    ("digital_services", "digital-services", "digital-e-services"),
    ("print_documentation", "print-documentation", "printing-documentation"),
    ("mobile_software", "mobile-software", "mobile-lab"),
    ("computer_software", "computer-software", "it-support"),
    ("business_software", "business-software", "business-consultancy"),
    ("ai_solutions", "ai-solutions", "ai-automation"),
    ("web_software", "web-software", "web-software"),
    ("general", "general", "others"),
]


# Known seed services (004_services_system.sql) → curated taxonomy placement.
# (service slug, category slug, subcategory slug or None). Runs BEFORE the
# generic legacy relink so e.g. mobile-app-development lands in mobile-lab
# rather than web-software; guarded so manual admin placements are kept.
SERVICE_PLACEMENT_SEED: list[tuple[str, str, str | None]] = [
    ("printing-service", "printing-documentation", "printing-photocopy"),
    ("website-development", "web-software", "website-design"),
    ("mobile-app-development", "mobile-lab", "app-development"),
    ("digital-marketing", "marketing-design", "social-media-campaign"),
    ("branding-design", "marketing-design", "logo-branding"),
    ("business-consultation", "business-consultancy", None),
    ("custom-software", "web-software", "custom-software"),
    ("ai-solutions", "ai-automation", "business-ai-tools"),
    ("python-automation", "ai-automation", "python-automation"),
    ("legal-services", "printing-documentation", "legal-drafting"),
    ("nid-passport", "digital-e-services", "nid"),
    ("future-service", "others", "future-services"),
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
    # A machine-generated row from 0004 may already occupy a seed slug (e.g.
    # legacy 'web_software' → slug 'web-software'): normalize its display data
    # only while it is provably untouched (name_en still equals the raw legacy
    # string), then insert whatever is still missing.
    normalize_sql = sa.text(
        """
        UPDATE categories
        SET name_en = :name_en, name_bn = :name_bn, icon = :icon, sort_order = :sort_order,
            applies_to = CASE
              WHEN applies_to @> '["service"]'::jsonb THEN applies_to
              ELSE applies_to || '["service"]'::jsonb
            END
        WHERE slug = :slug AND name_en = :machine_name
        """
    )
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
    machine_names = {new_slug: legacy for legacy, _machine, new_slug in LEGACY_CATEGORY_MAP}
    for slug, name_en, name_bn, icon, sort_order, subs in SERVICE_TAXONOMY_SEED:
        if slug in machine_names:
            bind.execute(
                normalize_sql,
                {
                    "slug": slug, "name_en": name_en, "name_bn": name_bn,
                    "icon": icon, "sort_order": sort_order,
                    "machine_name": machine_names[slug],
                },
            )
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

    # 4a. Place the known seed services into their exact category AND
    #     subcategory so every nested /services/{cat}/{sub} page has content
    #     from day one. Guarded: skipped as soon as an admin has assigned a
    #     subcategory, or moved the service to a non-machine category.
    machine_slug_list = sorted({m for _l, m, _n in LEGACY_CATEGORY_MAP})
    placement_sql = sa.text(
        """
        UPDATE services sv
        SET category_id = c.id,
            subcategory_id = COALESCE(
              (SELECT s.id FROM subcategories s
               WHERE s.category_id = c.id AND s.slug = :sub_slug
                 AND s.is_deleted = FALSE),
              sv.subcategory_id
            )
        FROM categories c
        WHERE c.slug = :cat_slug
          AND c.is_deleted = FALSE
          AND sv.slug = :service_slug
          AND sv.is_deleted = FALSE
          AND sv.subcategory_id IS NULL
          AND (
            sv.category_id IS NULL
            OR sv.category_id = c.id
            OR sv.category_id IN (
              SELECT id FROM categories mc WHERE mc.slug = ANY(:machine_slugs)
            )
          )
        """
    )
    for service_slug, cat_slug, sub_slug in SERVICE_PLACEMENT_SEED:
        bind.execute(
            placement_sql,
            {
                "service_slug": service_slug,
                "cat_slug": cat_slug,
                "sub_slug": sub_slug or "",
                "machine_slugs": machine_slug_list,
            },
        )

    # 4b. Re-link remaining services from 0004's machine-generated categories
    #    onto the curated taxonomy. Only touches rows whose category_id is
    #    NULL or still points at the machine row for that same legacy string —
    #    a manually assigned category_id is never overwritten.
    relink_sql = sa.text(
        """
        UPDATE services sv
        SET category_id = new_c.id
        FROM categories new_c
        WHERE new_c.slug = :new_slug
          AND new_c.is_deleted = FALSE
          AND sv.category = :legacy
          AND sv.is_deleted = FALSE
          AND (
            sv.category_id IS NULL
            OR sv.category_id IN (
              SELECT id FROM categories mc
              WHERE mc.slug = :machine_slug AND mc.slug <> :new_slug
            )
          )
        """
    )
    for legacy, machine_slug, new_slug in LEGACY_CATEGORY_MAP:
        bind.execute(
            relink_sql,
            {"legacy": legacy, "machine_slug": machine_slug, "new_slug": new_slug},
        )

    # 5. Deactivate superseded machine categories that nothing references any
    #    more (service-only rows; reversible via is_active, never deleted).
    machine_slugs = sorted(
        {m for _l, m, new in LEGACY_CATEGORY_MAP if m != new}
    )
    bind.execute(
        sa.text(
            """
            UPDATE categories c
            SET is_active = FALSE
            WHERE c.slug = ANY(:slugs)
              AND c.applies_to = '["service"]'::jsonb
              AND c.is_deleted = FALSE
              AND NOT EXISTS (
                SELECT 1 FROM services s
                WHERE s.category_id = c.id AND s.is_deleted = FALSE
              )
              AND NOT EXISTS (
                SELECT 1 FROM products p
                WHERE p.category_id = c.id AND p.is_deleted = FALSE
              )
            """
        ),
        {"slugs": machine_slugs},
    )


def downgrade() -> None:
    # Additive-only; leaving columns and seeded taxonomy in place is safe. No-op by design.
    pass
