# ABO Enterprise — Digital Business Ecosystem

An integrated commerce platform for Bangladesh combining a tech-product storefront, a taxonomy-driven service catalog with online booking, and a project-lead pipeline — backed by a fully admin-manageable CMS, a bilingual (বাংলা/English) interface, and an installable offline-capable PWA.

**Founder:** [M.A. Sumon](https://mumainsumon.netlify.app) · **Status:** ✅ Live in production

**Live:** [www.aboenterprise.com](https://www.aboenterprise.com) · **API:** [api.aboenterprise.com](https://api.aboenterprise.com)

---

## Architecture

```
frontend/   Next.js 14 (App Router, TypeScript, Tailwind)  → Vercel
backend/    FastAPI (Python 3.11, SQLAlchemy async)        → Render
database    PostgreSQL                                     → Supabase
media       Image storage & optimization                   → Cloudinary
dns/cdn     DNS, CDN, TLS                                  → Cloudflare
errors      Error monitoring                               → Sentry
email       Transactional email                            → Gmail SMTP
uptime      Keep-alive / warmup pings                      → cron-job.org
```

The entire stack runs on free tiers with a custom domain. The frontend calls the API cross-origin (`www.` → `api.`); public requests are credential-less, while the admin panel uses an HttpOnly cookie session (see [Security](#security--authentication)).

---

## What the Platform Does

### 1. E-commerce (Products)

- Product catalog with categories, search, filters, comparison and wishlist
- Cart → checkout → order flow with Bangladesh delivery zones (Sylhet / Dhaka / outside) and configurable delivery charges & free-delivery threshold
- Payment methods: bKash, Nagad, bank transfer, cash on delivery
- Coupon codes (admin-editable JSON, validated at checkout)
- Order tracking page (`/track`) by order number + phone, with courier tracking links (Pathao, Steadfast)
- PDF invoices generated per order/booking
- Order success page driven by a locally saved order snapshot, so the receipt renders instantly even on a slow connection

### 2. Services & Booking

- **One canonical route system** under `/services/[...segments]`:
  - `/services/{service}` → service detail (SEO metadata + Service JSON-LD)
  - `/services/{category}` → category landing
  - `/services/{category}/{subcategory}` → filtered listing
  - `printing` / `legal` / `software` resolve through the same pipeline, with dedicated booking pages as fallback until the taxonomy covers those slugs
- Category → subcategory taxonomy fully managed from the admin panel
- Booking form with tiered pricing (fixed / hourly / package / custom), **admin-defined dynamic form fields** per service (text, select, radio, checkbox groups, conditional show/if logic — validated on both client and server), BD district/upazila selectors, and a dynamic CTA (book / order / quote / contact) computed per service
- Bookings land in Admin → Bookings and redirect the customer to a success page with reference number and downloadable invoice

### 3. Project Leads

- Lead capture on the homepage, contact page and software page (custom software, AI solutions, automation, ERP/POS)
- Lead qualification scoring and pipeline management in Admin → Leads
- Career application intake (`/career`) with its own admin queue

### 4. Content & CMS

Nearly every public surface is editable from **Admin → Settings** without a redeploy:

| Surface | Setting keys |
| --- | --- |
| Hero (title, subtitle, CTA, banner) | `hero_*` |
| Announcement bar messages | `site_announcements_json` |
| Trust badges | `site_trust_badges_json` |
| Why Choose Us cards | `site_why_choose_json` |
| FAQ (homepage + `/faq`) | `site_faq_json` |
| Quick category tiles | `site_quick_categories_json` |
| Entry-point cards | `site_entry_points_json` |
| Client logos, team, testimonials | `client_logos_json`, `about_team_json`, `demo_reviews_json` |
| Contact info & business hours | `contact_phone/email/address`, `contact_hours_en/bn` |
| Delivery, checkout, coupons, SMTP, social links | `delivery_*`, `checkout_*`, `coupons_json`, `smtp_*`, `*_url` |

Every section ships with a built-in default, so an empty setting renders the standard content — settings only override. Blog, project gallery (showcase), image manager (Cloudinary), email templates and newsletter round out the content tooling.

### 5. PWA & Offline Resilience

- Installable PWA (service worker, manifest, install prompt, one-time branded splash screen)
- IndexedDB response cache — catalog pages work from cache when the backend is cold or the connection drops
- **Offline submission queue:** bookings and leads submitted offline are stored locally, shown as "queued", and auto-synced when the connection returns (with a floating status badge)
- Network-aware API client: adaptive timeouts and retry counts based on connection quality, safe retry policy (idempotent requests only), and cold-start-friendly warmup content

### 6. AI Assistant

Floating bilingual assistant widget backed by the backend assistant module (intent patterns, FAQ knowledge base, synonyms) with WhatsApp handoff — configurable from Admin → AI Assistant.

### 7. Bilingual UI

Full বাংলা/English toggle persisted per visitor, covering navigation, forms, validation messages, CMS content (`*_bn` fields throughout) and JSON-LD.

---

## SEO

- Per-page metadata with canonical URLs; dynamic metadata for services, products and blog posts (with per-record SEO overrides)
- JSON-LD: Organization, LocalBusiness (Sylhet storefront), WebSite + SearchAction, Service
- `sitemap.xml` (static + dynamic routes, deduplicated) and `robots.txt`
- Transactional/account pages (cart, checkout, auth, profile, orders, search, compare) are `noindex,follow` and excluded from the sitemap
- Google Analytics 4 events (checkout funnel, lead generation) and UTM capture

## Security & Authentication

- **Admin:** email + password with optional TOTP 2FA. Production uses an HttpOnly cookie session (JWT never touches JS); a localStorage bearer token is the automatic fallback for preview environments. Role-based access (viewer / editor / admin) gates both the UI and the API. Full audit logging of admin actions.
- **Customers:** phone OTP login for order history, profile, addresses and wishlist.
- **CORS:** public requests are credential-less by design — some BD mobile-carrier proxies strip `Access-Control-Allow-Credentials`, so credentials are enabled only within `/admin`.
- Rate limiting, secure JSON-LD serialization, and masked secrets in the settings API.

## Accessibility

- Programmatic label↔input binding (`htmlFor`/`id`), `aria-invalid` + `aria-describedby` error association, and `fieldset`/`legend` grouping across all public forms (booking, lead, contact, printing/legal/software)
- Keyboard-focus management, focus traps in dialogs, `role="status"`/`role="alert"` live regions, and reduced-motion-safe animations

---

## Admin Panel (`/admin`)

| Section | Modules |
| --- | --- |
| Overview | Dashboard (live stats, quick actions), Analytics & revenue |
| Sales | Orders, Invoices, Payments, Coupons |
| Customers | Bookings, Leads, Career applications |
| Catalog | Categories (taxonomy), Products, Services (incl. dynamic booking-form builder), Reviews |
| Content | Image Manager, Project Gallery, Blog, Email Templates, Newsletter |
| System | Settings (CMS), Users & roles, Audit logs, AI Assistant |

---

## Project Structure

```
backend/
  app/
    api/v1/routes/     27 REST resource modules (products, orders, bookings_v2,
                       leads_v2, services, categories, payments, invoices, auth,
                       customer_otp, settings, media, assistant, analytics, ops …)
    assistant/         Intent patterns, FAQ knowledge, synonyms (JSON)
    core/              DB, security, booking-form validation, schema sync
    models/ schemas/   SQLAlchemy models, Pydantic schemas
  migrations/          Ordered SQL migrations (001 … 017 + TOTP)

frontend/
  src/app/             App Router pages (public site + /admin)
  src/components/      home, services, booking, products, layout, ui, pwa,
                       network, admin, analytics …
  src/lib/             API client, CMS content, i18n, offline sync, caching,
                       SEO helpers, BD districts/upazilas, phone validation
  src/store/           Zustand stores (cart, customer, language, wishlist …)
  src/__tests__/       Jest + Testing Library suites
```

---

## Local Development

### Prerequisites

Node.js 20+, Python 3.11+, a Supabase (PostgreSQL) project, and a Cloudinary account.

### 1. Database

Run the SQL files in `backend/migrations/` **in numeric order** (001 → 017, plus `manual_totp_migration.sql` for admin 2FA) in the Supabase SQL Editor. The backend also auto-syncs missing columns at startup (`app/core/schema_sync.py`), but the full migration set is recommended for fresh databases.

### 2. Backend

```bash
cd backend
cp .env.example .env        # fill in DATABASE_URL, JWT secret, Cloudinary, SMTP …
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Then create the first admin: `GET http://localhost:8000/api/v1/auth/setup`

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local  # NEXT_PUBLIC_API_URL=http://localhost:8000 …
npm install
npm run dev                 # http://localhost:3000
```

### Tests & Checks

```bash
cd frontend
npx jest          # unit/component tests
npx tsc --noEmit  # typecheck
npx next lint     # lint
npm run build     # production build
```

---

## Deployment

### Vercel (frontend)

1. Import the GitHub repo, set **Root Directory** to `frontend`
2. Set environment variables (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, analytics/Sentry keys)
3. Production deploys on every push to `main`. A **Deploy Hook** (Settings → Git → Deploy Hooks, branch `main`) is kept as a manual trigger for when GitHub webhook delivery is degraded.

### Render (backend)

- Web Service, root `backend`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1`
- Configured via `render.yaml`

### Keep-alive & Ops

Render's free tier sleeps on idle. A [cron-job.org](https://cron-job.org) job pings the backend health/warmup endpoints (`/api/v1/health`, ops warmup) on a schedule so customer-facing requests avoid cold starts. `docs/DISASTER_RECOVERY.md` covers backup and restore procedures.

---

## Documentation

- 🎯 [AIOS.md](./AIOS.md) — AI Operating System & business rules governing development
- 🛟 [Disaster Recovery](./docs/DISASTER_RECOVERY.md) — backup & restore runbook
- 🗃️ [Migrations](./backend/migrations/README.md) — database migration notes

---

&copy; 2026 ABO Enterprise. Built by [Mumain.dev](https://mumain.dev)
