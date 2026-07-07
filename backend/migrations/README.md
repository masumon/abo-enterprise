# Migration Policy

This folder is retained for historical SQL snapshots only.

Active schema authority is Alembic:
- Run migrations via `alembic upgrade head`
- Do not execute files in this folder against production databases

Reason:
- Prevent dual-track schema drift between raw SQL and Alembic revisions
- Keep production migration flow deterministic and auditable
