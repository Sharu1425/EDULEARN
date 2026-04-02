"""
Core Assessment CRUD Operations
Handles basic assessment creation, retrieval, and management
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from ...db import get_db
from ...schemas.schemas import (
    AssessmentCreate, AssessmentResponse, QuestionCreate, QuestionResponse,
    CodingQuestionCreate, CodingQuestionResponse
)
from pydantic import BaseModel
from ...dependencies import require_teacher, get_current_user
from ...models.models import UserModel
from .notifications import send_assessment_notifications
import random
import uuid

class HeartbeatRequest(BaseModel):
    session_id: str
    student_id: str

router = APIRouter(prefix="/assessments", tags=["assessments-core"])

@router.post("/", response_model=AssessmentResponse)
async def create_assessment(assessment_data: AssessmentCreate, user: UserModel = Depends(require_teacher)):
    """Create a new assessment - Teacher/Admin only"""
    try:
        db = await get_db()
        
        assessment_doc = {
            "title": assessment_data.title,
            "subject": assessment_data.subject,
            "difficulty": assessment_data.difficulty,
            "description": assessment_data.description,
            "time_limit": assessment_data.time_limit,
            "max_attempts": assessment_data.max_attempts,
            "type": assessment_data.type,
            "created_by": str(user.id),
            "created_at": datetime.utcnow(),
            "status": "draft",
            "question_count": len(assessment_data.questions),
            "questions": assessment_data.questions,
            "assigned_batches": assessment_data.batches,
            "is_active": False
        }
        
        result = await db.assessments.insert_one(assessment_doc)
        assessment_id = str(result.inserted_id)
        
        # Generate questions if assessment type is AI-generated
        if assessment_data.type == "ai" and len(assessment_data.questions) == 0:
            try:
                from app.services.gemini_coding_service import GeminiCodingService
                gemini_service = GeminiCodingService()
                
                # Generate questions based on topic and difficulty
                generated_questions = await gemini_service.generate_mcq_questions(
                    topic=assessment_data.subject,
                    difficulty=assessment_data.difficulty,
                    count=10  # Default count, can be made configurable
                )
                
                # Update assessment with generated questions
                await db.assessments.update_one(
                    {"_id": result.inserted_id},
                    {"$set": {
                        "questions": generated_questions,
                        "question_count": len(generated_questions),
                        "is_active": True,
                        "status": "active"
                    }}
                )
                
                # Send notifications to students in selected batches
                await send_assessment_notifications(db, assessment_id, assessment_data.batches, assessment_data.title)
                
            except Exception as e:
                print(f"❌ [ASSESSMENT] Error generating questions: {str(e)}")
                # Continue with empty questions if generation fails
        
        return AssessmentResponse(
            id=assessment_id,
            title=assessment_data.title,
            subject=assessment_data.subject,
            difficulty=assessment_data.difficulty,
            description=assessment_data.description,
            time_limit=assessment_data.time_limit,
            max_attempts=assessment_data.max_attempts,
            question_count=len(assessment_data.questions),
            created_by=str(user.id),
            created_at=assessment_doc["created_at"].isoformat(),
            status="active" if assessment_data.type == "ai" else "draft",
            type=assessment_doc["type"],
            is_active=True if assessment_data.type == "ai" else False,
            total_questions=len(assessment_data.questions)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# In backend/app/api/assessments/core.py


@router.get("/", response_model=List[AssessmentResponse])
async def get_teacher_assessments(user: UserModel = Depends(require_teacher)): # Changed dependency to require_teacher
    """Get all assessments created by the current teacher across sources (manual and teacher-created)."""
    try:
        db = await get_db()
        
        # This endpoint is for teachers, so explicitly check the role.
        # The dependency Depends(require_teacher) already handles this.
        
        # Get manual assessments
        manual_list = await db.assessments.find({"created_by": str(user.id)}).sort("created_at", -1).to_list(length=None)
        
        # Teacher-created (AI/generated) assessments
        teacher_list = []
        try:
            collections = await db.list_collection_names()
            if "teacher_assessments" in collections:
                teacher_list = await db.teacher_assessments.find({"teacher_id": str(user.id)}).sort("created_at", -1).to_list(length=None)
        except Exception as e:
            print(f"⚠️ Warning: Could not query teacher_assessments: {e}")
            teacher_list = []
        
        # Combine and format both lists
        all_assessments = []
        
        # Process manual assessments
        for assessment in manual_list:
            # --- FIX: Safely handle created_at ---
            created_at_dt = assessment.get("created_at", datetime.utcnow()) # Default to now if missing
            created_at_iso = created_at_dt.isoformat() if isinstance(created_at_dt, datetime) else str(created_at_dt)
            
            all_assessments.append(AssessmentResponse(
                id=str(assessment["_id"]),
                title=assessment.get("title", "Untitled Assessment"),
                subject=assessment.get("subject", "General"),
                difficulty=assessment.get("difficulty", "medium"),
                description=assessment.get("description", ""),
                time_limit=assessment.get("time_limit", 30),
                max_attempts=assessment.get("max_attempts", 1),
                question_count=assessment.get("question_count", len(assessment.get("questions", []))),
                created_by=assessment.get("created_by", "Unknown"),
                created_at=created_at_iso, # Use safe variable
                status=assessment.get("status", "draft"),
                type=assessment.get("type", "mcq"),
                is_active=assessment.get("is_active", False),
                total_questions=assessment.get("question_count", len(assessment.get("questions", []))),
                assigned_batches=assessment.get("assigned_batches", [])
            ))
        
        # Process teacher-created assessments
        for assessment in teacher_list:
            # --- FIX: Safely handle created_at ---
            created_at_dt = assessment.get("created_at", datetime.utcnow()) # Default to now if missing
            created_at_iso = created_at_dt.isoformat() if isinstance(created_at_dt, datetime) else str(created_at_dt)

            all_assessments.append(AssessmentResponse(
                id=str(assessment["_id"]),
                title=assessment.get("title", "Untitled Assessment"),
                subject=assessment.get("topic", assessment.get("subject", "General")),
                difficulty=assessment.get("difficulty", "medium"),
                description=f"Teacher-created: {assessment.get('description', '')}",
                time_limit=assessment.get("time_limit", 30),
                max_attempts=assessment.get("max_attempts", 1),
                question_count=assessment.get("question_count", len(assessment.get("questions", []))),
                created_by=str(assessment.get("teacher_id", "Unknown")),
                created_at=created_at_iso, # Use safe variable
                status=assessment.get("status", "published"),
                type=assessment.get("type", "teacher"),
                is_active=assessment.get("is_active", True),
                total_questions=assessment.get("question_count", len(assessment.get("questions", []))),
                assigned_batches=assessment.get("batches", [])
            ))
        
        # Re-sort the combined list just in case
        all_assessments.sort(key=lambda x: x.created_at, reverse=True)
        
        return all_assessments
        
    except Exception as e:
        print(f"❌ [GET TEACHER ASSESSMENTS] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to retrieve teacher assessments: {str(e)}")

@router.get("/{assessment_id}/details")
async def get_assessment_details(assessment_id: str, user: UserModel = Depends(get_current_user)):
    """Get detailed information about a specific assessment"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(assessment_id):
            raise HTTPException(status_code=400, detail="Invalid assessment ID")
        
        # Try to find in regular assessments first
        assessment = await db.assessments.find_one({"_id": ObjectId(assessment_id)})
        
        if not assessment:
            # Try teacher assessments
            assessment = await db.teacher_assessments.find_one({"_id": ObjectId(assessment_id)})
        
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Check permissions
        if user.role == "student":
            # Students can only see published assessments assigned to them
            if assessment.get("status") != "published" and assessment.get("status") != "active":
                raise HTTPException(status_code=403, detail="Assessment not available")
        elif user.role == "teacher":
            # Teachers can only see their own assessments
            if assessment.get("created_by") != str(user.id) and assessment.get("teacher_id") != str(user.id):
                raise HTTPException(status_code=403, detail="Access denied")
        
        
        # --- SHUFFLING & POOLING LOGIC ---
        questions_list = assessment.get("questions", [])
        pool_size = assessment.get("pool_size", 10) # default to 10 if not specified
        
        if user.role == "student":
            # Seed the random number generator with student_id and assessment_id for reproducibility per student
            random.seed(f"{user.id}_{assessment_id}")
            
            # 1. Shuffle question order
            random.shuffle(questions_list)
            
            # 2. Select a subset (pool) if needed
            if len(questions_list) > pool_size:
                questions_list = questions_list[:pool_size]
                
            # 3. Shuffle options for MCQs
            for q in questions_list:
                if q.get("type") in ["mcq", "multiple_choice"] and "options" in q:
                    options = q["options"]
                    correct_ans = q.get("correct_answer")
                    
                    if isinstance(correct_ans, int) and 0 <= correct_ans < len(options):
                        correct_text = options[correct_ans]
                        # Shuffle options
                        random.shuffle(options)
                        # Find new index of the correct answer
                        new_correct_ans = options.index(correct_text)
                        q["correct_answer"] = new_correct_ans
                        q["options"] = options
            
            # 4. Create Active Session
            session_token = str(uuid.uuid4())
            await db.active_sessions.update_one(
                {"student_id": str(user.id), "assessment_id": assessment_id},
                {"$set": {
                    "session_token": session_token,
                    "started_at": datetime.utcnow(),
                    "last_heartbeat": datetime.utcnow(),
                    "is_active": True
                }},
                upsert=True
            )
            # End student specific modifications
        
        # Format response based on assessment type
        if "teacher_id" in assessment:
            # Teacher-created assessment
            return {
                "id": str(assessment["_id"]),
                "title": assessment["title"],
                "topic": assessment.get("topic", assessment.get("subject", "General")),
                "difficulty": assessment["difficulty"],
                "question_count": len(questions_list),
                "questions": questions_list,
                "batches": assessment.get("batches", []),
                "teacher_id": str(assessment["teacher_id"]),
                "type": assessment["type"],
                "status": assessment["status"],
                "is_active": assessment["is_active"],
                "created_at": assessment.get("created_at", datetime.utcnow()).isoformat(),
                "created_by": str(assessment.get("teacher_id", assessment.get("created_by", "unknown")))
            }
        else:
            # Regular assessment
            return {
                "id": str(assessment["_id"]),
                "title": assessment["title"],
                "subject": assessment["subject"],
                "difficulty": assessment["difficulty"],
                "description": assessment["description"],
                "time_limit": assessment["time_limit"],
                "max_attempts": assessment["max_attempts"],
                "question_count": len(questions_list),
                "questions": questions_list,
                "assigned_batches": assessment.get("assigned_batches", []),
                "created_by": assessment["created_by"],
                "created_at": assessment.get("created_at", datetime.utcnow()).isoformat(),
                "status": assessment["status"],
                "type": assessment["type"],
                "is_active": assessment["is_active"],
                "total_questions": len(questions_list)
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/heartbeat")
async def update_heartbeat(payload: HeartbeatRequest, user: UserModel = Depends(get_current_user)):
    """Keep the assessment session alive via heartbeat"""
    try:
        if str(user.id) != payload.student_id:
            raise HTTPException(status_code=403, detail="Unauthorized")
            
        db = await get_db()
        result = await db.active_sessions.update_one(
            {"student_id": payload.student_id, "assessment_id": payload.session_id, "is_active": True},
            {"$set": {"last_heartbeat": datetime.utcnow()}}
        )
        if result.matched_count == 0:
            return {"status": "error", "message": "No active session found"}
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@router.post("/{assessment_id}/publish")
async def publish_assessment(assessment_id: str, user: UserModel = Depends(get_current_user)):
    """Publish an assessment to make it available to students"""
    try:
        db = await get_db()
        
        if user.role != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can publish assessments")
        
        if not ObjectId.is_valid(assessment_id):
            raise HTTPException(status_code=400, detail="Invalid assessment ID")
        
        # Update assessment status
        result = await db.assessments.update_one(
            {"_id": ObjectId(assessment_id), "created_by": str(user.id)},
            {"$set": {"status": "active", "is_active": True}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Assessment not found or access denied")
        
        # Get assessment details for notifications
        assessment = await db.assessments.find_one({"_id": ObjectId(assessment_id)})
        
        # Get assigned batches
        assigned_batches = assessment.get("assigned_batches", [])
        
        # Create notifications for students in assigned batches
        for batch_id in assigned_batches:
            # Get students in this batch
            batch = await db.batches.find_one({"_id": ObjectId(batch_id)})
            if batch:
                student_ids = batch.get("student_ids", [])
                
                # Create notifications for each student
                notifications = []
                for student_id in student_ids:
                    # Prefer subject if topic is not present
                    subject_or_topic = assessment.get("subject") or assessment.get("topic", "Assessment")
                    notification = {
                        "student_id": student_id,
                        "type": "assessment_assigned",
                        "title": f"New Assessment: {assessment.get('title', 'Untitled')}",
                        "message": f"A new {assessment.get('difficulty', 'medium')} assessment on {subject_or_topic} has been assigned to you.",
                        "assessment_id": assessment_id,
                        "created_at": datetime.utcnow(),
                        "is_read": False
                    }
                    notifications.append(notification)
                
                if notifications:
                    await db.notifications.insert_many(notifications)
        
        return {"success": True, "message": "Assessment published successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{assessment_id}/assign-batches")
async def assign_assessment_to_batches(
    assessment_id: str, 
    batch_ids: List[str], 
    user: UserModel = Depends(get_current_user)
):
    """Assign assessment to specific batches"""
    try:
        db = await get_db()
        
        print(f"[DEBUG] [ASSESSMENT] Assigning assessment {assessment_id} to {len(batch_ids)} batches")
        
        if user.role not in ["teacher", "admin"]:
            raise HTTPException(status_code=403, detail="Only teachers and admins can assign assessments")
        
        if not ObjectId.is_valid(assessment_id):
            raise HTTPException(status_code=400, detail="Invalid assessment ID")
        
        # Get assessment details
        assessment = await db.assessments.find_one({"_id": ObjectId(assessment_id)})
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Validate batch IDs and collect student counts
        valid_batch_ids = []
        total_students = 0
        batch_details = []
        
        for batch_id in batch_ids:
            if ObjectId.is_valid(batch_id):
                batch = await db.batches.find_one({
                    "_id": ObjectId(batch_id), 
                    "teacher_id": str(user.id)
                })
                if batch:
                    valid_batch_ids.append(batch_id)
                    
                    # Count students in this batch
                    student_count = await db.users.count_documents({
                        "batch_id": ObjectId(batch_id),
                        "role": "student"
                    })
                    total_students += student_count
                    batch_details.append({
                        "batch_id": batch_id,
                        "batch_name": batch["name"],
                        "student_count": student_count
                    })
                    
                    # Create notifications for students in this batch
                    students = await db.users.find({
                        "batch_id": ObjectId(batch_id),
                        "role": "student"
                    }).to_list(length=None)
                    
                    for student in students:
                        notification = {
                            "user_id": student["_id"],
                            "type": "assessment_assigned",
                            "title": f"New Assessment: {assessment.get('title', 'Untitled')}",
                            "message": f"A new assessment has been assigned to your batch '{batch['name']}'. Complete it before the deadline.",
                            "assessment_id": ObjectId(assessment_id),
                            "batch_id": ObjectId(batch_id),
                            "teacher_id": ObjectId(user.id),
                            "created_at": datetime.utcnow(),
                            "is_read": False,
                            "priority": "high"
                        }
                        await db.notifications.insert_one(notification)
        
        # Update assessment with assigned batches
        await db.assessments.update_one(
            {"_id": ObjectId(assessment_id)},
            {"$set": {
                "assigned_batches": valid_batch_ids,
                "updated_at": datetime.utcnow()
            }}
        )
        
        print(f"[SUCCESS] [ASSESSMENT] Assigned assessment to {len(valid_batch_ids)} batches, notified {total_students} students")
        
        return {
            "success": True,
            "message": f"Assessment assigned to {len(valid_batch_ids)} batch(es)",
            "batch_count": len(valid_batch_ids),
            "student_count": total_students,
            "batches": batch_details
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] [ASSESSMENT] Error assigning assessment: {str(e)}")
        import traceback
        print(f"[ERROR] [ASSESSMENT] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
