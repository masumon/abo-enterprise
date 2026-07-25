# Service Module — Enterprise Audit

**Scope:** Service module only (taxonomy, service catalog, service detail, booking intake, dynamic booking forms, service admin panel).
**Out of scope:** Products/orders/cart, blog, career, leads, assistant, invoices except where a service booking touches them.
**Method:** Static read of backend (`backend/app`) and frontend (`frontend/src`) on `claude/service-module-audit-ob5fcv`. Every finding below is traced to a file and line. Nothing is inferred from naming alone.

---

## 0. Module map (what actually exists)

| Layer | Artifact | Location |
|---|---|---|
| Taxonomy | `Category` (self-referencing tree), `Subcategory` (legacy, unified into `categories` by alembic 0008) | `models.py:752`, `models.py:783` |
| Service | `Service` (52 columns) | `models.py:217` |
| Pricing | `ServicePricingTier` | `models.py:285` |
| Dynamic form | `ServiceBookingForm` | `models.py:306` |
| Booking (current) | `BookingV2` → `bookings_v2` | `models.py:330` |
| Booking (legacy) | `Booking` → `bookings` | `models.py:146` |
| Service API | public list/detail/booking-form + admin CRUD | `routes/services.py` |
| Booking API | public create/read + admin list/status/update/delete/stats | `routes/bookings_v2.py` |
| Taxonomy API | public tree + admin CRUD | `routes/categories.py` |
| Form validation | `validate_form_data`, `summarize_form_data` | `core/booking_form.py` |
| CTA/capability resolution | `capabilities_for`, `resolve_service_cta` | `core/capabilities.py` |
| Public UI | `/services`, `/services/[...segments]`, `/book`, `/booking-success` | `app/services`, `app/book`, `app/booking-success` |
| Admin UI | Services editor, Bookings console | `app/admin/services/page.tsx`, `app/admin/bookings/page.tsx` |

---

## 1. Service Structure

### 1.1 Categories

The taxonomy is a **single self-referencing tree** (`categories.parent_id`, `models.py:769`) with unlimited depth. `applies_to` (JSON array) marks a node as `"product"`, `"service"` or both (`models.py:765`). Children inherit `applies_to` from the parent when it is not set explicitly (`categories.py:150-152`).

Node fields: `slug`, `name_en`, `name_bn`, `description_en/bn`, `icon`, `image_url`, `applies_to`, `parent_id`, `sort_order`, `is_active`, `is_deleted`.

Admin CRUD exists and is guarded (`categories.py:140`, `:163`, `:200`). Deletion is soft, cascades over the whole subtree, and is **refused while any product or service still points into that subtree** (`categories.py:200-224`) — a genuinely correct guard.

**Confirmed defects**

1. **Two parallel category systems on one entity.** `Service.category` is a required free string (`models.py:230`, `schemas.py:507`) *and* `Service.category_id` / `Service.subcategory_id` are FKs into the tree (`models.py:232-237`). Both are live: the public list endpoint accepts `category`, `category_id`, `subcategory_id`, `category_slug` and `subcategory_slug` as five separate filters (`services.py:40-68`). Nothing keeps the string and the FK in sync.
2. **The required string category is hardcoded in the frontend.** `CATEGORIES` in `admin/services/page.tsx:23-37` is a 13-entry literal (`digital_services`, `printing`, `legal`, `software`, `general`, …). An admin who creates a new tree category cannot make it selectable as the mandatory `category` string without a code change.
3. **The hardcoded list does not match the seeded tree.** Admin list uses underscores (`digital_services`, `print_documentation`); the seeded taxonomy uses hyphens (`digital-e-services`, `printing-documentation`, `mobile-lab` — `core/demo_catalog.py:240-250`). The two vocabularies never intersect.
4. **Service category taxonomy is gated behind product permissions.** All category admin routes require `require_role("products.read" | "products.write" | "products.delete")` (`categories.py:97`, `:143`, `:167`, `:202`). A role scoped to services cannot manage service categories.

### 1.2 Subcategories

`Subcategory` still exists as a model (`models.py:783`) but alembic 0008 folded it into `categories`; the legacy `/admin/subcategories` endpoints now write `Category` rows with a `parent_id` (`categories.py:236-252`). Serialization keeps the `subcategories` key for backward compatibility (`categories.py:58-61`).

**Confirmed defects**

5. **`Service.subcategory_id` is unreachable from the admin UI.** The tree selector sets `category_id` and *unconditionally nulls* `subcategory_id`: `{ ...prev, category_id: e.target.value || null, subcategory_id: null }` (`admin/services/page.tsx:519`). There is no second selector. The column can only be populated by direct API or SQL, yet it is used in query filters (`services.py:59`, `:67`) and in the category-delete guard (`categories.py:191`).
6. **Depth is unlimited in the data model but flat in navigation.** `/services` renders category cards with one level of child chips only (`ServicesPageClient.tsx:218-224`); deeper levels are reachable only by URL or by clicking through `CategoryBrowseClient`.

### 1.3 Service Details

`Service` carries the following, all persisted and all returned by `ServiceOut`:

- Identity: `slug` (unique, indexed), `name_en`, `name_bn`
- Copy: `description_en/bn`, `short_description_en/bn`, `long_description_en/bn`
- Classification: `category`, `category_id`, `subcategory_id`, `tags`
- Media: `icon_url`, `featured_image_url`, `icon_color`
- Commerce: `pricing_type`, `base_price`, `min_price`, `max_price`, `hourly_rate`, `delivery_charge`, `consultancy_fee`, `requires_advance`
- Capability/CTA: `is_orderable`, `is_bookable`, `cta_type`, `cta_label_en/bn`
- Merchandising: `is_active`, `is_featured`, `sort_order`, `lead_priority`, `lead_qualification_score`
- SEO: `seo_title`, `seo_description`, `seo_keywords`, `canonical_url`, `og_image`
- Structured content: `process_steps`, `benefits`, `requirements`, `required_documents`, `faq`
- Children: `pricing_tiers[]`, `booking_forms[]`

**Confirmed defects**

7. **Five structured content fields are never rendered anywhere on the public site.** `process_steps`, `benefits`, `requirements`, `required_documents` and `faq` are editable in admin (`admin/services/page.tsx:598-670`), seeded with real content by the demo catalog (`core/demo_catalog.py:428-471`), and shipped in the API response (`schemas.py:534-538`) — but `ServiceDetailClient.tsx` renders only hero, image, description, pricing tiers, tags and a bottom CTA. A repo-wide search for these keys outside `admin/` returns no public consumer. Admins are entering content that no customer can ever see.
8. **`slug` cannot be edited after creation.** `ServiceUpdate` omits `slug` (`schemas.py:550-592`) while the admin editor renders an editable slug input (`admin/services/page.tsx:494-496`) and posts the whole object. Pydantic silently drops the unknown field, so the admin sees "Service updated" and the slug is unchanged. Silent data loss.
9. **`lead_qualification_score` is settable at create but not at update** (present in `ServiceBase`, absent from `ServiceUpdate`) and has no admin UI at all.
10. **`icon_color` has no admin control** despite being a column and a schema field.
11. **`pricing_type` has no server-side whitelist.** It is a bare `str` in both `ServiceBase` and `ServiceUpdate`. The admin dropdown offers `fixed | hourly | package | custom | custom_quote` (`admin/services/page.tsx:41`), but `custom` is not handled by `resolve_service_cta`, which only special-cases `custom_quote` (`capabilities.py:123`). A service set to `custom` therefore gets the CTA "Book Now" instead of "Request Quote".
12. **`package` pricing renders no price at all.** `ServiceCard` handles `fixed`, `hourly`, `custom_quote` and `custom` — never `package` (`ServiceCard.tsx:58-72`). `PricingBadge` handles `package` only when *both* `min_price` and `max_price` are set (`ServiceDetailClient.tsx:47`), otherwise it falls through to a "Custom Quote" badge. The demo seeder creates every "Standard" variant with `pricing_type="package"` and only `base_price` set — no min, no max (`core/demo_catalog.py:262`, `:454-456`). Result: roughly a third of the seeded catalog shows a blank price on cards and a misleading "Custom Quote" badge on the detail page while a real `base_price` exists.

---

## 2. User Journey

### 2.1 Discovery

Three entry points, all working:

- `/services` — hero, category cards with child chips, category filter chips, paginated grid (12/page), offline/cached fallback via `loadServices` (`ServicesPageClient.tsx`).
- `/services/{categorySlug}[/{child}/…]` — `CategoryBrowseClient`, breadcrumb trail, "Browse deeper" chips, grid of everything in the subtree (`descendant_ids_for_slug`, `taxonomy.py:52`).
- `/search` — services included alongside products and blog (`app/search/page.tsx:62`).

Resolution order for `/services/{one-segment}` is service-slug first, then category, then the legacy static pages (`app/services/[...segments]/page.tsx:232-267`) — a clean back-compatible design.

**Confirmed defects**

13. **No search box on the services page.** The API supports `search` (`services.py:46, 71-73`) and `featured` (`:45`); the services UI passes neither. Filtering is category chips only.
14. **No sort and no price filter.** The list endpoint hardcodes `order_by(Service.sort_order)` (`services.py:88`) with no client control, and exposes no price range parameter.
15. **Legacy pages create a silent second catalog.** `/services/printing`, `/services/legal` and `/services/software` fall back to hardcoded React pages (`page.tsx:33-49`) whose forms post to the **v1** `bookings` table (`PrintingServicePage.tsx:52`, `LegalServicePage.tsx:75`) — a different table, different admin tab, no `service_id`, no dynamic form, no pricing tier.

### 2.2 Service Details

`/services/{slug}` renders: `PageHero` (image, name, short description, breadcrumb, category chip, pricing badge, WhatsApp button, primary CTA, optional "Order Now"), a 16:9 image, the long/full description, the pricing-tier grid with a per-tier "Book — {tier}" link, tags, and a bottom CTA block. Metadata and `Service` JSON-LD are generated server-side (`page.tsx:111-140`, `:186-226`).

**Confirmed defects**

16. See finding 7 — process, benefits, requirements, required documents and FAQ are absent.
17. **No FAQ structured data.** `faq` exists on the model but `buildJsonLd` emits no `FAQPage` block (`page.tsx:186-226`), forfeiting rich results.
18. **No reviews or ratings for services.** `Review.product_id` is the only linkage (`models.py:79`); the reviews API filters by `product_id` only (`routes/reviews.py:34-43`). No `aggregateRating` in JSON-LD, no social proof on any service surface.
19. **No delivery time, turnaround or SLA on the service itself.** `duration_days` exists only per pricing tier (`models.py:294`); a service without tiers communicates no timeline anywhere.
20. **No related/cross-sell services.** `tags` are rendered as inert `<span>`s (`ServiceDetailClient.tsx:256-267`) — not links, not used to surface related services.

### 2.3 Booking

`/book?service={slug}[&tier=][&mode=order|quote]` loads the service client-side and renders `BookingForm` inside a card (`BookPageClient.tsx`). `mode` only changes headings and a banner; the submitted payload is identical in all three modes.

**Confirmed defects**

21. **A booking can be created against an inactive, soft-deleted or explicitly non-bookable service.** `create_booking` looks the service up by id alone — `select(Service).where(Service.id == payload.service_id)` (`bookings_v2.py:62-64`). There is no `is_active`, no `is_deleted`, and no `is_bookable` check, even though the public read endpoints filter on all of them (`services.py:50-51`, `:115`) and `is_bookable=False` is a first-class capability (`capabilities.py:58`). Anyone replaying a service id books a withdrawn service.
22. **A soft-deleted pricing tier still sets the price.** The tier lookup filters on `service_id` and `tier_name` only — no `is_deleted`, no `is_active` (`bookings_v2.py:93-99`).
23. **Duplicate tier names cause a 500.** Tier names are not unique per service (no constraint in `models.py:285`, no check in `services.py:351`), and the booking path calls `scalar_one_or_none()` (`bookings_v2.py:99`), which raises `MultipleResultsFound` on two matches.
24. **`pricing_type` is stored from client input.** `booking_fields = payload.model_dump()` overrides only `quoted_price` and `form_data` (`bookings_v2.py:108-110`); `pricing_type` is written verbatim from the request and is never reconciled against `service.pricing_type`.
25. **`is_bookable=False` is unenforced end-to-end.** The CTA points at `/contact` (`ServiceDetailClient.tsx:95`), but `/book?service={slug}` still renders the full booking form for such a service.

### 2.4 Form

Covered field by field in Section 3.

### 2.5 Upload

**There is no upload capability in the service module at any layer.**

- `BookingV2.attachments` exists (`models.py:356`) and `BookingV2Create.attachments` accepts a list of strings (`schemas.py:656`).
- `BookingV2Out` **omits** `attachments` (`schemas.py:668-697`) — so even a value written by API could never be read back by admin or customer.
- The booking form has no file input and never sends `attachments` (`BookingForm.tsx:215-227`).
- `field_type` has no `file` variant: the admin dropdown lists 11 types, none of them a file (`admin/services/page.tsx:823`), and `_validate_scalar` has no file branch — a `file` type would be coerced to a plain string (`core/booking_form.py:131-186`).
- The only upload endpoint is `POST /media/upload-with-metadata`, which requires `require_admin` and rejects everything that is not `image/*` or `video/*` (`routes/media.py:23-46`). No customer can reach it, and PDFs — the actual format of an NID, trade licence or passport scan — are rejected outright.

This is the single largest gap in the module. `Service.required_documents` invites the admin to list documents (`admin/services/page.tsx:641-651`) that the customer is never shown and can never submit.

### 2.6 Payment

**There is no payment step for service bookings.**

- `routes/payments.py` contains bKash, Nagad and SSLCommerz initiate/verify/webhook handlers. A search for `booking` in that file returns **zero** matches; every handler mutates `order.payment_status` (`payments.py:119`, `:223`).
- `BookingV2.payment_status` defaults to `"pending"` (`models.py:358`) and **no code path in the repository ever writes it**. A repo-wide grep for `payment_status` assignments finds only `Invoice` and `Order`.
- `BookingV2.final_price` is likewise **never written** by any code path.
- Marking the auto-created invoice paid updates `Invoice.payment_status` only and does not propagate to the booking (`routes/invoices.py:429-470`).

Downstream consequences, both confirmed:

26. **Service booking revenue in analytics is permanently ৳0.** The revenue query is `sum(BookingV2.final_price) where payment_status == "completed"` (`routes/analytics.py:39-43`). Neither column is ever set, so both the revenue figure and the per-service revenue breakdown (`analytics.py:74-83`) always return zero/null.
27. **The advance / consultancy-fee feature is dead code for services.** `Service.consultancy_fee`, `Service.requires_advance`, `BookingV2.advance_amount` and `BookingV2.advance_paid` all exist (migration `0010_delivery_advance.py:28-33`) and `requires_advance` has an admin toggle whose label promises "booking confirmed after payment" (`admin/services/page.tsx:718-721`). `create_booking` never reads either field; `advance_amount` stays 0 and `advance_paid` stays false. The equivalent order-side logic *is* implemented (`routes/orders.py:184-209`, `:435`), so the omission is service-specific.
28. **`Service.delivery_charge` is never used.** It has an admin input (`admin/services/page.tsx:709-712`) and a column, and appears in no backend calculation — the booking invoice totals `final_price or quoted_price` and nothing else (`core/invoice.py:527-534`).
29. **Service bookings cannot use coupons.** `_server_side_discount` is applied in `routes/orders.py:176` only; `BookingV2` has no `coupon_code` column and `BookingV2Create` has no such field.
30. **The booking invoice has no tax line, no discount line and no delivery line** — `subtotal == total`, `tax=0` hardcoded (`core/invoice.py:544-547`).

### 2.7 Confirmation

On success the form persists a local snapshot and redirects to `/booking-success?booking={id}&phone={phone}` (`BookingForm.tsx:243-260`). That page shows a green check, the booking number, an inline invoice card (snapshot first, replaced by the phone-gated API response), a "Download PDF" button, and links to browse more services or go home (`booking-success/page.tsx`).

Emails: an admin notification including a rendered summary of the dynamic form answers (`bookings_v2.py:122-146`) and, when an email was supplied, a customer confirmation (`:148-164`).

**Confirmed defects**

31. **The confirmation email states a falsehood.** `customer_booking_confirmation_html` reads "Your booking has been confirmed! We will contact you shortly" (`core/email.py:388`) while the booking is created with `status="pending"` (`models.py:357`). The on-page copy is correct ("Your booking has been received"), so the two channels contradict each other.
32. **No SMS confirmation.** `core/sms.py` exists but is wired to OTP only; `bookings_v2.py` contains no SMS call. In the Bangladesh market, where `customer_email` is optional and `customer_phone` is mandatory, a customer without an email receives **no confirmation at all** — the booking number exists only on the success screen they are about to navigate away from.
33. **Customer-facing booking emails do not use the admin email-template system.** `EmailTemplate` has full CRUD (`routes/email_templates.py`) and `send_template_email` exists (`core/email.py:133`), but nothing calls it — booking emails are hardcoded Python HTML functions. Admins cannot edit a single word of what customers receive.
34. **No calendar invite, no `.ics`, no reminder** for a booking that carries a `booking_date`.

### 2.8 Tracking

**There is no customer-facing booking tracking of any kind.**

- No route exists under `/orders`, `/profile` or elsewhere that lists or shows a service booking. `/profile` links "bookings" to `/book` — the booking *form* (`app/profile/page.tsx:17`).
- `GET /service-bookings/{booking_id}` exists and is public (`bookings_v2.py:183`), but no page calls it. The only public read a customer can perform is the phone-gated invoice (`routes/invoices.py:148`).
- Status changes fire no notification. The admin status endpoint carries the literal comment `# TODO: Send status update email to customer` (`bookings_v2.py:327`).

35. **The one public booking-read endpoint is unauthenticated and unrate-limited.** `GET /service-bookings/{booking_id}` returns the full `BookingV2Out` — name, phone, email, company, prices, notes and every dynamic form answer — to anyone holding the id, with no phone check and no rate limit (`bookings_v2.py:183-202`). The booking id is handed to the browser and put in the `/booking-success` URL. The parallel invoice endpoint *does* verify the phone (`invoices.py:87`), so the inconsistency is clearly unintentional.

---

## 3. Service Form — field by field

The customer-facing booking form is `frontend/src/components/booking/BookingForm.tsx`. Schema: `bookingSchema` (`:19-34`). Server contract: `BookingV2Create` (`schemas.py:640`).

### 3.1 Static fields (present on every service)

| # | Field | Purpose | Visible | Req. | Input | Validation (client → server) | UX quality |
|---|---|---|---|---|---|---|---|
| 1 | Service banner | Confirms what is being booked; shows `base_price` when `fixed` and no tiers | Yes (read-only) | — | Text block | — | Good. Bilingual. Does not show tier price once a tier is picked. |
| 2 | `customer_name` | Identify customer | Yes | **Required** | `text` | `min(2)` → none server-side beyond `str` | Adequate. No max length, no character class check. |
| 3 | `customer_phone` | Primary contact + the de-facto identity key for invoice retrieval | Yes | **Required** | `tel` | `BD_PHONE_REGEX` → `bd_phone()` normaliser (`schemas.py`, `booking_form.py:145`) | Good — properly normalised both sides. No country-code affordance, BD-only by design. |
| 4 | `customer_email` | Confirmation email; optional by design | Yes | Optional | `email` | `z.string().email().or(literal(""))` → none server-side (plain `str \| None`) | **Weak.** The server accepts any string as an email. Also the *only* channel for a written confirmation (finding 32), yet marked "(Optional)". |
| 5 | `customer_company` | B2B qualification | Yes | Optional | `text` | none → none | Fine. |
| 6 | `booking_date` | Preferred date | Yes | Optional | `date` | **none** → `datetime \| None` | **Poor.** No `min` attribute and no server check: a past date is accepted and stored. No time. No availability check (Section 4.5). |
| 7 | `district` | Service location | Yes | Optional | `select` (`BD_DISTRICTS`) | none | Good pattern (cascades into upazila). **But the value is concatenated into the free-text `details` string** — `Location: ${upazila}, ${district}\n\n${details}` (`BookingForm.tsx:212-213`) — not stored in any column. Unqueryable, unreportable, unfilterable. |
| 8 | `upazila` | Narrower location | Yes | Optional | `select`, disabled until district chosen | none | Same structural problem as 7. |
| 9 | `service_tier` | Package selection; drives price | Only when the service has tiers | Effectively required (first tier pre-selected) | `radio` | none client → server re-resolves price from DB by `tier_name` | Mixed. Server-authoritative pricing is correct. But pre-selecting the first tier means a customer who never reads the section is silently billed for tier 1, and there is no "not sure / advise me" option. |
| 10 | `quoted_price` | Price carried to the API | **No — hidden** | — | none | `z.number().optional()` → **overwritten server-side** (`bookings_v2.py:102-109`) | Correct security posture. |
| 11 | `details` | Free-text requirement | Yes | **Required** | `textarea` (4 rows) | `min(10)` → `str \| None` | Adequate, but it is the dumping ground for location data (7/8) and the only place a service-specific requirement lands when no dynamic fields are configured. |
| 12 | Submit | Commit | Yes | — | button | — | Label comes from the API-computed CTA (`service.cta`) — good consistency. |

### 3.2 Dynamic fields (per-service, admin-defined)

Rendered from `service.booking_forms`, filtered to `is_active !== false` and sorted by `sort_order` (`BookingForm.tsx:58-62`), then filtered again by `show_if` visibility (`:427`).

Supported types, end to end (renderer at `BookingForm.tsx:487-557`, validator at `core/booking_form.py:99-186`):

| Type | Rendered as | Server validation |
|---|---|---|
| `text` | `input[type=text]` | length, `min_length`, `max_length` (default cap 2000), `pattern` |
| `textarea` | `textarea` rows=3 | same as text |
| `number` / `integer` | `input[type=number]` | float parse, finite check (NaN/inf rejected), whole-number check for `integer`, `min`/`max` |
| `email` | `input[type=email]` | Pydantic `EmailStr` |
| `phone` / `tel` | `input[type=tel]` | `bd_phone()` normaliser |
| `url` | `input[type=url]` | `^https?://\S+$` |
| `date` | `input[type=date]` | `date.fromisoformat` |
| `datetime` | *falls through to `input[type=text]`* | `datetime.fromisoformat` |
| `select` | `select` + blank option | value must be in `options` |
| `radio` | fieldset of radios | value must be in `options` |
| `multiselect` / `checkbox_group` | fieldset of checkboxes | every value must be in `options` |
| `checkbox` / `boolean` | single checkbox with inline label | required ⇒ must be `true` (consent semantics) |

Per-field definition schema (`ServiceBookingFormBase`, `schemas.py:469-481`): `field_name`, `field_type`, `field_label_en`, `field_label_bn`, `is_required` (default **true**), `placeholder`, `options`, `default_value`, `validation_rules`, `conditional_logic`, `sort_order`, `is_active`.

**What is done well.** The server never trusts the client: unknown keys are dropped rather than persisted, hidden fields are ignored, select values are whitelisted, and a malformed admin regex is caught and skipped rather than blocking the booking (`core/booking_form.py:177-184`). Soft-deleted field definitions are stripped from `ServiceOut` so a stale render cannot produce an unrejectable submission (`schemas.py:600-609`). Client and server validators are deliberate mirrors. This layer is the strongest part of the module.

**Confirmed defects**

36. **`datetime` has no matching input type.** The renderer's type ladder ends at `date` and falls back to `text` (`BookingForm.tsx:537-548`), so a `datetime` field is a free-text box the server then parses with `fromisoformat` — near-guaranteed customer error.
37. **`field_type` is not whitelisted server-side.** It is a bare `str` (`schemas.py:471`); anything unrecognised is silently treated as text by both renderer and validator.
38. **`field_name` is not validated or deduplicated.** No uniqueness constraint per service, no format check. Two fields with the same `field_name` collapse in `field_map` (`core/booking_form.py:200`) — the last one silently wins and the other is never validated.
39. **Client and server disagree on `max_length`.** The server enforces an implicit 2000-character cap on every text-like field (`core/booking_form.py:170`); the client checks `min_length` and `pattern` but never `max_length` (`BookingForm.tsx:146-163`). A long answer passes client validation and is rejected by the server.
40. **`min`/`max` numeric rules have no admin UI.** The server enforces them (`core/booking_form.py:115-120`) but the admin panel only exposes `min_length`, `max_length`, `pattern` and `pattern_message` (`admin/services/page.tsx:879-920`).
41. **A `default_value` outside `options` produces a phantom selection.** Defaults are seeded for any non-boolean/non-multi type including `select` (`BookingForm.tsx:102`). A controlled `<select>` whose value matches no `<option>` displays blank while the value stays in state and is submitted — then rejected as "Invalid option".
42. **`is_required` defaults to `true` in the API but `false` in the admin form** (`schemas.py:474` vs `admin/services/page.tsx:69`). A field created through the API without an explicit flag is mandatory; the same field created in the UI is not.
43. **No focus management on failure.** `onInvalidSubmit` sets a banner (`BookingForm.tsx:286-300`) but never scrolls to or focuses the first invalid control — on a long form with dynamic fields the customer sees an error with no visible cause.
44. **Only four static fields have friendly names in the error banner.** `labels` covers name, phone, email and details (`BookingForm.tsx:288-293`); any other failure degrades to "Please fill in all required fields".

### 3.3 Missing fields (customer form)

Confirmed absent from the form, from `BookingV2Create`, or from both:

- **File / document upload** — no field type, no input, no endpoint (Section 2.5).
- **Terms & conditions / privacy consent checkbox** — no static consent gate; legal pages exist at `/legal/*` but are never referenced from the form.
- **Marketing-consent opt-in** — required for lawful follow-up messaging.
- **Coupon / promo code** — accepted for orders, not for bookings (finding 29).
- **Preferred contact method / preferred contact time** — phone is mandatory but there is no way to say "WhatsApp only" or "call after 6pm".
- **Alternate phone number.**
- **Structured address** — street/area/postcode; only district+upazila exist and they are stringified into `details` (finding 7/8).
- **Preferred time slot** — `booking_date` is date-only (Section 4.5).
- **Quantity / units** — nothing multiplies price; a 500-copy print job and a 5-copy job submit identically.
- **Urgency / rush-service flag.**
- **Budget range** — exists on `LeadV2` (`schemas.py:713-715`), absent from bookings, so the `quote` mode collects no budget signal.
- **`requirements`** — accepted by `BookingV2Create` (`schemas.py:652`), rendered in the admin detail modal (`admin/bookings/page.tsx:601`), **never sent by the form**.
- **`estimated_completion_date`** — accepted by the create schema (`schemas.py:648`), never sent, never set by admin.
- **Referral source ("how did you hear about us")** — no acquisition attribution on bookings.
- **CAPTCHA / bot challenge** — the only protection is a 10-per-10-minutes IP rate limit (`bookings_v2.py:54`).

---

## 4. Dynamic Form Logic

### 4.1 What changes per service

Exactly three things vary between services:

1. The `service_booking_forms` rows for that service (`services.py:129-151`; also inlined into `ServiceOut.booking_forms`).
2. The tier radio group — rendered only when `pricing_tiers` is non-empty (`BookingForm.tsx:407`).
3. The banner price line — only when `pricing_type == "fixed"`, `base_price` set and no tiers (`:313`).

Everything else — name, phone, email, company, date, district, upazila, details — is identical on every service and is not configurable.

45. **The static block cannot be configured.** An admin cannot mark "Company" required for a B2B service, hide "District" for a remote software service, or make email mandatory. There is no per-service override for any of the 8 static fields.
46. **No form-field library or templates.** Each service's fields must be typed in one at a time; there is no clone-from-service, no reusable field set, no import.

### 4.2 Conditional fields

The engine supports a single `show_if` rule per field, with three operators (`core/booking_form.py:65-84`), mirrored exactly on the client (`BookingForm.tsx:64-77`):

```json
{"show_if": {"field": "delivery_type", "equals": "home"}}
{"show_if": {"field": "delivery_type", "not_equals": "pickup"}}
{"show_if": {"field": "doc_type", "in": ["nid", "passport"]}}
```

Hidden ⇒ not required, and any submitted value is dropped. Unknown operators fail open so a config typo never blocks a booking — a good defensive choice.

**Confirmed defects**

47. **There is no admin UI for `conditional_logic` at all.** The new-field form in `admin/services/page.tsx:803-951` has no conditional section, and `EMPTY_FIELD` (`:67-71`) does not include the key. The entire conditional-logic feature is reachable only by hand-crafting JSON against the API. This is the highest-value capability in the module and it is invisible to its intended user.
48. **Single condition only.** No AND/OR, no multiple rules, no nesting, no comparison operators (`greater_than`, `contains`, `is_empty`).
49. **Conditions can only reference other dynamic fields.** `_condition_met` reads `form_data` (`core/booking_form.py:75`), which never contains `service_tier`, `district`, `customer_company` or any static field. "Show this field only for the Premium tier" is not expressible.
50. **No conditional *requiredness*, no conditional options, no calculated fields.** Visibility is the only effect available.

### 4.3 Upload fields

None exist. See Section 2.5 for the full trace.

### 4.4 Pricing logic

The complete server-side rule (`bookings_v2.py:87-110`):

```
if service_tier given and a tier row with that tier_name exists → trusted_price = tier.price
else                                                            → trusted_price = service.base_price   (may be None)
quoted_price = trusted_price          # client value discarded
```

The invoice is then `subtotal = total = final_price or quoted_price or 0`, `tax = 0` (`core/invoice.py:527-547`).

**Confirmed defects**

51. **`hourly_rate` never produces a price.** An `hourly` service with no tiers falls back to `base_price` — typically null — so the booking is created with `quoted_price = None` and an invoice for ৳0. `hours_worked` exists on the model but is never written.
52. **`min_price` / `max_price` never produce a price.** `package` services with a range but no tiers behave the same way: ৳0 invoice.
53. **No line items, no quantity, no add-ons, no per-field price modifiers.** A dynamic field cannot influence price at all.
54. **No delivery charge, no consultancy fee, no coupon, no tax, no rounding rules** in the booking total (findings 27-30).
55. **No price history.** Changing `base_price` or a tier price does not affect existing bookings (correct — `quoted_price` is snapshotted), but the *invoice* recomputes from the live booking on first generation and there is no record of which price version was quoted.

### 4.5 Schedule logic

The complete implementation is: one optional `<input type="date">` whose value is converted to an ISO string and stored on `booking_date` (`BookingForm.tsx:222`).

There is **no scheduling system**. Confirmed absent from the entire codebase:

- No working-hours model, table or setting used by booking. (`business_hours_en/bn` exists but is consumed only by the AI assistant knowledge base — `assistant/knowledge_base.py:98-116`.)
- No time slots, no slot duration, no per-slot capacity, no double-booking prevention.
- No blackout dates, no holiday calendar, no per-service lead time or minimum notice.
- No staff/resource assignment and therefore no per-resource availability.
- No past-date rejection (finding 6).
- No timezone handling or display.
- No reschedule or cancel flow for the customer.
- `estimated_completion_date` and `completed_at` exist on the model; only `completed_at` is ever written, and only when an admin sets status to `completed` (`bookings_v2.py:309-310`).

---

## 5. Admin Panel

Two screens touch this module: **Admin → Services** (`app/admin/services/page.tsx`, 1130 lines) and **Admin → Bookings**, V2 tab (`app/admin/bookings/page.tsx`).

### 5.1 Create

| Object | Can create | Where |
|---|---|---|
| Service | Yes | `POST /services/admin/services` → `services.py:156` |
| Pricing tier | Yes, **edit mode only** | `services.py:351`; UI gated behind `!isNew` (`admin/services/page.tsx:994`) |
| Booking-form field | Yes, **edit mode only** | `services.py:442`; UI gated behind `!isNew` (`:765`) |
| Category / subcategory | Yes | `categories.py:140`, `:236` (products RBAC) |
| Booking | **No** — admins cannot create a booking on a customer's behalf | no endpoint |

56. **Tiers and form fields cannot be added during creation.** The admin must save the service, reopen it, then add tiers and fields — a two-pass flow with no indication on the create screen that these sections exist.

### 5.2 Edit

| Object | Can edit | Notes |
|---|---|---|
| Service | Yes, `PUT /services/admin/services/{id}` | **except `slug`** (finding 8) and except `lead_qualification_score` (finding 9) |
| Pricing tier | **No** | `PUT .../tiers/{tier_id}` exists (`services.py:377`) and `servicesAdminApi.updateTier` exists (`lib/api.ts:466`) — **neither is called anywhere in the UI** |
| Booking-form field | **No** | `PUT .../form-fields/{field_id}` exists (`services.py:470`), `updateFormField` exists (`lib/api.ts:475`) — **never called** |
| Category | Yes | `categories.py:163` |
| Booking | **No** | `PUT /service-bookings/admin/bookings/{id}` exists (`bookings_v2.py:335`) but `serviceBookingsAdminApi` has only `list`, `updateStatus` and `delete` (`lib/api.ts:226-235`) |

57. **A typo in a pricing tier or a form field can only be fixed by deleting and recreating it.** Deleting a tier orphans nothing but loses `sort_order` position; deleting a form field breaks the mapping for all historical bookings that stored answers under that `field_name` (the admin dialog acknowledges this — `admin/services/page.tsx:295`).
58. **Admins can never set `final_price`, `payment_status`, `payment_method`, `notes`, `hours_worked`, `estimated_completion_date`, `advance_paid` or `service_tier` on a booking.** The columns exist, the endpoint exists, the UI does not. This is the direct cause of finding 26 (revenue always zero) and finding 27 (advance feature dead).

### 5.3 Delete

- Service: soft delete, cascades conceptually to tiers and forms via `cascade="all, delete-orphan"` on the relationships (`models.py:280-281`) — but the endpoint only flips `Service.is_deleted` (`services.py:331`), so child rows keep `is_deleted = False`. They are unreachable because the parent is filtered out, but they are not marked deleted. Cosmetic inconsistency, not a leak.
- Tier / form field: soft delete (`services.py:434`, `:531`).
- Booking: soft delete (`bookings_v2.py:399`).
- Category: soft delete of the whole subtree, blocked while items remain (`categories.py:200-224`) — correct.

59. **No restore, no trash view, no undo.** `is_deleted` is set everywhere and surfaced nowhere. Soft-deleted services are invisible and unrecoverable through the panel.
60. **All delete confirmations say "cannot be undone"** while the operation is reversible in the database — the copy trains admins to fear a safe action and gives them no path to the actual recovery.

### 5.4 Enable / Disable

- Service `is_active`: inline toggle in the table (`admin/services/page.tsx:375-386`) and in the editor (`:456-464`). Works; disabling removes the service from all public endpoints (`services.py:51`, `:115`).
- Service `is_featured`: toggle (`:465-473`). **The public site never filters on it** — the API supports `?featured=` (`services.py:45`) but no UI passes it; the flag only renders a star on the card (`ServiceCard.tsx:81`).
- Service `is_orderable`: toggle (`:474-482`). `is_bookable` has **no toggle** despite being a column, a schema field and a capability input (`capabilities.py:58`).
- Pricing tier `is_active`: column and schema field exist; **no UI control**, and the public detail page renders every tier regardless (`ServiceDetailClient.tsx:187`).
- Form field `is_active`: column and schema field exist; **no UI control**.

61. Four of the six enable/disable switches in the data model are unreachable from the panel.

### 5.5 Categories

Covered in 1.1/1.2. Summary of admin capability: full tree CRUD via `/admin/categories`; on the *service* editor, only `category_id` can be assigned (never `subcategory_id`), and the mandatory `category` string is picked from a hardcoded 13-item list that does not match the seeded tree.

### 5.6 Form Fields

Creatable and deletable, not editable (5.2). The create form exposes: `field_name`, `field_type` (11 options), `field_label_en`, `field_label_bn`, `placeholder`, `default_value`, `options` (for select/multiselect/radio), `min_length`, `max_length`, `pattern`, `pattern_message`, `sort_order`, `is_required`.

Not exposed, though supported by the model/validator: **`conditional_logic`** (finding 47), **`min`/`max`** numeric rules (finding 40), **`is_active`** (finding 61).

62. **`sort_order` is a raw number input with no drag-to-reorder and no preview**, and the field list in the editor is rendered in API order, not sorted — so the admin cannot see the order the customer will get.
63. **No form preview.** The service editor has a `LivePreview` of the *card* (`:445-449`) but nothing that renders the booking form the customer will actually see.

### 5.7 Custom Fields

"Custom fields" in this system means exactly the `service_booking_forms` rows described above. There is no separate custom-field/attribute system for the Service entity itself — no arbitrary key/value metadata, no per-category attribute schema.

64. Consequence: service-specific *display* attributes (warranty, turnaround, coverage area, prerequisites beyond the unrendered `requirements` list) have nowhere to live. Products have `specifications` (`models.py`, used by the demo seeder); services have no equivalent.

### 5.8 Upload Rules

**No upload rule system exists**, because no upload exists (Section 2.5). There is no per-service or per-field configuration for allowed MIME types, maximum file size, file count, or required-vs-optional documents. `Service.required_documents` is a plain list of strings with no enforcement path and no public rendering.

The only limits in the codebase are global and admin-only: 5 MB for images, 50 MB for video, images and video only (`routes/media.py:44-51`).

### 5.9 Pricing

Admin can set, per service: `pricing_type`, `base_price`, `hourly_rate`, `min_price`, `max_price`, `delivery_charge`, `consultancy_fee`, `requires_advance`, `lead_priority`. Per tier: `tier_name`, `price`, `duration_days`, `sort_order`, `description_en`, `features[]`.

**Confirmed defects**

65. **Client-side validation only, and partial.** `handleSave` checks `min_price <= max_price` and `base_price >= 0` (`admin/services/page.tsx:177-180`). The server validates neither — `ServiceCreate`/`ServiceUpdate` accept any float, including negative prices, via direct API call.
66. **Nothing validates price coherence against `pricing_type`.** A `fixed` service can be saved with no `base_price`; an `hourly` service with no `hourly_rate`; a `package` service with no range and no tiers. Each produces the ৳0-invoice paths in findings 51-52 with no warning.
67. **Tier fields exposed by the API but not the UI:** `description_bn`, `includes`, `is_active`. Bengali tier descriptions cannot be entered, so the tier grid is English-only for Bengali visitors (`ServiceDetailClient.tsx:188-191` falls back to `description_en`).
68. **No cost/margin, no currency field, no VAT/tax configuration** anywhere in the service module.

### 5.10 Coupons

Coupons exist as a JSON blob in `Setting["coupons_json"]` with `discount_percent`, `min_subtotal` and `active` per code (`routes/coupons.py:19-46`), validated at `POST /public/coupons/validate` and re-derived server-side at order creation (`orders.py:74-90`).

69. **No part of this reaches services.** `BookingV2` has no coupon column, `BookingV2Create` has no coupon field, the booking form has no coupon input, and `create_booking` never calls `_server_side_discount`. Service bookings cannot be discounted through the platform.
70. **Coupons are global-only** — no per-service, per-category or per-tier scoping, no usage limits, no expiry dates, no per-customer limits, and no redemption log.

### 5.11 Availability

**Nothing exists.** No availability model, no admin screen, no API. See Section 4.5.

### 5.12 Working Hours

**Nothing exists that affects services.** `business_hours_en` / `business_hours_bn` are site settings read only by the AI assistant (`assistant/knowledge_base.py:98-116`). The booking date picker is unconstrained by them.

### 5.13 Required Documents

`Service.required_documents` is a `list[str]` with a plain textarea editor (one per line, `admin/services/page.tsx:641-651`).

71. It is **never displayed to the customer**, **never enforced**, and **has no upload counterpart**. It is write-only data.

### 5.14 SEO

Per service: `seo_title`, `seo_description` (160-char capped in the UI), `seo_keywords`, `canonical_url`, `og_image` — all wired into `generateMetadata` with sensible fallbacks (`app/services/[...segments]/page.tsx:111-140`). `Service` JSON-LD with provider, `areaServed` and a price specification is emitted (`:186-226`). Services and every taxonomy node are included in the sitemap (`app/sitemap.ts:50-60`).

**Confirmed defects**

72. **Category and subcategory pages have no SEO fields.** `Category` has no `seo_title`, `seo_description`, `seo_keywords`, `canonical_url` or `og_image` columns (`models.py:752-776`); their metadata is derived from `name_en` and `description_en` only (`page.tsx:152-161`). Category pages are frequently the highest-intent landing pages.
73. **No FAQ structured data** despite `faq` being populated (finding 17).
74. **No breadcrumb JSON-LD** on any service or category page — only visual breadcrumbs.
75. **No `aggregateRating`** (no service reviews — finding 18).
76. **Only 50 services enter the sitemap** — `?per_page=50` hardcoded (`app/sitemap.ts:51`), and the demo seeder alone generates three variants per leaf node. Silent truncation as the catalog grows.
77. **`canonical_url` is a free-text field with no validation** — a typo silently de-indexes the page.

### 5.15 Notifications

Two emails fire on booking creation and nothing else:

- Admin notification to `resolve_notify_email(db)` — admin-editable recipient (`core/email_config.py:46-52`), includes the rendered dynamic-form summary, HTML-escaped correctly (`bookings_v2.py:128-146`).
- Customer confirmation, only when an email was supplied (`:148-164`).

**Confirmed defects**

78. **No notification on any status change** — `# TODO` at `bookings_v2.py:327`.
79. **No SMS on any event** (finding 32) — critical when email is optional and phone is mandatory.
80. **Booking email bodies are hardcoded and not editable by admin** (finding 33).
81. **The confirmation email misstates the booking state** (finding 31).
82. **A single global notification recipient.** No per-service or per-category routing, no team/department assignment, no escalation, no digest.
83. **Emails are fire-and-forget `BackgroundTasks`** with no delivery log, no retry and no failure surface (`bookings_v2.py:141`, `:159`). An SMTP outage silently loses every booking notification.
84. **No in-app admin notification.** The ops feed counts pending bookings (`routes/ops.py:431-436`) but there is no alert, badge or push.

### 5.16 Access control (cross-cutting)

85. **Every service and service-booking admin endpoint uses `require_admin`, which checks only that the account exists and `is_active` — it never checks `role`** (`core/security.py:84-109`). `ROLE_PERMISSIONS` defines `viewer` as read-only (`core/rbac.py:22-24`), but a `viewer` can create, edit and delete services, tiers, form fields and bookings. Only the category routes use `require_role` (`categories.py:97` etc.).
86. **`ROLE_PERMISSIONS` has no `services.*` permission at all**, and its `bookings.read` / `bookings.write` entries are never enforced by any route.
87. **`require_permission` is a stub** that calls through without checking anything (`core/rbac.py:32-40`).

### 5.17 What else the admin cannot do

- Duplicate / clone a service.
- Bulk-edit, bulk-activate or bulk-reprice services (bulk export exists for bookings — `routes/bulk.py:138`; there is no service import).
- Reorder services by drag — `sort_order` is a number box only.
- See which bookings reference a service before deleting it.
- View or download a booking's attachments (they cannot exist, and `BookingV2Out` omits the field anyway).
- Create a booking manually (phone/walk-in intake).
- Assign a booking to a staff member — no owner column exists.
- See booking form answers with their admin-defined labels — the modal prints raw `field_name` keys, `key.replace(/_/g, " ")` (`admin/bookings/page.tsx:611`), because `BookingV2Out` ships no labels.

### 5.18 Status-vocabulary drift (confirmed)

| Source | Values |
|---|---|
| Model default | `status = "pending"`, `payment_status = "pending"` (`models.py:357-358`) |
| Admin status dropdown | `pending, in_progress, completed, cancelled, on_hold` (`admin/bookings/page.tsx:18`) |
| Backend stats endpoint | counts `pending, confirmed, in_progress, completed` (`bookings_v2.py:417-467`) |
| Admin payment filter | `unpaid, partial, paid, refunded` (`admin/bookings/page.tsx:19`) |
| Analytics revenue filter | `payment_status == "completed"` (`analytics.py:41`) |

88. `confirmed` is counted by the stats endpoint but cannot be selected by any admin. `on_hold` can be selected but is counted nowhere.
89. **The payment-status filter can never match anything.** Every booking is created with `payment_status = "pending"`, which is not one of the four filter options — so filtering by payment status always returns an empty list, and there is no filter that returns the actual population.
90. `BookingV2StatusUpdate.status` is an unvalidated `str` (`schemas.py:664-665`) — any string can be written as a status.

---

## 6. Customer Experience — screen by screen

### Before booking

**`/services`** — Page hero (title, subtitle, breadcrumb). "What We Offer": 3-column grid of category cards, each with a coloured icon tile, a linked title and child-category chips (live taxonomy, or an 8-group hardcoded fallback when the API returns nothing — `ServicesPageClient.tsx:206-232`). "All Services": category filter chips, a result count, a 3-column card grid (image, category tag, name, 2-line description, price, "Learn More", featured star), Previous/Next pagination, an offline-cache banner when serving from cache, and a closing "Powered by Modern Technology" band. Skeletons while loading; a retry card on error.

**`/services/{category}[/{child}…]`** — Hero with the node's image, name, description and a full breadcrumb trail. "Browse deeper" chips linking one level down. Result count, card grid, pagination. When the node is empty: "No services have been added to this category yet" plus a Contact Us button (`CategoryBrowseClient.tsx:114-124`) — a good empty state.

**`/services/{slug}`** — Hero over the featured image: name, short description, breadcrumb, category chip, pricing badge, "Chat on WhatsApp", the primary CTA, and a second "Order Now" button when the service is also orderable. Below: a 16:9 image, "About This Service" (long or full description, `whitespace-pre-line`), "Pricing Plans" as selectable tier cards (name, price, delivery days, description, feature checklist) with "Book — {tier}" and "Ask on WhatsApp" for the selected tier, inert tag pills, and a "Ready to get started?" closing block.

**Not on this screen, though the data exists:** how the service works (`process_steps`), why to choose it (`benefits`), what the customer must supply (`requirements`), which documents to bring (`required_documents`), the FAQ, any review or rating, any turnaround promise, any related service.

**`/book?service={slug}`** — Hero ("Book Service" / "Confirm Order" / "Request a Quote"), breadcrumb, a "Back" link, a mode banner for order/quote, and the form card: service name (+ price when fixed), Full Name*, Phone*, Email (Optional), Company (Optional), Preferred Booking Date (Optional), District/Upazila (Optional, cascading), the package radio group when tiers exist, the service's dynamic fields, Details/Requirements*, and a submit button labelled from the service's CTA. Errors appear inline under each control plus a summary banner. If the device is offline the submission queues and shows "Booking queued offline… will sync automatically".

**`/services/printing`, `/legal`, `/software`** — only when no service or category owns that slug: hardcoded legacy pages whose forms write to the v1 `bookings` table (finding 15).

### After booking

**`/booking-success?booking={id}&phone={phone}`** — Hero "Booking Confirmed!", a green check, the message "Your booking has been received… We'll contact you shortly", the booking number in a highlighted panel, a dismissible inline invoice card (local snapshot first, replaced by the phone-gated API response), "Download PDF", "Skip", "Browse More Services" and "Back to Home".

**Email (only if an email address was given)** — "Booking Confirmation #BK-YYYY-XXXXXX", stating "Your booking has been confirmed!", with the booking number, the estimated price (or "Quote upon confirmation") and a WhatsApp deep link.

**Everything after that point.** Nothing. Confirmed absent:

- No booking list in `/profile` (the "bookings" entry links to `/book` — `app/profile/page.tsx:17`).
- No status page, no tracking page, no lookup-by-number-and-phone form.
- No notification when status changes to in-progress, completed or cancelled.
- No SMS at any point.
- No way to cancel, reschedule, amend, or add information to a submitted booking.
- No way to pay.
- No way to upload the documents the service may require.
- No receipt after payment (there is no payment).
- No review request after completion.

The customer's only durable artifact is a booking number on a page they are one click away from leaving, and — if they happened to enter an email — one message. Everything after intake happens on WhatsApp or by phone, outside the system.

---

## 7. Missing Features (confirmed absent)

**Blocking — the module cannot complete its own advertised workflow**

1. Customer document/file upload — no field type, no input, no endpoint, no storage path (Section 2.5).
2. Payment for service bookings — no gateway integration, `payment_status` never written (Section 2.6).
3. Advance / consultancy-fee collection — columns, migration and admin toggle exist; logic absent (finding 27).
4. Customer booking tracking — no page, no lookup, no status notifications (Section 2.8).
5. Admin booking editing — endpoint exists, client method does not; `final_price`, `notes`, `payment_status` unreachable (finding 58).
6. Scheduling — no working hours, slots, capacity, blackout dates or conflict detection (Section 4.5).

**Major — present in the data model, unreachable in practice**

7. Conditional-logic editor (finding 47).
8. Pricing-tier and form-field editing (finding 57).
9. `subcategory_id` assignment (finding 5).
10. `is_bookable`, tier `is_active`, field `is_active` toggles (finding 61).
11. Public rendering of `process_steps`, `benefits`, `requirements`, `required_documents`, `faq` (finding 7).
12. `delivery_charge` in booking totals (finding 28).
13. Booking `attachments` in `BookingV2Out` (Section 2.5).

**Major — genuinely not built**

14. Service reviews and ratings.
15. Coupons/discounts on bookings.
16. Tax/VAT on bookings.
17. SMS notifications.
18. Admin-editable booking email templates.
19. Status-change notifications.
20. Search, sort and price filtering on the services listing.
21. Service cloning, bulk operations, and service import.
22. Staff assignment and per-owner workload.
23. Cancel / reschedule flows.
24. Multi-currency.
25. Recurring or subscription services.
26. Service add-ons and quantity-based pricing.
27. Waitlists and capacity limits.
28. Category-level SEO fields (finding 72).
29. Service-level analytics visible to admin (booking→completion funnel, conversion by service, drop-off in the form).
30. A/B or draft/publish workflow for services (only a binary `is_active`).
31. Versioning or audit history visible in the UI (`ActivityLog` rows are written for services and bookings but there is no service-history view).
32. Restore from soft delete (finding 59).

---

## 8. Improvement Recommendations

Ordered by ratio of business impact to implementation cost. Every item maps to a confirmed finding above.

### P0 — Correctness and trust (do first; all are small)

1. **Gate booking creation on service state.** Add `is_deleted == False`, `is_active == True` and a `is_bookable` capability check to the lookup in `bookings_v2.py:62-64`; return 404/409 otherwise. *(Findings 21, 25.)*
2. **Filter the tier lookup** on `is_deleted == False` and `is_active == True`, and switch to a deterministic pick (or add a unique constraint on `(service_id, tier_name)`) to remove the 500. *(Findings 22, 23.)*
3. **Phone-gate `GET /service-bookings/{booking_id}`** exactly as `routes/invoices.py:87` does, and add a rate limit. *(Finding 35.)*
4. **Fix the confirmation email copy** to say "received" and to state the actual status. *(Finding 31.)*
5. **Add `slug` to `ServiceUpdate`** with a uniqueness check, or make the admin slug input read-only after creation. Silent discard is the worst of the three options. *(Finding 8.)*
6. **Make `require_admin` role-aware** for service and booking mutations, and add `services.*` permissions to `ROLE_PERMISSIONS`. Today a `viewer` can delete the catalog. *(Findings 85-87.)*
7. **Whitelist `pricing_type`, `field_type` and booking `status`** as literals in the Pydantic schemas; drop `custom` in favour of `custom_quote` or teach `resolve_service_cta` about it. *(Findings 11, 37, 90.)*
8. **Reject past `booking_date`** client-side (`min` attribute) and server-side.

### P1 — Close the loops that are already 80% built

9. **Ship the admin booking edit form.** Add `update` to `serviceBookingsAdminApi` and a modal for `final_price`, `payment_status`, `payment_method`, `notes`, `hours_worked`, `estimated_completion_date`, `service_tier`. This single screen fixes zero-revenue analytics, makes the payment-status filter meaningful, and gives the module a fulfilment record. *(Findings 26, 58, 89.)*
10. **Render the five structured content blocks** on the service detail page — process steps as a numbered timeline, benefits as a checklist, requirements and required documents as pre-booking prep, FAQ as an accordion — and emit `FAQPage` JSON-LD from the same data. Zero new data entry; the content is already seeded. *(Findings 7, 17.)*
11. **Add edit affordances for pricing tiers and form fields.** The endpoints and the API client methods already exist and are simply never called. *(Finding 57.)*
12. **Add the conditional-logic editor** to the form-field panel: a field picker, an operator select (`equals` / `not_equals` / `in`), a value input, and a live preview. This exposes the module's best capability to the people who need it. *(Finding 47.)*
13. **Add a booking-form preview** in the service editor that renders `BookingForm` with the current field set. *(Finding 63.)*
14. **Fix `package` pricing display** — render `base_price` when the range is absent, and show a range when both bounds exist, in both `ServiceCard` and `PricingBadge`. *(Finding 12.)*
15. **Surface form answers with their labels** by adding a label map (or the field definitions) to `BookingV2Out`, so the admin modal stops printing machine keys. *(Section 5.17.)*
16. **Add the missing toggles**: `is_bookable`, tier `is_active`, field `is_active`, and a `subcategory_id` selector that does not null itself. *(Findings 5, 61.)*

### P2 — Build the missing halves of the journey

17. **Customer document upload.** Add a `file` field type; a customer-scoped, booking-scoped upload endpoint accepting PDF and images with a size cap; store URLs on `BookingV2.attachments`; add `attachments` to `BookingV2Out`; render them in the admin modal; and drive the required list from `Service.required_documents` so the field stops being write-only. This unblocks the entire "Digital Services / Legal" category, which is document-centric by nature. *(Findings 71, Section 2.5.)*
18. **Customer booking tracking.** A `/bookings/track` lookup by booking number + phone, and a bookings list in `/profile` reusing the phone-gated pattern that already exists for invoices. Replace the `/profile` → `/book` mislink. *(Section 2.8.)*
19. **SMS on booking creation and on every status change**, using the existing `core/sms.py`. Email is optional; phone is mandatory. This is the highest-impact notification change available. *(Findings 32, 78.)*
20. **Wire booking emails to `EmailTemplate`** via the existing `send_template_email`, seed the two current bodies as editable templates, and add a delivery log so a failed send is visible. *(Findings 33, 83.)*
21. **Implement the advance/consultancy flow for bookings**, mirroring `routes/orders.py:184-209`: read `requires_advance` and `consultancy_fee`, set `advance_amount`, keep the booking pending until `advance_paid`, and expose a "mark advance received" action. The order-side reference implementation already exists. *(Finding 27.)*
22. **Extend the payment gateways to bookings** — reuse the bKash/Nagad/SSLCommerz initiate/verify handlers with a booking reference, and propagate the result to `BookingV2.payment_status` *and* the linked invoice. *(Finding 26, Section 2.6.)*

### P3 — Structural debt worth paying down

23. **Retire the dual category system.** Backfill `category_id` from the `category` string, make the tree the single source, and reduce `category` to a derived cache (or drop it). Until then the hardcoded `CATEGORIES` list should be generated from the taxonomy API, not a literal. *(Findings 1-3.)*
24. **Retire or migrate the v1 booking system.** Either move the printing/legal legacy pages onto `bookings_v2` or seed real services for those slugs so the fallback never fires. Two intake tables with two admin tabs is a permanent reporting hazard. *(Finding 15.)*
25. **Promote district/upazila to real columns** on `BookingV2` instead of prefixing them into `details`. Location is a primary operational dimension for a Sylhet-based business and is currently unqueryable. *(Findings 7, 8 in §3.1.)*
26. **Add scheduling as a discrete feature**: per-service working hours, slot length, capacity, blackout dates, minimum lead time, and conflict detection at booking time. Until this exists, `booking_date` should be labelled "preferred date (we will confirm)" so the UI stops implying a commitment the system cannot keep. *(Section 4.5.)*
27. **Extend coupons to bookings** and give coupon rules scope (service/category/tier), expiry and usage limits. *(Findings 69, 70.)*
28. **Add service reviews** reusing the `Review` model with a nullable `service_id`, and emit `aggregateRating` in the service JSON-LD. *(Findings 18, 75.)*
29. **Add SEO fields to `Category`** and breadcrumb JSON-LD to both service and category pages; raise or paginate the sitemap's 50-service cap. *(Findings 72, 74, 76.)*
30. **Add search, sort and price filtering** to `/services` — the `search` parameter already exists server-side and is simply unused. *(Findings 13, 14.)*
31. **Add server-side price coherence validation** (`fixed` requires `base_price`, `hourly` requires `hourly_rate`, `package` requires a range or tiers, no negative prices) so the ৳0-invoice paths become impossible. *(Findings 51, 52, 65, 66.)*
32. **Add a soft-delete restore view** for services, tiers, fields and bookings, and correct the "cannot be undone" copy. *(Findings 59, 60.)*

---

## Appendix — What is well built

Stated for balance; all verified.

- **`core/booking_form.py`** is a genuinely well-engineered validation layer: server-authoritative, whitelist-based, fails open on admin config errors, drops unknown keys instead of rejecting the booking, and is mirrored faithfully on the client.
- **Server-authoritative pricing.** `quoted_price` from the client is discarded and re-derived from DB rows (`bookings_v2.py:87-109`).
- **`core/capabilities.py`** gives CTA and capability resolution exactly one home, consumed by the API and rendered identically on cards, detail pages and the booking button.
- **Soft-deleted form fields are stripped from `ServiceOut`** (`schemas.py:600-609`) with a comment explaining the exact failure it prevents.
- **Category deletion refuses while items remain in the subtree** (`categories.py:200-224`) and the cycle guard on re-parenting is correct.
- **The catch-all service route** resolves service → category → legacy in an order that preserves every pre-existing URL, with retry-on-5xx so a cold start never turns a valid URL into a crawlable 404.
- **Offline booking queueing** and the local invoice snapshot are thoughtful touches for a low-connectivity market.
- **Bilingual (EN/BN) coverage** is consistent across every public surface in the module.
