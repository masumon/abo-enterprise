#!/usr/bin/env bash
set -euo pipefail

echo "=== Running Database Migrations ==="

cd "$(dirname "$0")/../.."

# PostgreSQL migrations
echo "[...] Running PostgreSQL migrations"
PGPASSWORD="${POSTGRES_PASSWORD:-aegis_dev}" psql \
    -h "${POSTGRES_HOST:-localhost}" \
    -p "${POSTGRES_PORT:-5432}" \
    -U "${POSTGRES_USER:-aegis}" \
    -d "${POSTGRES_DB:-aegis_ai}" \
    -f database/migrations/postgresql/001_initial_schema.sql

echo "[OK] PostgreSQL migrations complete"

# MongoDB migrations
echo "[...] Running MongoDB index creation"
mongosh \
    "mongodb://${MONGO_USER:-aegis}:${MONGO_PASSWORD:-aegis_dev}@${MONGO_HOST:-localhost}:${MONGO_PORT:-27017}" \
    --eval "use aegis_ai_logs" \
    database/migrations/mongodb/001_initial_indexes.js

echo "[OK] MongoDB indexes created"
echo "=== All migrations complete ==="
