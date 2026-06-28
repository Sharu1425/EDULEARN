from datetime import timezone
"""
Async Assessment Creation Endpoints
Handles asynchronous assessment creation with background task processing
"""
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from typing import List, Optional
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from ...db import get_db
from ...dependencies import get_current_user
from ...models.unified_models import AssessmentCreateRequest, AssessmentResponse
from ...services.background_task_service import BackgroundTaskService, generate_questions_background_task
from ...services.validation_service import ValidationService
from ...utils.exceptions import ValidationError, NotFoundError
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/assessments/async", tags=["Async Assessments"])

@router.post("/create")
async def create_assessment_async(
    assessment_data: AssessmentCreateRequest,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create assessment asynchronously with AI question generation"""
    try:
        # Validate request data
        validation_service = ValidationService()
        
        # Validate assessment data
        title_validation = validation_service.validate_assessment_title(assessment_data.title)
        if not title_validation["is_valid"]:
            raise ValidationError("Invalid assessment title: " + "; ".join(title_validation["errors"]))
        
        desc_validation = validation_service.validate_assessment_description(assessment_data.description)
        if not desc_validation["is_valid"]:
            raise ValidationError("Invalid assessment description: " + "; ".join(desc_validation["errors"]))
        
        batch_validation = validation_service.validate_batch_assignment(assessment_data.assigned_batches)
        if not batch_validation["is_valid"]:
            raise ValidationError("Invalid batch assignment: " + "; ".join(batch_validation["errors"]))
        
        # Create assessment in draft status
        assessment_doc = {
            "title": assessment_data.title,
            "description": assessment_data.description,
            "subject": assessment_data.subject,
            "topic": assessment_data.topic,
            "difficulty": assessment_data.difficulty,
            "type": "ai_generated",
            "status": "draft",
            "total_questions": 0,
            "total_points": 0,
            "questions": [],
            "config": assessment_data.config.dict(),
            "schedule": assessment_data.schedule.dict(),
            "assigned_batches": assessment_data.assigned_batches,
            "assigned_students": [],
            "access_control": {},
            "created_by": current_user["_id"],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "published_at": None,
            "analytics": {
                "total_attempts": 0,
                "average_score": 0.0,
                "completion_rate": 0.0,
                "average_time": 0.0,
                "difficulty_distribution": {},
                "question_analytics": {},
                "last_updated": datetime.now(timezone.utc)
            },
            "tags": assessment_data.tags,
            "metadata": {},
            "is_active": True
        }
        
        # Insert assessment
        assessments_collection = db.assessments
        result = await assessments_collection.insert_one(assessment_doc)
        assessment_id = str(result.inserted_id)
        
        # Start background task for AI question generation
        background_tasks.add_task(
            generate_questions_background_task,
            assessment_id,
            current_user["_id"],
            assessment_data.topic or assessment_data.subject,
            assessment_data.difficulty,
            assessment_data.config.question_count if hasattr(assessment_data.config, 'question_count') else 10,
            assessment_data.assigned_batches,
            db
        )
        
        logger.info(f"🚀 Started async assessment creation for {assessment_id}")
        
        return {
            "success": True,
            "message": "Assessment creation started",
            "assessment_id": assessment_id,
            "status": "processing",
            "estimated_completion": "2-5 minutes"
        }
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create async assessment: {e}")
        raise HTTPException(status_code=500, detail="Failed to create assessment")

@router.get("/status/{assessment_id}")
async def get_assessment_generation_status(
    assessment_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get the status of assessment generation"""
    try:
        background_service = BackgroundTaskService(db)
        task_id = f"ai_gen_{assessment_id}"
        
        # Get task status
        task_status = await background_service.get_task_status(task_id)
        
        if not task_status:
            # Check if assessment exists and is completed
            assessments_collection = db.assessments
            assessment = await assessments_collection.find_one({"_id": assessment_id})
            
            if not assessment:
                raise NotFoundError("Assessment not found")
            
            if assessment.get("status") == "published":
                return {
                    "success": True,
                    "status": "completed",
                    "progress": 100,
                    "assessment_id": assessment_id,
                    "questions_generated": assessment.get("total_questions", 0)
                }
            elif assessment.get("status") == "failed":
                return {
                    "success": False,
                    "status": "failed",
                    "progress": 0,
                    "assessment_id": assessment_id,
                    "error": "Assessment generation failed"
                }
            else:
                return {
                    "success": True,
                    "status": "not_started",
                    "progress": 0,
                    "assessment_id": assessment_id
                }
        
        return {
            "success": True,
            "status": task_status["status"],
            "progress": task_status.get("progress", 0),
            "assessment_id": assessment_id,
            "started_at": task_status.get("started_at"),
            "completed_at": task_status.get("completed_at"),
            "failed_at": task_status.get("failed_at"),
            "error": task_status.get("error"),
            "questions_generated": task_status.get("questions_generated", 0)
        }
        
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get assessment status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get assessment status")

@router.get("/tasks")
async def get_all_background_tasks(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get status of all background tasks"""
    try:
        # Only allow admin and teachers to view all tasks
        if current_user.get("role") not in ["admin", "teacher"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        background_service = BackgroundTaskService(db)
        all_tasks = await background_service.get_all_task_statuses()
        
        return {
            "success": True,
            "tasks": all_tasks,
            "total_tasks": len(all_tasks)
        }
        
    except Exception as e:
        logger.error(f"Failed to get background tasks: {e}")
        raise HTTPException(status_code=500, detail="Failed to get background tasks")

@router.post("/cleanup")
async def cleanup_completed_tasks(
    max_age_hours: int = 24,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Clean up completed background tasks"""
    try:
        # Only allow admin to cleanup tasks
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Access denied")
        
        background_service = BackgroundTaskService(db)
        await background_service.cleanup_completed_tasks(max_age_hours)
        
        return {
            "success": True,
            "message": f"Cleaned up tasks older than {max_age_hours} hours"
        }
        
    except Exception as e:
        logger.error(f"Failed to cleanup tasks: {e}")
        raise HTTPException(status_code=500, detail="Failed to cleanup tasks")

@router.post("/bulk-notify")
async def bulk_notify_students_async(
    student_ids: List[str],
    title: str,
    message: str,
    notification_type: str = "info",
    assessment_id: Optional[str] = None,
    background_tasks: BackgroundTasks = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Send bulk notifications to students asynchronously"""
    try:
        # Only allow teachers and admins to send bulk notifications
        if current_user.get("role") not in ["teacher", "admin"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if not student_ids:
            raise HTTPException(status_code=400, detail="No students specified")
        
        if len(student_ids) > 1000:
            raise HTTPException(status_code=400, detail="Maximum 1000 students per bulk notification")
        
        # Validate notification data
        validation_service = ValidationService()
        
        if not title or len(title.strip()) < 3:
            raise HTTPException(status_code=400, detail="Title must be at least 3 characters")
        
        if not message or len(message.strip()) < 10:
            raise HTTPException(status_code=400, detail="Message must be at least 10 characters")
        
        if notification_type not in ["info", "success", "warning", "error"]:
            raise HTTPException(status_code=400, detail="Invalid notification type")
        
        # Start background task for bulk notifications
        from app.services.background_task_service import bulk_notify_background_task
        
        background_tasks.add_task(
            bulk_notify_background_task,
            student_ids,
            title,
            message,
            notification_type,
            assessment_id,
            db
        )
        
        logger.info(f"🚀 Started bulk notification to {len(student_ids)} students")
        
        return {
            "success": True,
            "message": "Bulk notification started",
            "student_count": len(student_ids),
            "status": "processing"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start bulk notification: {e}")
        raise HTTPException(status_code=500, detail="Failed to start bulk notification")

@router.get("/progress/{task_id}")
async def get_task_progress(
    task_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get progress of a specific background task"""
    try:
        background_service = BackgroundTaskService(db)
        task_status = await background_service.get_task_status(task_id)
        
        if not task_status:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return {
            "success": True,
            "task_id": task_id,
            "status": task_status["status"],
            "progress": task_status.get("progress", 0),
            "started_at": task_status.get("started_at"),
            "completed_at": task_status.get("completed_at"),
            "failed_at": task_status.get("failed_at"),
            "error": task_status.get("error")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get task progress: {e}")
        raise HTTPException(status_code=500, detail="Failed to get task progress")
