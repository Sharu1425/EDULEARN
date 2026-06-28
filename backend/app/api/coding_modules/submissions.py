from datetime import timezone
"""
Coding Submission Handling
Handles submission management, analytics, and session tracking
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from ...db import get_db
from ...dependencies import get_current_user, require_teacher
from ...models.models import UserModel

router = APIRouter(prefix="/coding", tags=["coding-submissions"])

# Response Models
class SubmissionResponse:
    id: str
    problem_id: str
    student_id: str
    student_name: str
    status: str
    score: int
    max_score: int
    execution_time: int
    memory_used: int
    language: str
    submitted_at: str

class SessionResponse:
    id: str
    problem_id: str
    student_id: str
    start_time: str
    end_time: Optional[str]
    duration: Optional[int]
    status: str

@router.post("/submit")
async def submit_solution(
    submission_data: dict,
    current_user: UserModel = Depends(get_current_user)
):
    """Submit a coding solution"""
    try:
        db = await get_db()
        
        problem_id = submission_data.get("problem_id")
        code = submission_data.get("code", "")
        language = submission_data.get("language", "python")
        
        if not problem_id:
            raise HTTPException(status_code=400, detail="Problem ID is required")
        
        if not ObjectId.is_valid(problem_id):
            raise HTTPException(status_code=400, detail="Invalid problem ID")
        
        if not code.strip():
            raise HTTPException(status_code=400, detail="Code cannot be empty")
        
        # Get problem
        problem = await db.coding_problems.find_one({
            "_id": ObjectId(problem_id),
            "is_active": True
        })
        
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found")
        
        print(f"📝 [CODING] Submitting solution for problem '{problem['title']}' by user {current_user.id}")
        
        # Test code against problem test cases
        from app.services.hackerearth_execution_service import HackerEarthExecutionService
        execution_service = HackerEarthExecutionService()
        
        test_results = []
        total_score = 0
        max_score = len(problem["test_cases"]) * 10
        
        for i, test_case in enumerate(problem["test_cases"]):
            try:
                result = await execution_service.execute_code(
                    code=code,
                    language=language,
                    input_data=test_case["input"]
                )
                
                expected_output = test_case["expected_output"].strip()
                actual_output = result.get("output", "").strip()
                
                test_passed = expected_output == actual_output
                test_score = 10 if test_passed else 0
                total_score += test_score
                
                test_results.append({
                    "test_case": i + 1,
                    "input": test_case["input"],
                    "expected_output": expected_output,
                    "actual_output": actual_output,
                    "passed": test_passed,
                    "score": test_score,
                    "execution_time": result.get("execution_time", 0),
                    "memory_used": result.get("memory_used", 0),
                    "error": result.get("error", "")
                })
                
            except Exception as e:
                test_results.append({
                    "test_case": i + 1,
                    "input": test_case["input"],
                    "expected_output": test_case["expected_output"],
                    "actual_output": "",
                    "passed": False,
                    "score": 0,
                    "execution_time": 0,
                    "memory_used": 0,
                    "error": str(e)
                })
        
        # Determine status
        passed_tests = sum(1 for test in test_results if test["passed"])
        total_tests = len(test_results)
        
        if passed_tests == total_tests:
            status = "accepted"
        elif passed_tests > 0:
            status = "partial"
        else:
            status = "wrong_answer"
        
        # Create submission record
        submission_doc = {
            "problem_id": problem_id,
            "student_id": str(current_user.id),
            "student_name": current_user.username or current_user.email,
            "code": code,
            "language": language,
            "test_results": test_results,
            "score": total_score,
            "max_score": max_score,
            "status": status,
            "execution_time": sum(test["execution_time"] for test in test_results),
            "memory_used": sum(test["memory_used"] for test in test_results),
            "submitted_at": datetime.now(timezone.utc)
        }
        
        result = await db.coding_submissions.insert_one(submission_doc)
        submission_id = str(result.inserted_id)
        
        # Update user analytics
        await update_user_analytics_task(str(current_user.id), status == "accepted")
        
        # Update problem statistics
        await update_problem_stats_task(problem_id, status == "accepted", submission_doc["execution_time"])
        
        # Generate AI feedback if enabled
        if status != "accepted":
            await generate_ai_feedback_task(submission_id, code, test_results)
        
        print(f"✅ [CODING] Solution submitted with status: {status}, score: {total_score}/{max_score}")
        
        return {
            "success": True,
            "submission_id": submission_id,
            "status": status,
            "score": total_score,
            "max_score": max_score,
            "test_results": test_results
        }
        
    except Exception as e:
        print(f"❌ [CODING] Submission failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/submissions/{submission_id}")
async def get_submission(
    submission_id: str,
    current_user: UserModel = Depends(get_current_user)
):
    """Get detailed information about a specific submission"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(submission_id):
            raise HTTPException(status_code=400, detail="Invalid submission ID")
        
        # Get submission
        submission = await db.coding_submissions.find_one({"_id": ObjectId(submission_id)})
        
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        
        # Check access permissions
        if current_user.role == "student" and submission["student_id"] != str(current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get problem details
        problem = await db.coding_problems.find_one({"_id": ObjectId(submission["problem_id"])})
        
        return {
            "submission": {
                "id": str(submission["_id"]),
                "problem_id": submission["problem_id"],
                "problem_title": problem["title"] if problem else "Unknown",
                "student_id": submission["student_id"],
                "student_name": submission["student_name"],
                "code": submission["code"],
                "language": submission["language"],
                "status": submission["status"],
                "score": submission["score"],
                "max_score": submission["max_score"],
                "execution_time": submission["execution_time"],
                "memory_used": submission["memory_used"],
                "test_results": submission["test_results"],
                "submitted_at": submission["submitted_at"].isoformat()
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/submissions")
async def get_user_submissions(
    skip: int = 0,
    limit: int = 20,
    problem_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: UserModel = Depends(get_current_user)
):
    """Get user's coding submissions"""
    try:
        db = await get_db()
        
        # Build query
        query = {"student_id": str(current_user.id)}
        
        if problem_id:
            query["problem_id"] = problem_id
        if status:
            query["status"] = status
        
        # Get submissions
        submissions = await db.coding_submissions.find(query).skip(skip).limit(limit).sort("submitted_at", -1).to_list(length=None)
        
        # Format submissions
        submission_list = []
        for submission in submissions:
            # Get problem title
            problem = await db.coding_problems.find_one({"_id": ObjectId(submission["problem_id"])})
            problem_title = problem["title"] if problem else "Unknown"
            
            submission_list.append({
                "id": str(submission["_id"]),
                "problem_id": submission["problem_id"],
                "problem_title": problem_title,
                "status": submission["status"],
                "score": submission["score"],
                "max_score": submission["max_score"],
                "execution_time": submission["execution_time"],
                "memory_used": submission["memory_used"],
                "language": submission["language"],
                "submitted_at": submission["submitted_at"].isoformat()
            })
        
        return {
            "submissions": submission_list,
            "total_count": len(submission_list),
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions/start")
async def start_coding_session(
    session_data: dict,
    current_user: UserModel = Depends(get_current_user)
):
    """Start a new coding session"""
    try:
        db = await get_db()
        
        problem_id = session_data.get("problem_id")
        
        if not problem_id or not ObjectId.is_valid(problem_id):
            raise HTTPException(status_code=400, detail="Valid problem ID is required")
        
        # Check if problem exists
        problem = await db.coding_problems.find_one({
            "_id": ObjectId(problem_id),
            "is_active": True
        })
        
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found")
        
        # Check for existing active session
        existing_session = await db.coding_sessions.find_one({
            "student_id": str(current_user.id),
            "problem_id": problem_id,
            "status": "active"
        })
        
        if existing_session:
            return {
                "session_id": str(existing_session["_id"]),
                "message": "Active session already exists"
            }
        
        # Create new session
        session_doc = {
            "problem_id": problem_id,
            "student_id": str(current_user.id),
            "start_time": datetime.now(timezone.utc),
            "status": "active",
            "code_snapshots": [],
            "total_time": 0
        }
        
        result = await db.coding_sessions.insert_one(session_doc)
        session_id = str(result.inserted_id)
        
        print(f"🚀 [CODING] Started coding session {session_id} for user {current_user.id}")
        
        return {
            "session_id": session_id,
            "start_time": session_doc["start_time"].isoformat(),
            "message": "Coding session started successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/sessions/{session_id}")
async def update_coding_session(
    session_id: str,
    update_data: dict,
    current_user: UserModel = Depends(get_current_user)
):
    """Update a coding session"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(session_id):
            raise HTTPException(status_code=400, detail="Invalid session ID")
        
        # Check if session exists and belongs to user
        session = await db.coding_sessions.find_one({
            "_id": ObjectId(session_id),
            "student_id": str(current_user.id)
        })
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Update session
        update_fields = {}
        
        if "code" in update_data:
            # Save code snapshot
            code_snapshot = {
                "code": update_data["code"],
                "timestamp": datetime.now(timezone.utc)
            }
            
            await db.coding_sessions.update_one(
                {"_id": ObjectId(session_id)},
                {"$push": {"code_snapshots": code_snapshot}}
            )
        
        if "language" in update_data:
            update_fields["language"] = update_data["language"]
        
        if update_fields:
            await db.coding_sessions.update_one(
                {"_id": ObjectId(session_id)},
                {"$set": update_fields}
            )
        
        return {
            "success": True,
            "message": "Session updated successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions/{session_id}/end")
async def end_coding_session(
    session_id: str,
    current_user: UserModel = Depends(get_current_user)
):
    """End a coding session"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(session_id):
            raise HTTPException(status_code=400, detail="Invalid session ID")
        
        # Check if session exists and belongs to user
        session = await db.coding_sessions.find_one({
            "_id": ObjectId(session_id),
            "student_id": str(current_user.id),
            "status": "active"
        })
        
        if not session:
            raise HTTPException(status_code=404, detail="Active session not found")
        
        # Calculate session duration
        end_time = datetime.now(timezone.utc)
        duration = int((end_time - session["start_time"]).total_seconds())
        
        # Update session
        await db.coding_sessions.update_one(
            {"_id": ObjectId(session_id)},
            {
                "$set": {
                    "end_time": end_time,
                    "status": "completed",
                    "total_time": duration
                }
            }
        )
        
        print(f"🏁 [CODING] Ended coding session {session_id}, duration: {duration} seconds")
        
        return {
            "success": True,
            "session_id": session_id,
            "duration": duration,
            "end_time": end_time.isoformat(),
            "message": "Coding session ended successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics")
async def get_coding_analytics(
    current_user: UserModel = Depends(get_current_user)
):
    """Get coding analytics for the current user"""
    try:
        db = await get_db()
        
        # Get user's coding statistics
        user = await db.users.find_one({"_id": ObjectId(current_user.id)})
        
        # Get submission statistics
        total_submissions = await db.coding_submissions.count_documents({
            "student_id": str(current_user.id)
        })
        
        accepted_submissions = await db.coding_submissions.count_documents({
            "student_id": str(current_user.id),
            "status": "accepted"
        })
        
        # Get recent submissions
        recent_submissions = await db.coding_submissions.find({
            "student_id": str(current_user.id)
        }).sort("submitted_at", -1).limit(10).to_list(length=None)
        
        # Get session statistics
        total_sessions = await db.coding_sessions.count_documents({
            "student_id": str(current_user.id)
        })
        
        completed_sessions = await db.coding_sessions.count_documents({
            "student_id": str(current_user.id),
            "status": "completed"
        })
        
        # Calculate average session time
        sessions = await db.coding_sessions.find({
            "student_id": str(current_user.id),
            "status": "completed"
        }).to_list(length=None)
        
        avg_session_time = 0
        if sessions:
            total_time = sum(session.get("total_time", 0) for session in sessions)
            avg_session_time = total_time / len(sessions)
        
        # Get language preferences
        language_stats = {}
        submissions = await db.coding_submissions.find({
            "student_id": str(current_user.id)
        }).to_list(length=None)
        
        for submission in submissions:
            lang = submission["language"]
            language_stats[lang] = language_stats.get(lang, 0) + 1
        
        # Get difficulty distribution
        difficulty_stats = {}
        for submission in submissions:
            problem = await db.coding_problems.find_one({"_id": ObjectId(submission["problem_id"])})
            if problem:
                diff = problem["difficulty"]
                difficulty_stats[diff] = difficulty_stats.get(diff, 0) + 1
        
        return {
            "user_stats": {
                "coding_problems_solved": user.get("coding_problems_solved", 0),
                "coding_attempts": user.get("coding_attempts", 0),
                "level": user.get("level", 1),
                "xp": user.get("xp", 0)
            },
            "submission_stats": {
                "total_submissions": total_submissions,
                "accepted_submissions": accepted_submissions,
                "acceptance_rate": round((accepted_submissions / max(total_submissions, 1)) * 100, 2)
            },
            "session_stats": {
                "total_sessions": total_sessions,
                "completed_sessions": completed_sessions,
                "average_session_time": round(avg_session_time, 2)
            },
            "language_preferences": language_stats,
            "difficulty_distribution": difficulty_stats,
            "recent_submissions": [
                {
                    "id": str(sub["_id"]),
                    "problem_id": sub["problem_id"],
                    "status": sub["status"],
                    "score": sub["score"],
                    "language": sub["language"],
                    "submitted_at": sub["submitted_at"].isoformat()
                }
                for sub in recent_submissions
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def generate_ai_feedback_task(submission_id: str, code: str, test_results: List[Dict]):
    """Generate AI feedback for failed submissions"""
    try:
        db = await get_db()
        
        # Get submission details
        submission = await db.coding_submissions.find_one({"_id": ObjectId(submission_id)})
        if not submission:
            return
        
        # Get problem details
        problem = await db.coding_problems.find_one({"_id": ObjectId(submission["problem_id"])})
        if not problem:
            return
        
        # Generate feedback using AI
        from app.services.gemini_coding_service import GeminiCodingService
        gemini_service = GeminiCodingService()
        
        feedback = await gemini_service.generate_code_feedback(
            code=code,
            problem_description=problem["description"],
            test_results=test_results,
            language=submission["language"]
        )
        
        # Store feedback
        feedback_doc = {
            "submission_id": submission_id,
            "student_id": submission["student_id"],
            "problem_id": submission["problem_id"],
            "feedback": feedback,
            "generated_at": datetime.now(timezone.utc),
            "ai_generated": True
        }
        
        await db.coding_feedback.insert_one(feedback_doc)
        
        print(f"🤖 [AI FEEDBACK] Generated feedback for submission {submission_id}")
        
    except Exception as e:
        print(f"❌ [AI FEEDBACK] Failed to generate feedback: {str(e)}")

async def update_user_analytics_task(user_id: str, solved: bool):
    """Update user analytics after code execution"""
    try:
        db = await get_db()
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return
        
        update_data = {
            "last_coding_activity": datetime.now(timezone.utc)
        }
        
        if solved:
            current_solved = user.get("coding_problems_solved", 0)
            update_data["coding_problems_solved"] = current_solved + 1
            
            current_xp = user.get("xp", 0)
            coding_xp = 20
            update_data["xp"] = current_xp + coding_xp
            
            new_level = (update_data["xp"] // 100) + 1
            update_data["level"] = new_level
        
        current_attempts = user.get("coding_attempts", 0)
        update_data["coding_attempts"] = current_attempts + 1
        
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
    except Exception as e:
        print(f"❌ [ANALYTICS] Failed to update user analytics: {str(e)}")

async def update_problem_stats_task(problem_id: str, solved: bool, execution_time: int):
    """Update problem statistics after submission"""
    try:
        db = await get_db()
        
        update_data = {
            "last_attempted_at": datetime.now(timezone.utc)
        }
        
        if solved:
            problem = await db.coding_problems.find_one({"_id": ObjectId(problem_id)})
            if problem:
                current_solved = problem.get("times_solved", 0)
                update_data["times_solved"] = current_solved + 1
                
                current_best_time = problem.get("best_execution_time", float('inf'))
                if execution_time < current_best_time:
                    update_data["best_execution_time"] = execution_time
        
        current_attempts = problem.get("total_attempts", 0) if problem else 0
        update_data["total_attempts"] = current_attempts + 1
        
        await db.coding_problems.update_one(
            {"_id": ObjectId(problem_id)},
            {"$set": update_data}
        )
        
    except Exception as e:
        print(f"❌ [ANALYTICS] Failed to update problem statistics: {str(e)}")
