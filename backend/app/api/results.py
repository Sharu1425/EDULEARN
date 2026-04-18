"""
Results endpoints
Handles test results and user performance data
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel

from ..db import get_db
from ..models.models import UserModel
from ..dependencies import get_current_user
from bson import ObjectId

router = APIRouter()

# Gamification removed per user request

# Response Models
class TestResult(BaseModel):
    id: str
    test_name: str
    score: float
    total_questions: int
    correct_answers: int
    completed_at: datetime
    duration: int  # in seconds
    topic: Optional[str] = ""
    difficulty: Optional[str] = "medium"
    percentage: Optional[float] = None
    time_taken: Optional[int] = None
    date: Optional[datetime] = None

class UserResultsResponse(BaseModel):
    success: bool
    results: List[TestResult]
    total: int

@router.get("/user/{user_id}", response_model=UserResultsResponse)
async def get_user_results(
    user_id: str,
    current_user: UserModel = Depends(get_current_user)
):
    """Get user's test results"""
    try:
        # Verify user can access this data
        if str(current_user.id) != user_id and current_user.role not in ["admin", "teacher"]:
            raise HTTPException(
                status_code=403,
                detail="Not authorized to access this user's results"
            )
        
        db = await get_db()
        
        # Get real results from database
        # Check multiple collections for results
        results = []
        
        # Get from db.results collection (general test results)
        db_results = []
        try:
            if ObjectId.is_valid(user_id):
                results_cursor = db.results.find({"user_id": ObjectId(user_id)}).sort("submitted_at", -1)
                db_results = await results_cursor.to_list(length=None)
        except Exception:
            db_results = []
        # Also try string user_id in case results were stored as strings
        if not db_results:
            db_results = await db.results.find({"user_id": user_id}).sort("submitted_at", -1).to_list(length=None)
        
        for result in db_results:
            score = result.get("score", 0)
            total_questions = result.get("total_questions", 0)
            percentage = (score / total_questions * 100) if total_questions > 0 else 0
            
            results.append(TestResult(
                id=str(result["_id"]),
                test_name=result.get("test_name", "Unknown Test"),
                score=score,
                total_questions=total_questions,
                correct_answers=result.get("correct_answers", 0),
                completed_at=result.get("submitted_at", datetime.utcnow()),
                duration=result.get("time_spent", 0),
                topic=result.get("topic", ""),
                difficulty=result.get("difficulty", "medium"),
                percentage=percentage,
                time_taken=result.get("time_spent", 0),
                date=result.get("submitted_at", datetime.utcnow())
            ))
        
        # Get from db.assessment_results collection (legacy)
        assessment_results_cursor = db.assessment_results.find({"student_id": user_id}).sort("submitted_at", -1)
        assessment_results = await assessment_results_cursor.to_list(length=None)
        
        for result in assessment_results:
            score = result.get("score", 0)
            total_questions = result.get("total_questions", 0)
            percentage = (score / total_questions * 100) if total_questions > 0 else 0
            
            results.append(TestResult(
                id=str(result["_id"]),
                test_name=result.get("assessment_title", "Assessment"),
                score=score,
                total_questions=total_questions,
                correct_answers=result.get("score", 0),  # For assessment results, score is the correct count
                completed_at=result.get("submitted_at", datetime.utcnow()),
                duration=result.get("time_taken", 0),
                topic=result.get("subject", ""),
                difficulty=result.get("difficulty", "medium"),
                percentage=percentage,
                time_taken=result.get("time_taken", 0),
                date=result.get("submitted_at", datetime.utcnow())
            ))
        
        # Get from db.assessment_submissions collection (current regular assessments)
        submission_results_cursor = db.assessment_submissions.find({"student_id": user_id}).sort("submitted_at", -1)
        submission_results = await submission_results_cursor.to_list(length=None)
        
        for result in submission_results:
            # Get assessment details
            assessment = await db.assessments.find_one({"_id": ObjectId(result["assessment_id"])})
            assessment_title = assessment.get("title", "Assessment") if assessment else "Assessment"
            
            score = result.get("score", 0)
            total_questions = result.get("total_questions", 0)
            percentage = (score / total_questions * 100) if total_questions > 0 else 0
            
            results.append(TestResult(
                id=str(result["_id"]),
                test_name=assessment_title,
                score=score,
                total_questions=total_questions,
                correct_answers=result.get("score", 0),
                completed_at=result.get("submitted_at", datetime.utcnow()),
                duration=result.get("time_taken", 0),
                topic=assessment.get("subject", "") if assessment else "",
                difficulty=assessment.get("difficulty", "medium") if assessment else "medium",
                percentage=percentage,
                time_taken=result.get("time_taken", 0),
                date=result.get("submitted_at", datetime.utcnow())
            ))
        
        # Get from db.teacher_assessment_results collection (teacher-assigned assessments)
        try:
            teacher_results_cursor = db.teacher_assessment_results.find({"student_id": user_id}).sort("submitted_at", -1)
            teacher_results = await teacher_results_cursor.to_list(length=None)
        except Exception:
            teacher_results = []
        for t_result in teacher_results:
            score = t_result.get("score", 0)
            total_questions = t_result.get("total_questions", 0)
            percentage = (score / total_questions * 100) if total_questions > 0 else 0
            # Try to enrich with assessment info
            title = "Assessment"
            topic = ""
            difficulty = "medium"
            assessment_id = t_result.get("assessment_id")
            if assessment_id:
                try:
                    assessment = await db.teacher_assessments.find_one({"_id": ObjectId(assessment_id)})
                except Exception:
                    assessment = None
                if not assessment:
                    try:
                        assessment = await db.assessments.find_one({"_id": ObjectId(assessment_id)})
                    except Exception:
                        assessment = None
                if assessment:
                    title = assessment.get("title", title)
                    topic = assessment.get("topic", assessment.get("subject", topic))
                    difficulty = assessment.get("difficulty", difficulty)
            results.append(TestResult(
                id=str(t_result["_id"]),
                test_name=title,
                score=score,
                total_questions=total_questions,
                correct_answers=score,
                completed_at=t_result.get("submitted_at", datetime.utcnow()),
                duration=t_result.get("time_taken", 0),
                topic=topic,
                difficulty=difficulty,
                percentage=percentage,
                time_taken=t_result.get("time_taken", 0),
                date=t_result.get("submitted_at", datetime.utcnow())
            ))

        # Sort all results by completion date (most recent first)
        results.sort(key=lambda x: x.completed_at, reverse=True)
        
        return UserResultsResponse(
            success=True,
            results=results,
            total=len(results)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get user results: {str(e)}"
        )

@router.get("/analytics/{user_id}")
async def get_user_analytics(
    user_id: str,
    current_user: UserModel = Depends(get_current_user)
):
    """Get user analytics data"""
    try:
        # Verify user can access this data
        if str(current_user.id) != user_id and current_user.role not in ["admin", "teacher"]:
            raise HTTPException(
                status_code=403,
                detail="Not authorized to access this user's analytics"
            )
        
        # Get real analytics data from database
        db = await get_db()
        user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user_doc:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )
        
        # Get user's assessment results
        results_cursor = db.results.find({"user_id": user_id}).sort("submitted_at", -1).limit(10)
        results = await results_cursor.to_list(length=10)
        
        # Calculate analytics from real data
        total_tests = user_doc.get("completed_assessments", 0)
        average_score = user_doc.get("average_score", 0)
        total_questions = user_doc.get("total_questions_answered", 0)
        streak_days = user_doc.get("streak", 0)
        
        # Get recent performance data
        recent_performance = []
        for result in results:
            if result.get("submitted_at"):
                recent_performance.append({
                    "date": result["submitted_at"].strftime("%Y-%m-%d") if hasattr(result["submitted_at"], 'strftime') else str(result["submitted_at"]),
                    "score": result.get("score", 0)
                })
        
        analytics_data = {
            "success": True,
            "analytics": {
                "total_assessments": total_tests,
                "total_questions": total_questions,
                "average_score": average_score,
                "streak_days": streak_days,
                "topics": ["Mathematics", "Science", "Programming"],  # Default topics
                "recent_performance": recent_performance
            }
        }
        
        return analytics_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get user analytics: {str(e)}"
        )

# Request Models
class AssessmentSubmission(BaseModel):
    user_id: str
    score: float
    total_questions: int
    questions: List[Dict[str, Any]]  # List of questions
    user_answers: List[str]  # List of user answers
    topic: str
    difficulty: str
    time_taken: int  # in seconds
    explanations: Optional[List[Dict[str, Any]]] = []  # Optional explanations
    test_name: Optional[str] = None  # Optional test name
    answers: Optional[List[Dict[str, Any]]] = None  # Optional answers format
    time_spent: Optional[int] = None  # Optional time_spent format

class SubmissionResponse(BaseModel):
    success: bool
    score: float
    correct_answers: int
    total_questions: int
    message: str

@router.post("", response_model=SubmissionResponse)
@router.post("/", response_model=SubmissionResponse)
async def submit_assessment_result(
    submission: AssessmentSubmission,
    current_user: UserModel = Depends(get_current_user)
):
    """Submit assessment results"""
    try:
        print(f"🔍 [RESULTS] Received submission: {submission}")
        print(f"🔍 [RESULTS] Submission type: {type(submission)}")
        print(f"🔍 [RESULTS] Submission dict: {submission.__dict__ if hasattr(submission, '__dict__') else 'No dict'}")
        # Calculate score based on user answers vs correct answers
        correct_count = 0
        questions_data = submission.questions
        
        # We'll build a clean record of what actually happened
        print(f"📊 [RESULTS] Autorative grading for {len(submission.user_answers)} answers (User: {current_user.username})")
        
        for i, user_answer in enumerate(submission.user_answers):
            if i < len(questions_data):
                question = questions_data[i]
                options = question.get("options", [])
                
                # Standardized retrieval of expected answer
                correct_idx = question.get("correct_answer")
                expected_text = question.get("answer", "")
                
                # Strategy 1: Index-based text derivation
                derived_expected = expected_text
                if isinstance(correct_idx, int) and 0 <= correct_idx < len(options):
                    derived_expected = options[correct_idx]
                
                # Strategy 2: Letter normalization (if it's A/B/C/D)
                if not derived_expected or derived_expected in ["A", "B", "C", "D"]:
                    if str(expected_text).upper() in ["A", "B", "C", "D"]:
                         idx = ord(str(expected_text).upper()) - ord("A")
                         if idx < len(options): derived_expected = options[idx]

                # Strategy 3: Normalized Comparison
                is_correct = False
                clean_user = str(user_answer).strip().lower()
                clean_expected = str(derived_expected).strip().lower()
                
                if clean_user == clean_expected and clean_user != "":
                    is_correct = True
                
                if is_correct:
                    correct_count += 1
                    print(f"   [Q{i+1}: ✓] User: '{user_answer}' Matches Expected: '{derived_expected}'")
                else:
                    print(f"   [Q{i+1}: ✗] User: '{user_answer}' Expected: '{derived_expected}'")

        # The backend IS the source of truth. We calculate the official score right here.
        score = (correct_count / submission.total_questions) * 100 if submission.total_questions > 0 else 0
        
        # Credit Reward logic (Tiered performance rewards)
        # Student self-practice (this endpoint) gives 5 credits for score >= 75%
        credit_reward = 0
        if score >= 75:
            credit_reward = 5
            print(f"💰 [RESULTS] Awarding {credit_reward} credits for performance (Self-Practice Score: {score:.1f}%)")
        
        # Use time_taken or time_spent
        time_spent = submission.time_spent if submission.time_spent else submission.time_taken
        
        # Generate test name if not provided
        test_name = submission.test_name or f"{submission.topic} Assessment"
        
        # Store result in database (mock implementation)
        db = await get_db()
        result_data = {
            "user_id": current_user.id,
            "test_name": test_name,
            "topic": submission.topic,
            "difficulty": submission.difficulty,
            "score": score,
            "correct_answers": correct_count,
            "total_questions": submission.total_questions,
            "time_spent": time_spent,
            "submitted_at": datetime.utcnow(),
            "questions": submission.questions,
            "user_answers": submission.user_answers,
            "explanations": submission.explanations
        }
        
        # Save to database
        result_id = await db.results.insert_one(result_data)
        
        # Award credits if applicable
        if credit_reward > 0:
            try:
                # Update user credits
                await db.users.update_one(
                    {"_id": ObjectId(current_user.id)},
                    {"$inc": {"credits": credit_reward}}
                )
                
                # Create credit notification
                notification = {
                    "user_id": str(current_user.id),
                    "title": "Practice Credit Reward!",
                    "message": f"You've been rewarded {credit_reward} credits for scoring {score:.1f}% on your {submission.topic} practice assessment.",
                    "type": "credit",
                    "read": False,
                    "created_at": datetime.utcnow()
                }
                await db.notifications.insert_one(notification)
            except Exception as credit_err:
                print(f"⚠️ [RESULTS] Error awarding credits: {credit_err}")
        
        # Gamification XP removed per user request
        
        print(f"[SUCCESS] [RESULTS] Assessment submitted for user {current_user.id}: {score:.1f}% ({correct_count}/{submission.total_questions})")
        
        return SubmissionResponse(
            success=True,
            score=score,
            correct_answers=correct_count,
            total_questions=submission.total_questions,
            message=f"Assessment completed! Score: {score:.1f}%"
        )
        
    except Exception as e:
        print(f"[ERROR] [RESULTS] Failed to submit assessment: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to submit assessment: {str(e)}"
        )

@router.get("/{result_id}/detailed")
async def get_detailed_result(
    result_id: str,
    current_user: UserModel = Depends(get_current_user)
):
    """Get detailed result with question reviews"""
    try:
        db = await get_db()
        
        # Try regular results collection first
        result = await db.results.find_one({"_id": ObjectId(result_id)})
        result_source = "results"
        
        # Fall back to teacher assessments results if not found
        if not result:
            result = await db.teacher_assessment_results.find_one({"_id": ObjectId(result_id)})
            result_source = "teacher_assessment_results" if result else result_source
        
        # Fall back to assessment submissions if still not found (regular teacher-created assessments)
        if not result:
            result = await db.assessment_submissions.find_one({"_id": ObjectId(result_id)})
            result_source = "assessment_submissions" if result else result_source
        
        if not result:
            raise HTTPException(status_code=404, detail="Result not found")
        
        # Verify user can access this result
        result_user_id = result.get("user_id") or result.get("student_id")
        if isinstance(result_user_id, ObjectId):
            result_user_id = str(result_user_id)
        
        if result_user_id != str(current_user.id) and current_user.role not in ["admin", "teacher"]:
            raise HTTPException(status_code=403, detail="Not authorized to access this result")
        
        # If this is a teacher-assessment result, enrich with questions from the assessment
        questions = result.get("questions", [])
        user_answers = result.get("user_answers", result.get("answers", []))
        topic = result.get("topic", "")
        difficulty = result.get("difficulty", "medium")
        time_taken = result.get("time_spent", result.get("time_taken", 0))
        total_questions = result.get("total_questions", len(questions) if questions else 0)
        
        if result_source == "teacher_assessment_results":
            assessment_id = result.get("assessment_id")
            # Fetch the assessment to get questions
            assessment = await db.teacher_assessments.find_one({"_id": ObjectId(assessment_id)})
            if not assessment:
                assessment = await db.assessments.find_one({"_id": ObjectId(assessment_id)})
            if assessment:
                questions = assessment.get("questions", questions)
                print(f"[DEBUG] [RESULTS] Fetched assessment {assessment_id}, found {len(questions)} questions")
                if questions and len(questions) > 0:
                    # Check if first question has explanation
                    first_q = questions[0]
                    print(f"[DEBUG] [RESULTS] Sample question fields: {list(first_q.keys())}")
                    print(f"[DEBUG] [RESULTS] Has explanation: {bool(first_q.get('explanation', ''))}")
                    print(f"[DEBUG] [RESULTS] Has correct_answer: {first_q.get('correct_answer') is not None}")
                topic = assessment.get("topic", assessment.get("subject", topic))
                difficulty = assessment.get("difficulty", difficulty)
                # default time limit in minutes -> convert to seconds if needed
                if not time_taken:
                    time_limit = assessment.get("time_limit", 30)
                    time_taken = time_limit * 60
                total_questions = len(questions)
        
        # If assessment_submissions, reconstruct from assessments
        if result_source == "assessment_submissions":
            assessment_id = result.get("assessment_id")
            assessment = await db.assessments.find_one({"_id": ObjectId(assessment_id)})
            if not assessment:
                # Also try teacher_assessments
                assessment = await db.teacher_assessments.find_one({"_id": ObjectId(assessment_id)})
            if assessment:
                questions = assessment.get("questions", questions)
                print(f"[DEBUG] [RESULTS] Fetched assessment {assessment_id} from submissions, found {len(questions)} questions")
                if questions and len(questions) > 0:
                    first_q = questions[0]
                    print(f"[DEBUG] [RESULTS] Sample question fields: {list(first_q.keys())}")
                    print(f"[DEBUG] [RESULTS] Has explanation: {bool(first_q.get('explanation', ''))}")
                topic = assessment.get("subject", assessment.get("topic", topic))
                difficulty = assessment.get("difficulty", difficulty)
                total_questions = assessment.get("question_count", len(questions))
            # ensure user_answers array exists
            user_answers = result.get("answers", user_answers)
        
        score = result.get("score", 0)
        correct_answers = result.get("correct_answers", score)  # for teacher results, score equals correct count
        submitted_at = result.get("submitted_at", datetime.utcnow())
        if hasattr(submitted_at, "isoformat"):
            submitted_iso = submitted_at.isoformat()
        else:
            submitted_iso = str(submitted_at)
        
        real_result = {
            "id": str(result["_id"]),
            "user_id": str(result_user_id),
            "score": score,
            "total_questions": total_questions,
            "questions": questions,
            "user_answers": user_answers,
            "topic": topic,
            "difficulty": difficulty,
            "time_taken": time_taken,
            "date": submitted_iso,
            "percentage": (score / (total_questions or 1)) * 100,
            "correct_answers": correct_answers,
            "incorrect_answers": (total_questions or 0) - correct_answers,
            "ai_feedback": result.get("ai_feedback")
        }
        
        # Generate question reviews with proper is_correct calculation
        question_reviews = []
        for i, question in enumerate(real_result["questions"]):
            # Get user answer from different possible fields
            user_answer_raw = ""
            if "user_answers" in real_result and i < len(real_result["user_answers"]):
                user_answer_raw = real_result["user_answers"][i]
            elif "answers" in real_result and i < len(real_result["answers"]):
                user_answer_raw = real_result["answers"][i]
            
            options = question.get("options", [])
            
            # Normalize correct answer text - try multiple field names and formats
            correct_answer = ""
            correct_answer_index = question.get("correct_answer", question.get("answer_index", question.get("correct", -1)))
            
            # Handle different ways correct answer might be stored
            # First, try integer index (most common format)
            if isinstance(correct_answer_index, int) and 0 <= correct_answer_index < len(options):
                correct_answer = options[correct_answer_index]
                print(f"[DEBUG] [RESULTS] Using index {correct_answer_index} -> '{correct_answer}'")
            # Try direct answer text
            elif "answer" in question and question["answer"]:
                answer_val = question["answer"]
                if isinstance(answer_val, int) and 0 <= answer_val < len(options):
                    correct_answer = options[answer_val]
                    correct_answer_index = answer_val
                else:
                    correct_answer = str(answer_val)
                print(f"[DEBUG] [RESULTS] Using answer field -> '{correct_answer}'")
            # Try "correct" field
            elif "correct" in question and question["correct"]:
                correct_val = question["correct"]
                if isinstance(correct_val, int) and 0 <= correct_val < len(options):
                    correct_answer = options[correct_val]
                    correct_answer_index = correct_val
                else:
                    correct_answer = str(correct_val)
                print(f"[DEBUG] [RESULTS] Using correct field -> '{correct_answer}'")
            # Try "correct_option" field
            elif "correct_option" in question and question["correct_option"]:
                correct_answer = str(question["correct_option"])
                print(f"[DEBUG] [RESULTS] Using correct_option field -> '{correct_answer}'")
            
            # If correct answer is just a letter (A, B, C, D), find the matching option
            if len(correct_answer) == 1 and correct_answer.isalpha():
                letter = correct_answer.upper()
                for option in options:
                    if option.startswith(f"{letter})"):
                        correct_answer = option
                        break
            
            # Normalize user answer to text
            user_answer = ""
            if isinstance(user_answer_raw, int) and 0 <= user_answer_raw < len(options):
                user_answer = options[user_answer_raw]
            elif isinstance(user_answer_raw, str):
                user_answer = user_answer_raw
            else:
                user_answer = str(user_answer_raw) if user_answer_raw else ""
            
            # Debug logging
            print(f"[DEBUG] Question {i+1}:")
            print(f"  Options: {options}")
            print(f"  Correct answer index: {correct_answer_index}")
            print(f"  Correct answer text: '{correct_answer}'")
            print(f"  User answer raw: '{user_answer_raw}'")
            print(f"  User answer text: '{user_answer}'")
            
            # Compare answers (normalize whitespace and case for comparison)
            is_correct = False
            if correct_answer and user_answer:
                # Exact match
                if user_answer.strip() == correct_answer.strip():
                    is_correct = True
                # Match by index if both are integers
                elif isinstance(user_answer_raw, int) and isinstance(correct_answer_index, int):
                    if user_answer_raw == correct_answer_index:
                        is_correct = True
                # Match option text even if formatted differently
                elif len(options) > 0:
                    user_idx = user_answer_raw if isinstance(user_answer_raw, int) else -1
                    correct_idx = correct_answer_index if isinstance(correct_answer_index, int) else -1
                    if user_idx >= 0 and correct_idx >= 0 and user_idx == correct_idx:
                        is_correct = True
                    elif user_idx >= 0 and correct_idx < 0:
                        # User selected by index, correct answer is text - compare option text
                        if user_idx < len(options) and options[user_idx].strip() == correct_answer.strip():
                            is_correct = True
            
            print(f"  Is correct: {is_correct}")
            
            # Get explanation - try multiple field names
            explanation = question.get("explanation", "")
            if not explanation or explanation == "":
                explanation = question.get("explain", "")
            if not explanation or explanation == "":
                explanation = question.get("solution", "")
            if not explanation or explanation == "":
                explanation = question.get("description", "")  # Sometimes stored as description
            if not explanation or explanation == "":
                explanation = "No explanation available for this question."
            
            print(f"[DEBUG] [RESULTS] Question {i+1} explanation: {'Found' if explanation and explanation != 'No explanation available for this question.' else 'Missing'}")
            
            # Ensure correct_answer_index is properly set if we found the answer
            if correct_answer and correct_answer_index == -1:
                # Try to find the index by matching the answer text
                for idx, opt in enumerate(options):
                    if opt.strip() == correct_answer.strip() or opt == correct_answer:
                        correct_answer_index = idx
                        break
            
            question_reviews.append({
                "question_index": i,
                "question": question.get("question", ""),
                "options": options,
                "correct_answer": correct_answer,
                "correct_answer_index": correct_answer_index if isinstance(correct_answer_index, int) and correct_answer_index >= 0 else -1,
                "user_answer": user_answer,
                "user_answer_index": user_answer_raw if isinstance(user_answer_raw, int) else -1,
                "is_correct": is_correct,
                "explanation": explanation
            })
        
        return {
            "success": True,
            "result": real_result,
            "question_reviews": question_reviews
        }
        
    except Exception as e:
        print(f"[ERROR] [RESULTS] Failed to get detailed result: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get detailed result: {str(e)}"
        )

@router.get("/health")
async def results_health_check():
    """Health check endpoint for results router"""
    return {
        "status": "healthy",
        "message": "Results router is working",
        "timestamp": datetime.utcnow().isoformat()
    }

@router.post("/test")
async def test_results_endpoint():
    """Test endpoint for results router"""
    return {
        "status": "success",
        "message": "Results endpoint is accessible",
        "timestamp": datetime.utcnow().isoformat()
    }