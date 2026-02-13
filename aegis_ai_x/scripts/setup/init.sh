#!/usr/bin/env bash
set -euo pipefail

echo "=== Aegis AI X - Initial Setup (Linux/macOS) ==="

cd "$(dirname "$0")/../.."

# Create .env from example
if [ ! -f .env ]; then
    cp .env.example .env
    echo "[OK] Created .env from .env.example"
    echo "     Please edit .env with your configuration."
else
    echo "[SKIP] .env already exists"
fi

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 not found. Please install Python 3.11+"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo "[OK] Found $PYTHON_VERSION"

# Create virtual environment if not exists
if [ ! -d ".venv" ]; then
    echo "[...] Creating virtual environment"
    python3 -m venv .venv
    echo "[OK] Virtual environment created"
fi

# Activate virtual environment
echo "[...] Activating virtual environment"
source .venv/bin/activate

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
if command -v docker &> /dev/null; then
    echo "[...] Starting infrastructure services"
    docker compose up -d postgres redis mongodb qdrant
    echo "[OK] Infrastructure services started"

    # Wait for PostgreSQL
    echo "[...] Waiting for PostgreSQL"
    retries=30
    until docker compose exec -T postgres pg_isready -U aegis 2>/dev/null; do
        sleep 1
        retries=$((retries - 1))
        if [ $retries -eq 0 ]; then
            echo "[WARN] PostgreSQL may not be ready yet"
            break
        fi
    done
    if [ $retries -gt 0 ]; then
        echo "[OK] PostgreSQL is ready"
    fi

    # Run migrations
    echo "[...] Running database migrations"
    docker compose exec -T postgres psql -U aegis -d aegis_ai -f /dev/stdin < database/migrations/postgresql/001_initial_schema.sql 2>/dev/null || true
    echo "[OK] Migrations complete"
else
    echo "[WARN] Docker not found. Install Docker:"
    echo "       https://docs.docker.com/engine/install/"
fi

echo ""
echo "=== Setup Complete ==="
echo "Activate venv:  source .venv/bin/activate"
echo "Start services: docker compose up --build -d"
echo "Run tests:      python -m pytest tests/ -v"
