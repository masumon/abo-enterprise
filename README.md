# ABO Enterprise — Platform

Bangladesh's Complete Technology Ecosystem

**Founder:** [Mumain Ahmed (Sumon)](https://mumainsumon.netlify.app)

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

## Phase Roadmap

| Phase | Features | Status |
|-------|----------|--------|
| 1 | Products, Orders, Service Booking, Lead Gen | **In Progress** |
| 2 | Admin Panel, Client Portal, bKash API | Planned |
| 3 | AI Features, Automation, SaaS Products | Planned |
| 4 | Mobile App, Multi-vendor, White-label | Future |

---

## AI Operating System

See [AIOS.md](./AIOS.md) for the complete AI Operating System governing all development decisions.

---

&copy; 2026 ABO Enterprise. Built by [Mumain.dev](https://mumain.dev)
