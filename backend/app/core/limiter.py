"""
Shared rate limiter instance.

Defined in its own module so routers can apply per-route limits
(`@limiter.limit(...)`) without importing from `main` (which would be circular).
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
