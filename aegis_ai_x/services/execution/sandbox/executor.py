"""Sandboxed code execution using Docker containers."""

from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field
from typing import Any

import docker
from docker.errors import ContainerError, ImageNotFound

from libs.monitoring.logger import get_logger

logger = get_logger("sandbox-executor")

# Language-specific Docker images
LANGUAGE_IMAGES = {
    "python": "python:3.11-slim",
    "node": "node:20-slim",
    "go": "golang:1.21-alpine",
    "rust": "rust:1.74-slim",
    "java": "openjdk:21-slim",
}

# Resource limits
DEFAULT_LIMITS = {
    "mem_limit": "256m",
    "cpu_period": 100000,
    "cpu_quota": 50000,  # 50% of one CPU
    "network_disabled": True,
    "pids_limit": 100,
}


@dataclass
class ExecutionResult:
    """Result of a sandboxed code execution."""

    exit_code: int
    stdout: str
    stderr: str
    duration_ms: int = 0
    language: str = ""
    container_id: str = ""
    timed_out: bool = False
    error: str | None = None


class SandboxExecutor:
    """Executes code in isolated Docker containers."""

    def __init__(self, timeout: int = 30) -> None:
        self.timeout = timeout
        try:
            self.client = docker.from_env()
        except docker.errors.DockerException:
            logger.warning("Docker not available - sandbox execution disabled")
            self.client = None

    async def execute(
        self,
        code: str,
        language: str = "python",
        stdin_data: str = "",
        env_vars: dict[str, str] | None = None,
        timeout: int | None = None,
    ) -> ExecutionResult:
        """Execute code in a sandboxed container."""
        if not self.client:
            return ExecutionResult(
                exit_code=-1,
                stdout="",
                stderr="Docker not available",
                error="Docker not available",
            )

        image = LANGUAGE_IMAGES.get(language)
        if not image:
            return ExecutionResult(
                exit_code=-1,
                stdout="",
                stderr=f"Unsupported language: {language}",
                error=f"Unsupported language: {language}",
            )

        timeout = timeout or self.timeout
        container_name = f"aegis-sandbox-{uuid.uuid4().hex[:12]}"

        # Build the execution command
        cmd = self._build_command(code, language)

        try:
            # Pull image if needed
            try:
                self.client.images.get(image)
            except ImageNotFound:
                logger.info("pulling_image", image=image)
                self.client.images.pull(image)

            # Run in container
            import time
            start = time.time()

            container = self.client.containers.run(
                image=image,
                command=cmd,
                name=container_name,
                detach=True,
                environment=env_vars or {},
                **DEFAULT_LIMITS,
            )

            try:
                result = container.wait(timeout=timeout)
                exit_code = result["StatusCode"]
                stdout = container.logs(stdout=True, stderr=False).decode("utf-8", errors="replace")
                stderr = container.logs(stdout=False, stderr=True).decode("utf-8", errors="replace")
                timed_out = False
            except Exception:
                container.kill()
                exit_code = -1
                stdout = ""
                stderr = "Execution timed out"
                timed_out = True

            duration_ms = int((time.time() - start) * 1000)

            return ExecutionResult(
                exit_code=exit_code,
                stdout=stdout[:10000],  # Limit output size
                stderr=stderr[:10000],
                duration_ms=duration_ms,
                language=language,
                container_id=container.id,
                timed_out=timed_out,
            )

        except ContainerError as e:
            return ExecutionResult(
                exit_code=e.exit_status,
                stdout="",
                stderr=str(e),
                error=str(e),
            )
        except Exception as e:
            logger.error("sandbox_execution_error", error=str(e))
            return ExecutionResult(
                exit_code=-1,
                stdout="",
                stderr=str(e),
                error=str(e),
            )
        finally:
            # Cleanup container
            try:
                container = self.client.containers.get(container_name)
                container.remove(force=True)
            except Exception:
                pass

    @staticmethod
    def _build_command(code: str, language: str) -> list[str]:
        """Build the execution command for the given language."""
        if language == "python":
            return ["python", "-c", code]
        elif language == "node":
            return ["node", "-e", code]
        elif language == "go":
            return ["sh", "-c", f'echo \'{code}\' > /tmp/main.go && go run /tmp/main.go']
        elif language == "rust":
            return ["sh", "-c", f'echo \'{code}\' > /tmp/main.rs && rustc /tmp/main.rs -o /tmp/main && /tmp/main']
        elif language == "java":
            return ["sh", "-c", f'echo \'{code}\' > /tmp/Main.java && javac /tmp/Main.java && java -cp /tmp Main']
        else:
            return ["sh", "-c", code]
