# SUMONIX AI - Initial Setup (Windows PowerShell)
# Run with: powershell -ExecutionPolicy Bypass -File scripts\setup\init.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== SUMONIX AI - Initial Setup (Windows) ===" -ForegroundColor Cyan

# Navigate to project root
Set-Location (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent)

# Create .env from example
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "[OK] Created .env from .env.example" -ForegroundColor Green
    Write-Host "     Please edit .env with your configuration." -ForegroundColor Yellow
} else {
    Write-Host "[SKIP] .env already exists" -ForegroundColor Yellow
}

# Check Python
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Python not found. Please install Python 3.11+ from https://python.org" -ForegroundColor Red
    exit 1
}

$pythonVersion = python --version 2>&1
Write-Host "[OK] Found $pythonVersion" -ForegroundColor Green

# Create virtual environment if not exists
if (-not (Test-Path ".venv")) {
    Write-Host "[...] Creating virtual environment" -ForegroundColor Yellow
    python -m venv .venv
    Write-Host "[OK] Virtual environment created" -ForegroundColor Green
}

# Activate virtual environment
Write-Host "[...] Activating virtual environment" -ForegroundColor Yellow
& .\.venv\Scripts\Activate.ps1

# Install Python dependencies
Write-Host "[...] Installing Python dependencies" -ForegroundColor Yellow
pip install -e ".[dev]"
Write-Host "[OK] Python dependencies installed" -ForegroundColor Green

# Install pre-commit hooks
if (Get-Command pre-commit -ErrorAction SilentlyContinue) {
    pre-commit install
    Write-Host "[OK] Pre-commit hooks installed" -ForegroundColor Green
}

# Check Docker
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "[...] Starting infrastructure services" -ForegroundColor Yellow
    docker compose up -d postgres redis mongodb qdrant
    Write-Host "[OK] Infrastructure services started" -ForegroundColor Green

    # Wait for PostgreSQL
    Write-Host "[...] Waiting for PostgreSQL" -ForegroundColor Yellow
    $retries = 30
    while ($retries -gt 0) {
        $result = docker compose exec -T postgres pg_isready -U sumonix 2>&1
        if ($LASTEXITCODE -eq 0) { break }
        Start-Sleep -Seconds 1
        $retries--
    }

    if ($retries -eq 0) {
        Write-Host "[WARN] PostgreSQL may not be ready yet" -ForegroundColor Yellow
    } else {
        Write-Host "[OK] PostgreSQL is ready" -ForegroundColor Green
    }

    # Run migrations
    Write-Host "[...] Running database migrations" -ForegroundColor Yellow
    Get-Content "database\migrations\postgresql\001_initial_schema.sql" | docker compose exec -T postgres psql -U sumonix -d sumonix_ai 2>$null
    Write-Host "[OK] Migrations complete" -ForegroundColor Green
} else {
    Write-Host "[WARN] Docker not found. Install Docker Desktop for Windows." -ForegroundColor Yellow
    Write-Host "       https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host "Activate venv:  .\.venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "Start services: docker compose up --build -d" -ForegroundColor White
Write-Host "Run tests:      python -m pytest tests/ -v" -ForegroundColor White
