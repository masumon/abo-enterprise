# Aegis AI X - Deployment Script (Windows PowerShell)
# Usage: .\scripts\deployment\deploy.ps1 [-Environment staging] [-ImageTag latest]

param(
    [string]$Environment = "staging",
    [string]$ImageTag = "latest"
)

$ErrorActionPreference = "Stop"
$Namespace = "aegis-ai"

Write-Host "=== Deploying Aegis AI X to $Environment ===" -ForegroundColor Cyan
Write-Host "Image tag: $ImageTag"
Write-Host "Namespace: $Namespace"

$services = @("api-gateway", "supervisor", "agents", "execution", "approval", "auth", "analytics")

foreach ($service in $services) {
    Write-Host "[...] Updating $service" -ForegroundColor Yellow
    try {
        kubectl set image "deployment/$service" `
            "${service}=ghcr.io/aegis-ai-x/${service}:$ImageTag" `
            -n $Namespace --record
    } catch {
        Write-Host "[SKIP] $service deployment not found" -ForegroundColor Yellow
    }
}

Write-Host "[...] Waiting for rollout" -ForegroundColor Yellow
foreach ($service in $services) {
    try {
        kubectl rollout status "deployment/$service" `
            -n $Namespace --timeout=300s
    } catch {
        Write-Host "[WARN] $service rollout status check failed" -ForegroundColor Yellow
    }
}

Write-Host "=== Deployment to $Environment complete ===" -ForegroundColor Cyan
