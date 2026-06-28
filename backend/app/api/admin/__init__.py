"""
Admin API Module
Aggregates all admin-related routers
"""
from fastapi import APIRouter
from .users import router as users_router
from .analytics import router as analytics_router
from .content import router as content_router
from .platform import router as platform_router

# Create main router
router = APIRouter()

# Include all sub-routers
router.include_router(users_router)
router.include_router(analytics_router)
router.include_router(content_router)
router.include_router(platform_router)

# Export the main router
__all__ = ["router"]
