"""
Prometheus metrics middleware for EDULEARN backend.
Tracks: request count, latency histogram, active requests gauge.
"""
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
import time

# ── Metrics ──────────────────────────────────────────────────────────────────

REQUEST_COUNT = Counter(
    "app_request_count_total",
    "Total number of HTTP requests",
    ["method", "endpoint", "status_code"]
)

REQUEST_LATENCY = Histogram(
    "app_request_latency_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

ACTIVE_REQUESTS = Gauge(
    "app_active_requests",
    "Number of HTTP requests currently being processed"
)


# ── Middleware ────────────────────────────────────────────────────────────────

class MetricsMiddleware:
    """ASGI middleware that auto-instruments every request with Prometheus metrics."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "UNKNOWN")
        path = scope.get("path", "/")

        # Collapse dynamic segments to avoid high cardinality
        # e.g. /api/users/abc123 → /api/users/{id}
        endpoint = self._normalize_path(path)

        ACTIVE_REQUESTS.inc()
        start = time.perf_counter()
        status_code = 500  # default if something crashes

        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message.get("status", 500)
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            elapsed = time.perf_counter() - start
            ACTIVE_REQUESTS.dec()
            REQUEST_COUNT.labels(method=method, endpoint=endpoint, status_code=str(status_code)).inc()
            REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(elapsed)

    @staticmethod
    def _normalize_path(path: str) -> str:
        """Replace UUIDs and ObjectIds in paths with {id} to reduce cardinality."""
        import re
        # Replace MongoDB ObjectIDs (24 hex chars)
        path = re.sub(r"/[0-9a-fA-F]{24}", "/{id}", path)
        # Replace UUIDs
        path = re.sub(r"/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "/{id}", path)
        # Replace pure numeric IDs
        path = re.sub(r"/\d+", "/{id}", path)
        return path
