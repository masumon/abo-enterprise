# Disaster Recovery Runbook — ABO Enterprise

**Goal:** restore the full platform after data loss or provider failure.
**RPO target:** ≤ 7 days (weekly dump) · **RTO target:** ≤ 4 hours.

## What lives where

| Asset | Location | Backup |
|---|---|---|
| Database (orders, customers, CMS) | Postgres (`DATABASE_URL` on Render) | Provider backups + weekly `pg_dump` artifact (GitHub Actions → repo → Actions → "Weekly DB Backup") |
| Media (product/blog images) | Cloudinary | Managed by Cloudinary; URLs + metadata in `media_assets` table |
| Code & schema | GitHub (`masumon/abo-enterprise`) | Git history; schema = `backend/migrations` + Alembic |
| Backend infra config | `render.yaml` (IaC) | In repo; secret VALUES are not — keep an encrypted copy in a password manager |
| Frontend env | Vercel project settings (`NEXT_PUBLIC_*`) | Non-secret; also in `.env.production` |

## Restore: database

1. Download the latest dump: GitHub → Actions → **Weekly DB Backup** → latest run → artifact.
2. Create a fresh Postgres database (same provider or any Postgres 15+).
3. Restore:
   ```bash
   pg_restore --no-owner --no-privileges -d "postgresql://USER:PASS@HOST/DBNAME" abo-db-YYYYMMDD.dump
   ```
4. If restoring schema-only from scratch instead: set `DATABASE_URL`, then run `alembic upgrade head` from `backend/`.
5. Point Render env `DATABASE_URL` at the new database → **Manual Deploy**.

## Restore: services

1. Backend: Render → New → Blueprint → select the repo (`render.yaml` recreates the service). Re-enter all `sync: false` secrets from the password-manager copy.
2. Frontend: Vercel → import repo → set `NEXT_PUBLIC_*` vars → deploy.
3. DNS: `aboenterprise.com` → Vercel; `api.aboenterprise.com` → Render (if changed).

## Verify after restore

- `GET https://<api>/health/db` → `{"database": "connected"}`
- Admin login works; orders list loads
- Place a test order end-to-end
- Admin → Analytics → "Test GA4 Connection" → green

## Secrets inventory (values in password manager, names here)

`DATABASE_URL, SECRET_KEY, ADMIN_EMAIL, ADMIN_PASSWORD, SMTP_PASSWORD, ADMIN_NOTIFY_EMAIL, BUSINESS_EMAIL, WHATSAPP_NUMBER, CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET, BKASH_*, NAGAD_*, SSLCOMMERZ_*, GA4_PROPERTY_ID, GA4_CLIENT_EMAIL, GA4_PRIVATE_KEY, SENTRY_DSN, BACKUP_DATABASE_URL (GitHub secret)`

## Test log

| Date | Tested by | Result | Time taken |
|---|---|---|---|
| _(run one rehearsal and record it here)_ | | | |
