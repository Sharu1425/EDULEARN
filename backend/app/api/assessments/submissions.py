"""
Assessment Submission Handling
Handles student submissions, scoring, and result processing
"""
from fastapi import APIRouter, HTTPException, Depends, status # Added status import
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from ...db import get_db
from ...schemas.schemas import (
    AssessmentSubmission, AssessmentResult, AssessmentSubmissionResponse,
    CodingSubmission, CodingSubmissionResponse, AssessmentLeaderboard, LeaderboardEntry,
    # Assuming StudentAssessment schema exists in schemas.py
    StudentAssessment
)
from ...dependencies import get_current_user
from ...models.models import UserModel
from .notifications import create_assessment_completion_notification

# Added import for logging
import logging
import random
logger = logging.getLogger(__name__)


router = APIRouter(prefix="/assessments", tags=["assessments-submissions"])

@router.get("/student/available", response_model=List[AssessmentSubmissionResponse])
async def get_available_assessments(user: UserModel = Depends(get_current_user)):
    """Get assessments available to the current student"""
    try:
        db = await get_db()

        if user.role != "student":
            raise HTTPException(status_code=403, detail="Only students can access this endpoint")

        # Get student's batch
        student = await db.users.find_one({"_id": ObjectId(user.id)})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        student_batch_id = student.get("batch_id")
        if not student_batch_id:
            logger.warning(f"Student {user.id} has no batch assigned.")
            return []  # No batch assigned

        # Ensure batch_id is a string for querying
        student_batch_id_str = str(student_batch_id)

        # Get assessments assigned to student's batch
        assessments = await db.assessments.find({
            "assigned_batches": student_batch_id_str, # Query using string
            "status": {"$in": ["published", "active"]},
            "is_active": True
        }).to_list(length=None)
        logger.info(f"Found {len(assessments)} regular assessments for batch {student_batch_id_str}.")

        # Also check teacher assessments
        teacher_assessments = []
        try:
             collections = await db.list_collection_names()
             if "teacher_assessments" in collections:
                teacher_assessments = await db.teacher_assessments.find({
                    "batches": student_batch_id_str, # Query using string
                    "status": {"$in": ["published", "active"]},
                    "is_active": True
                }).to_list(length=None)
                logger.info(f"Found {len(teacher_assessments)} teacher assessments for batch {student_batch_id_str}.")
             else:
                 logger.warning("'teacher_assessments' collection not found.")
        except Exception as e:
            logger.error(f"Error querying teacher_assessments: {e}")


        # Format assessments
        available_assessments = []
        submitted_ids = set() # Use a set for efficient lookup

        # Pre-fetch submitted IDs
        try:
            submitted_cursor = db.assessment_submissions.find({"student_id": user.id}, {"assessment_id": 1})
            async for sub in submitted_cursor:
                if sub.get("assessment_id"): submitted_ids.add(str(sub["assessment_id"]))

            if "teacher_assessment_results" in collections:
                teacher_submitted_cursor = db.teacher_assessment_results.find({"student_id": user.id}, {"assessment_id": 1})
                async for sub in teacher_submitted_cursor:
                    if sub.get("assessment_id"): submitted_ids.add(str(sub["assessment_id"]))
            logger.info(f"Student {user.id} has submitted {len(submitted_ids)} assessments.")
        except Exception as e:
            logger.error(f"Error fetching submitted assessments for user {user.id}: {e}")


        combined_assessments = assessments + teacher_assessments
        logger.info(f"Total potential assessments before filtering: {len(combined_assessments)}")

        for assessment in combined_assessments:
            assessment_id_str = str(assessment["_id"])

            # Skip if already submitted
            if assessment_id_str in submitted_ids:
                logger.debug(f"Skipping assessment {assessment_id_str}, already submitted.")
                continue

            # Safely get question count
            q_count = assessment.get("question_count", 0)
            if not q_count and "questions" in assessment:
                q_count = len(assessment.get("questions", []))

            available_assessments.append(AssessmentSubmissionResponse(
                id=assessment_id_str,
                assessment_id=assessment_id_str,
                student_id=str(user.id), # Ensure string ID
                student_name=user.username or user.email,
                student_email=user.email,
                score=0,  # Not submitted yet
                percentage=0.0,
                time_taken=0,
                submitted_at=datetime.utcnow().isoformat(),
                total_questions=q_count
            ))

        logger.info(f"Returning {len(available_assessments)} available assessments for student {user.id}.")
        return available_assessments

    except HTTPException:
        raise # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"Error in get_available_assessments for user {user.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get available assessments: {e}")


# --- Corrected /student/upcoming endpoint ---
# Define the response model using StudentAssessment from schemas
@router.get("/student/upcoming", response_model=List[StudentAssessment])
async def get_student_upcoming_assessments(user: UserModel = Depends(get_current_user)):
    """Get upcoming assessments for the current student from all sources."""
    try:
        logger.info("=" * 50)
        logger.info(f"STUDENT UPCOMING ENDPOINT CALLED!")
        logger.info(f"Student: {user.email} (ID: {user.id})")
        logger.info("=" * 50)
        db = await get_db()

        if user.role != "student":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can access this endpoint")

        # Get student's batch_ids (a student might be in multiple batches)
        logger.info(f"🔍 [STUDENT-UPCOMING] Looking for batches containing student {user.id}")
        try:
            # Ensure user.id is queried correctly (might be ObjectId or str)
            student_batches = await db.batches.find({
                "student_ids": str(user.id) # Query using string representation
            }).to_list(length=None)
        except Exception as e:
            logger.error(f"❌ [STUDENT-UPCOMING] Error finding batches for student {user.id}: {e}")
            return []

        logger.info(f"📊 [STUDENT-UPCOMING] Found {len(student_batches)} batches for student")
        for batch in student_batches:
             logger.info(f"  - Batch: {batch.get('name', 'Unknown')} (ID: {batch['_id']})")

        if not student_batches:
            logger.warning(f"⚠️ [STUDENT-UPCOMING] Student {user.id} is not in any batch")
            return []

        batch_ids = [str(batch["_id"]) for batch in student_batches]
        logger.info(f"🔍 [STUDENT-UPCOMING] Student {user.id} is in batches: {batch_ids}")

        # Find active assessments assigned to these batches
        assessments = []
        logger.info(f"🔍 [STUDENT-UPCOMING] Searching for regular assessments in batches: {batch_ids}")
        try:
            regular_assessments = await db.assessments.find({
                "assigned_batches": {"$in": batch_ids},
                "is_active": True,
                "status": "active" # Ensure only active ones are fetched
            }).to_list(length=None)
            assessments.extend(regular_assessments)
            logger.info(f"📊 [STUDENT-UPCOMING] Found {len(regular_assessments)} regular assessments")
        except Exception as e:
            logger.error(f"❌ [STUDENT-UPCOMING] Error finding regular assessments: {e}")

        logger.info(f"🔍 [STUDENT-UPCOMING] Searching for teacher assessments in batches: {batch_ids}")
        try:
            # Check if teacher_assessments collection exists before querying
            collections = await db.list_collection_names()
            if "teacher_assessments" in collections:
                teacher_assessments = await db.teacher_assessments.find({
                    "batches": {"$in": batch_ids},
                    "is_active": True,
                    "status": {"$in": ["active", "published"]} # Published or active
                }).to_list(length=None)
                assessments.extend(teacher_assessments)
                logger.info(f"📊 [STUDENT-UPCOMING] Found {len(teacher_assessments)} teacher assessments")
            else:
                 logger.warning("⚠️ [STUDENT-UPCOMING] 'teacher_assessments' collection not found.")

        except Exception as e:
            logger.error(f"❌ [STUDENT-UPCOMING] Error finding teacher assessments: {e}")

        logger.info(f"📊 [STUDENT-UPCOMING] Total assessments found across sources: {len(assessments)}")

        # Check submitted assessments from both collections
        submitted_ids = set()
        logger.info(f"🔍 [STUDENT-UPCOMING] Checking submissions for student {user.id}")
        try:
            # Check assessment_submissions
            submitted_cursor = db.assessment_submissions.find(
                {"student_id": user.id}, # Use user.id directly if it's string
                {"assessment_id": 1}
            )
            async for sub in submitted_cursor:
                if sub.get("assessment_id"):
                    submitted_ids.add(str(sub["assessment_id"]))
            logger.info(f"📊 [STUDENT-UPCOMING] Found {len(submitted_ids)} regular submissions")

            # Check teacher_assessment_results
            if "teacher_assessment_results" in collections:
                teacher_submitted_cursor = db.teacher_assessment_results.find(
                    {"student_id": user.id}, # Use user.id directly if it's string
                    {"assessment_id": 1}
                )
                async for sub in teacher_submitted_cursor:
                     if sub.get("assessment_id"):
                        submitted_ids.add(str(sub["assessment_id"]))
                logger.info(f"📊 [STUDENT-UPCOMING] Found submissions in teacher_assessment_results, total submitted IDs now: {len(submitted_ids)}")
            else:
                 logger.warning("⚠️ [STUDENT-UPCOMING] 'teacher_assessment_results' collection not found.")

        except Exception as e:
            logger.error(f"❌ [STUDENT-UPCOMING] Error checking submissions: {e}")
            # Continue, but might show already submitted assessments

        logger.info(f"📋 [STUDENT-UPCOMING] Submitted assessment IDs: {submitted_ids}")

        # Filter out already submitted assessments
        upcoming_assessments = [
            assessment for assessment in assessments
            if str(assessment["_id"]) not in submitted_ids
        ]

        logger.info(f"📊 [STUDENT-UPCOMING] After filtering submissions: {len(upcoming_assessments)} upcoming assessments")

        # Format response using StudentAssessment schema
        result = []
        teacher_cache = {} # Cache teacher names to reduce DB lookups

        for assessment in upcoming_assessments:
            try:
                # Determine teacher ID source and get teacher name
                teacher_id = assessment.get("created_by") or assessment.get("teacher_id")
                teacher_id_str = str(teacher_id) if teacher_id else None # Ensure it's a string or None
                teacher_name = "Unknown Teacher"

                if teacher_id_str and teacher_id_str != 'None':
                    if teacher_id_str in teacher_cache:
                        teacher_name = teacher_cache[teacher_id_str]
                    else:
                        try:
                           # Try fetching teacher by ObjectId first, then string
                           teacher_oid = None
                           if ObjectId.is_valid(teacher_id_str):
                               teacher_oid = ObjectId(teacher_id_str)

                           teacher = None
                           if teacher_oid:
                               teacher = await db.users.find_one({"_id": teacher_oid})
                           if not teacher: # Fallback to string ID check if ObjectId failed or ID wasn't valid ObjectId
                                teacher = await db.users.find_one({"_id": teacher_id_str})

                           if teacher:
                               teacher_name = teacher.get("full_name") or teacher.get("username", "Unknown Teacher")
                               teacher_cache[teacher_id_str] = teacher_name
                           else:
                                logger.warning(f"⚠️ Teacher not found for ID: {teacher_id_str}")
                        except Exception as find_teacher_error:
                             logger.error(f"❌ Error fetching teacher {teacher_id_str}: {find_teacher_error}")


                # Handle potential missing fields and ensure correct types
                created_at_dt = assessment.get("created_at", datetime.utcnow())
                created_at_iso = created_at_dt.isoformat() if isinstance(created_at_dt, datetime) else str(created_at_dt)

                # Safely get question count
                q_count = assessment.get("question_count", 0)
                if not q_count and "questions" in assessment:
                    q_count = len(assessment.get("questions", []))

                assessment_item = StudentAssessment(
                    id=str(assessment["_id"]),
                    title=assessment.get("title", "Untitled Assessment"),
                    subject=assessment.get("subject") or assessment.get("topic", "General"),
                    difficulty=assessment.get("difficulty", "medium"),
                    description=assessment.get("description", ""),
                    time_limit=assessment.get("time_limit", 30), # Default time limit
                    question_count=q_count,
                    type=assessment.get("type", "mcq"),
                    is_active=assessment.get("is_active", False), # Use is_active status
                    created_at=created_at_iso,
                    teacher_name=teacher_name
                )
                result.append(assessment_item)
                logger.debug(f"  ✅ Added upcoming assessment: {assessment_item.title}")

            except Exception as format_error:
                logger.error(f"❌ [STUDENT-UPCOMING] Error formatting assessment {assessment.get('_id', 'unknown')}: {format_error}", exc_info=True)
                continue

        logger.info(f"✅ [STUDENT-UPCOMING] Returning {len(result)} formatted upcoming assessments")
        return result

    except HTTPException:
        # Re-raise HTTP exceptions directly
        raise
    except Exception as e:
        logger.error(f"❌ [STUDENT-UPCOMING] Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch upcoming assessments")


@router.get("/student/upcoming-test")
async def get_student_upcoming_assessments_test(user: UserModel = Depends(get_current_user)):
    """Test endpoint for upcoming assessments"""
    try:
        logger.info("=" * 50)
        logger.info(f"TEST ENDPOINT CALLED!")
        logger.info(f"Student: {user.email} (ID: {user.id})")
        logger.info("=" * 50)

        if user.role != "student":
            raise HTTPException(status_code=403, detail="Only students can access this endpoint")

        # Return test data matching StudentAssessment structure
        return [
             StudentAssessment(
                id="test-assessment-1",
                title="Test Assessment",
                subject="General",
                difficulty="medium",
                description="This is a test assessment",
                time_limit=30,
                question_count=5,
                type="mcq",
                is_active=True,
                created_at=datetime.utcnow().isoformat(),
                teacher_name="Test Teacher"
            )
        ]

    except Exception as e:
        logger.error(f"[ERROR] [TEST] Error in test endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Test endpoint failed: {str(e)}")


@router.get("/teacher/upcoming")
async def get_teacher_upcoming_assessments(user: UserModel = Depends(get_current_user)):
    """Get upcoming assessments for the current teacher"""
    try:
        db = await get_db()

        if user.role != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can access this endpoint")

        # Get teacher's upcoming assessments (draft or scheduled)
        # Querying assessments collection, adjust if teacher assessments are elsewhere
        assessments = await db.assessments.find({
            "created_by": str(user.id), # Assuming teacher ID stored as string
            "status": {"$in": ["draft", "scheduled"]},
            # "is_active": True # Maybe upcoming shouldn't depend on is_active? Check logic.
        }).sort("created_at", -1).to_list(length=None) # Added sort

        # Format the response
        upcoming_assessments = []
        for assessment in assessments:
            # Format created_at safely
            created_at_dt = assessment.get("created_at", datetime.utcnow())
            created_at_iso = created_at_dt.isoformat() if isinstance(created_at_dt, datetime) else str(created_at_dt)

            # Format scheduled_date and due_date safely
            scheduled_date = assessment.get("scheduled_date")
            scheduled_date_iso = scheduled_date.isoformat() if isinstance(scheduled_date, datetime) else str(scheduled_date) if scheduled_date else None

            due_date = assessment.get("due_date")
            due_date_iso = due_date.isoformat() if isinstance(due_date, datetime) else str(due_date) if due_date else None


            upcoming_assessments.append({
                "id": str(assessment["_id"]),
                "title": assessment.get("title", "Untitled Assessment"),
                "description": assessment.get("description", ""),
                "status": assessment.get("status", "draft"),
                "created_at": created_at_iso,
                "scheduled_date": scheduled_date_iso,
                "due_date": due_date_iso,
                "question_count": assessment.get("question_count", len(assessment.get("questions", []))),
                "assigned_batches": assessment.get("assigned_batches", [])
            })

        return upcoming_assessments

    except Exception as e:
        logger.error(f"[ERROR] [ASSESSMENTS] Error fetching upcoming teacher assessments: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch upcoming assessments: {str(e)}")


@router.post("/{assessment_id}/submit", response_model=AssessmentResult)
async def submit_assessment(
    assessment_id: str,
    submission_data: AssessmentSubmission,
    user: UserModel = Depends(get_current_user)
):
    """Submit assessment answers"""
    try:
        db = await get_db()

        if user.role != "student":
            raise HTTPException(status_code=403, detail="Only students can submit assessments")

        if not ObjectId.is_valid(assessment_id):
            raise HTTPException(status_code=400, detail="Invalid assessment ID")

        # Get assessment
        assessment = await db.assessments.find_one({"_id": ObjectId(assessment_id)})

        is_teacher_assessment = False
        if not assessment:
            # Try teacher assessments
            collections = await db.list_collection_names()
            if "teacher_assessments" in collections:
                assessment = await db.teacher_assessments.find_one({"_id": ObjectId(assessment_id)})
                if assessment:
                    is_teacher_assessment = True

        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")

        # Check if assessment is available
        if assessment.get("status") not in ["published", "active"]:
            raise HTTPException(status_code=403, detail="Assessment not available")

        # Check if student already submitted (check appropriate collection)
        submission_collection_name = "teacher_assessment_results" if is_teacher_assessment and "teacher_assessment_results" in collections else "assessment_submissions"
        submission_collection = db[submission_collection_name]

        existing_submission = await submission_collection.find_one({
            "assessment_id": assessment_id,
            "student_id": user.id # Query using user.id (depends on how it's stored)
        })

        if existing_submission:
            raise HTTPException(status_code=400, detail="Assessment already submitted")

        # Get questions
        questions = assessment.get("questions", [])
        if not questions:
            raise HTTPException(status_code=400, detail="Assessment has no questions")
            
        # Check active session heartbeat
        session = await db.active_sessions.find_one({
             "student_id": str(user.id), 
             "assessment_id": assessment_id, 
             "is_active": True
        })
        if session:
             time_diff = (datetime.utcnow() - session.get("last_heartbeat", datetime.utcnow())).total_seconds()
             if time_diff > 90:
                 logger.warning(f"Student {user.id} heartbeat missing for {time_diff}s!")
                 # Mark submission as suspicious (add to violations)
                 if not hasattr(submission_data, 'violations'):
                     submission_data.violations = []
                 submission_data.violations.append({
                     "type": "heartbeat_timeout",
                     "detail": f"No heartbeat for {time_diff}s",
                     "strike_number": 1,
                     "timestamp": datetime.utcnow().isoformat()
                 })
             
             # Deactivate session
             await db.active_sessions.update_one(
                 {"_id": session["_id"]},
                 {"$set": {"is_active": False}}
             )

        # --- AUTHORITATIVE GRADING (Strategy 1/2/3 from results.py) ---
        # Note: We REMOVED the server-side shuffle here. Server-side shuffling during submission
        # is dangerous as it may mismatch the student's frontend order.
        # Instead, we grade based on the original question order and Authoritative Answer Texts.
        
        score = 0
        total_questions = len(questions)
        user_answers_text = []

        print(f"📊 [SUBMISSION] Autorative grading for {total_questions} questions (User: {user.id})")
        
        for i, question in enumerate(questions):
            options = question.get("options", [])
            user_answer_idx = submission_data.answers[i] if i < len(submission_data.answers) else -1
            
            # Ground Truth Retrieval
            correct_idx = question.get("correct_answer")
            expected_text = question.get("answer", "")
            
            # 1. Derive Expected Text (Authoritative)
            derived_expected = str(expected_text).strip()
            if isinstance(correct_idx, int) and 0 <= correct_idx < len(options):
                derived_expected = options[correct_idx]
            
            # 2. Letter normalization (handle A/B/C/D stored in DB)
            if not derived_expected or derived_expected.upper() in ["A", "B", "C", "D"]:
                letter = str(expected_text).upper() if expected_text else ""
                if letter in ["A", "B", "C", "D"]:
                    idx = ord(letter) - ord("A")
                    if idx < len(options): 
                        derived_expected = options[idx]

            # 3. Derive User Answer Text
            user_text = ""
            if isinstance(user_answer_idx, int) and 0 <= user_answer_idx < len(options):
                user_text = options[user_answer_idx]
            else:
                user_text = str(user_answer_idx) if user_answer_idx != -1 else ""

            # 4. Normalized Comparison
            is_correct = False
            if user_answer_idx != -1:
                clean_user = str(user_text).strip().lower()
                clean_expected = str(derived_expected).strip().lower()
                
                # Check 1: Text match
                if clean_user == clean_expected and clean_user != "":
                    is_correct = True
                
                # Check 2: Index match (fallback)
                if not is_correct:
                    try:
                        if correct_idx is not None and int(user_answer_idx) == int(correct_idx):
                            is_correct = True
                    except (ValueError, TypeError):
                        pass
            
            if is_correct:
                score += 1
            
            user_answers_text.append(user_text)
            status = "✓" if is_correct else "✗"
            print(f"   [Q{i+1}: {status}] User Index: {user_answer_idx} ('{user_text}'), Expected: '{derived_expected}'")

        percentage = (score / total_questions) * 100 if total_questions > 0 else 0

        # Create submission record in the correct collection
        submission_doc = {
            "assessment_id": assessment_id,
            "student_id": user.id, # Store consistently (e.g., always string)
            "student_name": user.username or user.email,
            "answers": submission_data.answers, # Raw answers
            "score": score,
            "percentage": round(percentage, 2), # Round percentage
            "time_taken": submission_data.time_taken,
            "submitted_at": datetime.utcnow(),
            "total_questions": total_questions,
            "questions": questions,
            "user_answers": user_answers_text, # Text answers
            "is_malpractice": submission_data.is_malpractice,
            "violations": submission_data.violations if hasattr(submission_data, 'violations') else [],
            "answers_timing": submission_data.answers_timing if hasattr(submission_data, 'answers_timing') else []
        }
        if not is_teacher_assessment:
             submission_doc["attempt_number"] = 1 # Only for regular assessments?

        result = await submission_collection.insert_one(submission_doc)

        # Create completion notification - ensure IDs are strings
        teacher_id = assessment.get("created_by") or assessment.get("teacher_id")
        teacher_id_str = str(teacher_id) if teacher_id else None
        assessment_title = assessment.get("title", "Assessment")
        await create_assessment_completion_notification(
            db, str(user.id), assessment_title, percentage, teacher_id_str
        )

        # Award bonus credits for good performance (> 75%)
        # This applies to all assessments submitted through this main endpoint
        if percentage >= 75.0:
            try:
                from ...services import credits_service
                reward_amount = 10 if is_teacher_assessment else 5
                await credits_service.add_credits(
                    str(user.id), 
                    reward_amount, 
                    f"assessment_performance_bonus_{assessment_id}"
                )
                logger.info(f"💰 [CREDITS] Awarded {reward_amount} performance bonus to student {user.id} for {percentage:.1f}% score")
            except Exception as credits_err:
                logger.error(f"⚠️ [CREDITS] Failed to award performance bonus: {credits_err}")

        # Return AssessmentResult structure
        return AssessmentResult(
            id=str(result.inserted_id),
            assessment_id=assessment_id,
            student_id=str(user.id), # Ensure string ID
            student_name=user.username or user.email,
            score=float(score),
            total_questions=total_questions,
            percentage=round(percentage, 2),
            time_taken=submission_data.time_taken,
            submitted_at=submission_doc["submitted_at"].isoformat(),
            attempt_number=submission_doc.get("attempt_number", 1) # Get attempt number
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error submitting assessment {assessment_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to submit assessment: {e}")


@router.post("/{assessment_id}/coding-submit", response_model=CodingSubmissionResponse)
async def submit_coding_solution(
    assessment_id: str,
    submission_data: CodingSubmission,
    user: UserModel = Depends(get_current_user)
):
    """Submit coding solution"""
    try:
        db = await get_db()

        if user.role != "student":
            raise HTTPException(status_code=403, detail="Only students can submit coding solutions")

        if not ObjectId.is_valid(assessment_id):
            raise HTTPException(status_code=400, detail="Invalid assessment ID")

        # Get assessment and question
        assessment = await db.assessments.find_one({"_id": ObjectId(assessment_id)})
        if not assessment:
             # Maybe coding problems are part of teacher assessments too? Check schema.
             # assessment = await db.teacher_assessments.find_one({"_id": ObjectId(assessment_id)})
             raise HTTPException(status_code=404, detail="Assessment not found")


        # Find the coding question within the assessment
        question = None
        question_index = -1
        for i, q in enumerate(assessment.get("questions", [])):
            # Check if this question is the coding one based on ID or type
            # Adjust matching logic based on how coding questions are identified in your schema
            # Example: Check for a unique ID field or a specific type like 'coding'
            if q.get("type") == "coding" and q.get("id") == submission_data.question_id:
                question = q
                question_index = i
                break
            # Fallback: check if the 'title' matches if 'id' or 'type' isn't standard
            elif q.get("title") == submission_data.question_id: # Assuming question_id might be title here
                logger.warning(f"Matching coding question by title '{submission_data.question_id}'. Consider using a stable ID.")
                question = q
                question_index = i
                # break # Continue searching in case titles aren't unique, prefer type match

        if not question:
            raise HTTPException(status_code=404, detail=f"Coding question with ID/Title '{submission_data.question_id}' not found in assessment")

        # Execute code (using the placeholder function for now - replace with actual service call)
        test_cases_to_run = question.get("test_cases", []) # Maybe include hidden_test_cases?
        logger.info(f"Running {len(test_cases_to_run)} test cases for question {submission_data.question_id}")
        execution_result = await execute_code(submission_data.code, submission_data.language, test_cases_to_run)
        logger.info(f"Execution result status: {execution_result.get('status')}")

        # Create submission record - Store in coding_submissions
        submission_doc = {
            "assessment_id": assessment_id, # Link back to the assessment
            "question_id": submission_data.question_id, # Specific question ID/Title
            "student_id": str(user.id), # Ensure string ID
            "code": submission_data.code,
            "language": submission_data.language,
            "status": execution_result.get("status", "error"), # Default to error if missing
            "execution_time": execution_result.get("execution_time", 0),
            "memory_used": execution_result.get("memory_used", 0),
            "test_results": execution_result.get("test_results", []),
            "score": execution_result.get("score", 0),
            "max_score": question.get("points", 10), # Use points defined in the question
            "submitted_at": datetime.utcnow()
        }

        # Save to coding_submissions collection
        result = await db.coding_submissions.insert_one(submission_doc)
        logger.info(f"Saved coding submission {result.inserted_id}")

        return CodingSubmissionResponse(
            id=str(result.inserted_id),
            assessment_id=assessment_id,
            question_id=submission_data.question_id,
            status=execution_result.get("status", "error"),
            execution_time=execution_result.get("execution_time", 0),
            memory_used=execution_result.get("memory_used", 0),
            test_results=execution_result.get("test_results", []),
            score=execution_result.get("score", 0),
            max_score=question.get("points", 10),
            submitted_at=submission_doc["submitted_at"].isoformat()
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error submitting coding solution for assessment {assessment_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to submit coding solution: {e}")


@router.get("/{assessment_id}/leaderboard", response_model=AssessmentLeaderboard)
async def get_assessment_leaderboard(assessment_id: str, user: UserModel = Depends(get_current_user)):
    """Get leaderboard for an assessment"""
    try:
        db = await get_db()

        if not ObjectId.is_valid(assessment_id):
            raise HTTPException(status_code=400, detail="Invalid assessment ID")

        # Get submissions from both collections
        submissions = []
        try:
             # Check assessment_submissions
            regular_subs = await db.assessment_submissions.find({
                "assessment_id": assessment_id
            }).to_list(length=None) # Fetch all for sorting
            submissions.extend(regular_subs)

             # Check teacher_assessment_results
            collections = await db.list_collection_names()
            if "teacher_assessment_results" in collections:
                teacher_subs = await db.teacher_assessment_results.find({
                    "assessment_id": assessment_id
                }).to_list(length=None) # Fetch all for sorting
                submissions.extend(teacher_subs)

        except Exception as e:
            logger.error(f"❌ Error fetching submissions for leaderboard {assessment_id}: {e}")
            raise HTTPException(status_code=500, detail="Could not fetch leaderboard data")


        # Sort combined list by percentage (desc), then time_taken (asc)
        submissions.sort(key=lambda x: (-x.get("percentage", 0), x.get("time_taken", float('inf'))))

        # Format leaderboard
        leaderboard = []
        rank = 0
        last_percentage = -1.0 # Use float for comparison
        last_time = float('-inf')
        tied_rank_start_index = 0 # Index where the current rank started

        for i, submission in enumerate(submissions):
            current_percentage = submission.get("percentage", 0)
            current_time = submission.get("time_taken", float('inf'))

            # Determine rank, handling ties correctly
            # If score or time is different, update rank
            if current_percentage != last_percentage or current_time != last_time:
                rank = i + 1 # Rank is current index + 1
                tied_rank_start_index = i
                last_percentage = current_percentage
                last_time = current_time
            # Else: Use the rank determined at tied_rank_start_index

            leaderboard.append(LeaderboardEntry(
                student_id=str(submission.get("student_id")), # Ensure string ID
                student_name=submission.get("student_name", "Unknown"),
                score=submission.get("score", 0),
                percentage=round(submission.get("percentage", 0), 2), # Round percentage
                time_taken=submission.get("time_taken"),
                rank=rank # Assign the calculated rank
            ))

        # Get assessment title
        assessment = await db.assessments.find_one({"_id": ObjectId(assessment_id)})
        if not assessment and "teacher_assessments" in collections:
            assessment = await db.teacher_assessments.find_one({"_id": ObjectId(assessment_id)})

        title = assessment.get("title", "Unknown Assessment") if assessment else "Unknown Assessment"

        return AssessmentLeaderboard(
            assessment_id=assessment_id,
            assessment_title=title,
            total_students=len(leaderboard), # Number of entries in leaderboard
            leaderboard=leaderboard
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating leaderboard for {assessment_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate leaderboard: {e}")


# --- Helper Functions ---
# Gamification removed per user request


async def execute_code(code: str, language: str, test_cases: List[Dict]) -> Dict:
    """Execute code and return results (placeholder implementation)"""
    # Replace with your actual code execution service logic (e.g., HackerEarth call)
    logger.warning("Using placeholder execute_code function.")
    passed_count = 0
    results = []
    total_time = 0
    max_memory = 0
    status = "accepted"

    for i, case in enumerate(test_cases):
        # Simulate execution
        time_ms = 50 + (i * 10)
        memory_kb = 32 + (i * 5)
        passed = (i % 2 == 0) # Simulate alternating pass/fail
        output = case.get("expected_output", "simulated_output") if passed else "wrong_simulated_output"
        error = None if passed else "AssertionError: Output mismatch"

        results.append({
            "passed": passed,
            "input": case.get("input", ""),
            "expected_output": case.get("expected_output", ""),
            "actual_output": output,
            "execution_time": time_ms,
            "memory_used": memory_kb,
            "error": error
            })
        if passed:
            passed_count += 1
        else:
            status = "wrong_answer" # Change status if any test fails
        total_time += time_ms
        max_memory = max(max_memory, memory_kb)

    score = int((passed_count / len(test_cases)) * 10) if test_cases else 0 # Example scoring


    return {
        "status": status,
        "execution_time": total_time,
        "memory_used": max_memory,
        "test_results": results,
        "score": score
    }

# --- Assume StudentAssessment is defined in schemas/schemas.py ---
# Example:
# from pydantic import BaseModel, Field
# from typing import Optional
#
# class StudentAssessment(BaseModel):
#     id: str
#     title: str
#     subject: str
#     difficulty: str
#     description: Optional[str] = ""
#     time_limit: int
#     question_count: int
#     type: str
#     is_active: bool
#     created_at: str
#     teacher_name: str