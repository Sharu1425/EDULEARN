"""
API package initialization
Contains all API endpoint routers and configurations
"""
from fastapi import APIRouter
from .auth import router as auth_router
from .users import router as users_router
from .admin import router as admin_router
# Import from teacher.py module file explicitly (not the teacher package folder)
from . import teacher as teacher_module
teacher_router = teacher_module.router
# Import from assessments folder (modular sub-routers) instead of single file
from .assessments import router as assessments_router
from .coding import router as coding_router
from .notifications import router as notifications_router
from .results import router as results_router
from .topics import router as topics_router
from .ai_questions import router as ai_questions_router
from .bulk_students import router as bulk_students_router
from .bulk_teachers import router as bulk_teachers_router
from .test import router as test_router
from .thinktrace import router as thinktrace_router
from .livesession import router as livesession_router
from .web3 import router as web3_router

# Create main API router
api_router = APIRouter(prefix="/api")

# Include all routers directly (no v1 versioning for clarity)
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(admin_router, prefix="/admin", tags=["Admin"])
api_router.include_router(teacher_router, prefix="/teacher", tags=["Teacher"])
api_router.include_router(assessments_router, tags=["Assessments"])
api_router.include_router(coding_router, prefix="/coding", tags=["Coding"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(results_router, prefix="/results", tags=["Results"])
api_router.include_router(topics_router, prefix="/topics", tags=["Topics"])
api_router.include_router(ai_questions_router, prefix="/ai-questions", tags=["AI Questions"])
api_router.include_router(bulk_students_router, prefix="/bulk-students", tags=["Bulk Students"])
api_router.include_router(bulk_teachers_router, prefix="/bulk-teachers", tags=["Bulk Teachers"])
api_router.include_router(test_router, tags=["Test"])
api_router.include_router(thinktrace_router, prefix="/thinktrace", tags=["ThinkTrace"])
api_router.include_router(livesession_router, prefix="/livesession", tags=["LiveSession"])
api_router.include_router(web3_router, prefix="/web3", tags=["Web3 Ledger"])

__all__ = ["api_router"]
