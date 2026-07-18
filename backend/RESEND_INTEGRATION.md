# Resend Email Provider Integration

## Overview

ABO Enterprise now supports **multiple email providers** with pluggable architecture:
- ✅ SMTP (existing default)
- ✅ Resend (new, production-ready)
- 🔄 Future: SendGrid, Mailgun, AWS SES

## Architecture

```
send_email()
    ↓
email_factory.get_email_provider()
    ↓
[ResendProvider | SMTPProvider]
    ↓
API or SMTP
```

### Files Changed

**New files:**
- `app/core/email_provider.py` - Provider interfaces (ABC)
- `app/core/email_factory.py` - Provider factory + selection logic

**Modified:**
- `app/core/config.py` - Added `EMAIL_PROVIDER`, `RESEND_API_KEY`
- `app/core/email.py` - Refactored `send_email()` to use factory
- `requirements.txt` - Added `resend==0.11.0`
- `render.yaml` - Added provider configuration variables

---

## Configuration

### Environment Variables

```env
# Provider selection (default: "smtp")
EMAIL_PROVIDER=resend

# Resend API key (required if EMAIL_PROVIDER=resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx

# Used by both providers
SMTP_FROM=noreply@aboenterprise.com
EMAIL_SENDER_NAME=ABO Enterprise
ADMIN_NOTIFY_EMAIL=admin@aboenterprise.com
```

### How to Switch Providers

#### **Option 1: Render Dashboard (Recommended for Production)**

1. Go to Render dashboard → `abo-enterprise-api` service
2. **Environment** tab
3. Update/create variables:
   - `EMAIL_PROVIDER` = `resend`
   - `RESEND_API_KEY` = `re_xxxxx` (from Resend dashboard)
4. **Save** → Service auto-redeploys
5. ✅ Done!

#### **Option 2: Backend .env (Development)**

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_test_xxxxxxxxxxxxx
```

#### **Option 3: Database Settings (Runtime)**

Admin can edit via Settings API:
```bash
PUT /api/v1/settings/upsert
[
  {"key": "email_provider", "value": "resend"},
  {"key": "resend_api_key", "value": "re_xxxxx"}
]
```

---

## Setup: Resend

### Step 1: Create Resend Account
- Go to https://resend.com
- Sign up (free)

### Step 2: Create Sender
1. Dashboard → **Emails** → **Domains**
2. Add domain: `aboenterprise.com` (or use default Resend domain)
3. Verify DNS records (follow Resend guide)
4. ✅ Sender verified

### Step 3: Generate API Key
1. Dashboard → **API Keys** → **Create API Key**
2. Copy API key (starts with `re_`)

### Step 4: Deploy
- Add `RESEND_API_KEY` to Render environment
- Set `EMAIL_PROVIDER=resend`
- Deploy

---

## Backward Compatibility

### SMTP Still Works

Default is **SMTP** (`EMAIL_PROVIDER=smtp`):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=info@aboenterprise.com
SMTP_PASSWORD=your-app-password
```

No code changes needed.

### All Email Types Supported

Both SMTP and Resend support:
- ✅ Booking confirmations
- ✅ Order confirmations
- ✅ Invoice emails
- ✅ Admin notifications
- ✅ Lead notifications
- ✅ Contact form emails
- ✅ OTP/Password reset (if implemented)

### Database Email Config

Admin can still configure SMTP via panel:
```
Setting: smtp_host = smtp.gmail.com
Setting: smtp_user = info@aboenterprise.com
etc.
```

Resend and SMTP can coexist - select via `EMAIL_PROVIDER`.

---

## Error Handling

### Resend-Specific

**Missing API key:**
```
RuntimeError: Resend provider requires RESEND_API_KEY environment variable
```
→ Set `RESEND_API_KEY` in Render environment

**Package not installed:**
```
RuntimeError: Resend provider requires: pip install resend
```
→ Deployed via `requirements.txt`, should not occur in production

**API error (rate limit, invalid email):**
```
RuntimeError: Resend API error: Invalid email address
```
→ Email validation happens before send; most errors are retried (2s, 5s backoff)

### Graceful Degradation

If both providers fail:
- ✅ Booking still created
- ✅ Error logged to Sentry
- ✅ Admin notified via Operations panel (`failed_emails` buffer)
- ✅ Customer sees success (email async task)

---

## Testing

### Manual Test (Production)

1. Create a booking via API/admin
2. Check email inbox (recipient from booking form)
3. Verify email arrived within 1-2 seconds

### Logs

Check Render logs for:
```
Using Resend email provider ✓
Email sent via Resend to user@example.com (id=xxxxx)
```

### Failed Emails

Admin panel → Operations → Failed Emails:
```
Timestamp: 2026-07-19 10:30:45
To: user…@example.com
Subject: Booking Confirmation
Error: Invalid sender domain
```

---

## Monitoring

### Sentry Integration

All email errors logged with context:
- Provider used
- Recipient
- Email type
- Retry count
- Error message

### Metrics (Future)

Could add:
- Email delivery rate
- Latency per provider
- Cost tracking (Resend vs SMTP)

---

## Rollback

If Resend fails, revert to SMTP:

**In Render dashboard:**
1. Set `EMAIL_PROVIDER` = `smtp`
2. Set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`
3. Deploy

**Emails resume immediately** - no downtime.

---

## Limitations

### Resend

- ❌ Attachments not yet supported (logged with warning)
- ✅ HTML emails with images
- ✅ Plain text fallback
- ✅ 100+ emails/day (free tier)
- ✅ 5000+ emails/month (paid)

### SMTP

- ✅ Attachments supported
- ✅ All features
- ⚠️ Render free tier: Gmail SMTP blocked (Network issue)

---

## Future Extensibility

To add a new provider (e.g., SendGrid):

1. Extend `EmailProvider` ABC in `email_provider.py`:
```python
class SendGridProvider(EmailProvider):
    async def send(self, to, subject, html, attachments=None):
        # SendGrid API call
        pass
    
    def validate(self) -> bool:
        # Check API key
        pass
```

2. Register in `email_factory.py`:
```python
elif provider_name == "sendgrid":
    provider = SendGridProvider(...)
```

3. Add env var to `config.py`:
```python
SENDGRID_API_KEY: str = ""
```

**No existing code changes needed.**

---

## Support

**Issues or questions?**
1. Check Render logs: `Logs` tab
2. Check Sentry: error tracking
3. Check admin Operations panel: failed emails
4. Review this guide: configuration section

---

**Last Updated:** 2026-07-19
**Version:** 1.0
**Status:** ✅ Production Ready
