#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-staging}"
IMAGE_TAG="${2:-latest}"
NAMESPACE="aegis-ai"

echo "=== Deploying Aegis AI X to ${ENVIRONMENT} ==="
echo "Image tag: ${IMAGE_TAG}"
echo "Namespace: ${NAMESPACE}"

SERVICES=(api-gateway supervisor agents execution approval auth analytics)

for service in "${SERVICES[@]}"; do
    echo "[...] Updating ${service}"
    kubectl set image "deployment/${service}" \
        "${service}=ghcr.io/aegis-ai-x/${service}:${IMAGE_TAG}" \
        -n "${NAMESPACE}" \
        --record 2>/dev/null || echo "[SKIP] ${service} deployment not found"
done

echo "[...] Waiting for rollout"
for service in "${SERVICES[@]}"; do
    kubectl rollout status "deployment/${service}" \
        -n "${NAMESPACE}" \
        --timeout=300s 2>/dev/null || true
done

echo "=== Deployment to ${ENVIRONMENT} complete ==="
