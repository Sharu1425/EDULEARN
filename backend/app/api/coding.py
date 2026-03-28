"""
Coding Platform Router
Handles all coding-related endpoints with Gemini AI integration
"""
from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
import asyncio

from ..db import get_db
from ..schemas.schemas import (
    CodingProblemCreate, CodingProblemResponse, CodingSolutionSubmit, 
    CodingSolutionResponse, CodeExecutionRequest, CodeExecutionResponse,
    CodingSessionStart, CodingSessionUpdate, CodingAnalyticsResponse,
    AIFeedbackRequest, ProblemGenerationRequest
)
from ..models.models import (
    CodingProblemModel, CodingSolutionModel, CodingSessionModel, CodingAnalyticsModel
)
from ..dependencies import get_current_user_id, get_current_user
from ..dependencies import require_student, require_teacher, require_admin
from ..services.gemini_coding_service import gemini_coding_service
from ..services.hackerearth_execution_service import hackerearth_execution_service, get_hackerearth_service

router = APIRouter()

# Problem Management Endpoints

@router.post("/problems/generate")
async def generate_problem(
    request: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Generate a new coding problem using Gemini AI"""
    try:
        print(f"🧠 [CODING] User {user_id} requesting problem generation: {request.get('topic')} ({request.get('difficulty')})")
        print(f"🧠 [CODING] Request data: {request}")
        
        # Extract parameters from request
        topic = request.get('topic', 'Arrays')
        difficulty = request.get('difficulty', 'easy')
        user_skill_level = request.get('user_skill_level', 'intermediate')
        focus_areas = request.get('focus_areas', [topic])
        avoid_topics = request.get('avoid_topics', [])
        timestamp = request.get('timestamp')
        session_id = request.get('session_id')
        
        # Get user analytics to personalize problem
        db = await get_db()
        user_analytics = await db.coding_analytics.find_one({"user_id": ObjectId(user_id)})
        
        # Generate unique problem using Gemini AI with additional parameters
        problem_data = await gemini_coding_service.generate_coding_problem(
            topic=topic,
            difficulty=difficulty,
            user_skill_level=user_skill_level,
            focus_areas=focus_areas,
            avoid_topics=avoid_topics
        )
        
        # Add uniqueness parameters to ensure different problems each time
        if timestamp:
            problem_data["title"] = f"{problem_data['title']} (Generated {datetime.fromtimestamp(timestamp/1000).strftime('%H:%M:%S')})"
        
        if session_id:
            problem_data["description"] = f"{problem_data['description']}\n\n*Session ID: {session_id}*"
        
        # Create problem document
        problem_doc = {
            "title": problem_data["title"],
            "description": problem_data["description"],
            "topic": problem_data["topic"],
            "difficulty": problem_data["difficulty"],
            "constraints": problem_data["constraints"],
            "examples": problem_data["examples"],
            "test_cases": problem_data["test_cases"],
            "hidden_test_cases": problem_data["hidden_test_cases"],
            "expected_complexity": problem_data["expected_complexity"],
            "hints": problem_data["hints"],
            "reference_solution": problem_data.get("reference_solution"),
            "code_templates": problem_data.get("code_templates", {}),
            "created_by": "AI",
            "created_at": datetime.utcnow(),
            "tags": problem_data["tags"],
            "success_rate": 0.0,
            "average_time": None
        }
        
        # Save to database
        result = await db.coding_problems.insert_one(problem_doc)
        problem_doc["_id"] = result.inserted_id
        
        print(f"[OK] [CODING] Problem generated and saved: {problem_data['title']}")
        
        # Return problem with test cases (but not hidden ones)
        return {
            "success": True,
            "problem": {
                "id": str(result.inserted_id),
                "title": problem_data["title"],
                "description": problem_data["description"],
                "topic": problem_data["topic"],
                "difficulty": problem_data["difficulty"],
                "constraints": problem_data["constraints"],
                "examples": problem_data["examples"],
                "test_cases": problem_data["test_cases"],
                "hints": problem_data["hints"],
                "tags": problem_data["tags"],
                "expected_complexity": problem_data["expected_complexity"],
                "code_templates": problem_data.get("code_templates", {}),
                "success_rate": 0.0,
                "average_time": None
            }
        }
        
    except Exception as e:
        print(f"[ERROR] [CODING] Error generating problem: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate problem: {str(e)}"
        )

@router.get("/problems")
async def get_problems(
    topic: Optional[str] = None,
    difficulty: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    user_id: str = Depends(get_current_user_id)
):
    """Get coding problems with optional filtering"""
    try:
        print(f"[LIST] [CODING] User {user_id} requesting problems (topic: {topic}, difficulty: {difficulty})")
        
        db = await get_db()
        
        # Build query
        query = {}
        if topic:
            query["topic"] = {"$regex": topic, "$options": "i"}
        if difficulty:
            query["difficulty"] = difficulty
        
        # Get problems (excluding hidden test cases)
        problems = await db.coding_problems.find(
            query,
            {"hidden_test_cases": 0}  # Exclude hidden test cases
        ).skip(skip).limit(limit).sort("created_at", -1).to_list(None)
        
        # Format response
        formatted_problems = []
        for problem in problems:
            formatted_problems.append({
                "id": str(problem["_id"]),
                "title": problem["title"],
                "description": problem["description"],
                "topic": problem["topic"],
                "difficulty": problem["difficulty"],
                "constraints": problem["constraints"],
                "examples": problem["examples"],
                "hints": problem["hints"],
                "tags": problem["tags"],
                "success_rate": problem.get("success_rate", 0.0),
                "average_time": problem.get("average_time")
            })
        
        print(f"[OK] [CODING] Returning {len(formatted_problems)} problems")
        
        return {
            "success": True,
            "problems": formatted_problems,
            "total": len(formatted_problems)
        }
        
    except Exception as e:
        print(f"[ERROR] [CODING] Error fetching problems: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch problems: {str(e)}"
        )

@router.get("/problems/{problem_id}")
async def get_problem(
    problem_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get a specific coding problem by ID"""
    try:
        print(f"[LIST] [CODING] User {user_id} requesting problem: {problem_id}")
        
        db = await get_db()
        
        # Get problem (excluding hidden test cases)
        problem = await db.coding_problems.find_one(
            {"_id": ObjectId(problem_id)},
            {"hidden_test_cases": 0}
        )
        
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found")
        
        # Check if user has attempted this problem
        user_solutions = await db.coding_solutions.find({
            "user_id": ObjectId(user_id),
            "problem_id": ObjectId(problem_id)
        }).sort("submitted_at", -1).limit(1).to_list(None)
        
        last_attempt = None
        if user_solutions:
            solution = user_solutions[0]
            last_attempt = {
                "status": solution["status"],
                "submitted_at": solution["submitted_at"].isoformat(),
                "execution_time": solution.get("execution_time"),
                "attempts": solution.get("attempts", 1)
            }
        
        problem_response = {
            "id": str(problem["_id"]),
            "title": problem["title"],
            "description": problem["description"],
            "topic": problem["topic"],
            "difficulty": problem["difficulty"],
            "constraints": problem["constraints"],
            "examples": problem["examples"],
            "test_cases": problem.get("test_cases", []),
            "hints": problem["hints"],
            "tags": problem["tags"],
            "expected_complexity": problem["expected_complexity"],
            "success_rate": problem.get("success_rate", 0.0),
            "average_time": problem.get("average_time"),
            "last_attempt": last_attempt
        }
        
        print(f"[OK] [CODING] Problem retrieved: {problem['title']}")
        
        return {
            "success": True,
            "problem": problem_response
        }
        
    except Exception as e:
        print(f"[ERROR] [CODING] Error fetching problem: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch problem: {str(e)}"
        )

# Code Execution and Submission Endpoints

@router.post("/execute")
async def execute_code(
    request: CodeExecutionRequest,
    user_id: str = Depends(get_current_user_id)
):
    """Execute code with test cases"""
    try:
        print(f"⚡ [CODING] User {user_id} executing {request.language} code via HackerEarth")
        print(f"[DEBUG] [CODING] HackerEarth service available: {hackerearth_execution_service is not None}")
        
        # Check if HackerEarth service is available
        if not hackerearth_execution_service:
            print("[DEBUG] [CODING] Attempting to create HackerEarth service instance...")
            try:
                service = get_hackerearth_service()
                print("[DEBUG] [CODING] HackerEarth service created successfully")
            except ValueError as e:
                print(f"[ERROR] [CODING] Failed to create HackerEarth service: {str(e)}")
                raise HTTPException(
                    status_code=503,
                    detail="Code execution service is not configured. Please contact the administrator."
                )
        else:
            print("[DEBUG] [CODING] Using existing HackerEarth service instance")
            service = hackerearth_execution_service
            
        # Use HackerEarth for deterministic execution against provided test cases
        judge_results = service.run_tests(
            language=request.language,
            code=request.code,
            test_cases=request.test_cases or []
        )

        passed = sum(1 for r in judge_results if r.get("passed"))
        total = len(judge_results)
        exec_time_ms = int(sum((r.get("execution_time") or 0) for r in judge_results))
        mem_used_kb = int(max((r.get("memory") or 0) for r in judge_results)) if judge_results else 0

        execution_result = {
            "success": passed == total and total > 0,
            "execution_time": exec_time_ms,
            "memory_used": mem_used_kb,
            "results": judge_results,
            "output": "\n".join([r.get("output", "") for r in judge_results if r.get("output")]),
            "error": None if passed == total else next((r.get("error") for r in judge_results if r.get("error")), None),
        }

        print(f"[OK] [CODING] HackerEarth execution completed - Passed {passed}/{total}")

        return {"success": True, "execution_result": execution_result}
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except ValueError as e:
        # Configuration errors should return 503 Service Unavailable
        error_msg = str(e)
        if "HACKEREARTH_CLIENT_SECRET" in error_msg:
            print(f"[ERROR] [CODING] Configuration error: {error_msg}")
            raise HTTPException(
                status_code=503,
                detail="Code execution service is not properly configured. Please contact the administrator."
            )
        else:
            print(f"[ERROR] [CODING] Validation error: {error_msg}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid request: {error_msg}"
            )
    except Exception as e:
        error_msg = str(e)
        print(f"[ERROR] [CODING] Code execution failed: {error_msg}")
        # Only print full traceback in debug mode or for unexpected errors
        import os
        if os.getenv("DEBUG", "").lower() == "true" or os.getenv("LOG_LEVEL", "").upper() == "DEBUG":
            import traceback
            traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Code execution failed: {error_msg}"
        )

@router.post("/test-code")
async def test_code_against_problem(
    request: dict,
    user_id: str = Depends(get_current_user_id)
):
    """Test any code against any problem's test cases for debugging"""
    try:
        problem_id = request.get("problem_id")
        code = request.get("code", "")
        language = request.get("language", "python")
        
        if not problem_id:
            raise HTTPException(status_code=400, detail="Problem ID is required")
        
        if not code.strip():
            raise HTTPException(status_code=400, detail="Code is required")
        
        print(f"🧪 [CODING] User {user_id} testing code against problem {problem_id}")
        
        db = await get_db()
        
        # Get problem with all test cases
        problem = await db.coding_problems.find_one({"_id": ObjectId(problem_id)})
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found")
        
        # Use all test cases (visible + hidden) for comprehensive testing
        all_test_cases = problem.get("test_cases", []) + problem.get("hidden_test_cases", [])
        
        if not all_test_cases:
            raise HTTPException(status_code=400, detail="No test cases available for this problem")
        
        # Execute code with all test cases via HackerEarth
        if not hackerearth_execution_service:
            try:
                service = get_hackerearth_service()
            except ValueError:
                raise HTTPException(
                    status_code=503,
                    detail="Code execution service is not configured. Please contact the administrator."
                )
        else:
            service = hackerearth_execution_service
            
        judge_results = service.run_tests(
            language=language,
            code=code,
            test_cases=all_test_cases
        )

        passed = sum(1 for r in judge_results if r.get("passed"))
        total = len(judge_results)
        exec_time_ms = int(sum((r.get("execution_time") or 0) for r in judge_results))
        mem_used_kb = int(max((r.get("memory") or 0) for r in judge_results)) if judge_results else 0

        # Detailed analysis of results
        detailed_results = []
        for i, result in enumerate(judge_results):
            test_case = all_test_cases[i] if i < len(all_test_cases) else {}
            detailed_result = {
                "test_case_number": i + 1,
                "input": test_case.get("input", ""),
                "expected_output": test_case.get("output", ""),
                "actual_output": result.get("output", ""),
                "passed": result.get("passed", False),
                "execution_time": result.get("execution_time", 0),
                "memory_used": result.get("memory", 0),
                "error": result.get("error"),
                "debug_info": result.get("debug_info", {}),
                "is_hidden": i >= len(problem.get("test_cases", []))
            }
            detailed_results.append(detailed_result)

        execution_result = {
            "success": passed == total and total > 0,
            "execution_time": exec_time_ms,
            "memory_used": mem_used_kb,
            "passed_tests": passed,
            "total_tests": total,
            "results": detailed_results,
            "problem_info": {
                "id": str(problem["_id"]),
                "title": problem.get("title", ""),
                "topic": problem.get("topic", ""),
                "difficulty": problem.get("difficulty", "")
            }
        }

        print(f"[OK] [CODING] Code testing completed - Passed {passed}/{total}")

        return {"success": True, "execution_result": execution_result}
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except ValueError as e:
        # Configuration errors should return 503 Service Unavailable
        error_msg = str(e)
        if "HACKEREARTH_CLIENT_SECRET" in error_msg:
            print(f"[ERROR] [CODING] Configuration error: {error_msg}")
            raise HTTPException(
                status_code=503,
                detail="Code execution service is not properly configured. Please contact the administrator."
            )
        else:
            print(f"[ERROR] [CODING] Validation error: {error_msg}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid request: {error_msg}"
            )
    except Exception as e:
        print(f"[ERROR] [CODING] Code testing failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Code testing failed: {str(e)}"
        )

@router.post("/submit")
async def submit_solution(
    solution: CodingSolutionSubmit,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id)
):
    """Submit a coding solution for evaluation"""
    try:
        print(f"[SEND] [CODING] User {user_id} submitting solution for problem: {solution.problem_id}")
        print(f"[DEBUG] [CODING] Submission data - Language: {solution.language}, Code length: {len(solution.code)}, Session ID: {solution.session_id}")
        
        db = await get_db()
        
        # Get problem with all test cases
        problem = await db.coding_problems.find_one({"_id": ObjectId(solution.problem_id)})
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found")
        
        # Combine visible and hidden test cases (robust to missing/None)
        visible_cases = problem.get("test_cases") or []
        hidden_cases = problem.get("hidden_test_cases") or []
        all_test_cases = visible_cases + hidden_cases
        
        # Execute code with all test cases via HackerEarth
        if not hackerearth_execution_service:
            try:
                service = get_hackerearth_service()
            except ValueError:
                raise HTTPException(
                    status_code=503,
                    detail="Code execution service is not configured. Please contact the administrator."
                )
        else:
            service = hackerearth_execution_service
            
        judge_results = service.run_tests(
            language=solution.language,
            code=solution.code,
            test_cases=all_test_cases
        )

        judge_results = judge_results or []
        passed = sum(1 for r in judge_results if r and r.get("passed"))
        total = len(judge_results)
        exec_time_ms = int(sum(((r or {}).get("execution_time") or 0) for r in judge_results))
        mem_used_kb = int(max(((r or {}).get("memory") or 0) for r in judge_results)) if judge_results else 0

        execution_result = {
            "success": passed == total and total > 0,
            "execution_time": exec_time_ms,
            "memory_used": mem_used_kb,
            "results": judge_results,
        }
        
        # Determine status
        if execution_result["success"]:
            status = "accepted"
        else:
            # Check specific failure reasons
            results_list = execution_result.get("results") or []
            has_errors = any((res or {}).get("error") for res in results_list)
            has_timeouts = any("Time Limit" in ((res or {}).get("error", "") or "") for res in results_list)
            
            if has_timeouts:
                status = "time_limit_exceeded"
            elif has_errors:
                status = "runtime_error"
            elif total == 0:
                status = "no_result"
            else:
                status = "wrong_answer"
        
        # Count previous attempts
        previous_attempts = await db.coding_solutions.count_documents({
            "user_id": ObjectId(user_id),
            "problem_id": ObjectId(solution.problem_id)
        })
        
        # Create solution document
        solution_doc = {
            "user_id": ObjectId(user_id),
            "problem_id": ObjectId(solution.problem_id),
            "code": solution.code,
            "language": solution.language,
            "status": status,
            "execution_time": execution_result["execution_time"],
            "memory_used": execution_result["memory_used"],
            "test_results": execution_result["results"],
            "submitted_at": datetime.utcnow(),
            "attempts": previous_attempts + 1
        }
        
        # Save solution
        result = await db.coding_solutions.insert_one(solution_doc)
        solution_doc["_id"] = result.inserted_id
        
        # Update coding session if session_id provided
        if solution.session_id:
            try:
                await db.coding_sessions.update_one(
                    {"_id": ObjectId(solution.session_id), "user_id": ObjectId(user_id)},
                    {
                        "$inc": {"submissions": 1},
                        "$set": {
                            "last_submission_status": status,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                print(f"[OK] [CODING] Updated session {solution.session_id} with submission status: {status}")
            except Exception as session_err:
                print(f"[WARN] [CODING] Failed to update session {solution.session_id}: {str(session_err)}")
        
        # Gamification XP removed per user request
        
        # Schedule background tasks for AI feedback and analytics update
        background_tasks.add_task(
            generate_ai_feedback_task,
            str(result.inserted_id),
            solution.code,
            problem["description"],
            solution.language,
            execution_result["results"]
        )
        background_tasks.add_task(update_user_analytics_task, user_id, str(solution.problem_id), status == "accepted")
        background_tasks.add_task(update_problem_stats_task, solution.problem_id, status == "accepted", execution_result["execution_time"])
        
        print(f"[OK] [CODING] Solution submitted - Status: {status}")
        
        return {
            "success": True,
            "submission": {
                "id": str(result.inserted_id),
                "status": status,
                "execution_time": execution_result["execution_time"],
                "memory_used": execution_result["memory_used"],
                "test_results": execution_result["results"],
                "submitted_at": solution_doc["submitted_at"].isoformat()
            }
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except ValueError as e:
        # Configuration errors should return 503 Service Unavailable
        error_msg = str(e)
        if "HACKEREARTH_CLIENT_SECRET" in error_msg:
            print(f"[ERROR] [CODING] Configuration error: {error_msg}")
            raise HTTPException(
                status_code=503,
                detail="Code execution service is not properly configured. Please contact the administrator."
            )
        else:
            print(f"[ERROR] [CODING] Validation error: {error_msg}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid request: {error_msg}"
            )
    except Exception as e:
        print(f"[ERROR] [CODING] Solution submission failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Solution submission failed: {str(e)}"
        )

@router.get("/submissions/user")
async def get_user_submissions(
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    user_id: str = Depends(get_current_user_id)
):
    """Get all submissions for the current user"""
    try:
        print(f"[LIST] [CODING] User {user_id} requesting their submissions (limit: {limit}, skip: {skip})")
        
        db = await get_db()
        
        # Get submissions with problem titles
        submissions = await db.coding_solutions.find(
            {"user_id": ObjectId(user_id)}
        ).sort("submitted_at", -1).skip(skip).limit(limit).to_list(None)
        
        # Get all unique problem IDs to fetch their titles
        problem_ids = list(set([sol["problem_id"] for sol in submissions]))
        problems = await db.coding_problems.find(
            {"_id": {"$in": problem_ids}},
            {"title": 1, "topic": 1, "difficulty": 1}
        ).to_list(None)
        
        # Create a mapping of problem_id to problem info
        problem_map = {str(p["_id"]): p for p in problems}
        
        # Format response
        formatted_submissions = []
        for sol in submissions:
            p_id = str(sol["problem_id"])
            p_info = problem_map.get(p_id, {})
            
            formatted_submissions.append({
                "id": str(sol["_id"]),
                "problem_id": p_id,
                "problem_title": p_info.get("title", "Unknown Problem"),
                "problem_topic": p_info.get("topic", "Unknown"),
                "problem_difficulty": p_info.get("difficulty", "medium"),
                "status": sol["status"],
                "language": sol["language"],
                "submitted_at": sol["submitted_at"].isoformat() if hasattr(sol["submitted_at"], "isoformat") else str(sol["submitted_at"]),
                "execution_time": sol.get("execution_time"),
                "memory_used": sol.get("memory_used"),
                "attempts": sol.get("attempts", 1)
            })
        
        print(f"[OK] [CODING] Returning {len(formatted_submissions)} submissions")
        
        return {
            "success": True,
            "submissions": formatted_submissions,
            "total": len(formatted_submissions)
        }
        
    except Exception as e:
        print(f"[ERROR] [CODING] Error fetching user submissions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch user submissions: {str(e)}"
        )

@router.get("/submissions/{submission_id}")
async def get_submission(
    submission_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get a specific submission by ID"""
    try:
        print(f"[LIST] [CODING] User {user_id} requesting submission: {submission_id}")
        
        db = await get_db()
        
        # Get submission
        submission = await db.coding_solutions.find_one({"_id": ObjectId(submission_id)})
        
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        
        # Ensure user can only access their own submissions
        if str(submission["user_id"]) != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        problem = await db.coding_problems.find_one(
            {"_id": submission["problem_id"]},
            {"title": 1, "topic": 1, "difficulty": 1, "description": 1, "problem_statement": 1, "reference_solution": 1}
        )
        
        submission_response = {
            "id": str(submission["_id"]),
            "problem_id": str(submission["problem_id"]),
            "problem_title": problem["title"] if problem else "Unknown",
            "problem_topic": problem["topic"] if problem else "Unknown",
            "problem_difficulty": problem["difficulty"] if problem else "Unknown",
            "problem_description": problem.get("description") or problem.get("problem_statement") if problem else "",
            "reference_solution": problem.get("reference_solution") if problem else None,
            "code": submission["code"],
            "language": submission["language"],
            "status": submission["status"],
            "execution_time": submission.get("execution_time"),
            "memory_used": submission.get("memory_used"),
            "test_results": submission["test_results"],
            "ai_feedback": submission.get("ai_feedback"),
            "code_quality_score": submission.get("code_quality_score"),
            "submitted_at": submission["submitted_at"].isoformat(),
            "attempts": submission.get("attempts", 1)
        }
        
        print(f"[OK] [CODING] Submission retrieved")
        
        return {
            "success": True,
            "submission": submission_response
        }
        
    except Exception as e:
        print(f"[ERROR] [CODING] Error fetching submission: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch submission: {str(e)}"
        )

# Session Management Endpoints

@router.post("/sessions/start")
async def start_coding_session(
    session_data: CodingSessionStart,
    user_id: str = Depends(get_current_user_id)
):
    """Start a new coding session"""
    try:
        print(f"[START] [CODING] User {user_id} starting session for problem: {session_data.problem_id}")
        
        db = await get_db()
        
        # Verify problem exists
        problem = await db.coding_problems.find_one({"_id": ObjectId(session_data.problem_id)})
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found")
        
        # Create session document
        session_doc = {
            "user_id": ObjectId(user_id),
            "problem_id": ObjectId(session_data.problem_id),
            "start_time": datetime.utcnow(),
            "keystrokes": 0,
            "lines_of_code": 0,
            "compilation_attempts": 0,
            "test_runs": 0,
            "hints_used": 0
        }
        
        result = await db.coding_sessions.insert_one(session_doc)
        
        print(f"[OK] [CODING] Session started: {result.inserted_id}")
        
        return {
            "success": True,
            "session_id": str(result.inserted_id)
        }
        
    except Exception as e:
        print(f"[ERROR] [CODING] Error starting session: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start session: {str(e)}"
        )

@router.put("/sessions/{session_id}")
async def update_coding_session(
    session_id: str,
    update_data: dict,  # Changed to dict for flexibility
    user_id: str = Depends(get_current_user_id)
):
    """Update coding session data - flexible endpoint"""
    try:
        db = await get_db()
        
        # Build update document dynamically
        update_doc = {"$set": {}, "$inc": {}}
        
        # Fields to set directly
        set_fields = ["code", "cursor_position", "language"]
        for field in set_fields:
            if field in update_data and update_data[field] is not None:
                update_doc["$set"][field] = update_data[field]
        
        # Numeric fields to set
        numeric_set_fields = ["keystrokes", "lines_of_code"]
        for field in numeric_set_fields:
            if field in update_data and update_data[field] is not None:
                update_doc["$set"][field] = update_data[field]
        
        # Fields to increment
        inc_fields = ["compilation_attempts", "test_runs", "hints_used", "submissions"]
        for field in inc_fields:
            if field in update_data and update_data[field] is not None:
                update_doc["$inc"][field] = update_data[field]
        
        # Special fields
        if "last_test_results" in update_data:
            update_doc["$set"]["last_test_results"] = update_data["last_test_results"]
        if "last_error" in update_data:
            update_doc["$set"]["last_error"] = update_data["last_error"]
        if "last_submission_status" in update_data:
            update_doc["$set"]["last_submission_status"] = update_data["last_submission_status"]
        
        # Remove empty operators
        if not update_doc["$set"]:
            del update_doc["$set"]
        if not update_doc["$inc"]:
            del update_doc["$inc"]
        
        # If no updates, return success
        if not update_doc:
            return {"success": True, "message": "No updates provided"}
        
        # Update session (don't fail if not found, just log)
        result = await db.coding_sessions.update_one(
            {"_id": ObjectId(session_id), "user_id": ObjectId(user_id)},
            update_doc
        )
        
        if result.matched_count == 0:
            print(f"[WARN] [CODING] Session not found for update: {session_id}")
            # Don't raise error - session tracking is optional
            return {"success": True, "message": "Session not found but continuing"}
        
        return {"success": True}
        
    except Exception as e:
        print(f"[ERROR] [CODING] Error updating session: {str(e)}")
        # Don't raise HTTP exception - make session updates non-critical
        return {"success": False, "error": str(e)}

@router.post("/sessions/{session_id}/end")
async def end_coding_session(
    session_id: str,
    end_data: dict,  # Changed to dict to accept flexible request body
    user_id: str = Depends(get_current_user_id)
):
    """End a coding session"""
    try:
        db = await get_db()
        
        # Get session
        session = await db.coding_sessions.find_one({
            "_id": ObjectId(session_id),
            "user_id": ObjectId(user_id)
        })
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Extract final_status from request body, default to "completed" if not provided
        final_status = end_data.get("final_status", "completed")
        
        # Calculate total time
        end_time = datetime.utcnow()
        total_time = int((end_time - session["start_time"]).total_seconds())
        
        # Build update document
        update_doc = {
            "$set": {
                "end_time": end_time,
                "total_time": total_time,
                "final_status": final_status
            }
        }
        
        # Optionally save additional fields if provided
        if "solution_code" in end_data:
            update_doc["$set"]["solution_code"] = end_data["solution_code"]
        if "completion_time" in end_data:
            update_doc["$set"]["completion_time"] = end_data["completion_time"]
        
        # Update session
        await db.coding_sessions.update_one(
            {"_id": ObjectId(session_id)},
            update_doc
        )
        
        print(f"[OK] [CODING] Session ended: {session_id} (Duration: {total_time}s, Status: {final_status})")
        
        return {
            "success": True,
            "session_summary": {
                "total_time": total_time,
                "keystrokes": session.get("keystrokes", 0),
                "lines_of_code": session.get("lines_of_code", 0),
                "compilation_attempts": session.get("compilation_attempts", 0),
                "test_runs": session.get("test_runs", 0),
                "hints_used": session.get("hints_used", 0),
                "final_status": final_status
            }
        }
        
    except Exception as e:
        print(f"[ERROR] [CODING] Error ending session: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to end session: {str(e)}"
        )

# Analytics Endpoints

@router.get("/analytics")
async def get_coding_analytics(
    user_id: str = Depends(get_current_user_id)
):
    """Get coding analytics for the user"""
    try:
        print(f"[STATS] [CODING] User {user_id} requesting coding analytics")
        
        db = await get_db()
        
        # Get or create analytics
        analytics = await db.coding_analytics.find_one({"user_id": ObjectId(user_id)})
        
        if not analytics:
            # Create initial analytics
            analytics_doc = {
                "user_id": ObjectId(user_id),
                "total_problems_solved": 0,
                "total_problems_attempted": 0,
                "success_rate": 0.0,
                "average_time_per_problem": 0.0,
                "skill_level": "beginner",
                "strong_topics": [],
                "weak_topics": [],
                "improvement_areas": [],
                "learning_path": [],
                "last_updated": datetime.utcnow(),
                "problems_by_difficulty": {"easy": 0, "medium": 0, "hard": 0},
                "problems_by_topic": {}
            }
            
            result = await db.coding_analytics.insert_one(analytics_doc)
            analytics = analytics_doc
            analytics["_id"] = result.inserted_id
        
        # Get recent activity
        recent_solutions = await db.coding_solutions.find(
            {"user_id": ObjectId(user_id)}
        ).sort("submitted_at", -1).limit(10).to_list(None)
        
        # Format response
        analytics_response = {
            "total_problems_solved": analytics["total_problems_solved"],
            "total_problems_attempted": analytics["total_problems_attempted"],
            "success_rate": analytics["success_rate"],
            "average_time_per_problem": analytics["average_time_per_problem"],
            "preferred_language": analytics.get("preferred_language"),
            "skill_level": analytics["skill_level"],
            "strong_topics": analytics["strong_topics"],
            "weak_topics": analytics["weak_topics"],
            "improvement_areas": analytics["improvement_areas"],
            "learning_path": analytics["learning_path"],
            "problems_by_difficulty": analytics["problems_by_difficulty"],
            "problems_by_topic": analytics["problems_by_topic"],
            "recent_activity": [
                {
                    "problem_id": str(sol["problem_id"]),
                    "status": sol["status"],
                    "language": sol["language"],
                    "submitted_at": sol["submitted_at"].isoformat(),
                    "execution_time": sol.get("execution_time")
                }
                for sol in recent_solutions
            ]
        }
        
        print(f"[OK] [CODING] Analytics retrieved for user {user_id}")
        
        return {
            "success": True,
            "analytics": analytics_response
        }
        
    except Exception as e:
        print(f"[ERROR] [CODING] Error fetching analytics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch analytics: {str(e)}"
        )

@router.post("/analytics/learning-path")
async def generate_learning_path(
    user_id: str = Depends(get_current_user_id)
):
    """Generate personalized learning path using AI"""
    try:
        print(f"[TARGET] [CODING] Generating learning path for user: {user_id}")
        
        db = await get_db()
        
        # Get user solutions and analytics
        user_solutions = await db.coding_solutions.find(
            {"user_id": ObjectId(user_id)}
        ).sort("submitted_at", -1).limit(50).to_list(None)
        
        analytics = await db.coding_analytics.find_one({"user_id": ObjectId(user_id)})
        
        if not analytics:
            analytics = {
                "total_problems_solved": 0,
                "success_rate": 0.0,
                "skill_level": "beginner",
                "strong_topics": [],
                "weak_topics": []
            }
        
        # Convert solutions to format for AI
        solutions_data = [
            {
                "status": sol["status"],
                "language": sol["language"],
                "execution_time": sol.get("execution_time", 0),
                "submitted_at": sol["submitted_at"].isoformat()
            }
            for sol in user_solutions
        ]
        
        # Generate learning path using AI
        learning_path = await gemini_coding_service.generate_learning_path(
            user_solutions=solutions_data,
            user_analytics=analytics
        )
        
        # Update analytics with new learning path
        await db.coding_analytics.update_one(
            {"user_id": ObjectId(user_id)},
            {
                "$set": {
                    "learning_path": learning_path.get("recommended_topics", []),
                    "improvement_areas": learning_path.get("improvement_areas", []),
                    "last_updated": datetime.utcnow()
                }
            },
            upsert=True
        )
        
        print(f"[OK] [CODING] Learning path generated for user {user_id}")
        
        return {
            "success": True,
            "learning_path": learning_path
        }
        
    except Exception as e:
        print(f"[ERROR] [CODING] Error generating learning path: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate learning path: {str(e)}"
        )

# Background Tasks

async def generate_ai_feedback_task(
    submission_id: str,
    code: str,
    problem_description: str,
    language: str,
    test_results: List[Dict[str, Any]],
    collection_name: str = "coding_solutions"
):
    """Background task to generate AI feedback for a submission"""
    try:
        print(f"[AI] [BACKGROUND] Generating AI feedback for submission: {submission_id}")
        
        # Generate AI feedback
        feedback = await gemini_coding_service.analyze_code_solution(
            code=code,
            problem_description=problem_description,
            language=language,
            test_results=test_results
        )
        
        # Update submission with AI feedback
        db = await get_db()
        await db[collection_name].update_one(
            {"_id": ObjectId(submission_id)},
            {
                "$set": {
                    "ai_feedback": feedback,
                    "code_quality_score": feedback.get("overall_score", 70)
                }
            }
        )
        
        print(f"[OK] [BACKGROUND] AI feedback generated for submission: {submission_id}")
        
    except Exception as e:
        print(f"[ERROR] [BACKGROUND] Error generating AI feedback: {str(e)}")

async def update_user_analytics_task(user_id: str, problem_id: str, solved: bool):
    """Background task to update user analytics tracking unique problems"""
    try:
        print(f"[STATS] [BACKGROUND] Updating analytics for user: {user_id}, problem: {problem_id}")
        
        db = await get_db()
        
        # Get current analytics
        analytics = await db.coding_analytics.find_one({"user_id": ObjectId(user_id)})
        
        if not analytics:
            # Create new analytics with sets for unique tracking
            analytics_doc = {
                "user_id": ObjectId(user_id),
                "total_problems_solved": 1 if solved else 0,
                "total_problems_attempted": 1,
                "attempted_problem_ids": [ObjectId(problem_id)],
                "solved_problem_ids": [ObjectId(problem_id)] if solved else [],
                "success_rate": 100.0 if solved else 0.0,
                "average_time_per_problem": 0.0,
                "skill_level": "beginner",
                "strong_topics": [],
                "weak_topics": [],
                "improvement_areas": [],
                "learning_path": [],
                "last_updated": datetime.utcnow(),
                "problems_by_difficulty": {"easy": 0, "medium": 0, "hard": 0},
                "problems_by_topic": {}
            }
            await db.coding_analytics.insert_one(analytics_doc)
        else:
            # Update existing analytics using $addToSet for uniqueness
            update_ops = {
                "$addToSet": {"attempted_problem_ids": ObjectId(problem_id)},
                "$set": {"last_updated": datetime.utcnow()}
            }
            
            if solved:
                if "$addToSet" not in update_ops:
                    update_ops["$addToSet"] = {}
                update_ops["$addToSet"]["solved_problem_ids"] = ObjectId(problem_id)
            
            # Perform the set updates first
            await db.coding_analytics.update_one(
                {"user_id": ObjectId(user_id)},
                update_ops
            )
            
            # Recalculate total counts from the sets
            # This is more robust than simple incrementing
            updated_analytics = await db.coding_analytics.find_one({"user_id": ObjectId(user_id)})
            
            attempted_count = len(updated_analytics.get("attempted_problem_ids", []))
            solved_count = len(updated_analytics.get("solved_problem_ids", []))
            success_rate = (solved_count / attempted_count * 100) if attempted_count > 0 else 0
            
            await db.coding_analytics.update_one(
                {"user_id": ObjectId(user_id)},
                {
                    "$set": {
                        "total_problems_attempted": attempted_count,
                        "total_problems_solved": solved_count,
                        "success_rate": success_rate
                    }
                }
            )
        
        print(f"[OK] [BACKGROUND] Analytics updated for user: {user_id}")
        
    except Exception as e:
        print(f"[ERROR] [BACKGROUND] Error updating analytics: {str(e)}")

async def update_problem_stats_task(problem_id: str, solved: bool, execution_time: int):
    """Background task to update problem statistics"""
    try:
        print(f"[UP] [BACKGROUND] Updating stats for problem: {problem_id}")
        
        db = await get_db()
        
        # Get current problem stats
        problem = await db.coding_problems.find_one({"_id": ObjectId(problem_id)})
        
        if problem:
            # Get all solutions for this problem
            solutions = await db.coding_solutions.find({"problem_id": ObjectId(problem_id)}).to_list(None)
            
            if solutions:
                solved_count = sum(1 for sol in solutions if sol["status"] == "accepted")
                total_count = len(solutions)
                success_rate = (solved_count / total_count) * 100
                
                # Calculate average time for accepted solutions
                accepted_solutions = [sol for sol in solutions if sol["status"] == "accepted" and sol.get("execution_time")]
                if accepted_solutions:
                    avg_time = sum(sol["execution_time"] for sol in accepted_solutions) / len(accepted_solutions)
                else:
                    avg_time = None
                
                # Update problem stats
                await db.coding_problems.update_one(
                    {"_id": ObjectId(problem_id)},
                    {
                        "$set": {
                            "success_rate": success_rate,
                            "average_time": avg_time
                        }
                    }
                )
        
        print(f"[OK] [BACKGROUND] Problem stats updated: {problem_id}")
        
    except Exception as e:
        print(f"[ERROR] [BACKGROUND] Error updating problem stats: {str(e)}")
