from datetime import timezone
"""
Unified Notification Service
Centralized notification management and delivery
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from ..db import get_db

class NotificationService:
    """Centralized notification service"""
    
    def __init__(self):
        self.db = None
    
    async def initialize(self):
        """Initialize the service with database connection"""
        self.db = await get_db()
    
    async def send_assessment_notification(
        self,
        assessment_id: str,
        batch_ids: List[str],
        assessment_title: str,
        notification_type: str = "assessment_assigned"
    ):
        """Send notifications to students when a new assessment is created"""
        try:
            if not self.db:
                await self.initialize()
            
            print(f"📢 [NOTIFICATION] Sending {notification_type} notifications for: {assessment_title}")
            
            # Get all students from the selected batches
            students = []
            for batch_id in batch_ids:
                batch = await self.db.batches.find_one({"_id": ObjectId(batch_id)})
                if batch and batch.get("student_ids"):
                    student_ids = batch["student_ids"]
                    batch_students = await self.db.users.find({
                        "_id": {"$in": [ObjectId(sid) for sid in student_ids]},
                        "role": "student",
                        "is_active": True
                    }).to_list(length=None)
                    students.extend(batch_students)
                    print(f"📢 [NOTIFICATION] Found {len(batch_students)} students in batch {batch_id}")
            
            # Create notifications for each student
            notifications = []
            for student in students:
                # Check for duplicate notifications
                existing_notification = await self.db.notifications.find_one({
                    "student_id": str(student["_id"]),
                    "type": notification_type,
                    "assessment_id": assessment_id,
                    "created_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)}
                })
                
                if existing_notification:
                    print(f"📢 [NOTIFICATION] Duplicate notification prevented for student {student['_id']}")
                    continue
                
                notification = {
                    "student_id": str(student["_id"]),
                    "type": notification_type,
                    "title": f"New Assessment: {assessment_title}",
                    "message": f"A new assessment '{assessment_title}' has been assigned to you.",
                    "assessment_id": assessment_id,
                    "created_at": datetime.now(timezone.utc),
                    "is_read": False,
                    "priority": "normal"
                }
                notifications.append(notification)
            
            # Insert notifications in bulk
            if notifications:
                await self.db.notifications.insert_many(notifications)
                print(f"✅ [NOTIFICATION] Sent {len(notifications)} notifications to students")
            
            return len(notifications)
            
        except Exception as e:
            print(f"❌ [NOTIFICATION] Failed to send notifications: {str(e)}")
            return 0
    
    async def send_batch_assignment_notification(
        self,
        student_id: str,
        batch_name: str,
        teacher_name: str
    ):
        """Send notification when student is assigned to a batch"""
        try:
            if not self.db:
                await self.initialize()
            
            # Check for duplicate notification
            existing_notification = await self.db.notifications.find_one({
                "student_id": student_id,
                "type": "batch_assignment",
                "title": f"Added to Batch: {batch_name}",
                "created_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)}
            })
            
            if existing_notification:
                print(f"📢 [NOTIFICATION] Duplicate batch assignment notification prevented for student {student_id}")
                return
            
            notification = {
                "student_id": student_id,
                "type": "batch_assignment",
                "title": f"Added to Batch: {batch_name}",
                "message": f"You have been added to batch '{batch_name}' by {teacher_name}. Welcome to the class!",
                "created_at": datetime.now(timezone.utc),
                "is_read": False,
                "priority": "normal"
            }
            
            await self.db.notifications.insert_one(notification)
            print(f"✅ [NOTIFICATION] Sent batch assignment notification to student {student_id}")
            
        except Exception as e:
            print(f"❌ [NOTIFICATION] Failed to send batch assignment notification: {str(e)}")
    
    async def send_assessment_completion_notification(
        self,
        student_id: str,
        assessment_title: str,
        score: float,
        teacher_id: Optional[str] = None
    ):
        """Create notification for assessment completion"""
        try:
            if not self.db:
                await self.initialize()
            
            # Create notification for the student
            student_notification = {
                "student_id": student_id,
                "type": "assessment_completed",
                "title": "Assessment Completed",
                "message": f"You completed '{assessment_title}' with a score of {score:.1f}%",
                "created_at": datetime.now(timezone.utc),
                "is_read": False,
                "priority": "normal"
            }
            
            await self.db.notifications.insert_one(student_notification)
            
            # Create notification for the teacher if teacher_id is provided
            if teacher_id:
                teacher_notification = {
                    "user_id": teacher_id,
                    "type": "student_assessment_completed",
                    "title": "Student Assessment Completed",
                    "message": f"A student completed '{assessment_title}' with a score of {score:.1f}%",
                    "created_at": datetime.now(timezone.utc),
                    "is_read": False,
                    "priority": "normal"
                }
                
                await self.db.notifications.insert_one(teacher_notification)
            
            print(f"✅ [NOTIFICATION] Created assessment completion notifications for student {student_id}")
            
        except Exception as e:
            print(f"❌ [NOTIFICATION] Failed to create assessment completion notification: {str(e)}")
    
    async def send_teacher_assessment_notification(
        self,
        student_id: str,
        assessment_title: str,
        difficulty: str,
        topic: str
    ):
        """Send notification for teacher-created assessment"""
        try:
            if not self.db:
                await self.initialize()
            
            # Check for duplicate notification
            existing_notification = await self.db.notifications.find_one({
                "student_id": student_id,
                "type": "teacher_assessment_assigned",
                "assessment_id": assessment_title,  # Using title as identifier
                "created_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)}
            })
            
            if existing_notification:
                print(f"📢 [NOTIFICATION] Duplicate teacher assessment notification prevented for student {student_id}")
                return
            
            notification = {
                "student_id": student_id,
                "type": "teacher_assessment_assigned",
                "title": f"New Assessment: {assessment_title}",
                "message": f"A new {difficulty} assessment on {topic} has been assigned to you.",
                "created_at": datetime.now(timezone.utc),
                "is_read": False,
                "priority": "normal"
            }
            
            await self.db.notifications.insert_one(notification)
            print(f"✅ [NOTIFICATION] Sent teacher assessment notification to student {student_id}")
            
        except Exception as e:
            print(f"❌ [NOTIFICATION] Failed to send teacher assessment notification: {str(e)}")
    
    async def send_coding_feedback_notification(
        self,
        student_id: str,
        problem_title: str,
        feedback: str
    ):
        """Send notification for coding feedback"""
        try:
            if not self.db:
                await self.initialize()
            
            notification = {
                "student_id": student_id,
                "type": "coding_feedback",
                "title": f"Feedback for: {problem_title}",
                "message": f"You have received feedback on your solution for '{problem_title}': {feedback[:100]}...",
                "created_at": datetime.now(timezone.utc),
                "is_read": False,
                "priority": "low"
            }
            
            await self.db.notifications.insert_one(notification)
            print(f"✅ [NOTIFICATION] Sent coding feedback notification to student {student_id}")
            
        except Exception as e:
            print(f"❌ [NOTIFICATION] Failed to send coding feedback notification: {str(e)}")
    
    async def mark_notification_read(
        self,
        notification_id: str,
        user_id: str
    ):
        """Mark a notification as read"""
        try:
            if not self.db:
                await self.initialize()
            
            await self.db.notifications.update_one(
                {
                    "_id": ObjectId(notification_id),
                    "$or": [
                        {"student_id": user_id},
                        {"user_id": user_id}
                    ]
                },
                {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc)}}
            )
            
        except Exception as e:
            print(f"❌ [NOTIFICATION] Failed to mark notification as read: {str(e)}")
    
    async def get_user_notifications(
        self,
        user_id: str,
        limit: int = 50,
        unread_only: bool = False
    ):
        """Get notifications for a user"""
        try:
            if not self.db:
                await self.initialize()
            
            query = {
                "$or": [
                    {"student_id": user_id},
                    {"user_id": user_id}
                ]
            }
            
            if unread_only:
                query["is_read"] = False
            
            notifications = await self.db.notifications.find(query).sort("created_at", -1).limit(limit).to_list(length=None)
            
            return notifications
            
        except Exception as e:
            print(f"❌ [NOTIFICATION] Failed to get user notifications: {str(e)}")
            return []
    
    async def cleanup_old_notifications(self, days: int = 30):
        """Clean up old notifications"""
        try:
            if not self.db:
                await self.initialize()
            
            cutoff_date = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            cutoff_date = cutoff_date.replace(day=cutoff_date.day - days)
            
            result = await self.db.notifications.delete_many({
                "created_at": {"$lt": cutoff_date},
                "is_read": True
            })
            
            print(f"🧹 [NOTIFICATION] Cleaned up {result.deleted_count} old notifications")
            return result.deleted_count
            
        except Exception as e:
            print(f"❌ [NOTIFICATION] Failed to cleanup old notifications: {str(e)}")
            return 0

# Global notification service instance
notification_service = NotificationService()
