#!/usr/bin/env bash
set -euo pipefail

echo "=== Aegis AI X - Initial Setup ==="

cd "$(dirname "$0")/../.."

# Create .env from example
if [ ! -f .env ]; then
    cp .env.example .env
    echo "[OK] Created .env from .env.example"
    echo "     Please edit .env with your configuration."
else
    echo "[SKIP] .env already exists"
fi

# Install Python dependencies
echo "[...] Installing Python dependencies"
pip install -e ".[dev]"
echo "[OK] Python dependencies installed"

# Install pre-commit hooks
if command -v pre-commit &> /dev/null; then
    pre-commit install
    echo "[OK] Pre-commit hooks installed"
fi

# Start infrastructure
echo "[...] Starting infrastructure services"
docker compose up -d postgres redis mongodb qdrant
echo "[OK] Infrastructure services started"

# Wait for PostgreSQL
echo "[...] Waiting for PostgreSQL"
until docker compose exec -T postgres pg_isready -U aegis 2>/dev/null; do
    sleep 1
done
echo "[OK] PostgreSQL is ready"

# Run migrations
echo "[...] Running database migrations"
docker compose exec -T postgres psql -U aegis -d aegis_ai -f /dev/stdin < database/migrations/postgresql/001_initial_schema.sql 2>/dev/null || true
echo "[OK] Migrations complete"

echo ""
echo "=== Setup Complete ==="
echo "Run 'make dev' to start all services."
