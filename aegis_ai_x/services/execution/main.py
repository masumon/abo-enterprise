"""Execution service FastAPI application."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from libs.config import get_settings
from libs.monitoring.logger import setup_logging
from services.execution.sandbox.executor import SandboxExecutor
from services.execution.kubernetes.executor import KubernetesExecutor

settings = get_settings()
setup_logging("execution-service")

app = FastAPI(title="Aegis AI X - Execution Service", version="1.0.0")

sandbox = SandboxExecutor(timeout=30)
k8s_executor = KubernetesExecutor()


class SandboxRequest(BaseModel):
    code: str
    language: str = "python"
    stdin_data: str = ""
    timeout: int = 30


class K8sJobRequest(BaseModel):
    image: str
    command: list[str]
    name_prefix: str = "aegis-job"
    env_vars: dict[str, str] = {}
    cpu_limit: str = "500m"
    memory_limit: str = "512Mi"
    timeout_seconds: int = 300


@app.post("/execution/sandbox/run")
async def run_sandbox(request: SandboxRequest):
    """Execute code in a sandboxed Docker container."""
    result = await sandbox.execute(
        code=request.code,
        language=request.language,
        stdin_data=request.stdin_data,
        timeout=request.timeout,
    )
    return {
        "exit_code": result.exit_code,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "duration_ms": result.duration_ms,
        "timed_out": result.timed_out,
        "error": result.error,
    }


@app.post("/execution/k8s/create")
async def create_k8s_job(request: K8sJobRequest):
    """Create a Kubernetes job for execution."""
    result = await k8s_executor.create_job(
        image=request.image,
        command=request.command,
        name_prefix=request.name_prefix,
        env_vars=request.env_vars,
        cpu_limit=request.cpu_limit,
        memory_limit=request.memory_limit,
        timeout_seconds=request.timeout_seconds,
    )
    return {
        "job_name": result.job_name,
        "namespace": result.namespace,
        "status": result.status,
        "error": result.error,
    }


@app.get("/execution/k8s/status/{job_name}")
async def get_k8s_job_status(job_name: str):
    """Get the status of a Kubernetes job."""
    result = await k8s_executor.get_job_status(job_name)
    return {
        "job_name": result.job_name,
        "status": result.status,
        "logs": result.logs,
        "error": result.error,
    }


@app.delete("/execution/k8s/{job_name}")
async def delete_k8s_job(job_name: str):
    """Delete a Kubernetes job."""
    success = await k8s_executor.delete_job(job_name)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete job")
    return {"deleted": True}


@app.get("/execution/health")
async def health():
    return {"status": "healthy", "service": "execution"}
