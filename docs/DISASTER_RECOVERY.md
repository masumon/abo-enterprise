# Disaster Recovery Runbook — ABO Enterprise

**Goal:** restore the full platform after data loss or provider failure.
**RPO target:** ≤ 1 day (daily encrypted dump, Admin → ডাটাবেস Backup) · **RTO target:** ≤ 4 hours.

## What lives where

| Asset | Location | Backup |
|---|---|---|
| Database (orders, customers, CMS) | Postgres (`DATABASE_URL` on Render) | Admin → **ডাটাবেস Backup** (`/sumon/backup`): daily + manual encrypted `pg_dump` to the owner's drives (Google Drive / OneDrive / Dropbox / S3 / WebDAV) or download to PC. Supabase free has no managed backups. GitHub Actions "Daily DB Backup" is an optional extra (needs a working GitHub billing account). |
| Media (product/blog images) | Cloudinary | Managed by Cloudinary; URLs + metadata in `media_assets` table |
| Code & schema | GitHub (`masumon/abo-enterprise`) | Git history; schema = `backend/migrations` + Alembic |
| Backend infra config | `render.yaml` (IaC) | In repo; secret VALUES are not — keep an encrypted copy in a password manager |
| Frontend env | Vercel project settings (`NEXT_PUBLIC_*`) | Non-secret; also in `.env.production` |

## Restore: database

**Always test first:** Admin → ডাটাবেস Backup → history → “যাচাই / Restore পরীক্ষা” restores into a separate
test database (e.g. a second free Supabase project) and compares every table's row count. The system refuses
the production database there.

Real (production) restore — only with the owner's explicit decision, by hand:

1. Get the newest verified `.abobak` file (from the drive's “ABO Backups”/Apps folder, or the PC download).
2. Decrypt it offline (needs only the file + Backup password):
   ```bash
   cd backend && python scripts/decrypt_backup.py abo-db-YYYY-MM-DD_HHMM-auto.abobak
   ```
   It must print “dump checksum matches”.
3. Take one more fresh backup of the current database first (Admin → “এখনই Backup নিন”), if it is still reachable.
4. Restore into a fresh/empty database (same provider or any Postgres of the same major version, use the
   Supabase **session pooler, port 5432**):
   ```bash
   pg_restore --no-owner --no-privileges --clean --if-exists -d "postgresql://USER:PASS@HOST:5432/postgres" abo-db-….dump
   ```
5. Point Render env `DATABASE_URL` at the restored database → **Manual Deploy** → run the checks below.

Limits: the dump covers the app's `public` schema (all app tables). Supabase-internal schemas (auth, storage)
are not used by this app. Single tables can be restored with `pg_restore -t <table>`, but foreign keys
(orders → customers, items → orders) mean related tables usually have to come back together.

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
