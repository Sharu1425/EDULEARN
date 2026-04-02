"""
Code Execution Module
Handles code execution, testing, and validation
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel
from ...db import get_db
from ...dependencies import get_current_user
from ...models.models import UserModel

router = APIRouter(prefix="/coding", tags=["coding-execution"])

# Response Models
class ExecutionResponse(BaseModel):
    status: str
    output: str
    error: Optional[str]
    execution_time: int
    memory_used: int
    test_results: List[Dict]

class TestResponse(BaseModel):
    status: str
    test_results: List[Dict]
    score: int
    execution_time: int
    memory_used: int

@router.post("/execute")
async def execute_code(
    execution_data: dict,
    current_user: UserModel = Depends(get_current_user)
):
    """Execute code and return results"""
    try:
        db = await get_db()
        
        code = execution_data.get("code", "")
        language = execution_data.get("language", "python")
        input_data = execution_data.get("input", "")
        
        if not code.strip():
            raise HTTPException(status_code=400, detail="Code cannot be empty")
        
        print(f"🔧 [CODING] Executing {language} code for user {current_user.id}")
        
        # Execute code using HackerEarth service
        from app.services.hackerearth_execution_service import HackerEarthExecutionService
        execution_service = HackerEarthExecutionService()
        
        # 'input_data' from the frontend is just a single string.
        # The run_tests service expects a list of test cases.
        # We must wrap the single input into a test case structure.
        test_case = {"input": input_data, "output": ""}
        
        results = execution_service.run_tests(
            code=code,
            language=language,
            test_cases=[test_case]
        )
        
        # Get the result for our single test case
        result = results[0] if results else {}
        
        # Determine status from the result
        status = "success" if result.get("passed", False) else "failed"
        if result.get("error"):
            if "Compilation" in result.get("error", ""):
                status = "compile_error"
            elif "Runtime" in result.get("error", ""):
                status = "runtime_error"
        
        # Store execution log
        execution_log = {
            "user_id": str(current_user.id),
            "code": code,
            "language": language,
            "input": input_data,
            "output": result.get("output", ""),
            "error": result.get("error", ""),
            "execution_time": result.get("execution_time", 0),
            "memory_used": result.get("memory", 0),  # Note: service returns "memory", not "memory_used"
            "status": status,
            "executed_at": datetime.utcnow()
        }
        
        await db.code_executions.insert_one(execution_log)
        
        return ExecutionResponse(
            status=status,
            output=result.get("output", ""),
            error=result.get("error"),
            execution_time=result.get("execution_time", 0),
            memory_used=result.get("memory", 0),  # Note: service returns "memory"
            test_results=[]  # Single execution doesn't have test_results
        )
        
    except Exception as e:
        print(f"❌ [CODING] Code execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test-code")
async def test_code_against_problem(
    test_data: dict,
    current_user: UserModel = Depends(get_current_user)
):
    """Test code against a specific problem's test cases"""
    try:
        db = await get_db()
        
        problem_id = test_data.get("problem_id")
        code = test_data.get("code", "")
        language = test_data.get("language", "python")
        
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
        
        print(f"🧪 [CODING] Testing code against problem '{problem['title']}' for user {current_user.id}")
        
        # Execute code against test cases
        from app.services.hackerearth_execution_service import HackerEarthExecutionService
        execution_service = HackerEarthExecutionService()
        
        test_results = []
        total_score = 0
        max_score = len(problem["test_cases"]) * 10  # Assuming 10 points per test case
        
        # Execute all test cases in batch using run_tests
        try:
            all_results = execution_service.run_tests(
                code=code,
                language=language,
                test_cases=problem["test_cases"]
            )
            
            # Process results from the batch execution
            for i, result in enumerate(all_results):
                expected_output = result.get("expected", "").strip()
                actual_output = result.get("output", "").strip()
                
                test_passed = result.get("passed", False)
                test_score = 10 if test_passed else 0
                total_score += test_score
                
                test_results.append({
                    "test_case": i + 1,
                    "input": result.get("input", ""),
                    "expected_output": expected_output,
                    "actual_output": actual_output,
                    "passed": test_passed,
                    "score": test_score,
                    "execution_time": result.get("execution_time", 0),
                    "memory_used": result.get("memory", 0),
                    "error": result.get("error", "")
                })
        except Exception as e:
            # If batch execution fails, create failed results for all test cases
            for i, test_case in enumerate(problem["test_cases"]):
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
        
        # Determine overall status
        passed_tests = sum(1 for test in test_results if test["passed"])
        total_tests = len(test_results)
        
        if passed_tests == total_tests:
            status = "accepted"
        elif passed_tests > 0:
            status = "partial"
        else:
            status = "wrong_answer"
        
        # Store test result
        test_result_doc = {
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
            "submitted_at": datetime.utcnow()
        }
        
        result_id = await db.coding_submissions.insert_one(test_result_doc)
        
        # Update user analytics
        await update_user_analytics_task(str(current_user.id), status == "accepted")
        
        # Update problem statistics
        await update_problem_stats_task(problem_id, status == "accepted", test_result_doc["execution_time"])
        
        print(f"✅ [CODING] Test completed with status: {status}, score: {total_score}/{max_score}")
        
        return TestResponse(
            status=status,
            test_results=test_results,
            score=total_score,
            execution_time=test_result_doc["execution_time"],
            memory_used=test_result_doc["memory_used"]
        )
        
    except Exception as e:
        print(f"❌ [CODING] Code testing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/validate-syntax")
async def validate_syntax(
    validation_data: dict,
    current_user: UserModel = Depends(get_current_user)
):
    """Validate code syntax without execution"""
    try:
        code = validation_data.get("code", "")
        language = validation_data.get("language", "python")
        
        if not code.strip():
            raise HTTPException(status_code=400, detail="Code cannot be empty")
        
        # Use HackerEarth for syntax validation
        from app.services.hackerearth_execution_service import HackerEarthExecutionService
        execution_service = HackerEarthExecutionService()
        
        # Execute with empty input to check syntax
        test_case = {"input": "", "output": ""}
        results = execution_service.run_tests(
            code=code,
            language=language,
            test_cases=[test_case]
        )
        result = results[0] if results else {}
        
        # Check if there are syntax errors
        has_syntax_error = bool(result.get("error"))
        
        # Determine status from debug_info
        debug_info = result.get("debug_info", {})
        status_description = debug_info.get("status", "unknown")
        
        return {
            "valid": not has_syntax_error,
            "error": result.get("error", "") if has_syntax_error else None,
            "status": status_description
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/languages")
async def get_supported_languages():
    """Get list of supported programming languages"""
    return {
        "languages": [
            {
                "id": "python",
                "name": "Python",
                "version": "3.8",
                "extension": ".py"
            },
            {
                "id": "javascript",
                "name": "JavaScript",
                "version": "Node.js 14",
                "extension": ".js"
            },
            {
                "id": "java",
                "name": "Java",
                "version": "11",
                "extension": ".java"
            },
            {
                "id": "cpp",
                "name": "C++",
                "version": "17",
                "extension": ".cpp"
            },
            {
                "id": "c",
                "name": "C",
                "version": "11",
                "extension": ".c"
            }
        ]
    }

async def update_user_analytics_task(user_id: str, solved: bool):
    """Update user analytics after code execution"""
    try:
        db = await get_db()
        
        # Get current user data
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return
        
        # Update coding statistics
        update_data = {
            "last_coding_activity": datetime.utcnow()
        }
        
        if solved:
            # Increment solved problems count
            current_solved = user.get("coding_problems_solved", 0)
            update_data["coding_problems_solved"] = current_solved + 1
            
            # Add XP for solving problem
            current_xp = user.get("xp", 0)
            coding_xp = 20  # XP for solving coding problem
            update_data["xp"] = current_xp + coding_xp
            
            # Update level
            new_level = (update_data["xp"] // 100) + 1
            update_data["level"] = new_level
        
        # Update total coding attempts
        current_attempts = user.get("coding_attempts", 0)
        update_data["coding_attempts"] = current_attempts + 1
        
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        print(f"✅ [ANALYTICS] Updated user analytics for {user_id}")
        
    except Exception as e:
        print(f"❌ [ANALYTICS] Failed to update user analytics: {str(e)}")

async def update_problem_stats_task(problem_id: str, solved: bool, execution_time: int):
    """Update problem statistics after submission"""
    try:
        db = await get_db()
        
        # Update problem statistics
        update_data = {
            "last_attempted_at": datetime.utcnow()
        }
        
        if solved:
            # Increment solved count
            problem = await db.coding_problems.find_one({"_id": ObjectId(problem_id)})
            if problem:
                current_solved = problem.get("times_solved", 0)
                update_data["times_solved"] = current_solved + 1
                
                # Update best execution time
                current_best_time = problem.get("best_execution_time", float('inf'))
                if execution_time < current_best_time:
                    update_data["best_execution_time"] = execution_time
        
        # Increment total attempts
        current_attempts = problem.get("total_attempts", 0) if problem else 0
        update_data["total_attempts"] = current_attempts + 1
        
        await db.coding_problems.update_one(
            {"_id": ObjectId(problem_id)},
            {"$set": update_data}
        )
        
        print(f"✅ [ANALYTICS] Updated problem statistics for {problem_id}")
        
    except Exception as e:
        print(f"❌ [ANALYTICS] Failed to update problem statistics: {str(e)}")
