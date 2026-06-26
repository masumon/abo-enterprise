# ABO Enterprise — Digital Business Ecosystem

Bangladesh's First Integrated Technology Platform for Product Sales, Service Bookings & Project Leads

**Founder:** [M.A. Sumon](https://mumainsumon.netlify.app) | **Version:** 1.0.0 | **Status:** ✅ Production Ready

---

## Architecture

```
frontend/   → Next.js 14 (Vercel)
backend/    → FastAPI Python (Render)
database    → Supabase PostgreSQL
storage     → Cloudinary
cdn/dns     → Cloudflare
```

## Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- Supabase account
- Cloudinary account
- Render account
- Vercel account

### 1. Database Setup (Supabase)

1. Create a new Supabase project
2. Go to SQL Editor
3. Run `backend/migrations/001_initial_schema.sql`

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in your values in .env
pip install -r requirements.txt
uvicorn app.main:app --reload
```

After starting, run admin setup:
```
GET http://localhost:8000/api/v1/auth/setup
```

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env.local
# Fill in your values in .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment

### Vercel (Frontend)
1. Connect GitHub repo to Vercel
2. Set root directory to `frontend`
3. Add environment variables
4. Deploy

### Render (Backend)
1. Create a new Web Service on Render
2. Connect GitHub repo
3. Set root directory to `backend`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 2`
6. Add environment variables

### GitHub Secrets Required
```
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
RENDER_DEPLOY_HOOK
```

---

## Features Implemented

### Core Revenue Streams

- ✅ **Product Sales** - E-commerce with inventory, orders, payments
- ✅ **Service Bookings** - 4 pricing models (fixed, hourly, package, custom)
- ✅ **Project Leads** - Lead generation with AI qualification scoring (0-100)

### Platform Capabilities

- ✅ 70+ REST API endpoints
- ✅ Admin dashboard with real-time statistics
- ✅ Dynamic service detail pages
- ✅ Advanced booking form with validation
- ✅ Project inquiry with qualification scoring
- ✅ Email notifications + WhatsApp integration
- ✅ Admin settings configuration
- ✅ Activity logging & audit trails
- ✅ Bangladesh payment methods (bKash, Nagad)
- ✅ Bilingual support (English/Bengali)
- ✅ PDF invoice generation
- ✅ Complete E2E test suite

## Project Status

| Phase | Timeline | Status | Details |
| --- | --- | --- | --- |
| **Phase 1** | Week 1-2 | ✅ Complete | Backend API (70+ endpoints), Database (6 migrations), 13 models |
| **Phase 2** | Week 3-4 | ✅ Complete | Frontend (9 pages), Components (7 reusable), Admin panel |
| **Phase 3** | Week 5-6 | ✅ Complete | Testing (6 test files), Deployment guides, Production readiness |
| **Phase 4** | Future | 📋 Planned | AI features, Advanced analytics, Mobile app |

## Documentation

- 📖 [API Documentation](./docs/API_DOCUMENTATION.md) - 70+ endpoints with examples
- 🧪 [Testing Guide](./docs/TESTING.md) - E2E testing strategy & setup
- 🚀 [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment to Render & Vercel
- ✅ [Production Checklist](./docs/PRODUCTION_CHECKLIST.md) - Pre-launch verification
- 🎯 [AIOS Framework](./AIOS.md) - AI Operating System & business rules

---

## AI Operating System

See [AIOS.md](./AIOS.md) for the complete AI Operating System governing all development decisions.

---

&copy; 2026 ABO Enterprise. Built by [Mumain.dev](https://mumain.dev)
