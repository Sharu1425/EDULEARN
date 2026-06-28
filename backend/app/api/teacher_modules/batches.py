from datetime import timezone
"""
Teacher Batch Management
Handles batch creation, deletion, and management operations
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel
from ...db import get_db
from ...dependencies import require_teacher_or_admin
from ...models.models import UserModel

router = APIRouter(tags=["teacher-batches"])

# Batch Response Models
class BatchCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None

class BatchResponse(BaseModel):
    success: bool
    batch_id: str
    message: str

class BatchOverviewResponse(BaseModel):
    id: str
    name: str
    student_count: int
    created_at: str
    status: str

@router.get("/batches", response_model=List[BatchOverviewResponse])
async def get_batch_overview(current_user: UserModel = Depends(require_teacher_or_admin)):
    """Get overview of all batches for the teacher"""
    try:
        db = await get_db()
        
        print(f"[DEBUG] [TEACHER] Getting batches for teacher: {current_user.id}")
        
        # Get batches created by the teacher
        batches = await db.batches.find({
            "teacher_id": str(current_user.id)
        }).sort("created_at", -1).to_list(length=None)
        
        print(f"[DEBUG] [TEACHER] Found {len(batches)} batches")
        
        # Format response
        batch_overviews = []
        for batch in batches:
            # Count students in this batch
            student_count = await db.users.count_documents({
                "batch_id": batch["_id"],
                "role": "student"
            })
            
            batch_overviews.append(BatchOverviewResponse(
                id=str(batch["_id"]),
                name=batch["name"],
                student_count=student_count,
                created_at=batch["created_at"].isoformat(),
                status=batch.get("status", "active")
            ))
        
        print(f"[SUCCESS] [TEACHER] Returning {len(batch_overviews)} batch overviews")
        return batch_overviews
        
    except Exception as e:
        print(f"[ERROR] [TEACHER] Error getting batch overview: {str(e)}")
        import traceback
        print(f"[ERROR] [TEACHER] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get batch overview: {str(e)}"
        )

@router.post("/batches", response_model=BatchResponse)
async def create_batch(
    batch_data: BatchCreateRequest,
    current_user: UserModel = Depends(require_teacher_or_admin)
):
    """Create a new batch"""
    try:
        db = await get_db()
        
        print(f"[DEBUG] [TEACHER] Creating batch: {batch_data.name}")
        print(f"[DEBUG] [TEACHER] Teacher ID: {current_user.id}")
        
        # Validation
        if not batch_data.name or not batch_data.name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Batch name cannot be empty"
            )
        
        if len(batch_data.name) > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Batch name must be less than 100 characters"
            )
        
        # Check for duplicate batch name for this teacher
        existing_batch = await db.batches.find_one({
            "name": batch_data.name.strip(),
            "teacher_id": current_user.id
        })
        
        if existing_batch:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"You already have a batch named '{batch_data.name}'"
            )
        
        # Create batch document
        batch_doc = {
            "name": batch_data.name.strip(),
            "description": batch_data.description.strip() if batch_data.description else "",
            "teacher_id": current_user.id,
            "created_at": datetime.now(timezone.utc),
            "status": "active",
            "student_ids": []
        }
        
        print(f"[DEBUG] [TEACHER] Batch document: {batch_doc}")
        
        # Insert batch
        result = await db.batches.insert_one(batch_doc)
        batch_id = str(result.inserted_id)
        
        print(f"[SUCCESS] [TEACHER] Created batch '{batch_data.name}' with ID: {batch_id}")
        
        return BatchResponse(
            success=True,
            batch_id=batch_id,
            message=f"Batch '{batch_data.name}' created successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] [TEACHER] Error creating batch: {str(e)}")
        import traceback
        print(f"[ERROR] [TEACHER] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create batch: {str(e)}"
        )

@router.put("/batches/{batch_id}")
async def update_batch(
    batch_id: str,
    batch_data: BatchCreateRequest,
    current_user: UserModel = Depends(require_teacher_or_admin)
):
    """Update a batch"""
    try:
        db = await get_db()
        
        print(f"[DEBUG] [TEACHER] Updating batch: {batch_id}")
        
        # Convert batch_id to ObjectId for MongoDB query
        try:
            batch_object_id = ObjectId(batch_id)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid batch ID format"
            )
        
        # Check if batch exists and belongs to teacher
        batch = await db.batches.find_one({
            "_id": batch_object_id,
            "teacher_id": current_user.id
        })
        
        if not batch:
            print(f"[ERROR] [TEACHER] Batch {batch_id} not found or not owned by teacher {current_user.id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found or you don't have permission to update this batch"
            )
        
        print(f"[SUCCESS] [TEACHER] Found batch: {batch['name']}")
        
        # Update batch
        update_data = {
            "name": batch_data.name,
            "description": batch_data.description,
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.batches.update_one(
            {"_id": batch_object_id},
            {"$set": update_data}
        )
        
        # Update batch_name for all students in this batch
        await db.users.update_many(
            {"batch_id": batch_object_id},
            {"$set": {"batch_name": batch_data.name}}
        )
        
        print(f"[SUCCESS] [TEACHER] Updated batch '{batch_data.name}'")
        
        return BatchResponse(
            success=True,
            batch_id=batch_id,
            message=f"Batch updated to '{batch_data.name}' successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] [TEACHER] Error updating batch: {str(e)}")
        import traceback
        print(f"[ERROR] [TEACHER] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update batch: {str(e)}"
        )

@router.delete("/batches/{batch_id}")
async def delete_batch(batch_id: str, current_user: UserModel = Depends(require_teacher_or_admin)):
    """Delete a batch"""
    try:
        db = await get_db()
        
        print(f"[DEBUG] [TEACHER] Deleting batch: {batch_id}")
        
        # Convert batch_id to ObjectId for MongoDB query
        try:
            batch_object_id = ObjectId(batch_id)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid batch ID format"
            )
        
        # Check if batch exists and belongs to teacher
        batch = await db.batches.find_one({
            "_id": batch_object_id,
            "teacher_id": current_user.id
        })
        
        if not batch:
            print(f"[ERROR] [TEACHER] Batch {batch_id} not found or not owned by teacher {current_user.id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found or you don't have permission to delete this batch"
            )
        
        print(f"[SUCCESS] [TEACHER] Found batch: {batch['name']}")
        
        # Remove batch_id from all students in this batch
        await db.users.update_many(
            {"batch_id": batch_object_id},
            {"$unset": {"batch_id": "", "batch_name": ""}}
        )
        
        # Delete the batch
        await db.batches.delete_one({"_id": batch_object_id})
        
        print(f"[SUCCESS] [TEACHER] Deleted batch '{batch['name']}' and removed from all students")
        
        return {"success": True, "message": f"Batch '{batch['name']}' deleted successfully"}
        
    except Exception as e:
        print(f"[ERROR] [TEACHER] Error deleting batch: {str(e)}")
        import traceback
        print(f"[ERROR] [TEACHER] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete batch: {str(e)}"
        )

@router.get("/batches/{batch_id}/students")
async def get_batch_students(batch_id: str, current_user: UserModel = Depends(require_teacher_or_admin)):
    """Get all students in a specific batch"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(batch_id):
            raise HTTPException(status_code=400, detail="Invalid batch ID")
        
        # Verify batch belongs to teacher
        batch = await db.batches.find_one({
            "_id": ObjectId(batch_id),
            "teacher_id": str(current_user.id)
        })
        
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        
        # Get students in this batch
        students = await db.users.find({
            "batch_ids": batch_id,
            "role": "student"
        }).to_list(length=None)
        
        # Format student data
        student_list = []
        for student in students:
            student_list.append({
                "id": str(student["_id"]),
                "name": student.get("username", student.get("email", "Unknown")),
                "email": student["email"],
                "level": student.get("level", 1),
                "xp": student.get("xp", 0),
                "last_activity": student.get("last_activity", datetime.now(timezone.utc)).isoformat(),
                "completed_assessments": student.get("completed_assessments", 0),
                "average_score": student.get("average_score", 0)
            })
        
        return {
            "batch_id": batch_id,
            "batch_name": batch["name"],
            "student_count": len(student_list),
            "students": student_list
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/batches/{batch_id}/analytics")
async def get_batch_analytics(batch_id: str, current_user: UserModel = Depends(require_teacher_or_admin)):
    """Get analytics for a specific batch"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(batch_id):
            raise HTTPException(status_code=400, detail="Invalid batch ID")
        
        # Verify batch belongs to teacher
        batch = await db.batches.find_one({
            "_id": ObjectId(batch_id),
            "teacher_id": str(current_user.id)
        })
        
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        
        # Get students in this batch
        students = await db.users.find({
            "batch_id": ObjectId(batch_id),
            "role": "student"
        }).to_list(length=None)
        
        student_ids = [str(student["_id"]) for student in students]
        
        # Get submissions from these students
        submissions = await db.assessment_submissions.find({
            "student_id": {"$in": student_ids}
        }).to_list(length=None)
        
        # Calculate analytics
        total_students = len(students)
        total_submissions = len(submissions)
        
        if total_submissions > 0:
            average_performance = sum(sub["percentage"] for sub in submissions) / total_submissions
            high_performers = len([s for s in submissions if s["percentage"] >= 80])
            low_performers = len([s for s in submissions if s["percentage"] < 60])
        else:
            average_performance = 0
            high_performers = 0
            low_performers = 0
        
        # Get recent activity with student names
        recent_submissions = sorted(submissions, key=lambda x: x.get("submitted_at", datetime.now(timezone.utc)), reverse=True)[:5]
        
        recent_activity = []
        for sub in recent_submissions:
            # Get student name
            student_name = "Unknown"
            student_id = sub.get("student_id")
            if student_id:
                try:
                    if isinstance(student_id, str):
                        student_id = ObjectId(student_id) if ObjectId.is_valid(student_id) else student_id
                    student = await db.users.find_one({"_id": student_id})
                    if student:
                        student_name = student.get("full_name") or student.get("username") or student.get("email", "Unknown")
                except:
                    pass
            
            # Handle submitted_at
            submitted_at = sub.get("submitted_at", datetime.now(timezone.utc))
            if hasattr(submitted_at, 'isoformat'):
                submitted_at_str = submitted_at.isoformat()
            else:
                submitted_at_str = str(submitted_at)
            
            recent_activity.append({
                "student_name": student_name,
                "percentage": sub.get("percentage", 0),
                "submitted_at": submitted_at_str
            })
        
        return {
            "batch_id": batch_id,
            "batch_name": batch["name"],
            "total_students": total_students,
            "total_submissions": total_submissions,
            "average_performance": round(average_performance, 2),
            "high_performers": high_performers,
            "low_performers": low_performers,
            "recent_activity": recent_activity
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] [BATCH ANALYTICS] Error: {str(e)}")
        import traceback
        print(f"[ERROR] [BATCH ANALYTICS] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
