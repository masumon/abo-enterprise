# ABO Enterprise — Deployment Guide (Free Tier)

## 🎯 Quick Overview

This guide covers deploying ABO Enterprise to production using:
- **Backend:** Render (Free Tier)
- **Frontend:** Vercel (Free Tier)
- **Database:** Supabase (Free Tier)
- **Storage:** Cloudinary (Free Tier)

## ⚙️ Prerequisites

- GitHub account (connected to your repo)
- Supabase account
- Cloudinary account
- Render account
- Vercel account
- Gmail account (for SMTP)

---

## STEP 1: Database Setup (Supabase)

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up / Log in
3. Create new project
4. Choose region close to Bangladesh (or Europe)
5. Wait for project to initialize

### 1.2 Run Database Migrations

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy-paste contents from `backend/migrations/001_initial_schema.sql`
4. Run query (⌘/Ctrl + Enter)
5. Repeat for `backend/migrations/002_settings_table.sql`

**Result:** You should see tables: `products`, `orders`, `order_items`, `bookings`, `leads`, `admin_users`, `settings`

### 1.3 Get Connection String

1. In Supabase, go to **Settings → Database**
2. Copy the **PostgreSQL Connection String** (Async version for FastAPI)
3. Save it somewhere safe — you'll need it for Render

---

## STEP 2: Environment Variables

### Backend (.env)

Create `backend/.env` with these values:

```env
# === Application ===
APP_NAME=ABO Enterprise
APP_ENV=production
DEBUG=false
SECRET_KEY=your_random_secret_key_here_make_it_long_and_random

# === Database (from Supabase) ===
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/dbname

# === SMTP (Gmail) ===
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password_here
SMTP_FROM=your_email@gmail.com
SMTP_TLS=true
EMAIL_SENDER_NAME=ABO Enterprise
ADMIN_NOTIFY_EMAIL=your_email@gmail.com

# === WhatsApp & Contact ===
WHATSAPP_NUMBER=+8801825007977
BUSINESS_PHONE=+880182500797

# === Cloudinary ===
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# === Security ===
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app,http://localhost:3000

# === JWT ===
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
```

**⚠️ Important:**
- Get Gmail App Password: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
- Get Cloudinary credentials from your dashboard
- Generate a strong `SECRET_KEY` (min 32 chars, random)

### Frontend (.env.local)

Create `frontend/.env.local` with:

```env
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
NEXT_PUBLIC_WHATSAPP_NUMBER=8801825007977
NEXT_PUBLIC_BUSINESS_NAME=ABO Enterprise
NEXT_PUBLIC_BUSINESS_EMAIL=abo.enterprise@gmail.com
NEXT_PUBLIC_BUSINESS_PHONE=+880182500797
NEXT_PUBLIC_BUSINESS_ADDRESS=Hazi Bahar Uddin Market, Sylhet-3170, Bangladesh
```

---

## STEP 3: Deploy Backend (Render)

### 3.1 Create Web Service

1. Go to [render.com](https://render.com)
2. Sign up / Log in with GitHub
3. Click **New + → Web Service**
4. Select your `abo-enterprise` repository
5. Configure:
   - **Name:** `abo-enterprise-api`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3.11`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app.main:app --workers 1 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`

### 3.2 Add Environment Variables

In Render dashboard, go to **Environment**:
- Paste all variables from `backend/.env`
- Make sure `DATABASE_URL` uses Async PostgreSQL driver

### 3.3 Deploy

Click **Create Web Service**. Wait 5-10 minutes for deployment.

**Test:**
```bash
curl https://your-service.onrender.com/api/v1/auth/me
# Should return 401 (unauthenticated)
```

### 3.4 Get Backend URL

Your backend URL will be: `https://your-service.onrender.com`

Copy this — you'll need it for frontend.

---

## STEP 4: Deploy Frontend (Vercel)

### 4.1 Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign up / Log in with GitHub
3. Import your `abo-enterprise` repository
4. Configure:
   - **Framework:** Next.js
   - **Root Directory:** `frontend`

### 4.2 Add Environment Variables

In Vercel, go to **Settings → Environment Variables**:

Add `NEXT_PUBLIC_API_URL` with value: `https://your-service.onrender.com`

Add other variables from `frontend/.env.local`

### 4.3 Deploy

Click **Deploy**. Wait 2-3 minutes.

**Your frontend is live at:** `https://your-project.vercel.app`

---

## STEP 5: Setup Admin Account

### 5.1 Initialize Admin

After backend is live:

```bash
curl https://your-service.onrender.com/api/v1/auth/setup
```

This endpoint creates the first admin user with credentials from `backend/.env`:
- **Email:** ADMIN_EMAIL from env
- **Password:** ADMIN_PASSWORD from env

### 5.2 Login to Admin

1. Go to `https://your-frontend-domain.vercel.app/admin/login`
2. Enter your admin credentials
3. Access dashboard

---

## STEP 6: Configure Settings

1. In Admin Dashboard, go to **Settings**
2. Update:
   - **WhatsApp Number:** Your business WhatsApp
   - **Business Email:** Your business email
   - **Business Phone:** Your contact number
   - **Business Name:** Your company name
   - **Business Address:** Your physical location

These settings are used for:
- Order/Booking confirmation emails
- WhatsApp links in customer communications
- Business information displayed on website

---

## 🧪 Test the Flow

### Test Order Creation

1. Go to homepage
2. Add a product to cart
3. Click Checkout
4. Fill form with test customer details
5. Complete order

**Expected:**
- ✅ Order created
- ✅ Redirected to `/order-success?id=...`
- ✅ Customer receives email confirmation (check inbox)
- ✅ WhatsApp link works

### Test Admin

1. Go to `/admin`
2. View recent orders in dashboard
3. Update order status
4. Check settings page

---

## 📊 Free Tier Limits & Tips

| Service | Limit | Optimization |
|---------|-------|--------------|
| **Render** | 0.5 CPU, 512MB RAM | Lightweight API only; no heavy processing |
| **Vercel** | 100GB bandwidth | Optimize images with Next.js Image |
| **Supabase** | 500MB database | Only keep necessary data; archive old orders |
| **Cloudinary** | 25GB storage | Compress images before upload |

### Cost Optimization Tips
1. Delete old orders/leads periodically (soft delete for compliance)
2. Set up Cloudinary auto-upload to free tier storage
3. Use Vercel's automatic code splitting
4. Monitor Render logs for memory leaks

---

## ⚠️ Common Issues

### Issue: "Cold Start" on Render
**Solution:** Add a monitoring cron job to keep backend warm

### Issue: Emails not sending
**Solution:**
1. Check SMTP credentials are correct
2. Enable "Less secure app access" if using Gmail
3. Verify email in ADMIN_NOTIFY_EMAIL exists

### Issue: Images not uploading
**Solution:**
1. Verify Cloudinary credentials in `backend/.env`
2. Check file size < 100MB
3. Allowed formats: jpg, png, gif, webp

### Issue: Database connection timeout
**Solution:**
1. Check DATABASE_URL is for async PostgreSQL
2. Verify Supabase IP whitelist (should be open)
3. Test connection: `psql <DATABASE_URL>`

---

## 🔒 Security Checklist

Before going live:

- [ ] Change `SECRET_KEY` to random 32+ char string
- [ ] Use Gmail App Password (not real password)
- [ ] Set `DEBUG=false` in production
- [ ] Enable HTTPS everywhere (automatic on Render + Vercel)
- [ ] Set CORS ALLOWED_ORIGINS to your domain only
- [ ] Delete or disable `/api/v1/auth/setup` endpoint after first use
- [ ] Regular database backups enabled in Supabase
- [ ] Monitor error logs regularly

---

## 📞 Support

If deployment fails:

1. Check Render logs: Dashboard → Logs
2. Check Vercel logs: Dashboard → Deployments → Logs
3. Verify environment variables
4. Check database connection with tools like pgAdmin
5. Test API endpoints with Postman

---

**You're live! 🎉**

Your platform is now:
- ✅ Accepting orders
- ✅ Booking services
- ✅ Sending confirmations
- ✅ Admin-controlled

Next steps:
1. Add real products
2. Test order flow with real customers
3. Monitor usage
4. Gradually add more features (Phase 2)
