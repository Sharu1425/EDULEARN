"""
Admin User Management
Handles user CRUD operations, bulk operations, and user administration
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel
from ...db import get_db
from ...dependencies import require_admin
from ...models.models import UserModel

router = APIRouter(tags=["admin-users"])

# Response Models
class UserActivityResponse(BaseModel):
    user_id: str
    username: str
    email: str
    role: str
    last_login: str
    activity_count: int

class UserDetailsResponse(BaseModel):
    id: str
    name: str
    username: str
    email: str
    role: str
    is_active: bool
    created_at: str
    last_login: str
    profile_data: Dict

@router.get("/users")
async def get_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    role: Optional[str] = Query(None),
    current_user: UserModel = Depends(require_admin)
):
    """Get all users with pagination and filtering"""
    try:
        db = await get_db()
        
        # Build query
        query = {}
        if role:
            query["role"] = role
        
        # Get total count
        total_count = await db.users.count_documents(query)
        
        # Get users with pagination
        users = await db.users.find(query).skip(skip).limit(limit).to_list(length=None)
        
        # Format response
        user_list = []
        for user in users:
            user_list.append({
                "id": str(user["_id"]),
                "username": user["username"],
                "email": user["email"],
                "role": user["role"],
                "is_active": user.get("is_active", True),
                "created_at": user["created_at"].isoformat(),
                "last_login": user.get("last_login", "").isoformat() if user.get("last_login") else None,
                "level": user.get("level", 1),
                "xp": user.get("xp", 0),
                "completed_assessments": user.get("completed_assessments", 0),
                "average_score": user.get("average_score", 0)
            })
        
        return {
            "users": user_list,
            "total_count": total_count,
            "skip": skip,
            "limit": limit,
            "has_more": skip + limit < total_count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users/{user_id}/details", response_model=UserDetailsResponse)
async def get_user_details(
    user_id: str,
    current_user: UserModel = Depends(require_admin)
):
    """Get detailed information about a specific user"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=400, detail="Invalid user ID")
        
        # Get user
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get additional data based on role
        profile_data = {
            "level": user.get("level", 1),
            "xp": user.get("xp", 0),
            "badges": user.get("badges", []),
            "streak": user.get("streak", 0),
            "longest_streak": user.get("longest_streak", 0)
        }
        
        if user["role"] == "student":
            # Get student-specific data
            submissions = await db.assessment_submissions.find({
                "student_id": user_id
            }).to_list(length=None)
            
            teacher_submissions = await db.teacher_assessment_results.find({
                "student_id": user_id
            }).to_list(length=None)
            
            all_submissions = submissions + teacher_submissions
            
            profile_data.update({
                "completed_assessments": len(all_submissions),
                "total_questions_answered": sum(sub.get("total_questions", 0) for sub in all_submissions),
                "average_score": user.get("average_score", 0),
                "batch_name": user.get("batch_name", "Unassigned"),
                "recent_submissions": [
                    {
                        "assessment_id": sub["assessment_id"],
                        "score": sub["score"],
                        "percentage": sub["percentage"],
                        "submitted_at": sub["submitted_at"].isoformat()
                    }
                    for sub in all_submissions[:5]
                ]
            })
        
        elif user["role"] == "teacher":
            # Get teacher-specific data
            batches = await db.batches.find({"teacher_id": user_id}).to_list(length=None)
            assessments = await db.assessments.find({"created_by": user_id}).to_list(length=None)
            teacher_assessments = await db.teacher_assessments.find({"teacher_id": user_id}).to_list(length=None)
            
            profile_data.update({
                "total_batches": len(batches),
                "total_assessments": len(assessments) + len(teacher_assessments),
                "total_students": sum(len(batch.get("student_ids", [])) for batch in batches),
                "batches": [
                    {
                        "id": str(batch["_id"]),
                        "name": batch["name"],
                        "student_count": len(batch.get("student_ids", []))
                    }
                    for batch in batches
                ]
            })
        
        return UserDetailsResponse(
            id=str(user["_id"]),
            name=user.get("full_name") or user.get("username", "Unknown"),
            username=user["username"],
            email=user["email"],
            role=user["role"],
            is_active=user.get("is_active", True),
            created_at=user["created_at"].isoformat(),
            last_login=user.get("last_login", "").isoformat() if user.get("last_login") else None,
            profile_data=profile_data
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/users")
async def create_user(
    user_data: dict,
    current_user: UserModel = Depends(require_admin)
):
    """Create a new user"""
    try:
        db = await get_db()
        
        # Validate required fields
        required_fields = ["email", "username", "role"]
        for field in required_fields:
            if field not in user_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Check if user already exists
        existing_user = await db.users.find_one({"email": user_data["email"]})
        if existing_user:
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        # Create user document
        user_doc = {
            "email": user_data["email"],
            "username": user_data["username"],
            "role": user_data["role"],
            "password_hash": user_data.get("password_hash", "temp_password"),
            "is_active": user_data.get("is_active", True),
            "created_at": datetime.utcnow(),
            "level": 1,
            "xp": 0,
            "badges": [],
            "completed_assessments": 0,
            "average_score": 0
        }
        
        # Add role-specific fields
        if user_data["role"] == "student":
            user_doc.update({
                "batch_id": None,
                "batch_name": None,
                "streak": 0,
                "longest_streak": 0
            })
        elif user_data["role"] == "teacher":
            user_doc.update({
                "profile_picture": user_data.get("profile_picture"),
                "bio": user_data.get("bio")
            })
        
        result = await db.users.insert_one(user_doc)
        
        return {
            "success": True,
            "user_id": str(result.inserted_id),
            "message": f"User '{user_data['username']}' created successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    user_data: dict,
    current_user: UserModel = Depends(require_admin)
):
    """Update user information"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=400, detail="Invalid user ID")
        
        # Check if user exists
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prepare update data
        update_data = {
            "updated_at": datetime.utcnow()
        }
        
        # Update allowed fields
        allowed_fields = ["username", "email", "role", "is_active", "profile_picture", "bio"]
        for field in allowed_fields:
            if field in user_data:
                update_data[field] = user_data[field]
        
        # Update user
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        return {
            "success": True,
            "message": f"User '{user_data.get('username', user['username'])}' updated successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: UserModel = Depends(require_admin)
):
    """Delete a user"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=400, detail="Invalid user ID")
        
        # Prevent admin from deleting themselves
        if str(current_user.id) == user_id:
            raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
        # Check if user exists
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Delete user
        await db.users.delete_one({"_id": ObjectId(user_id)})
        
        # Clean up related data
        if user["role"] == "student":
            # Remove from batches
            await db.batches.update_many(
                {"student_ids": user_id},
                {"$pull": {"student_ids": user_id}}
            )
            
            # Delete submissions
            await db.assessment_submissions.delete_many({"student_id": user_id})
            await db.teacher_assessment_results.delete_many({"student_id": user_id})
            
        elif user["role"] == "teacher":
            # Transfer batches to admin or mark as inactive
            await db.batches.update_many(
                {"teacher_id": user_id},
                {"$set": {"teacher_id": str(current_user.id), "status": "transferred"}}
            )
            
            # Transfer assessments
            await db.assessments.update_many(
                {"created_by": user_id},
                {"$set": {"created_by": str(current_user.id)}}
            )
            
            await db.teacher_assessments.update_many(
                {"teacher_id": user_id},
                {"$set": {"teacher_id": str(current_user.id)}}
            )
        
        # Delete notifications
        await db.notifications.delete_many({
            "$or": [
                {"student_id": user_id},
                {"user_id": user_id}
            ]
        })
        
        return {
            "success": True,
            "message": f"User '{user['username']}' deleted successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/users/bulk-import")
async def bulk_import_users(
    users_data: List[dict],
    current_user: UserModel = Depends(require_admin)
):
    """Bulk import users from CSV or JSON data"""
    try:
        db = await get_db()
        
        if len(users_data) > 1000:
            raise HTTPException(status_code=400, detail="Cannot import more than 1000 users at once")
        
        imported_users = []
        errors = []
        
        for i, user_data in enumerate(users_data):
            try:
                # Validate required fields
                if not user_data.get("email") or not user_data.get("username"):
                    errors.append(f"Row {i+1}: Missing email or username")
                    continue
                
                # Check if user already exists
                existing_user = await db.users.find_one({"email": user_data["email"]})
                if existing_user:
                    errors.append(f"Row {i+1}: User with email {user_data['email']} already exists")
                    continue
                
                # Create user document
                user_doc = {
                    "email": user_data["email"],
                    "username": user_data["username"],
                    "role": user_data.get("role", "student"),
                    "password_hash": "temp_password",
                    "is_active": user_data.get("is_active", True),
                    "created_at": datetime.utcnow(),
                    "level": 1,
                    "xp": 0,
                    "badges": [],
                    "completed_assessments": 0,
                    "average_score": 0
                }
                
                # Add role-specific fields
                if user_doc["role"] == "student":
                    user_doc.update({
                        "batch_id": None,
                        "batch_name": None,
                        "streak": 0,
                        "longest_streak": 0
                    })
                
                result = await db.users.insert_one(user_doc)
                imported_users.append({
                    "id": str(result.inserted_id),
                    "email": user_data["email"],
                    "username": user_data["username"],
                    "role": user_doc["role"]
                })
                
            except Exception as e:
                errors.append(f"Row {i+1}: {str(e)}")
        
        return {
            "success": True,
            "imported_count": len(imported_users),
            "error_count": len(errors),
            "imported_users": imported_users,
            "errors": errors
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users/export")
async def export_users(
    format: str = Query("json", pattern="^(json|csv)$"),
    role: Optional[str] = Query(None),
    current_user: UserModel = Depends(require_admin)
):
    """Export users data"""
    try:
        db = await get_db()
        
        # Build query
        query = {}
        if role:
            query["role"] = role
        
        # Get users
        users = await db.users.find(query).to_list(length=None)
        
        if format == "csv":
            # Generate CSV
            csv_data = "id,username,email,role,is_active,created_at,last_login\n"
            for user in users:
                csv_data += f"{user['_id']},{user['username']},{user['email']},{user['role']},{user.get('is_active', True)},{user['created_at'].isoformat()},{user.get('last_login', '').isoformat() if user.get('last_login') else ''}\n"
            
            return {
                "format": "csv",
                "data": csv_data,
                "count": len(users)
            }
        else:
            # Return JSON
            user_list = []
            for user in users:
                user_list.append({
                    "id": str(user["_id"]),
                    "username": user["username"],
                    "email": user["email"],
                    "role": user["role"],
                    "is_active": user.get("is_active", True),
                    "created_at": user["created_at"].isoformat(),
                    "last_login": user.get("last_login", "").isoformat() if user.get("last_login") else None,
                    "level": user.get("level", 1),
                    "xp": user.get("xp", 0),
                    "completed_assessments": user.get("completed_assessments", 0),
                    "average_score": user.get("average_score", 0)
                })
            
            return {
                "format": "json",
                "data": user_list,
                "count": len(users)
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    password_data: dict,
    current_user: UserModel = Depends(require_admin)
):
    """Reset user password"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=400, detail="Invalid user ID")
        
        # Check if user exists
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Hash new password
        new_password_hash = UserModel.hash_password(password_data.get("new_password", ""))
        
        # Update password
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"password_hash": new_password_hash, "updated_at": datetime.utcnow()}}
        )
        
        return {
            "success": True,
            "message": f"Password reset successfully for user '{user['username']}'"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users/activity", response_model=List[UserActivityResponse])
async def get_user_activity(
    days: int = Query(7, ge=1, le=30),
    current_user: UserModel = Depends(require_admin)
):
    """Get user activity for the last N days"""
    try:
        db = await get_db()
        
        from datetime import timedelta
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Get users with recent activity
        users = await db.users.find({
            "last_login": {"$gte": cutoff_date}
        }).sort("last_login", -1).to_list(length=None)
        
        activity_list = []
        for user in users:
            # Count recent submissions
            submission_count = await db.assessment_submissions.count_documents({
                "student_id": str(user["_id"]),
                "submitted_at": {"$gte": cutoff_date}
            })
            
            teacher_submission_count = await db.teacher_assessment_results.count_documents({
                "student_id": str(user["_id"]),
                "submitted_at": {"$gte": cutoff_date}
            })
            
            total_activity = submission_count + teacher_submission_count
            
            activity_list.append(UserActivityResponse(
                user_id=str(user["_id"]),
                username=user["username"],
                email=user["email"],
                role=user["role"],
                last_login=user.get("last_login", "").isoformat() if user.get("last_login") else None,
                activity_count=total_activity
            ))
        
        return activity_list
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
