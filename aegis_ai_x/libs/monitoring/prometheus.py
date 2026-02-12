"""Prometheus metrics collection for all services."""

from __future__ import annotations

from prometheus_client import Counter, Histogram, Gauge, Info


class MetricsCollector:
    """Centralized metrics collector using Prometheus client."""

    def __init__(self, service_name: str) -> None:
        self.service_name = service_name
        prefix = service_name.replace("-", "_")

        # HTTP metrics
        self.http_requests_total = Counter(
            f"{prefix}_http_requests_total",
            "Total HTTP requests",
            ["method", "endpoint", "status_code"],
        )
        self.http_request_duration = Histogram(
            f"{prefix}_http_request_duration_seconds",
            "HTTP request duration in seconds",
            ["method", "endpoint"],
            buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
        )

        # LLM metrics
        self.llm_requests_total = Counter(
            f"{prefix}_llm_requests_total",
            "Total LLM API requests",
            ["provider", "model"],
        )
        self.llm_request_duration = Histogram(
            f"{prefix}_llm_request_duration_seconds",
            "LLM request duration in seconds",
            ["provider", "model"],
        )
        self.llm_tokens_total = Counter(
            f"{prefix}_llm_tokens_total",
            "Total LLM tokens used",
            ["provider", "model", "token_type"],
        )

        # Agent metrics
        self.agent_tasks_total = Counter(
            f"{prefix}_agent_tasks_total",
            "Total agent tasks processed",
            ["agent_type", "status"],
        )
        self.agent_task_duration = Histogram(
            f"{prefix}_agent_task_duration_seconds",
            "Agent task duration in seconds",
            ["agent_type"],
        )
        self.active_agents = Gauge(
            f"{prefix}_active_agents",
            "Number of currently active agents",
            ["agent_type"],
        )

        # System metrics
        self.service_info = Info(
            f"{prefix}_service",
            "Service information",
        )

    def record_http_request(
        self, method: str, endpoint: str, status_code: int, duration: float
    ) -> None:
        self.http_requests_total.labels(method, endpoint, str(status_code)).inc()
        self.http_request_duration.labels(method, endpoint).observe(duration)

    def record_llm_request(
        self,
        provider: str,
        model: str,
        duration: float,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
    ) -> None:
        self.llm_requests_total.labels(provider, model).inc()
        self.llm_request_duration.labels(provider, model).observe(duration)
        if prompt_tokens:
            self.llm_tokens_total.labels(provider, model, "prompt").inc(prompt_tokens)
        if completion_tokens:
            self.llm_tokens_total.labels(provider, model, "completion").inc(completion_tokens)

    def record_agent_task(
        self, agent_type: str, status: str, duration: float
    ) -> None:
        self.agent_tasks_total.labels(agent_type, status).inc()
        self.agent_task_duration.labels(agent_type).observe(duration)
