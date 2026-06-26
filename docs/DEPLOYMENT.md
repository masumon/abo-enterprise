# ABO Enterprise Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     PRODUCTION DEPLOYMENT                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  Vercel (CDN)    │         │  Render.com      │         │
│  │  Frontend        │◄───────►│  Backend API     │         │
│  │  (Next.js)       │         │  (FastAPI)       │         │
│  └──────────────────┘         └──────────────────┘         │
│         ▲                               ▲                    │
│         │                               │                    │
│    Cloudflare DNS               Supabase PostgreSQL         │
│         │                               │                    │
│  Domain Management             Database + Auth              │
│         │                               │                    │
│  S3/Cloudinary ◄───────────────────────┘                    │
│  File Storage                   SMTP (Email)                │
│                                 WhatsApp API                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Phase 1: Prerequisites

### Required Accounts
- [ ] GitHub Repository (with SSH keys configured)
- [ ] Vercel Account (connected to GitHub)
- [ ] Render Account (with payment method)
- [ ] Supabase Project (PostgreSQL database)
- [ ] SendGrid / Gmail (SMTP email service)
- [ ] Cloudinary (image storage)
- [ ] Twilio (WhatsApp API) - Optional

### Environment Variables Created
- [ ] Frontend: `.env.local`
- [ ] Backend: `.env`
- [ ] Production: Vercel/Render environment variables

## Phase 2: Backend Deployment (Render.com)

### Step 1: Prepare Backend Repository

```bash
# Ensure .env.example exists with all required keys
cp .env .env.example
# Remove sensitive values from .env.example

# Verify requirements.txt is up-to-date
pip freeze > requirements.txt

# Test locally
python -m pytest

# Commit changes
git add .
git commit -m "chore: prepare for production deployment"
git push origin main
```

### Step 2: Create PostgreSQL Database on Supabase

1. Go to **supabase.com** → Create New Project
2. Select **Bangladesh (Singapore)** region for best latency
3. Wait for database initialization (5-10 minutes)
4. Copy connection string: `postgresql://...`
5. Run migrations:

```bash
# Connect to Supabase via psql
psql "postgresql://user:password@db.supabase.co:5432/postgres"

# Run all migrations in order
\i backend/migrations/001_core_tables.sql
\i backend/migrations/002_products_orders.sql
\i backend/migrations/003_payments_inventory.sql
\i backend/migrations/004_services_system.sql
\i backend/migrations/005_bookings_leads_payments.sql
\i backend/migrations/006_admin_settings_logging.sql
```

### Step 3: Deploy to Render

1. Go to **render.com** → Dashboard → New Web Service
2. Connect GitHub repository
3. Configure service:
   - **Name:** `abo-enterprise-api`
   - **Environment:** Python 3
   - **Build Command:**
     ```bash
     pip install -r requirements.txt
     ```
   - **Start Command:**
     ```bash
     gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app
     ```
   - **Instance Type:** Starter ($7/month) or Standard ($12/month)

4. Set Environment Variables in Render Dashboard:
   ```
   DATABASE_URL=postgresql://user:password@db.supabase.co:5432/postgres
   JWT_SECRET_KEY=<generate-random-32-char-key>
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   
   # Email Configuration
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USERNAME=apikey
   SMTP_PASSWORD=<sendgrid-api-key>
   FROM_EMAIL=noreply@aboenterprise.com
   
   # Cloudinary
   CLOUDINARY_CLOUD_NAME=<your-cloud-name>
   CLOUDINARY_API_KEY=<your-api-key>
   CLOUDINARY_API_SECRET=<your-api-secret>
   
   # Twilio (Optional)
   TWILIO_ACCOUNT_SID=<your-account-sid>
   TWILIO_AUTH_TOKEN=<your-auth-token>
   TWILIO_WHATSAPP_NUMBER=+14155238886
   
   # Application
   ENVIRONMENT=production
   LOG_LEVEL=info
   ```

5. Click **Deploy** and wait for deployment (5-10 minutes)

6. Verify deployment:
   ```bash
   curl https://abo-enterprise-api.onrender.com/health
   # Response: {"status": "ok"}
   ```

### Step 4: Database Seeding (One-time)

```bash
# SSH into Render instance or use local connection
python backend/scripts/seed_database.py

# Verify seed data
SELECT COUNT(*) FROM services;  -- Should show ~12 services
SELECT COUNT(*) FROM products;  -- Should show seed products
```

## Phase 3: Frontend Deployment (Vercel)

### Step 1: Prepare Frontend

```bash
# Update NEXT_PUBLIC_API_URL in .env.local
NEXT_PUBLIC_API_URL=https://abo-enterprise-api.onrender.com

# Test production build locally
npm run build
npm run start

# Verify no type errors
npm run type-check

# Commit changes
git add .
git commit -m "chore: prepare frontend for production"
git push origin main
```

### Step 2: Configure Vercel

1. Go to **vercel.com** → Add New Project
2. Import GitHub repository → `abo-enterprise`
3. Configure Build Settings:
   - **Framework:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
   - **Install Command:** `npm install`

4. Set Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://abo-enterprise-api.onrender.com
   NEXT_PUBLIC_APP_NAME=ABO Enterprise
   NEXT_PUBLIC_APP_URL=https://aboenterprise.com
   ```

5. Click **Deploy** and wait (2-5 minutes)

6. Verify deployment:
   - Visit deployed URL
   - Check Console for errors (F12)
   - Verify API calls work (Network tab)

### Step 3: Custom Domain Setup

1. **Register Domain** (Namecheap, GoDaddy, or domain provider)
2. **Add Domain to Vercel:**
   - Vercel Dashboard → Settings → Domains
   - Enter domain name
   - Add CNAME record: Point to `cname.vercel-dns.com`
   - Verify ownership (5-10 minutes)

3. **Setup SSL Certificate:** (Automatic with Vercel)

4. **Verify HTTPS:** 
   ```bash
   curl -I https://aboenterprise.com
   # Should return 200 OK with HTTPS
   ```

## Phase 4: Testing Production Deployment

### Backend Tests

```bash
# Test API health
curl https://abo-enterprise-api.onrender.com/health

# Test authentication
curl -X POST https://abo-enterprise-api.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@abo.com","password":"password"}'

# Test services endpoint
curl https://abo-enterprise-api.onrender.com/services

# Test database connection
curl https://abo-enterprise-api.onrender.com/admin/stats
```

### Frontend Tests

1. **Homepage**
   - [ ] Hero loads correctly
   - [ ] Navigation works
   - [ ] Images load from CDN

2. **Services Page**
   - [ ] Services list loads from API
   - [ ] Filtering works
   - [ ] Click service → detail page loads

3. **Booking Flow**
   - [ ] Fill form with valid data
   - [ ] Submit booking
   - [ ] Verify booking_number generated
   - [ ] Check email received

4. **Lead Inquiry Flow**
   - [ ] Fill project form
   - [ ] Submit inquiry
   - [ ] Verify lead_number generated
   - [ ] Check email received

5. **Admin Dashboard**
   - [ ] Login works
   - [ ] Dashboard loads stats
   - [ ] Can view/manage bookings
   - [ ] Can view/manage leads

## Phase 5: Monitoring & Maintenance

### Backend Monitoring

Set up on Render Dashboard:
- [ ] CPU usage alerts (> 80%)
- [ ] Memory alerts (> 90%)
- [ ] Error logs monitoring
- [ ] Database connection pooling

### Frontend Monitoring

Set up on Vercel Dashboard:
- [ ] Build failure notifications
- [ ] Deployment alerts
- [ ] Web Vitals monitoring
- [ ] Error tracking (Sentry optional)

### Logs Access

**Backend Logs (Render):**
```
Render Dashboard → Services → abo-enterprise-api → Logs
```

**Frontend Logs (Vercel):**
```
Vercel Dashboard → Deployments → abo-enterprise → Logs
```

**Database Logs (Supabase):**
```
Supabase Dashboard → Project → Database → Logs
```

## Phase 6: Post-Deployment Checklist

### Security
- [ ] Database password changed from default
- [ ] JWT secret is random (32+ chars)
- [ ] CORS properly configured (frontend URL only)
- [ ] HTTPS enforced (redirect HTTP → HTTPS)
- [ ] Sensitive env vars not logged
- [ ] Rate limiting enabled on APIs
- [ ] CSRF protection enabled

### Performance
- [ ] Frontend Lighthouse score > 90
- [ ] API response time < 500ms
- [ ] Database queries optimized (indexes added)
- [ ] Images optimized (Cloudinary)
- [ ] CDN caching enabled
- [ ] Gzip compression enabled

### Data
- [ ] Database backups enabled (daily)
- [ ] Backup retention: 30 days minimum
- [ ] Test restore process
- [ ] Seed data verified in production

### Operations
- [ ] Error monitoring configured
- [ ] Team notifications set up
- [ ] Documentation updated
- [ ] Team has access to dashboards
- [ ] Incident response plan created

## Rollback Procedures

### Frontend Rollback (Vercel)
1. Vercel Dashboard → Deployments
2. Find previous successful deployment
3. Click → "Promote to Production"
4. Verification happens automatically

### Backend Rollback (Render)
1. Render Dashboard → Services → abo-enterprise-api
2. Go to "Deploys" tab
3. Select previous successful deploy
4. Click "Redeploy"
5. Wait for deployment completion

### Database Rollback (Supabase)
1. Contact Supabase support for point-in-time recovery
2. Or restore from automated backup (24-hour retention)

## Cost Estimates (Monthly)

| Service | Plan | Cost |
|---------|------|------|
| Render Backend | Starter | $7 |
| Supabase Database | Free (up to 500MB) | $0-25 |
| Vercel Frontend | Hobby (free) or Pro | $0-20 |
| Cloudinary | Free (25GB/month) | $0-20 |
| SendGrid Email | Free (100/day) | $0-20 |
| **Total** | | **$7-85/month** |

## Production URLs

- **Frontend:** https://aboenterprise.com
- **Backend API:** https://abo-enterprise-api.onrender.com
- **API Docs:** https://abo-enterprise-api.onrender.com/docs
- **Admin Panel:** https://aboenterprise.com/admin

## Support & Troubleshooting

### Common Issues

**Frontend can''t connect to API:**
- [ ] Check NEXT_PUBLIC_API_URL is correct
- [ ] Verify backend is running (curl health endpoint)
- [ ] Check CORS headers in backend
- [ ] Verify network tab in browser DevTools

**Database connection error:**
- [ ] Verify DATABASE_URL in Render env vars
- [ ] Check Supabase database is running
- [ ] Verify IP whitelist (Supabase → Settings → Database)
- [ ] Test connection: `psql $DATABASE_URL`

**Email not sending:**
- [ ] Verify SendGrid API key is valid
- [ ] Check sender domain is verified in SendGrid
- [ ] Review SendGrid activity logs for bounces
- [ ] Test SMTP connection locally

**Build failures:**
- [ ] Check build logs (Vercel/Render dashboard)
- [ ] Verify all env vars are set
- [ ] Run build locally: `npm run build` / `python -m py_compile app/main.py`

## Support Contacts

- **Vercel Support:** vercel.com/support
- **Render Support:** render.com/support
- **Supabase Support:** supabase.io/support
- **SendGrid Support:** sendgrid.com/support

---

**Last Updated:** June 2024
**Status:** Ready for Production
**Version:** 1.0
