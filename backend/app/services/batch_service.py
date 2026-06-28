from datetime import timezone
"""
Batch Service
Centralized batch management and operations
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from ..db import get_db
from ..services.notification_service import notification_service

class BatchService:
    """Centralized batch service"""
    
    def __init__(self):
        self.db = None
    
    async def initialize(self):
        """Initialize the service with database connection"""
        self.db = await get_db()
    
    async def create_batch(
        self,
        batch_data: dict,
        teacher_id: str
    ):
        """Create a new batch"""
        try:
            if not self.db:
                await self.initialize()
            
            # Create batch document
            batch_doc = {
                "name": batch_data["name"],
                "description": batch_data.get("description", ""),
                "teacher_id": teacher_id,
                "created_at": datetime.now(timezone.utc),
                "status": "active",
                "student_ids": []
            }
            
            result = await self.db.batches.insert_one(batch_doc)
            batch_id = str(result.inserted_id)
            
            print(f"✅ [BATCH] Created batch '{batch_data['name']}' with ID: {batch_id}")
            
            return batch_id
            
        except Exception as e:
            print(f"❌ [BATCH] Failed to create batch: {str(e)}")
            raise e
    
    async def add_student_to_batch(
        self,
        batch_id: str,
        student_email: str,
        teacher_id: str,
        teacher_name: str
    ):
        """Add a student to a batch"""
        try:
            if not self.db:
                await self.initialize()
            
            # Verify batch belongs to teacher
            batch = await self.db.batches.find_one({
                "_id": ObjectId(batch_id),
                "teacher_id": teacher_id
            })
            
            if not batch:
                raise ValueError("Batch not found or access denied")
            
            # Check if student exists
            student = await self.db.users.find_one({
                "email": student_email,
                "role": "student"
            })
            
            if not student:
                # Create new student
                student_doc = {
                    "email": student_email,
                    "username": student_email.split("@")[0],
                    "role": "student",
                    "batch_id": ObjectId(batch_id),
                    "batch_name": batch["name"],
                    "password_hash": "temp_password",
                    "is_active": True,
                    "created_at": datetime.now(timezone.utc),
                    "level": 1,
                    "xp": 0,
                    "badges": [],
                    "completed_assessments": 0,
                    "average_score": 0
                }
                
                result = await self.db.users.insert_one(student_doc)
                student_id = str(result.inserted_id)
                
                # Add student to batch
                await self.db.batches.update_one(
                    {"_id": ObjectId(batch_id)},
                    {"$addToSet": {"student_ids": student_id}}
                )
                
                # Send notification
                await notification_service.send_batch_assignment_notification(
                    student_id, batch["name"], teacher_name
                )
                
                return {
                    "success": True,
                    "student_id": student_id,
                    "action": "created",
                    "message": f"New student created and added to batch '{batch['name']}'"
                }
            else:
                # Update existing student
                await self.db.users.update_one(
                    {"_id": student["_id"]},
                    {
                        "$set": {
                            "batch_id": ObjectId(batch_id),
                            "batch_name": batch["name"],
                            "updated_at": datetime.now(timezone.utc)
                        }
                    }
                )
                
                # Add student to batch
                await self.db.batches.update_one(
                    {"_id": ObjectId(batch_id)},
                    {"$addToSet": {"student_ids": str(student["_id"])}}
                )
                
                # Send notification
                await notification_service.send_batch_assignment_notification(
                    str(student["_id"]), batch["name"], teacher_name
                )
                
                return {
                    "success": True,
                    "student_id": str(student["_id"]),
                    "action": "updated",
                    "message": f"Student added to batch '{batch['name']}'"
                }
                
        except Exception as e:
            print(f"❌ [BATCH] Failed to add student to batch: {str(e)}")
            raise e
    
    async def remove_student_from_batch(
        self,
        batch_id: str,
        student_id: str,
        teacher_id: str
    ):
        """Remove a student from a batch"""
        try:
            if not self.db:
                await self.initialize()
            
            # Verify batch belongs to teacher
            batch = await self.db.batches.find_one({
                "_id": ObjectId(batch_id),
                "teacher_id": teacher_id
            })
            
            if not batch:
                raise ValueError("Batch not found or access denied")
            
            # Check if student is in batch
            student = await self.db.users.find_one({
                "_id": ObjectId(student_id),
                "batch_id": ObjectId(batch_id),
                "role": "student"
            })
            
            if not student:
                raise ValueError("Student not found in this batch")
            
            # Remove student from batch
            await self.db.users.update_one(
                {"_id": ObjectId(student_id)},
                {"$unset": {"batch_id": "", "batch_name": ""}}
            )
            
            # Remove student from batch's student_ids array
            await self.db.batches.update_one(
                {"_id": ObjectId(batch_id)},
                {"$pull": {"student_ids": student_id}}
            )
            
            print(f"✅ [BATCH] Removed student '{student.get('email', 'Unknown')}' from batch '{batch['name']}'")
            
            return {
                "success": True,
                "message": f"Student removed from batch '{batch['name']}'"
            }
            
        except Exception as e:
            print(f"❌ [BATCH] Failed to remove student from batch: {str(e)}")
            raise e
    
    async def get_batch_students(
        self,
        batch_id: str,
        teacher_id: str
    ):
        """Get all students in a batch"""
        try:
            if not self.db:
                await self.initialize()
            
            # Verify batch belongs to teacher
            batch = await self.db.batches.find_one({
                "_id": ObjectId(batch_id),
                "teacher_id": teacher_id
            })
            
            if not batch:
                raise ValueError("Batch not found or access denied")
            
            # Get students in this batch
            students = await self.db.users.find({
                "batch_id": ObjectId(batch_id),
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
            print(f"❌ [BATCH] Failed to get batch students: {str(e)}")
            raise e
    
    async def get_batch_analytics(
        self,
        batch_id: str,
        teacher_id: str
    ):
        """Get analytics for a specific batch"""
        try:
            if not self.db:
                await self.initialize()
            
            # Verify batch belongs to teacher
            batch = await self.db.batches.find_one({
                "_id": ObjectId(batch_id),
                "teacher_id": teacher_id
            })
            
            if not batch:
                raise ValueError("Batch not found or access denied")
            
            # Get students in this batch
            students = await self.db.users.find({
                "batch_id": ObjectId(batch_id),
                "role": "student"
            }).to_list(length=None)
            
            student_ids = [str(student["_id"]) for student in students]
            
            # Get submissions from these students
            submissions = await self.db.assessment_submissions.find({
                "student_id": {"$in": student_ids}
            }).to_list(length=None)
            
            teacher_submissions = await self.db.teacher_assessment_results.find({
                "student_id": {"$in": student_ids}
            }).to_list(length=None)
            
            all_submissions = submissions + teacher_submissions
            
            # Calculate analytics
            total_students = len(students)
            total_submissions = len(all_submissions)
            
            if total_submissions > 0:
                average_performance = sum(sub["percentage"] for sub in all_submissions) / total_submissions
                high_performers = len([s for s in all_submissions if s["percentage"] >= 80])
                low_performers = len([s for s in all_submissions if s["percentage"] < 60])
            else:
                average_performance = 0
                high_performers = 0
                low_performers = 0
            
            # Get recent activity
            recent_submissions = sorted(all_submissions, key=lambda x: x["submitted_at"], reverse=True)[:5]
            
            return {
                "batch_id": batch_id,
                "batch_name": batch["name"],
                "total_students": total_students,
                "total_submissions": total_submissions,
                "average_performance": round(average_performance, 2),
                "high_performers": high_performers,
                "low_performers": low_performers,
                "recent_activity": [
                    {
                        "student_name": sub["student_name"],
                        "percentage": sub["percentage"],
                        "submitted_at": sub["submitted_at"].isoformat()
                    }
                    for sub in recent_submissions
                ]
            }
            
        except Exception as e:
            print(f"❌ [BATCH] Failed to get batch analytics: {str(e)}")
            raise e
    
    async def delete_batch(
        self,
        batch_id: str,
        teacher_id: str
    ):
        """Delete a batch"""
        try:
            if not self.db:
                await self.initialize()
            
            # Check if batch exists and belongs to teacher
            batch = await self.db.batches.find_one({
                "_id": ObjectId(batch_id),
                "teacher_id": teacher_id
            })
            
            if not batch:
                raise ValueError("Batch not found or access denied")
            
            # Remove batch_id from all students in this batch
            await self.db.users.update_many(
                {"batch_id": ObjectId(batch_id)},
                {"$unset": {"batch_id": "", "batch_name": ""}}
            )
            
            # Delete the batch
            await self.db.batches.delete_one({"_id": ObjectId(batch_id)})
            
            print(f"✅ [BATCH] Deleted batch '{batch['name']}' and removed from all students")
            
            return {
                "success": True,
                "message": f"Batch '{batch['name']}' deleted successfully"
            }
            
        except Exception as e:
            print(f"❌ [BATCH] Failed to delete batch: {str(e)}")
            raise e
    
    async def get_teacher_batches(
        self,
        teacher_id: str
    ):
        """Get all batches for a teacher"""
        try:
            if not self.db:
                await self.initialize()
            
            # Get batches created by the teacher
            batches = await self.db.batches.find({
                "teacher_id": teacher_id
            }).sort("created_at", -1).to_list(length=None)
            
            # Format response
            batch_list = []
            for batch in batches:
                # Count students in this batch
                student_count = await self.db.users.count_documents({
                    "batch_id": batch["_id"],
                    "role": "student"
                })
                
                batch_list.append({
                    "id": str(batch["_id"]),
                    "name": batch["name"],
                    "description": batch.get("description", ""),
                    "student_count": student_count,
                    "created_at": batch["created_at"].isoformat(),
                    "status": batch.get("status", "active")
                })
            
            return batch_list
            
        except Exception as e:
            print(f"❌ [BATCH] Failed to get teacher batches: {str(e)}")
            raise e

# Global batch service instance
batch_service = BatchService()
