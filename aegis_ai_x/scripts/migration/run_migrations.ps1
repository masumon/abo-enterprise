# Aegis AI X - Database Migrations (Windows PowerShell)
# Run with: powershell -ExecutionPolicy Bypass -File scripts\migration\run_migrations.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== Running Database Migrations ===" -ForegroundColor Cyan

Set-Location (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent)

$env:PGPASSWORD = if ($env:POSTGRES_PASSWORD) { $env:POSTGRES_PASSWORD } else { "aegis_dev" }
$pgHost = if ($env:POSTGRES_HOST) { $env:POSTGRES_HOST } else { "localhost" }
$pgPort = if ($env:POSTGRES_PORT) { $env:POSTGRES_PORT } else { "5432" }
$pgUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "aegis" }
$pgDb = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "aegis_ai" }

# PostgreSQL migrations
Write-Host "[...] Running PostgreSQL migrations" -ForegroundColor Yellow
Get-Content "database\migrations\postgresql\001_initial_schema.sql" | `
    docker compose exec -T postgres psql -U $pgUser -d $pgDb
Write-Host "[OK] PostgreSQL migrations complete" -ForegroundColor Green

# MongoDB migrations
Write-Host "[...] Running MongoDB index creation" -ForegroundColor Yellow
$mongoHost = if ($env:MONGO_HOST) { $env:MONGO_HOST } else { "localhost" }
$mongoPort = if ($env:MONGO_PORT) { $env:MONGO_PORT } else { "27017" }

docker compose exec -T mongodb mongosh --eval "$(Get-Content 'database\migrations\mongodb\001_initial_indexes.js' -Raw)" 2>$null
Write-Host "[OK] MongoDB indexes created" -ForegroundColor Green

Write-Host "=== All migrations complete ===" -ForegroundColor Cyan
