"""Kubernetes-based execution for production workloads."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

from libs.monitoring.logger import get_logger

logger = get_logger("k8s-executor")


@dataclass
class K8sJobResult:
    """Result from a Kubernetes job execution."""

    job_name: str
    namespace: str
    status: str  # succeeded, failed, running
    logs: str = ""
    duration_seconds: int = 0
    error: str | None = None


class KubernetesExecutor:
    """Executes tasks as Kubernetes jobs for production workloads."""

    def __init__(self, namespace: str = "aegis-execution") -> None:
        self.namespace = namespace
        self._k8s_client = None

    def _get_client(self):
        """Lazy-load the Kubernetes client."""
        if self._k8s_client is None:
            try:
                from kubernetes import client, config

                try:
                    config.load_incluster_config()
                except config.ConfigException:
                    config.load_kube_config()

                self._k8s_client = {
                    "batch": client.BatchV1Api(),
                    "core": client.CoreV1Api(),
                }
            except Exception as e:
                logger.warning("Kubernetes not available: %s", e)
        return self._k8s_client

    async def create_job(
        self,
        image: str,
        command: list[str],
        name_prefix: str = "aegis-job",
        env_vars: dict[str, str] | None = None,
        cpu_limit: str = "500m",
        memory_limit: str = "512Mi",
        timeout_seconds: int = 300,
    ) -> K8sJobResult:
        """Create and run a Kubernetes job."""
        k8s = self._get_client()
        if not k8s:
            return K8sJobResult(
                job_name="",
                namespace=self.namespace,
                status="failed",
                error="Kubernetes not available",
            )

        from kubernetes import client

        job_name = f"{name_prefix}-{uuid.uuid4().hex[:8]}"

        # Build environment variables
        env_list = []
        if env_vars:
            env_list = [
                client.V1EnvVar(name=k, value=v) for k, v in env_vars.items()
            ]

        # Create job spec
        job = client.V1Job(
            api_version="batch/v1",
            kind="Job",
            metadata=client.V1ObjectMeta(
                name=job_name,
                namespace=self.namespace,
                labels={"app": "aegis-ai", "component": "execution"},
            ),
            spec=client.V1JobSpec(
                ttl_seconds_after_finished=600,
                active_deadline_seconds=timeout_seconds,
                backoff_limit=0,
                template=client.V1PodTemplateSpec(
                    spec=client.V1PodSpec(
                        restart_policy="Never",
                        containers=[
                            client.V1Container(
                                name="task",
                                image=image,
                                command=command,
                                env=env_list,
                                resources=client.V1ResourceRequirements(
                                    limits={"cpu": cpu_limit, "memory": memory_limit},
                                    requests={"cpu": "100m", "memory": "128Mi"},
                                ),
                            )
                        ],
                    )
                ),
            ),
        )

        try:
            k8s["batch"].create_namespaced_job(namespace=self.namespace, body=job)
            logger.info("k8s_job_created", job_name=job_name)
            return K8sJobResult(
                job_name=job_name,
                namespace=self.namespace,
                status="running",
            )
        except Exception as e:
            logger.error("k8s_job_creation_failed", error=str(e))
            return K8sJobResult(
                job_name=job_name,
                namespace=self.namespace,
                status="failed",
                error=str(e),
            )

    async def get_job_status(self, job_name: str) -> K8sJobResult:
        """Check the status of a Kubernetes job."""
        k8s = self._get_client()
        if not k8s:
            return K8sJobResult(
                job_name=job_name,
                namespace=self.namespace,
                status="failed",
                error="Kubernetes not available",
            )

        try:
            job = k8s["batch"].read_namespaced_job(name=job_name, namespace=self.namespace)
            if job.status.succeeded:
                status = "succeeded"
            elif job.status.failed:
                status = "failed"
            else:
                status = "running"

            # Get logs
            logs = ""
            if status in ("succeeded", "failed"):
                pods = k8s["core"].list_namespaced_pod(
                    namespace=self.namespace,
                    label_selector=f"job-name={job_name}",
                )
                if pods.items:
                    logs = k8s["core"].read_namespaced_pod_log(
                        name=pods.items[0].metadata.name,
                        namespace=self.namespace,
                    )

            return K8sJobResult(
                job_name=job_name,
                namespace=self.namespace,
                status=status,
                logs=logs[:10000],
            )
        except Exception as e:
            return K8sJobResult(
                job_name=job_name,
                namespace=self.namespace,
                status="failed",
                error=str(e),
            )

    async def delete_job(self, job_name: str) -> bool:
        """Delete a completed Kubernetes job."""
        k8s = self._get_client()
        if not k8s:
            return False
        try:
            from kubernetes import client

            k8s["batch"].delete_namespaced_job(
                name=job_name,
                namespace=self.namespace,
                body=client.V1DeleteOptions(propagation_policy="Background"),
            )
            return True
        except Exception as e:
            logger.error("k8s_job_delete_failed", error=str(e))
            return False
