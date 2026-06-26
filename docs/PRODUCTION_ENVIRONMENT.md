# Production Environment Setup Guide

## Backend Environment Variables (Render)

### Database Configuration
```
DATABASE_URL=postgresql://user:password@db.render.com:5432/aboenterprise
```
**Source:** Supabase connection string
**Location:** Settings → Database → Connection String → URI

### Authentication
```
JWT_SECRET_KEY=your-random-32-character-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```
**Generate JWT Secret:**
```bash
python -c "import secrets; print(secrets.token_hex(16))"
```

### Email Configuration (SendGrid)
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=SG.your_sendgrid_api_key
FROM_EMAIL=noreply@aboenterprise.com
```
**Setup:**
1. Create SendGrid account
2. Generate API key
3. Verify sender domain

### File Storage (Cloudinary)
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```
**Setup:**
1. Sign up at cloudinary.com
2. Go to Dashboard
3. Copy credentials

### WhatsApp Integration (Twilio)
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886
```
**Setup:**
1. Create Twilio account
2. Enable WhatsApp sandbox
3. Copy credentials

### Application Settings
```
ENVIRONMENT=production
LOG_LEVEL=info
CORS_ORIGINS=https://aboenterprise.com,https://www.aboenterprise.com
WORKERS=2
```

---

## Frontend Environment Variables (Vercel)

### Public Variables (visible in browser)
```
NEXT_PUBLIC_API_URL=https://api.aboenterprise.com
NEXT_PUBLIC_APP_NAME=ABO Enterprise
NEXT_PUBLIC_SITE_URL=https://aboenterprise.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
```

### Secret Variables (server-side only)
```
API_SECRET_KEY=your_secret_key (if needed)
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All env vars collected
- [ ] Database backed up
- [ ] Migrations tested locally
- [ ] Dependencies updated
- [ ] Build succeeds locally
- [ ] Tests pass
- [ ] No console.log statements
- [ ] No hardcoded secrets

### Backend Deployment (Render)
1. Push to GitHub main branch
2. Render auto-deploys from render.yaml
3. Monitor deployment logs
4. Verify health endpoint
5. Check database migrations

### Frontend Deployment (Vercel)
1. Connect GitHub repo
2. Set environment variables
3. Set build settings:
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`
4. Deploy
5. Verify PWA manifest loads

### Post-Deployment
- [ ] Test homepage loads
- [ ] Check service worker registration
- [ ] Test offline mode
- [ ] Verify API connectivity
- [ ] Check push notifications
- [ ] Monitor error logs
- [ ] Performance audit (Lighthouse)

---

## Monitoring Setup

### Render Monitoring
1. Dashboard → Services → abo-enterprise-api
2. Metrics tab:
   - CPU usage
   - Memory usage
   - Request count
   - Response time

### Vercel Monitoring
1. Dashboard → Deployments
2. Analytics tab:
   - Web Vitals
   - Performance metrics
   - Error tracking

### Custom Monitoring
```bash
# Health check script
curl https://api.aboenterprise.com/health
curl https://aboenterprise.com/api/health
```

---

## Rollback Procedures

### Frontend Rollback (Vercel)
1. Dashboard → Deployments
2. Click "..." on previous successful deployment
3. Select "Promote to Production"
4. Auto-verification

### Backend Rollback (Render)
1. Dashboard → Services → abo-enterprise-api
2. Go to "Deploys" tab
3. Click "Redeploy" on previous deployment
4. Monitor logs

---

## Secret Management Best Practices

✅ DO:
- [ ] Use strong random keys (32+ chars)
- [ ] Store secrets in platform vault only
- [ ] Rotate secrets quarterly
- [ ] Use different secrets per environment
- [ ] Enable 2FA on all accounts
- [ ] Monitor access logs

❌ DON''T:
- [ ] Commit secrets to Git
- [ ] Share secrets in chat/email
- [ ] Use same secret in multiple envs
- [ ] Log secrets in error messages
- [ ] Use default/weak credentials

---

## Database Backup Strategy

### Supabase
```
Settings → Database → Backups
- Auto backup: Daily
- Retention: 30 days
- Test restore: Weekly
```

### Verification
```bash
# Connect to backup
psql -h backup.supabase.co -U postgres -d aboenterprise

# Verify migrations
SELECT * FROM alembic_version;
```

---

## Domain & SSL Configuration

### Domain Setup (Vercel)
1. Vercel → Settings → Domains
2. Add domain
3. Update DNS:
   - Type: CNAME
   - Name: www
   - Value: cname.vercel-dns.com

### Domain Setup (Render)
1. Render → Services → abo-enterprise-api
2. Custom domain
3. Add DNS record (provided by Render)

### SSL Certificate
- Vercel: Auto-managed by Vercel
- Render: Auto-provisioned with Let''s Encrypt

### Verification
```bash
curl -I https://aboenterprise.com
# Should return 200 OK with HTTPS
```

---

## Monitoring & Alerting

### Set Up Alerts on Render
1. Dashboard → Services → abo-enterprise-api
2. Alerts
3. Create alert:
   - CPU > 80%
   - Memory > 90%
   - Restart count > 3
   - Response time > 2s

### Set Up Error Tracking
Option 1: Sentry
```bash
pip install sentry-sdk
```

Option 2: Built-in logging
```python
import logging
logger = logging.getLogger(__name__)
```

---

## Load Testing

Before production:
```bash
# Install Apache Bench
ab -n 1000 -c 10 https://aboenterprise.com/

# Or use LoadTesting tool
# https://loadtesting.io
```

**Target:**
- 1000+ concurrent users
- <500ms response time
- <1% error rate

