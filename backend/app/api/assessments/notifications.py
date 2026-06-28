from datetime import timezone
"""
Assessment Notifications Module
Handles notification creation, retrieval, and management for assessments
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from ...db import get_db
from ...schemas.schemas import StudentNotification
from ...dependencies import get_current_user
from ...models.models import UserModel

router = APIRouter(prefix="/assessments", tags=["assessments-notifications"])

@router.get("/notifications", response_model=List[StudentNotification])
async def get_student_notifications(user: UserModel = Depends(get_current_user)):
    """Get notifications for the current user"""
    try:
        db = await get_db()
        
        # Get user's notifications
        notifications = await db.notifications.find({
            "student_id": str(user.id)
        }).sort("created_at", -1).limit(50).to_list(length=None)
        
        # Format notifications
        formatted_notifications = []
        for notification in notifications:
            formatted_notifications.append(StudentNotification(
                id=str(notification["_id"]),
                student_id=notification["student_id"],
                type=notification["type"],
                title=notification["title"],
                message=notification["message"],
                assessment_id=notification.get("assessment_id"),
                created_at=notification["created_at"].isoformat(),
                is_read=notification["is_read"]
            ))
        
        return formatted_notifications
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: UserModel = Depends(get_current_user)):
    """Mark a notification as read"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(notification_id):
            raise HTTPException(status_code=400, detail="Invalid notification ID")
        
        # Update notification
        result = await db.notifications.update_one(
            {
                "_id": ObjectId(notification_id),
                "student_id": str(user.id)
            },
            {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc)}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return {"success": True, "message": "Notification marked as read"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str, user: UserModel = Depends(get_current_user)):
    """Delete a notification"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(notification_id):
            raise HTTPException(status_code=400, detail="Invalid notification ID")
        
        # Delete notification
        result = await db.notifications.delete_one({
            "_id": ObjectId(notification_id),
            "student_id": str(user.id)
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return {"success": True, "message": "Notification deleted"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def send_assessment_notifications(db, assessment_id: str, batch_ids: List[str], assessment_title: str):
    """Send notifications to students when a new assessment is created"""
    try:
        print(f"📢 [NOTIFICATION] Sending assessment notifications for: {assessment_title}")
        
        # Get all students from the selected batches
        students = []
        for batch_id in batch_ids:
            # First, get the batch to find student_ids
            batch = await db.batches.find_one({"_id": ObjectId(batch_id)})
            if batch and batch.get("student_ids"):
                # Get students by their IDs from the batch
                student_ids = batch["student_ids"]
                batch_students = await db.users.find({
                    "_id": {"$in": [ObjectId(sid) for sid in student_ids]},
                    "role": "student",
                    "is_active": True
                }).to_list(length=None)
                students.extend(batch_students)
                print(f"📢 [NOTIFICATION] Found {len(batch_students)} students in batch {batch_id}")
            else:
                print(f"❌ [NOTIFICATION] No students found in batch {batch_id}")
        
        # Create notifications for each student
        notifications = []
        for student in students:
            notification = {
                "student_id": str(student["_id"]),
                "type": "assessment_assigned",
                "title": "New Assessment Available",
                "message": f"A new assessment '{assessment_title}' has been assigned to you.",
                "assessment_id": assessment_id,
                "created_at": datetime.now(timezone.utc),
                "is_read": False
            }
            notifications.append(notification)
        
        # Insert notifications in bulk
        if notifications:
            await db.notifications.insert_many(notifications)
            print(f"✅ [NOTIFICATION] Sent {len(notifications)} notifications to students")
        
    except Exception as e:
        print(f"❌ [NOTIFICATION] Failed to send notifications: {str(e)}")

async def create_assessment_completion_notification(
    db,
    student_id: str,
    assessment_title: str,
    score: float,
    teacher_id: str = None
):
    """Create notification for assessment completion"""
    try:
        # Create notification for the student
        student_notification = {
            "student_id": student_id,
            "type": "assessment_completed",
            "title": "Assessment Completed",
            "message": f"You completed '{assessment_title}' with a score of {score:.1f}%",
            "created_at": datetime.now(timezone.utc),
            "is_read": False
        }
        
        await db.notifications.insert_one(student_notification)
        
        # Create notification for the teacher if teacher_id is provided
        if teacher_id:
            teacher_notification = {
                "user_id": teacher_id,
                "type": "student_assessment_completed",
                "title": "Student Assessment Completed",
                "message": f"A student completed '{assessment_title}' with a score of {score:.1f}%",
                "created_at": datetime.now(timezone.utc),
                "is_read": False
            }
            
            await db.notifications.insert_one(teacher_notification)
        
        print(f"✅ [NOTIFICATIONS] Created assessment completion notifications for student {student_id}")
        
    except Exception as e:
        print(f"❌ [NOTIFICATIONS] Failed to create assessment completion notification: {str(e)}")

async def send_batch_assignment_notification(db, student_id: str, batch_name: str, teacher_name: str):
    """Send notification when student is assigned to a batch"""
    try:
        notification = {
            "student_id": student_id,
            "type": "batch_assignment",
            "title": f"Added to Batch: {batch_name}",
            "message": f"You have been added to batch '{batch_name}' by {teacher_name}. Welcome to the class!",
            "created_at": datetime.now(timezone.utc),
            "is_read": False
        }
        
        await db.notifications.insert_one(notification)
        print(f"✅ [NOTIFICATIONS] Sent batch assignment notification to student {student_id}")
        
    except Exception as e:
        print(f"❌ [NOTIFICATIONS] Failed to send batch assignment notification: {str(e)}")

async def send_teacher_assessment_notification(db, student_id: str, assessment_title: str, difficulty: str, topic: str):
    """Send notification for teacher-created assessment"""
    try:
        notification = {
            "student_id": student_id,
            "type": "teacher_assessment_assigned",
            "title": f"New Assessment: {assessment_title}",
            "message": f"A new {difficulty} assessment on {topic} has been assigned to you.",
            "created_at": datetime.now(timezone.utc),
            "is_read": False
        }
        
        await db.notifications.insert_one(notification)
        print(f"✅ [NOTIFICATIONS] Sent teacher assessment notification to student {student_id}")
        
    except Exception as e:
        print(f"❌ [NOTIFICATIONS] Failed to send teacher assessment notification: {str(e)}")
