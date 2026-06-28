from datetime import timezone
"""
Teacher Student Management
Handles student addition, removal, and management operations
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel, EmailStr
from ...db import get_db
from ...dependencies import require_teacher_or_admin
from ...models.models import UserModel
import re

router = APIRouter(tags=["teacher-students"])

# Helper function for email validation
def validate_email(email: str) -> bool:
    """Validate email format"""
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(email_pattern, email) is not None

# Student Response Models
class StudentAddRequest(BaseModel):
    email: str
    name: Optional[str] = None
    batch_id: str

class StudentAddResponse(BaseModel):
    success: bool
    message: str
    student_id: Optional[str] = None

class StudentRemoveRequest(BaseModel):
    student_id: str
    batch_id: str

class StudentRemoveResponse(BaseModel):
    success: bool
    message: str

class BulkAssignRequest(BaseModel):
    student_ids: List[str]
    batch_id: str

class BulkAssignResponse(BaseModel):
    success: bool
    message: str
    assigned_count: int
    failed_count: int
    failed_students: List[str]

class StudentPerformanceResponse(BaseModel):
    id: str
    name: str
    email: str
    batch_name: str
    level: int
    xp: int
    completed_assessments: int
    average_score: float
    last_activity: str

@router.get("/students")
async def get_students(
    batch_id: Optional[str] = None,
    current_user: UserModel = Depends(require_teacher_or_admin)
):
    """Get students for the teacher, optionally filtered by batch"""
    try:
        db = await get_db()
        
        print(f"[DEBUG] [TEACHER] Getting students for teacher: {current_user.id}")
        
        # Build query
        query = {"role": "student"}
        
        if batch_id:
            if not ObjectId.is_valid(batch_id):
                raise HTTPException(status_code=400, detail="Invalid batch ID")
            
            # Verify batch belongs to teacher
            batch = await db.batches.find_one({
                "_id": ObjectId(batch_id),
                "teacher_id": str(current_user.id)
            })
            
            if not batch:
                raise HTTPException(status_code=404, detail="Batch not found")
            
            # Query students in this batch
            query["batch_ids"] = batch_id
        else:
            # Get all batches for this teacher
            teacher_batches = await db.batches.find({
                "teacher_id": str(current_user.id)
            }).to_list(length=None)
            
            if not teacher_batches:
                return []  # No batches, no students
            
            batch_ids = [str(batch["_id"]) for batch in teacher_batches]
            query["batch_ids"] = {"$in": batch_ids}
        
        # Get students
        students = await db.users.find(query).to_list(length=None)
        
        print(f"[DEBUG] [TEACHER] Found {len(students)} students")
        
        # Format response
        student_list = []
        for student in students:
            # Get batch names (multi-batch support)
            batch_ids = student.get("batch_ids", [])
            batch_names = []
            
            for batch_id in batch_ids:
                try:
                    if ObjectId.is_valid(batch_id):
                        batch = await db.batches.find_one({"_id": ObjectId(batch_id)})
                    else:
                        batch = await db.batches.find_one({"_id": batch_id})
                    if batch:
                        batch_names.append(batch["name"])
                except:
                    pass
            
            student_list.append({
                "id": str(student["_id"]),
                "name": student.get("username", student.get("email", "Unknown")),
                "email": student["email"],
                "batch_ids": batch_ids,
                "batch_names": batch_names,
                "batch_name": ", ".join(batch_names) if batch_names else "Unassigned",  # Backward compatibility
                "level": student.get("level", 1),
                "xp": student.get("xp", 0),
                "badges": student.get("badges", []),
                "completed_assessments": student.get("completed_assessments", 0),
                "average_score": student.get("average_score", 0),
                "last_activity": student.get("last_activity", datetime.now(timezone.utc)).isoformat(),
                "created_at": student["created_at"].isoformat()
            })
        
        print(f"[SUCCESS] [TEACHER] Returning {len(student_list)} students")
        return student_list
        
    except Exception as e:
        print(f"[ERROR] [TEACHER] Error getting students: {str(e)}")
        import traceback
        print(f"[ERROR] [TEACHER] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get students: {str(e)}"
        )

@router.get("/students/performance", response_model=List[StudentPerformanceResponse])
async def get_student_performance(
    batch_id: Optional[str] = None,
    current_user: UserModel = Depends(require_teacher_or_admin)
):
    """Get student performance data"""
    try:
        db = await get_db()
        
        # Build query for students
        query = {"role": "student"}
        
        if batch_id:
            if not ObjectId.is_valid(batch_id):
                raise HTTPException(status_code=400, detail="Invalid batch ID")
            
            # Verify batch belongs to teacher
            batch = await db.batches.find_one({
                "_id": ObjectId(batch_id),
                "teacher_id": str(current_user.id)
            })
            
            if not batch:
                raise HTTPException(status_code=404, detail="Batch not found")
            
            query["batch_id"] = ObjectId(batch_id)
        else:
            # Get all batches for this teacher
            teacher_batches = await db.batches.find({
                "teacher_id": str(current_user.id)
            }).to_list(length=None)
            
            batch_ids = [batch["_id"] for batch in teacher_batches]
            if batch_ids:
                query["batch_id"] = {"$in": batch_ids}
            else:
                return []
        
        # Get students
        students = await db.users.find(query).to_list(length=None)
        
        # Format performance data
        performance_data = []
        for student in students:
            # Get batch name
            batch_name = "Unassigned"
            if student.get("batch_id"):
                batch = await db.batches.find_one({"_id": student["batch_id"]})
                if batch:
                    batch_name = batch["name"]
            
            performance_data.append(StudentPerformanceResponse(
                id=str(student["_id"]),
                name=student.get("username", student.get("email", "Unknown")),
                email=student["email"],
                batch_name=batch_name,
                level=student.get("level", 1),
                xp=student.get("xp", 0),
                completed_assessments=student.get("completed_assessments", 0),
                average_score=student.get("average_score", 0),
                last_activity=student.get("last_activity", datetime.now(timezone.utc)).isoformat()
            ))
        
        return performance_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/students/add", response_model=StudentAddResponse)
async def add_student_to_batch(
    student_data: StudentAddRequest,
    current_user: UserModel = Depends(require_teacher_or_admin)
):
    """Add a student to a batch"""
    try:
        db = await get_db()
        
        print(f"[DEBUG] [TEACHER] Adding student {student_data.email} to batch {student_data.batch_id}")
        
        # Validate email format
        if not validate_email(student_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email format"
            )
        
        # Convert batch_id to ObjectId for MongoDB query
        try:
            batch_object_id = ObjectId(student_data.batch_id)
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
            print(f"[ERROR] [TEACHER] Batch {student_data.batch_id} not found or not owned by teacher {current_user.id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found or you don't have permission to add students to this batch"
            )
        
        print(f"[SUCCESS] [TEACHER] Found batch: {batch['name']}")
        
        # Check if student exists
        student = await db.users.find_one({"email": student_data.email, "role": "student"})
        
        if not student:
            # Create new student if they don't exist
            student_doc = {
                "email": student_data.email,
                "username": student_data.name or student_data.email.split("@")[0],
                "role": "student",
                "batch_id": batch_object_id,
                "batch_name": batch["name"],
                "password_hash": "temp_password",  # Will be set when they first login
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
                "level": 1,
                "xp": 0,
                "badges": [],
                "completed_assessments": 0,
                "average_score": 0
            }
            
            result = await db.users.insert_one(student_doc)
            student_id = str(result.inserted_id)
            
            # Add student to batch's student_ids array
            await db.batches.update_one(
                {"_id": batch_object_id},
                {"$addToSet": {"student_ids": student_id}}
            )
            
            # Create notification for the new student
            notification = {
                "student_id": student_id,
                "type": "batch_assignment",
                "title": f"Added to Batch: {batch['name']}",
                "message": f"You have been added to batch '{batch['name']}' by {current_user.username or 'your teacher'}. Welcome to the class!",
                "batch_id": batch_object_id,
                "teacher_id": ObjectId(current_user.id),
                "created_at": datetime.now(timezone.utc),
                "is_read": False,
                "priority": "normal"
            }
            await db.notifications.insert_one(notification)
            
            print(f"[SUCCESS] [TEACHER] Created new student '{student_data.email}' and added to batch '{batch['name']}'")
            print(f"[SUCCESS] [TEACHER] Notification sent to student about batch assignment")
            
            return StudentAddResponse(
                success=True,
                message=f"New student created and added to batch '{batch['name']}'",
                student_id=student_id
            )
        else:
            # Update existing student's batch
            await db.users.update_one(
                {"_id": student["_id"]},
                {
                    "$set": {
                        "batch_id": ObjectId(student_data.batch_id),
                        "batch_name": batch["name"],
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            # Add student to batch's student_ids array
            await db.batches.update_one(
                {"_id": ObjectId(student_data.batch_id)},
                {"$addToSet": {"student_ids": str(student["_id"])}}
            )
            
            # Create notification for the existing student
            notification = {
                "user_id": student["_id"],
                "type": "batch_assignment",
                "title": f"Added to Batch: {batch['name']}",
                "message": f"You have been added to batch '{batch['name']}' by {current_user.username or 'your teacher'}. Welcome to the class!",
                "batch_id": ObjectId(student_data.batch_id),
                "teacher_id": ObjectId(current_user.id),
                "created_at": datetime.now(timezone.utc),
                "is_read": False,
                "priority": "normal"
            }
            await db.notifications.insert_one(notification)
            
            print(f"[SUCCESS] [TEACHER] Added existing student '{student_data.email}' to batch '{batch['name']}'")
            print(f"[SUCCESS] [TEACHER] Notification sent to student about batch assignment")
            
            return StudentAddResponse(
                success=True,
                message=f"Student added to batch '{batch['name']}'",
                student_id=str(student["_id"])
            )
        
    except Exception as e:
        print(f"[ERROR] [TEACHER] Error adding student to batch: {str(e)}")
        import traceback
        print(f"[ERROR] [TEACHER] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add student to batch: {str(e)}"
        )

@router.post("/students/remove", response_model=StudentRemoveResponse)
async def remove_student_from_batch(
    student_data: StudentRemoveRequest,
    current_user: UserModel = Depends(require_teacher_or_admin)
):
    """Remove a student from a batch"""
    try:
        db = await get_db()
        
        print(f"[DEBUG] [TEACHER] Removing student {student_data.student_id} from batch {student_data.batch_id}")
        
        # Convert IDs to ObjectId
        try:
            student_object_id = ObjectId(student_data.student_id)
            batch_object_id = ObjectId(student_data.batch_id)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid ID format"
            )
        
        # Check if batch exists and belongs to teacher
        batch = await db.batches.find_one({
            "_id": batch_object_id,
            "teacher_id": current_user.id
        })
        
        if not batch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found or you don't have permission to remove students from this batch"
            )
        
        # Check if student exists
        student = await db.users.find_one({
            "_id": student_object_id,
            "role": "student"
        })
        
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        
        # Check if student is in this batch
        student_batch_ids = student.get("batch_ids", [])
        if student_data.batch_id not in student_batch_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student is not in this batch"
            )
        
        # Remove student from batch
        await db.users.update_one(
            {"_id": student_object_id},
            {"$pull": {"batch_ids": student_data.batch_id}}
        )
        
        # Remove student from batch's student_ids array
        await db.batches.update_one(
            {"_id": batch_object_id},
            {"$pull": {"student_ids": student_data.student_id}}
        )
        
        print(f"[SUCCESS] [TEACHER] Removed student '{student.get('email', 'Unknown')}' from batch '{batch['name']}'")
        
        return StudentRemoveResponse(
            success=True,
            message=f"Student removed from batch '{batch['name']}'"
        )
        
    except Exception as e:
        print(f"[ERROR] [TEACHER] Error removing student from batch: {str(e)}")
        import traceback
        print(f"[ERROR] [TEACHER] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove student from batch: {str(e)}"
        )

@router.post("/students/assign-batch", response_model=BulkAssignResponse)
async def assign_students_to_batch(
    assignment_data: BulkAssignRequest,
    current_user: UserModel = Depends(require_teacher_or_admin)
):
    """Assign multiple students to a batch"""
    try:
        db = await get_db()
        
        print(f"[DEBUG] [TEACHER] Bulk assigning {len(assignment_data.student_ids)} students to batch {assignment_data.batch_id}")
        
        # Convert batch_id to ObjectId
        try:
            batch_object_id = ObjectId(assignment_data.batch_id)
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
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found or you don't have permission to assign students to this batch"
            )
        
        assigned_count = 0
        failed_count = 0
        failed_students = []
        
        # Process each student
        for student_id in assignment_data.student_ids:
            try:
                # Convert student_id to ObjectId
                try:
                    student_object_id = ObjectId(student_id)
                except:
                    failed_count += 1
                    failed_students.append(f"{student_id} (invalid ID)")
                    continue
                
                # Get student
                student = await db.users.find_one({
                    "_id": student_object_id,
                    "role": "student"
                })
                
                if not student:
                    failed_count += 1
                    failed_students.append(f"{student_id} (not found)")
                    continue
                
                # Add student to batch (multi-batch support)
                await db.users.update_one(
                    {"_id": student_object_id},
                    {
                        "$addToSet": {
                            "batch_ids": assignment_data.batch_id  # Add to array, prevents duplicates
                        },
                        "$set": {
                            "batch_name": batch["name"],  # Keep for backward compatibility
                            "updated_at": datetime.now(timezone.utc)
                        }
                    }
                )
                
                # Add student to batch's student_ids array (if not already present)
                await db.batches.update_one(
                    {"_id": batch_object_id},
                    {"$addToSet": {"student_ids": student_id}}
                )
                
                # Create notification for the student
                notification = {
                    "user_id": student_object_id,
                    "type": "batch_assignment",
                    "title": f"Added to Batch: {batch['name']}",
                    "message": f"You have been added to batch '{batch['name']}' by {current_user.username or 'your teacher'}. Welcome to the class!",
                    "batch_id": batch_object_id,
                    "teacher_id": ObjectId(current_user.id),
                    "created_at": datetime.now(timezone.utc),
                    "is_read": False,
                    "priority": "normal"
                }
                await db.notifications.insert_one(notification)
                
                assigned_count += 1
                print(f"[SUCCESS] [TEACHER] Assigned student {student.get('email', student_id)} to batch '{batch['name']}'")
                
            except Exception as e:
                failed_count += 1
                failed_students.append(f"{student_id} (error: {str(e)})")
                print(f"[ERROR] [TEACHER] Failed to assign student {student_id}: {str(e)}")
                continue
        
        message = f"Successfully assigned {assigned_count} student(s) to batch '{batch['name']}'"
        if failed_count > 0:
            message += f". {failed_count} student(s) failed."
        
        print(f"[SUCCESS] [TEACHER] Bulk assignment complete: {assigned_count} success, {failed_count} failed")
        
        return BulkAssignResponse(
            success=True,
            message=message,
            assigned_count=assigned_count,
            failed_count=failed_count,
            failed_students=failed_students
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] [TEACHER] Error in bulk assignment: {str(e)}")
        import traceback
        print(f"[ERROR] [TEACHER] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign students to batch: {str(e)}"
        )

@router.get("/students/{student_id}/detailed-report")
async def get_student_detailed_report(
    student_id: str,
    current_user: UserModel = Depends(require_teacher_or_admin)
):
    """Get detailed report for a specific student"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(student_id):
            raise HTTPException(status_code=400, detail="Invalid student ID")
        
        # Get student
        student = await db.users.find_one({
            "_id": ObjectId(student_id),
            "role": "student"
        })
        
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Verify student is in teacher's batch
        if student.get("batch_id"):
            batch = await db.batches.find_one({
                "_id": student["batch_id"],
                "teacher_id": str(current_user.id)
            })
            
            if not batch:
                raise HTTPException(status_code=403, detail="Access denied")
        else:
            batch = None
        
        # Get student's submissions
        submissions = await db.assessment_submissions.find({
            "student_id": student_id
        }).sort("submitted_at", -1).to_list(length=None)
        
        # Get teacher assessment results
        teacher_submissions = await db.teacher_assessment_results.find({
            "student_id": student_id
        }).sort("submitted_at", -1).to_list(length=None)
        
        # Calculate statistics
        all_submissions = submissions + teacher_submissions
        
        if all_submissions:
            avg_percentage = sum(sub["percentage"] for sub in all_submissions) / len(all_submissions)
            total_questions = sum(sub["total_questions"] for sub in all_submissions)
            total_score = sum(sub["score"] for sub in all_submissions)
        else:
            avg_percentage = 0
            total_questions = 0
            total_score = 0
        
        return {
            "student_info": {
                "id": student_id,
                "name": student.get("username", student.get("email", "Unknown")),
                "email": student["email"],
                "batch_name": batch["name"] if batch else "Unassigned",
                "level": student.get("level", 1),
                "xp": student.get("xp", 0),
                "badges": student.get("badges", []),
                "created_at": student["created_at"].isoformat(),
                "last_activity": student.get("last_activity", datetime.now(timezone.utc)).isoformat()
            },
            "statistics": {
                "total_assessments": len(all_submissions),
                "average_percentage": round(avg_percentage, 2),
                "total_questions_answered": total_questions,
                "total_score": total_score,
                "streak": student.get("streak", 0),
                "longest_streak": student.get("longest_streak", 0)
            },
            "recent_submissions": [
                {
                    "assessment_id": sub["assessment_id"],
                    "score": sub["score"],
                    "percentage": sub["percentage"],
                    "time_taken": sub["time_taken"],
                    "submitted_at": sub["submitted_at"].isoformat()
                }
                for sub in all_submissions[:10]
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
