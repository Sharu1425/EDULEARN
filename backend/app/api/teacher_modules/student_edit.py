from datetime import timezone
"""
Student Edit Endpoints for Teachers
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from bson import ObjectId
from datetime import datetime

from ...models.models import UserModel
from ...db import get_db
from ...auth import require_teacher_or_admin

router = APIRouter()


class StudentUpdateRequest(BaseModel):
    student_id: str
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    batch_ids: Optional[List[str]] = None


class StudentUpdateResponse(BaseModel):
    success: bool
    message: str
    student: dict


class StudentDetailsResponse(BaseModel):
    id: str
    name: str
    email: str
    batch_ids: List[str]
    batch_names: List[str]
    level: int
    xp: int
    badges: List[str]
    completed_assessments: int
    average_score: float
    last_activity: str
    created_at: str


@router.get("/students/{student_id}")
async def get_student_details(
    student_id: str,
    current_user: UserModel = Depends(require_teacher_or_admin)
):
    """Get details for a specific student"""
    try:
        db = await get_db()
        
        # Validate student ID
        if not ObjectId.is_valid(student_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid student ID"
            )
        
        # Get student
        student = await db.users.find_one({
            "_id": ObjectId(student_id),
            "role": "student"
        })
        
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        
        # Get batch names
        batch_ids = student.get("batch_ids", [])
        batch_names = []
        for batch_id in batch_ids:
            try:
                batch = await db.batches.find_one({"_id": ObjectId(batch_id) if ObjectId.is_valid(batch_id) else batch_id})
                if batch:
                    batch_names.append(batch["name"])
            except:
                pass
        
        return {
            "id": str(student["_id"]),
            "name": student.get("username", student.get("full_name", "Unknown")),
            "email": student.get("email", ""),
            "batch_ids": batch_ids,
            "batch_names": batch_names,
            "level": student.get("level", 1),
            "xp": student.get("xp", 0),
            "badges": student.get("badges", []),
            "completed_assessments": student.get("completed_assessments", 0),
            "average_score": student.get("average_score", 0.0),
            "last_activity": student.get("last_activity", datetime.now(timezone.utc)).isoformat() if hasattr(student.get("last_activity", datetime.now(timezone.utc)), 'isoformat') else str(student.get("last_activity", "")),
            "created_at": student.get("created_at", datetime.now(timezone.utc)).isoformat() if hasattr(student.get("created_at", datetime.now(timezone.utc)), 'isoformat') else str(student.get("created_at", ""))
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] [TEACHER] Error getting student details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get student details: {str(e)}"
        )


@router.put("/students/edit")
async def update_student(
    update_data: StudentUpdateRequest,
    current_user: UserModel = Depends(require_teacher_or_admin)
):
    """Update student information"""
    try:
        db = await get_db()
        
        print(f"[DEBUG] [TEACHER] Updating student {update_data.student_id}")
        
        # Validate student exists
        try:
            student_object_id = ObjectId(update_data.student_id)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid student ID format"
            )
        
        student = await db.users.find_one({
            "_id": student_object_id,
            "role": "student"
        })
        
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        
        # Build update document
        update_doc = {}
        
        if update_data.name is not None:
            update_doc["username"] = update_data.name
            update_doc["full_name"] = update_data.name
        
        if update_data.email is not None:
            # Check if email is already used by another user
            existing_user = await db.users.find_one({
                "email": update_data.email,
                "_id": {"$ne": student_object_id}
            })
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already in use"
                )
            update_doc["email"] = update_data.email
        
        if update_data.batch_ids is not None:
            # Validate all batches belong to current teacher
            for batch_id in update_data.batch_ids:
                if not ObjectId.is_valid(batch_id):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid batch ID: {batch_id}"
                    )
                
                batch = await db.batches.find_one({
                    "_id": ObjectId(batch_id),
                    "teacher_id": str(current_user.id)
                })
                
                if not batch:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Batch {batch_id} not found or you don't have permission"
                    )
            
            # Get old batch_ids to update batch documents
            old_batch_ids = student.get("batch_ids", [])
            
            # Remove student from old batches that are not in new list
            for old_batch_id in old_batch_ids:
                if old_batch_id not in update_data.batch_ids:
                    await db.batches.update_one(
                        {"_id": ObjectId(old_batch_id) if ObjectId.is_valid(old_batch_id) else old_batch_id},
                        {"$pull": {"student_ids": update_data.student_id}}
                    )
            
            # Add student to new batches
            for new_batch_id in update_data.batch_ids:
                if new_batch_id not in old_batch_ids:
                    await db.batches.update_one(
                        {"_id": ObjectId(new_batch_id)},
                        {"$addToSet": {"student_ids": update_data.student_id}}
                    )
            
            update_doc["batch_ids"] = update_data.batch_ids
        
        if not update_doc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        update_doc["updated_at"] = datetime.now(timezone.utc)
        
        # Update student
        await db.users.update_one(
            {"_id": student_object_id},
            {"$set": update_doc}
        )
        
        # Get updated student
        updated_student = await db.users.find_one({"_id": student_object_id})
        
        # Get batch names
        batch_names = []
        for batch_id in updated_student.get("batch_ids", []):
            try:
                batch = await db.batches.find_one({"_id": ObjectId(batch_id) if ObjectId.is_valid(batch_id) else batch_id})
                if batch:
                    batch_names.append(batch["name"])
            except:
                pass
        
        print(f"[SUCCESS] [TEACHER] Updated student '{updated_student.get('email')}'")
        
        return StudentUpdateResponse(
            success=True,
            message="Student updated successfully",
            student={
                "id": str(updated_student["_id"]),
                "name": updated_student.get("username", ""),
                "email": updated_student.get("email", ""),
                "batch_ids": updated_student.get("batch_ids", []),
                "batch_names": batch_names
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] [TEACHER] Error updating student: {str(e)}")
        import traceback
        print(f"[ERROR] [TEACHER] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update student: {str(e)}"
        )

