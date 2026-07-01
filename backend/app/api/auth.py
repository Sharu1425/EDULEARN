import logging
from fastapi import APIRouter, HTTPException, Depends, Request, Response, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
import jwt
from jwt import InvalidTokenError
from datetime import datetime, timedelta

from ..db import get_db
from ..schemas.schemas import UserCreate, UserLogin, UserResponse
from ..models.models import UserModel
from ..utils.auth_utils import create_access_token, verify_token, create_refresh_token, verify_refresh_token
from ..core.config import settings
from ..core.limiter import limiter

logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer()

# In-memory session storage (in production, use Redis or database)
sessions = {}


async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[str]:
    """Get current user ID from JWT token"""
    try:
        payload = verify_token(credentials.credentials)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return str(user_id)
    except (jwt.InvalidTokenError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """Get current user information from JWT token"""
    try:
        payload = verify_token(credentials.credentials)
        user_id = payload.get("sub")
        email = payload.get("email")
        role = payload.get("role", "student")

        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        return {"id": user_id, "email": email, "role": role}
    except (jwt.InvalidTokenError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/register")
@limiter.limit("5/minute")
async def register_user(request: Request, response: Response, user_data: UserCreate):
    """Register a new user"""
    try:
        logger.info("[REGISTER] Starting registration")

        # Get database connection
        try:
            db = await get_db()
        except Exception as db_error:
            logger.error("[REGISTER] Database connection failed: %s", db_error)
            raise HTTPException(
                status_code=500,
                detail="Unable to connect to the database. Please try again later."
            )

        # Check if user already exists
        existing_user = await db.users.find_one({"email": user_data.email})
        if existing_user:
            logger.info("[REGISTER] Registration attempted with existing email")
            raise HTTPException(
                status_code=400,
                detail="User already exists. Please login instead."
            )

        # Hash password
        try:
            hashed_password = UserModel.hash_password(user_data.password)
        except Exception as hash_error:
            logger.error("[REGISTER] Password hashing failed: %s", hash_error)
            raise HTTPException(
                status_code=500,
                detail="Unable to process your password. Please try again."
            )

        # Create user document
        user_doc = {
            "username": user_data.username,
            "email": user_data.email,
            "password_hash": hashed_password,
            "is_admin": user_data.role == "admin",
            "role": user_data.role or "student",
            "google_id": user_data.google_id,
            "name": user_data.name,
            "profile_picture": user_data.profile_picture,
            "face_descriptor": None
        }

        # Insert user into database
        try:
            result = await db.users.insert_one(user_doc)
            user_doc["_id"] = result.inserted_id
        except Exception as insert_error:
            logger.error("[REGISTER] Database insert failed: %s", insert_error)
            raise HTTPException(
                status_code=500,
                detail="Unable to save your account. Please try again."
            )

        # Grant signup bonus credits (non-blocking — registration succeeds even if this fails)
        try:
            from ..services import credits_service
            await credits_service.add_credits(str(result.inserted_id), 200, "signup_bonus")
        except Exception as credits_error:
            logger.warning("[REGISTER] Signup bonus failed (non-fatal): %s", credits_error)

        # Create access token and refresh token with role information
        try:
            token_data = {
                "sub": str(result.inserted_id),
                "email": user_data.email,
                "role": user_data.role or "student"
            }
            access_token = create_access_token(data=token_data)
            refresh_token = create_refresh_token(data=token_data)
            
            # Set refresh token in HTTP-only cookie
            response.set_cookie(
                key="refresh_token",
                value=refresh_token,
                httponly=True,
                secure=True, # Should be True in production (HTTPS)
                samesite="lax",
                max_age=7 * 24 * 60 * 60 # 7 days
            )
        except Exception as token_error:
            logger.error("[REGISTER] Token creation failed: %s", token_error)
            raise HTTPException(
                status_code=500,
                detail="Account created but unable to log you in. Please try logging in."
            )

        logger.info("[REGISTER] Registration successful for user %s", result.inserted_id)

        return {
            "success": True,
            "message": "User registered successfully",
            "access_token": access_token,
            "user": {
                "id": str(result.inserted_id),
                "email": user_data.email,
                "username": user_data.username,
                "name": user_data.name,
                "profile_picture": user_data.profile_picture,
                "role": user_data.role or "student",
                "is_admin": user_data.role == "admin"
            }
        }
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.exception("[REGISTER] Unexpected error: %s", e)
        raise HTTPException(
            status_code=500,
            detail="Registration failed. Please try again later."
        )

@router.post("/login")
@limiter.limit("10/minute")
async def login_user(request: Request, response: Response, user_data: UserLogin):
    """Login with email and password"""
    try:
        db = await get_db()

        # Find user by email
        user = await db.users.find_one({"email": user_data.email})
        if not user:
            logger.info("[LOGIN] Failed login attempt (unknown email)")
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Verify password
        if not UserModel.verify_password(user_data.password, user["password_hash"]):
            logger.info("[LOGIN] Failed login attempt (bad password)")
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Create access token and refresh token with role information
        token_data = {
            "sub": str(user["_id"]),
            "email": user["email"],
            "role": user.get("role", "student")
        }
        access_token = create_access_token(data=token_data)
        refresh_token = create_refresh_token(data=token_data)
        
        # Set refresh token in HTTP-only cookie
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=True, 
            samesite="lax",
            max_age=7 * 24 * 60 * 60 # 7 days
        )

        logger.info("[LOGIN] User %s logged in successfully", user["_id"])

        return {
            "success": True,
            "message": "Login successful",
            "access_token": access_token,
            "user": {
                "id": str(user["_id"]),
                "email": user["email"],
                "username": user.get("username"),
                "name": user.get("name"),
                "profile_picture": user.get("profile_picture"),
                "role": user.get("role", "student"),
                "is_admin": user.get("is_admin", False)
            }
        }
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.exception("[LOGIN] Error during login: %s", e)
        raise HTTPException(
            status_code=500,
            detail="Login failed. Please try again later."
        )


@router.post("/logout")
async def logout(response: Response):
    """Logout user"""
    response.delete_cookie(key="refresh_token", httponly=True, secure=True, samesite="lax")
    return {
        "success": True,
        "message": "Logged out successfully"
    }

@router.post("/refresh")
async def refresh_token(request: Request, response: Response, refresh_token: Optional[str] = Cookie(None)):
    """Refresh access token using refresh token cookie"""
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
    
    try:
        payload = verify_refresh_token(refresh_token)
        user_id = payload.get("sub")
        email = payload.get("email")
        role = payload.get("role", "student")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        db = await get_db()
        from bson import ObjectId
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user or user.get("is_active") is False:
            raise HTTPException(status_code=401, detail="User not found or inactive")
            
        token_data = {
            "sub": str(user["_id"]),
            "email": user["email"],
            "role": user.get("role", "student")
        }
        
        new_access_token = create_access_token(data=token_data)
        # Optionally, we could rotate the refresh token here too, but for now we keep the same valid one
        
        return {
            "success": True,
            "access_token": new_access_token
        }
    except ValueError as e:
        # Token expired or invalid, clear cookie
        response.delete_cookie(key="refresh_token", httponly=True, secure=True, samesite="lax")
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        logger.error("[REFRESH] Token refresh failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to refresh token")

@router.get("/status")
async def auth_status(user_id: Optional[str] = Depends(get_current_user_id)):
    """Check authentication status"""
    if not user_id:
        return {
            "isAuthenticated": False,
            "user": None
        }

    try:
        db = await get_db()
        from bson import ObjectId
        user = await db.users.find_one({"_id": ObjectId(user_id)})

        if not user:
            logger.info("[STATUS] Authenticated token for non-existent user %s", user_id)
            return {
                "isAuthenticated": False,
                "user": None
            }

        return {
            "isAuthenticated": True,
            "user": {
                "id": str(user["_id"]),
                "email": user["email"],
                "username": user.get("username"),
                "name": user.get("name"),
                "profile_picture": user.get("profile_picture"),
                "role": user.get("role", "student"),
                "is_admin": user.get("is_admin", False)
            }
        }
    except Exception as e:
        logger.exception("[STATUS] Error in auth status: %s", e)
        raise HTTPException(status_code=500, detail="Failed to check authentication status")
