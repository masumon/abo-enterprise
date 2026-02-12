"""Distributed tracing using OpenTelemetry."""

from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Generator

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.resources import Resource


class Tracer:
    """Distributed tracing wrapper around OpenTelemetry."""

    def __init__(self, service_name: str, jaeger_endpoint: str = "") -> None:
        self.service_name = service_name
        resource = Resource.create({"service.name": service_name})
        provider = TracerProvider(resource=resource)

        if jaeger_endpoint:
            try:
                from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

                exporter = OTLPSpanExporter(endpoint=jaeger_endpoint)
                provider.add_span_processor(BatchSpanProcessor(exporter))
            except ImportError:
                pass

        trace.set_tracer_provider(provider)
        self._tracer = trace.get_tracer(service_name)

    @contextmanager
    def span(self, name: str, attributes: dict[str, Any] | None = None) -> Generator[Any, None, None]:
        """Create a tracing span."""
        with self._tracer.start_as_current_span(name) as span:
            if attributes:
                for key, value in attributes.items():
                    span.set_attribute(key, str(value))
            yield span

    def get_tracer(self) -> trace.Tracer:
        return self._tracer
