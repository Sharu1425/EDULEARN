"""
FastAPI dependencies for authentication and authorization
Provides role-based access control and user management
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from datetime import datetime

from .core.config import settings
from .core.security import security_manager
from .db import get_db
from .models.models import UserModel
from .schemas.schemas import UserResponse

security = HTTPBearer()

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[str]:
    """Get current user ID from JWT token"""
    try:
        import jwt
        payload = jwt.decode(credentials.credentials, settings.secret_key, algorithms=[settings.algorithm])
        user_id = payload.get("sub")
        if user_id is None:
            return None
        return str(user_id)
    except Exception:
        return None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserModel:
    """Get current authenticated user"""
    try:
        import jwt
        payload = jwt.decode(credentials.credentials, settings.secret_key, algorithms=[settings.algorithm])
        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )

        db = await get_db()

        from bson import ObjectId
        try:
            user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
        except Exception:
            user_doc = await db.users.find_one({"_id": user_id})

        if not user_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        return UserModel(**user_doc)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

def require_role(required_roles: List[str]):
    """Dependency factory for role-based access control"""
    async def role_checker(current_user: UserModel = Depends(get_current_user)) -> UserModel:
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {required_roles}"
            )
        return current_user
    return role_checker

def require_admin(current_user: UserModel = Depends(get_current_user)) -> UserModel:
    """Require admin role"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

def require_teacher_or_admin(current_user: UserModel = Depends(get_current_user)) -> UserModel:
    """Require teacher or admin role"""
    if current_user.role not in ["teacher", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher or admin access required"
        )
    return current_user

def require_student_or_above(current_user: UserModel = Depends(get_current_user)) -> UserModel:
    """Require student, teacher, or admin role"""
    if current_user.role not in ["student", "teacher", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student, teacher, or admin access required"
        )
    return current_user

# Specific permission dependencies
def require_user_management(current_user: UserModel = Depends(require_admin)) -> UserModel:
    """Require user management permissions (Admin only)"""
    return current_user

def require_content_management(current_user: UserModel = Depends(require_teacher_or_admin)) -> UserModel:
    """Require content management permissions (Teacher/Admin)"""
    return current_user

def require_analytics_access(current_user: UserModel = Depends(require_teacher_or_admin)) -> UserModel:
    """Require analytics access (Teacher/Admin)"""
    return current_user

def require_assessment_creation(current_user: UserModel = Depends(require_teacher_or_admin)) -> UserModel:
    """Require assessment creation permissions (Teacher/Admin)"""
    return current_user

def require_batch_management(current_user: UserModel = Depends(require_teacher_or_admin)) -> UserModel:
    """Require batch management permissions (Teacher/Admin)"""
    return current_user

def require_platform_management(current_user: UserModel = Depends(require_admin)) -> UserModel:
    """Require platform management permissions (Admin only)"""
    return current_user

# Optional authentication (for endpoints that work with or without auth)
async def get_optional_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[UserModel]:
    """Get current user if authenticated, None otherwise"""
    try:
        if not credentials:
            return None
        return await get_current_user(credentials)
    except:
        return None

# Role-based access control dependencies
async def require_teacher(current_user: UserModel = Depends(get_current_user)) -> UserModel:
    """Require teacher role"""
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher access required"
        )
    return current_user

async def require_student(current_user: UserModel = Depends(get_current_user)) -> UserModel:
    """Require student role"""
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student access required"
        )
    return current_user

async def require_assessment_creation_dep(current_user: UserModel = Depends(get_current_user)) -> UserModel:
    """Require permission to create assessments (Teacher/Admin)"""
    if current_user.role not in ["teacher", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Assessment creation requires teacher or admin role"
        )
    return current_user