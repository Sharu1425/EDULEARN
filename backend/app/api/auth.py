from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from typing import Optional, Dict, Any
import jwt
from jwt import InvalidTokenError
from datetime import datetime, timedelta

from ..db import get_db
from ..schemas.schemas import UserCreate, UserLogin, UserResponse
from ..models.models import UserModel
from ..utils.auth_utils import create_access_token, verify_token

router = APIRouter()
security = HTTPBearer()

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# In-memory session storage (in production, use Redis or database)
sessions = {}

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[str]:
    """Get current user ID from JWT token"""
    try:
        print(f"[DEBUG] Verifying token...")
        payload = verify_token(credentials.credentials)
        user_id = payload.get("sub")
        if user_id is None:
            print("[ERROR] No user_id in token payload")
            raise HTTPException(status_code=401, detail="Invalid token")
        print(f"[SUCCESS] Token verified for user: {user_id}")
        return str(user_id)  # Ensure it's a string
    except (jwt.InvalidTokenError, ValueError) as e:
        print(f"[ERROR] JWT verification failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        print(f"[ERROR] Unexpected error in token verification: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """Get current user information from JWT token"""
    try:
        print(f"[DEBUG] Getting current user from token...")
        payload = verify_token(credentials.credentials)
        user_id = payload.get("sub")
        email = payload.get("email")
        role = payload.get("role", "student")
        
        if user_id is None:
            print("[ERROR] No user_id in token payload")
            raise HTTPException(status_code=401, detail="Invalid token")
        
        print(f"[SUCCESS] User info retrieved: {user_id}, role: {role}")
        return {
            "id": user_id,
            "email": email,
            "role": role
        }
    except (jwt.InvalidTokenError, ValueError) as e:
        print(f"[ERROR] JWT verification failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        print(f"[ERROR] Unexpected error in token verification: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/register")
async def register_user(user_data: UserCreate):
    """Register a new user"""
    try:
        print(f"[SECURE] [REGISTER] Starting registration for email: {user_data.email}")
        
        # Get database connection
        try:
            db = await get_db()
            print(f"[SUCCESS] [REGISTER] Database connection successful")
        except Exception as db_error:
            print(f"[ERROR] [REGISTER] Database connection failed: {str(db_error)}")
            raise HTTPException(
                status_code=500, 
                detail="Unable to connect to the database. Please try again later."
            )
        
        # Check if user already exists
        existing_user = await db.users.find_one({"email": user_data.email})
        if existing_user:
            print(f"[ERROR] [REGISTER] User already exists: {user_data.email}")
            raise HTTPException(
                status_code=400, 
                detail="User already exists. Please login instead."
            )
        print(f"[SUCCESS] [REGISTER] No existing user found")
        
        # Hash password
        try:
            hashed_password = UserModel.hash_password(user_data.password)
            print(f"[SUCCESS] [REGISTER] Password hashed successfully")
        except Exception as hash_error:
            print(f"[ERROR] [REGISTER] Password hashing failed: {str(hash_error)}")
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
            print(f"[SUCCESS] [REGISTER] User inserted with ID: {result.inserted_id}")
        except Exception as insert_error:
            print(f"[ERROR] [REGISTER] Database insert failed: {str(insert_error)}")
            raise HTTPException(
                status_code=500, 
                detail="Unable to save your account. Please try again."
            )
        
        # Create access token with role information
        try:
            access_token = create_access_token(
                data={
                    "sub": str(result.inserted_id), 
                    "email": user_data.email,
                    "role": user_data.role or "student"
                }
            )
            print(f"[SUCCESS] [REGISTER] Access token created successfully")
        except Exception as token_error:
            print(f"[ERROR] [REGISTER] Token creation failed: {str(token_error)}")
            raise HTTPException(
                status_code=500, 
                detail="Account created but unable to log you in. Please try logging in."
            )
        
        print(f"[SUCCESS] [REGISTER] Registration successful for user: {user_data.email}")
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
        print(f"[ERROR] [REGISTER] Unexpected error: {str(e)}")
        print(f"[ERROR] [REGISTER] Error type: {type(e).__name__}")
        import traceback
        print(f"[ERROR] [REGISTER] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500, 
            detail="Registration failed. Please try again later."
        )

@router.post("/login")
async def login_user(user_data: UserLogin):
    """Login with email and password"""
    try:
        db = await get_db()
        
        # Find user by email
        user = await db.users.find_one({"email": user_data.email})
        if not user:
            print(f"[ERROR] [LOGIN] Failed login attempt for email: {user_data.email}")
            raise HTTPException(status_code=401, detail="No account found with this email. Please check your email or create an account.")
        
        # Verify password
        if not UserModel.verify_password(user_data.password, user["password_hash"]):
            print(f"[ERROR] [LOGIN] Invalid password for user: {user_data.email}")
            raise HTTPException(status_code=401, detail="Incorrect password. Please try again.")
        
        # Create access token with role information
        access_token = create_access_token(
            data={
                "sub": str(user["_id"]), 
                "email": user["email"],
                "role": user.get("role", "student")
            }
        )
        
        print(f"[SUCCESS] [LOGIN] User logged in successfully: {user_data.email}")
        
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
        print(f"[ERROR] [LOGIN] Error during login: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Login failed. Please try again later."
        )






@router.post("/logout")
async def logout():
    """Logout user"""
    return {
        "success": True,
        "message": "Logged out successfully"
    }

@router.get("/status")
async def auth_status(user_id: Optional[str] = Depends(get_current_user_id)):
    """Check authentication status"""
    print(f"[DEBUG] Auth status check for user_id: {user_id}")
    
    if not user_id:
        print("[ERROR] No user_id provided")
        return {
            "isAuthenticated": False,
            "user": None
        }
    
    try:
        db = await get_db()
        from bson import ObjectId
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            print(f"[ERROR] User not found in database: {user_id}")
            return {
                "isAuthenticated": False,
                "user": None
            }
        
        print(f"[SUCCESS] User authenticated: {user.get('email', 'Unknown')}")
        return {
            "isAuthenticated": True,
            "user": {
                "id": str(user["_id"]),
                "email": user["email"],
                "username": user.get("username"),
                "name": user.get("name"),
                "profile_picture": user.get("profile_picture"),
                "role": user.get("role", "student"),
                "is_admin": user.get("is_admin", False),
                "wallet_address": user.get("wallet_address", None),
                "credits": user.get("credits", 0.0)
            }
        }
    except Exception as e:
        print(f"[ERROR] Error in auth status: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 
