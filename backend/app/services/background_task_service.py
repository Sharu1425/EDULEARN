from datetime import timezone
"""
Background Tasks Service
Handles asynchronous AI question generation and other background operations
"""
import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import BackgroundTasks
from motor.motor_asyncio import AsyncIOMotorDatabase
from .notification_service import NotificationService
from ..core.config import settings
import httpx
import json

logger = logging.getLogger(__name__)

class BackgroundTaskService:
    """Service for managing background tasks"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.notification_service = NotificationService(db)
        self.task_status = {}  # In production, use Redis or similar
    
    async def generate_ai_questions_background(
        self,
        assessment_id: str,
        teacher_id: str,
        topic: str,
        difficulty: str,
        question_count: int,
        batches: List[str]
    ):
        """Generate AI questions in the background"""
        task_id = f"ai_gen_{assessment_id}"
        
        try:
            # Update task status
            self.task_status[task_id] = {
                "status": "processing",
                "progress": 0,
                "started_at": datetime.now(timezone.utc),
                "assessment_id": assessment_id,
                "teacher_id": teacher_id
            }
            
            logger.info(f"🤖 Starting AI question generation for assessment {assessment_id}")
            
            # Update assessment status to processing
            await self._update_assessment_status(assessment_id, "processing")
            
            # Generate questions using AI
            questions = await self._generate_questions_with_ai(topic, difficulty, question_count)
            
            # Update progress
            self.task_status[task_id]["progress"] = 50
            
            # Save questions to assessment
            await self._save_questions_to_assessment(assessment_id, questions)
            
            # Update progress
            self.task_status[task_id]["progress"] = 75
            
            # Send notifications to students
            await self._notify_students_about_assessment(assessment_id, batches)
            
            # Update assessment status to published
            await self._update_assessment_status(assessment_id, "published")
            
            # Update task status
            self.task_status[task_id].update({
                "status": "completed",
                "progress": 100,
                "completed_at": datetime.now(timezone.utc),
                "questions_generated": len(questions)
            })
            
            # Notify teacher
            await self._notify_teacher_completion(teacher_id, assessment_id, len(questions))
            
            logger.info(f"✅ AI question generation completed for assessment {assessment_id}")
            
        except Exception as e:
            logger.error(f"❌ AI question generation failed for assessment {assessment_id}: {e}")
            
            # Update task status
            self.task_status[task_id].update({
                "status": "failed",
                "error": str(e),
                "failed_at": datetime.now(timezone.utc)
            })
            
            # Update assessment status to failed
            await self._update_assessment_status(assessment_id, "failed")
            
            # Notify teacher about failure
            await self._notify_teacher_failure(teacher_id, assessment_id, str(e))
    
    async def _generate_questions_with_ai(self, topic: str, difficulty: str, count: int) -> List[Dict[str, Any]]:
        """Generate questions using AI service"""
        try:
            # Prepare AI request
            ai_request = {
                "topic": topic,
                "difficulty": difficulty,
                "question_count": count,
                "type": "mcq"
            }
            
            # Call AI service
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{settings.AI_SERVICE_URL}/generate-questions",
                    json=ai_request,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("questions", [])
                else:
                    raise Exception(f"AI service returned status {response.status_code}")
                    
        except Exception as e:
            logger.error(f"Failed to generate questions with AI: {e}")
            # Return fallback questions
            return self._generate_fallback_questions(topic, difficulty, count)
    
    def _generate_fallback_questions(self, topic: str, difficulty: str, count: int) -> List[Dict[str, Any]]:
        """Generate fallback questions when AI service fails"""
        logger.warning("Using fallback question generation")
        
        fallback_questions = []
        for i in range(count):
            question = {
                "id": f"q_{i + 1}",
                "type": "multiple_choice",
                "question_text": f"Sample question about {topic} (difficulty: {difficulty})",
                "options": [
                    {"id": "opt_1", "text": "Option A", "is_correct": False},
                    {"id": "opt_2", "text": "Option B", "is_correct": True},
                    {"id": "opt_3", "text": "Option C", "is_correct": False},
                    {"id": "opt_4", "text": "Option D", "is_correct": False}
                ],
                "correct_answer": 1,
                "explanation": f"This is a sample explanation for the {topic} question.",
                "points": 1,
                "difficulty": difficulty,
                "tags": [topic.lower(), difficulty],
                "metadata": {"fallback": True}
            }
            fallback_questions.append(question)
        
        return fallback_questions
    
    async def _update_assessment_status(self, assessment_id: str, status: str):
        """Update assessment status in database"""
        try:
            assessments_collection = self.db.assessments
            await assessments_collection.update_one(
                {"_id": assessment_id},
                {
                    "$set": {
                        "status": status,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
        except Exception as e:
            logger.error(f"Failed to update assessment status: {e}")
    
    async def _save_questions_to_assessment(self, assessment_id: str, questions: List[Dict[str, Any]]):
        """Save generated questions to assessment"""
        try:
            assessments_collection = self.db.assessments
            await assessments_collection.update_one(
                {"_id": assessment_id},
                {
                    "$set": {
                        "questions": questions,
                        "total_questions": len(questions),
                        "total_points": sum(q.get("points", 1) for q in questions),
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
        except Exception as e:
            logger.error(f"Failed to save questions to assessment: {e}")
    
    async def _notify_students_about_assessment(self, assessment_id: str, batches: List[str]):
        """Send notifications to students about new assessment"""
        try:
            # Get students from batches
            students = await self._get_students_from_batches(batches)
            
            # Send notifications
            for student in students:
                await self.notification_service.create_notification(
                    user_id=student["_id"],
                    title="New Assessment Available",
                    message=f"A new assessment has been assigned to your batch.",
                    type="info",
                    assessment_id=assessment_id
                )
            
            logger.info(f"Sent notifications to {len(students)} students")
            
        except Exception as e:
            logger.error(f"Failed to notify students: {e}")
    
    async def _get_students_from_batches(self, batch_ids: List[str]) -> List[Dict[str, Any]]:
        """Get all students from specified batches"""
        try:
            batches_collection = self.db.batches
            students_collection = self.db.users
            
            # Get student IDs from batches
            student_ids = []
            for batch_id in batch_ids:
                batch = await batches_collection.find_one({"_id": batch_id})
                if batch and "student_ids" in batch:
                    student_ids.extend(batch["student_ids"])
            
            # Get student details
            students = await students_collection.find(
                {"_id": {"$in": student_ids}, "role": "student"}
            ).to_list(length=None)
            
            return students
            
        except Exception as e:
            logger.error(f"Failed to get students from batches: {e}")
            return []
    
    async def _notify_teacher_completion(self, teacher_id: str, assessment_id: str, question_count: int):
        """Notify teacher about successful completion"""
        try:
            await self.notification_service.create_notification(
                user_id=teacher_id,
                title="Assessment Generation Complete",
                message=f"Successfully generated {question_count} questions for your assessment.",
                type="success",
                assessment_id=assessment_id
            )
        except Exception as e:
            logger.error(f"Failed to notify teacher completion: {e}")
    
    async def _notify_teacher_failure(self, teacher_id: str, assessment_id: str, error: str):
        """Notify teacher about generation failure"""
        try:
            await self.notification_service.create_notification(
                user_id=teacher_id,
                title="Assessment Generation Failed",
                message=f"Failed to generate questions: {error}",
                type="error",
                assessment_id=assessment_id
            )
        except Exception as e:
            logger.error(f"Failed to notify teacher failure: {e}")
    
    async def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get status of a background task"""
        return self.task_status.get(task_id)
    
    async def get_all_task_statuses(self) -> Dict[str, Any]:
        """Get status of all background tasks"""
        return self.task_status
    
    async def cleanup_completed_tasks(self, max_age_hours: int = 24):
        """Clean up completed tasks older than specified hours"""
        try:
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)
            
            tasks_to_remove = []
            for task_id, task_info in self.task_status.items():
                if task_info.get("status") in ["completed", "failed"]:
                    completed_at = task_info.get("completed_at") or task_info.get("failed_at")
                    if completed_at and completed_at < cutoff_time:
                        tasks_to_remove.append(task_id)
            
            for task_id in tasks_to_remove:
                del self.task_status[task_id]
            
            logger.info(f"Cleaned up {len(tasks_to_remove)} completed tasks")
            
        except Exception as e:
            logger.error(f"Failed to cleanup completed tasks: {e}")
    
    async def bulk_notify_students_background(
        self,
        student_ids: List[str],
        title: str,
        message: str,
        notification_type: str = "info",
        assessment_id: Optional[str] = None
    ):
        """Send bulk notifications to students in the background"""
        task_id = f"bulk_notify_{datetime.now(timezone.utc).timestamp()}"
        
        try:
            self.task_status[task_id] = {
                "status": "processing",
                "progress": 0,
                "started_at": datetime.now(timezone.utc),
                "total_students": len(student_ids)
            }
            
            logger.info(f"📢 Starting bulk notification to {len(student_ids)} students")
            
            # Send notifications in batches
            batch_size = 50
            total_batches = (len(student_ids) + batch_size - 1) // batch_size
            
            for i in range(0, len(student_ids), batch_size):
                batch_student_ids = student_ids[i:i + batch_size]
                
                # Send notifications for this batch
                for student_id in batch_student_ids:
                    await self.notification_service.create_notification(
                        user_id=student_id,
                        title=title,
                        message=message,
                        type=notification_type,
                        assessment_id=assessment_id
                    )
                
                # Update progress
                progress = int((i + len(batch_student_ids)) / len(student_ids) * 100)
                self.task_status[task_id]["progress"] = progress
                
                # Small delay to prevent overwhelming the system
                await asyncio.sleep(0.1)
            
            # Update task status
            self.task_status[task_id].update({
                "status": "completed",
                "progress": 100,
                "completed_at": datetime.now(timezone.utc)
            })
            
            logger.info(f"✅ Bulk notification completed for {len(student_ids)} students")
            
        except Exception as e:
            logger.error(f"❌ Bulk notification failed: {e}")
            
            self.task_status[task_id].update({
                "status": "failed",
                "error": str(e),
                "failed_at": datetime.now(timezone.utc)
            })

# Background task functions for FastAPI
async def generate_questions_background_task(
    background_tasks: BackgroundTasks,
    assessment_id: str,
    teacher_id: str,
    topic: str,
    difficulty: str,
    question_count: int,
    batches: List[str],
    db: AsyncIOMotorDatabase
):
    """Background task function for FastAPI"""
    service = BackgroundTaskService(db)
    await service.generate_ai_questions_background(
        assessment_id, teacher_id, topic, difficulty, question_count, batches
    )

async def bulk_notify_background_task(
    background_tasks: BackgroundTasks,
    student_ids: List[str],
    title: str,
    message: str,
    notification_type: str,
    assessment_id: Optional[str],
    db: AsyncIOMotorDatabase
):
    """Background task function for bulk notifications"""
    service = BackgroundTaskService(db)
    await service.bulk_notify_students_background(
        student_ids, title, message, notification_type, assessment_id
    )
