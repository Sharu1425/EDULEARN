"""
Teacher Assessment Operations
Handles teacher-specific assessment creation and management
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel
from ...db import get_db
from ...dependencies import require_teacher_or_admin
from ...models.models import UserModel

router = APIRouter(tags=["teacher-assessments"])

# Teacher Assessment Models
class TeacherAssessmentCreate(BaseModel):
    title: str
    topic: Optional[str] = None
    difficulty: str
    question_count: Optional[int] = None
    batches: Optional[List[str]] = None
    type: str = "ai_generated"
    # Additional fields for different assessment types
    description: Optional[str] = None
    questions: Optional[List[dict]] = None
    time_limit: Optional[int] = None

class TeacherAssessmentResponse(BaseModel):
    success: bool
    assessment_id: str
    message: str

@router.post("/assessments/create", response_model=TeacherAssessmentResponse)
async def create_teacher_assessment(
    assessment_data: TeacherAssessmentCreate,
    current_user: UserModel = Depends(require_teacher_or_admin)
):
    """Create an assessment for students"""
    try:
        db = await get_db()
        
        print(f"🤖 [TEACHER ASSESSMENT] Creating {assessment_data.type} assessment: {assessment_data.title}")
        
        # Generate unique assessment ID
        assessment_id = str(ObjectId())
        
        # Validate required fields
        if not assessment_data.batches or len(assessment_data.batches) == 0:
            raise HTTPException(status_code=400, detail="At least one batch must be selected")
        
        # Handle different assessment types
        if assessment_data.type == "ai_generated":
            if not assessment_data.topic or not assessment_data.question_count:
                raise HTTPException(status_code=400, detail="Topic and question count are required for AI-generated assessments")
            
            # Generate questions using Gemini AI
            from app.services.gemini_coding_service import GeminiCodingService
            gemini_service = GeminiCodingService()
            
            generated_questions = await gemini_service.generate_mcq_questions(
                topic=assessment_data.topic,
                difficulty=assessment_data.difficulty,
                count=assessment_data.question_count
            )
        else:
            # Use provided questions for manual assessments
            generated_questions = assessment_data.questions or []
            if len(generated_questions) == 0:
                raise HTTPException(status_code=400, detail="At least one question is required for manual assessments")
        
        # Store in teacher_assessments collection
        teacher_assessment = {
            "_id": ObjectId(assessment_id),
            "title": assessment_data.title,
            "topic": assessment_data.topic,
            "difficulty": assessment_data.difficulty,
            "question_count": assessment_data.question_count or len(generated_questions),
            "questions": generated_questions,
            "batches": assessment_data.batches or [],
            "teacher_id": str(current_user.id),  # Store as string for consistency
            "type": assessment_data.type,
            "created_at": datetime.utcnow(),
            "is_active": True,
            "status": "active"
        }
        
        # Add optional fields if provided
        if assessment_data.description:
            teacher_assessment["description"] = assessment_data.description
        if assessment_data.time_limit:
            teacher_assessment["time_limit"] = assessment_data.time_limit
        
        await db.teacher_assessments.insert_one(teacher_assessment)
        
        # Store questions in ai_questions collection for review
        for i, question in enumerate(generated_questions):
            ai_question_doc = {
                "assessment_id": assessment_id,
                "question_number": i + 1,
                "question": question["question"],
                "options": question["options"],
                "correct_answer": question["correct_answer"],
                "explanation": question.get("explanation", ""),
                "difficulty": assessment_data.difficulty,
                "topic": assessment_data.topic,
                "generated_at": datetime.utcnow(),
                "teacher_id": str(current_user.id),  # Store as string for consistency
                "status": "generated"
            }
            await db.ai_questions.insert_one(ai_question_doc)
        
        # Get all students from selected batches
        student_ids = []
        batches = assessment_data.batches or []
        for batch_id in batches:
            batch = await db.batches.find_one({"_id": ObjectId(batch_id)})
            if batch and batch.get("student_ids"):
                # Get students by their IDs from the batch
                batch_student_ids = batch["student_ids"]
                student_ids.extend(batch_student_ids)
                print(f"📢 [TEACHER_ASSESSMENT] Found {len(batch_student_ids)} students in batch {batch_id}")
            else:
                print(f"❌ [TEACHER_ASSESSMENT] No students found in batch {batch_id}")
        
        # Note: Notifications are now sent when the assessment is published, not on creation
        # This prevents duplicate notifications when assign-batches and publish are called separately
        
        print(f"✅ [TEACHER ASSESSMENT] Created assessment {assessment_id} with {len(generated_questions)} questions")
        print(f"📢 [TEACHER ASSESSMENT] Assessment will notify students when published")
        
        return TeacherAssessmentResponse(
            success=True,
            assessment_id=assessment_id,
            message=f"Assessment '{assessment_data.title}' created successfully with {len(generated_questions)} questions"
        )
        
    except Exception as e:
        print(f"❌ [TEACHER ASSESSMENT] Failed to create assessment: {str(e)}")
        import traceback
        print(f"❌ [TEACHER ASSESSMENT] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create assessment: {str(e)}"
        )

@router.get("/assessments")
async def get_teacher_assessments(current_user: UserModel = Depends(require_teacher_or_admin)):
    """Get all assessments created by the teacher"""
    try:
        db = await get_db()
        
        # Get teacher assessments - handle both string and ObjectId for backward compatibility
        user_id_str = str(current_user.id)
        user_id_obj = ObjectId(user_id_str) if ObjectId.is_valid(user_id_str) else None
        
        query = {
            "$or": [
                {"teacher_id": user_id_str},
                {"teacher_id": current_user.id}
            ]
        }
        
        if user_id_obj:
            query["$or"].append({"teacher_id": user_id_obj})
        
        assessments = await db.teacher_assessments.find(query).sort("created_at", -1).to_list(length=None)
        
        # Format assessments
        assessment_list = []
        for assessment in assessments:
            # Count submissions
            submission_count = await db.teacher_assessment_results.count_documents({
                "assessment_id": str(assessment["_id"])
            })
            
            assessment_list.append({
                "id": str(assessment["_id"]),
                "title": assessment["title"],
                "topic": assessment["topic"],
                "difficulty": assessment["difficulty"],
                "question_count": assessment["question_count"],
                "batches": assessment.get("batches", []),
                "status": assessment["status"],
                "is_active": assessment["is_active"],
                "created_at": assessment["created_at"].isoformat(),
                "submission_count": submission_count
            })
        
        return assessment_list
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/assessments/{assessment_id}")
async def get_teacher_assessment_details(
    assessment_id: str,
    current_user: UserModel = Depends(require_teacher_or_admin)
):
    """Get detailed information about a teacher-created assessment"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(assessment_id):
            raise HTTPException(status_code=400, detail="Invalid assessment ID")
        
        # Get assessment
        assessment = await db.teacher_assessments.find_one({
            "_id": ObjectId(assessment_id),
            "teacher_id": str(current_user.id)
        })
        
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Get submissions
        submissions = await db.teacher_assessment_results.find({
            "assessment_id": assessment_id
        }).sort("submitted_at", -1).to_list(length=None)
        
        # Calculate statistics
        if submissions:
            avg_percentage = sum(sub["percentage"] for sub in submissions) / len(submissions)
            total_students = len(set(sub["student_id"] for sub in submissions))
        else:
            avg_percentage = 0
            total_students = 0
        
        # Get batch information
        batch_info = []
        for batch_id in assessment.get("batches", []):
            batch = await db.batches.find_one({"_id": ObjectId(batch_id)})
            if batch:
                batch_info.append({
                    "id": batch_id,
                    "name": batch["name"],
                    "student_count": len(batch.get("student_ids", []))
                })
        
        return {
            "assessment_info": {
                "id": assessment_id,
                "title": assessment["title"],
                "topic": assessment["topic"],
                "difficulty": assessment["difficulty"],
                "question_count": assessment["question_count"],
                "questions": assessment.get("questions", []),
                "status": assessment["status"],
                "is_active": assessment["is_active"],
                "created_at": assessment["created_at"].isoformat()
            },
            "statistics": {
                "total_submissions": len(submissions),
                "total_students": total_students,
                "average_percentage": round(avg_percentage, 2),
                "batches": batch_info
            },
            "recent_submissions": [
                {
                    "student_id": sub["student_id"],
                    "student_name": sub["student_name"],
                    "score": sub["score"],
                    "percentage": sub["percentage"],
                    "time_taken": sub["time_taken"],
                    "submitted_at": sub["submitted_at"].isoformat()
                }
                for sub in submissions[:10]
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/assessments/{assessment_id}/submit")
async def submit_teacher_assessment(
    assessment_id: str,
    submission_data: dict,
    user: UserModel = Depends(require_teacher_or_admin)
):
    """Submit answers for a teacher-created assessment"""
    try:
        db = await get_db()
        
        if user.role != "student":
            raise HTTPException(status_code=403, detail="Only students can submit assessments")
        
        if not ObjectId.is_valid(assessment_id):
            raise HTTPException(status_code=400, detail="Invalid assessment ID")
        
        # Get assessment
        assessment = await db.teacher_assessments.find_one({"_id": ObjectId(assessment_id)})
        
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Check if assessment is active
        if not assessment.get("is_active", False):
            raise HTTPException(status_code=403, detail="Assessment is not active")
        
        # Check if student already submitted
        existing_submission = await db.teacher_assessment_results.find_one({
            "assessment_id": assessment_id,
            "student_id": user.id
        })
        
        if existing_submission:
            raise HTTPException(status_code=400, detail="Assessment already submitted")
        
        # Get questions and calculate score
        questions = assessment.get("questions", [])
        answers = submission_data.get("answers", [])
        time_taken = submission_data.get("time_taken", 0)
        
        if len(answers) != len(questions):
            raise HTTPException(status_code=400, detail="Invalid number of answers")
        
        # Calculate score
        correct_answers = 0
        for i, question in enumerate(questions):
            if i < len(answers) and answers[i] == question.get("correct_answer", -1):
                correct_answers += 1
        
        score = correct_answers
        percentage = (correct_answers / len(questions)) * 100 if questions else 0
        
        # Convert answers to text for review
        user_answers_text = []
        for i, question in enumerate(questions):
            if i < len(answers):
                user_answer_raw = answers[i]
                options = question.get("options", [])
                
                # Convert to text if it's an index
                if isinstance(user_answer_raw, int) and 0 <= user_answer_raw < len(options):
                    user_answers_text.append(options[user_answer_raw])
                else:
                    user_answers_text.append(str(user_answer_raw))
            else:
                user_answers_text.append("")
        
        # Create result record
        result_doc = {
            "assessment_id": assessment_id,
            "student_id": ObjectId(user.id) if isinstance(user.id, str) else user.id,  # Ensure ObjectId format
            "student_name": user.username or user.email,
            "score": score,
            "total_questions": len(questions),
            "percentage": percentage,
            "time_taken": time_taken,
            "answers": answers,  # Keep original format
            "user_answers": user_answers_text,  # Add text format for review
            "questions": questions,  # Store questions for review
            "submitted_at": datetime.utcnow(),
            "created_at": datetime.utcnow()
        }
        
        result = await db.teacher_assessment_results.insert_one(result_doc)
        
        # Award bonus credits for good performance (> 75%)
        if percentage >= 75.0:
            try:
                from ...services import credits_service
                await credits_service.add_credits(str(user.id), 10, f"assessment_performance_bonus_{assessment_id}")
                print(f"💰 [CREDITS] Awarded performance bonus to student {user.id} for {percentage:.1f}% score")
            except Exception as credits_err:
                print(f"⚠️ [CREDITS] Failed to award performance bonus: {credits_err}")
                
        # Create notification for student about result
        notification = {
            "student_id": user.id,
            "type": "teacher_assessment_result",
            "title": f"Assessment Result: {assessment['title']}",
            "message": f"Your assessment result is available. Score: {score}/{len(questions)} ({percentage:.1f}%)",
            "assessment_id": assessment_id,
            "created_at": datetime.utcnow(),
            "is_read": False
        }
        await db.notifications.insert_one(notification)
        
        # Create assessment completion notifications
        teacher_id = assessment.get("teacher_id")
        await create_assessment_completion_notification(
            db, user.id, assessment["title"], percentage, teacher_id
        )
        
        return {
            "success": True,
            "result_id": str(result.inserted_id),
            "score": score,
            "percentage": percentage,
            "message": "Assessment submitted successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
            "created_at": datetime.utcnow(),
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
                "created_at": datetime.utcnow(),
                "is_read": False
            }
            
            await db.notifications.insert_one(teacher_notification)
        
        print(f"✅ [NOTIFICATIONS] Created assessment completion notifications for student {student_id}")
        
    except Exception as e:
        print(f"❌ [NOTIFICATIONS] Failed to create assessment completion notification: {str(e)}")
