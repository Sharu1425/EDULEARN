from datetime import timezone
"""
Coding Problem Management
Handles coding problem creation, retrieval, and management
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel
from ...db import get_db
from ...dependencies import require_teacher, get_current_user
from ...models.models import UserModel

router = APIRouter(prefix="/coding", tags=["coding-problems"])

# Response Models
class ProblemResponse(BaseModel):
    id: str
    title: str
    description: str
    difficulty: str
    topic: str
    test_cases: List[Dict]
    constraints: List[str]
    examples: List[Dict]
    hints: List[str]
    points: int
    time_limit: int
    memory_limit: int
    created_by: str
    created_at: str

class ProblemCreateRequest(BaseModel):
    title: str
    description: str
    difficulty: str
    topic: str
    test_cases: List[Dict]
    constraints: List[str]
    examples: List[Dict]
    hints: List[str]
    points: int
    time_limit: int
    memory_limit: int

@router.post("/problems/generate")
async def generate_problem(
    request_data: dict,
    current_user: UserModel = Depends(require_teacher)
):
    """Generate a coding problem using AI"""
    try:
        db = await get_db()
        
        topic = request_data.get("topic", "General Programming")
        difficulty = request_data.get("difficulty", "medium")
        problem_type = request_data.get("type", "algorithm")
        
        print(f"🤖 [CODING] Generating {difficulty} {problem_type} problem on {topic}")
        
        # Generate problem using Gemini AI
        from app.services.gemini_coding_service import GeminiCodingService
        gemini_service = GeminiCodingService()
        
        generated_problem = await gemini_service.generate_coding_problem(
            topic=topic,
            difficulty=difficulty,
            problem_type=problem_type
        )
        
        # Store the generated problem
        problem_doc = {
            "title": generated_problem["title"],
            "description": generated_problem["description"],
            "difficulty": difficulty,
            "topic": topic,
            "test_cases": generated_problem["test_cases"],
            "hidden_test_cases": generated_problem.get("hidden_test_cases", []),
            "constraints": generated_problem["constraints"],
            "examples": generated_problem["examples"],
            "hints": generated_problem["hints"],
            "code_templates": generated_problem.get("code_templates", {}),
            "points": generated_problem.get("points", 10),
            "time_limit": generated_problem.get("time_limit", 1000),
            "memory_limit": generated_problem.get("memory_limit", 256),
            "created_by": str(current_user.id),
            "created_at": datetime.now(timezone.utc),
            "is_active": True,
            "type": problem_type,
            "ai_generated": True
        }
        
        result = await db.coding_problems.insert_one(problem_doc)
        problem_id = str(result.inserted_id)
        
        print(f"✅ [CODING] Generated problem '{generated_problem['title']}' with ID: {problem_id}")
        
        return {
            "success": True,
            "problem_id": problem_id,
            "problem": {
                "id": problem_id,
                "title": generated_problem["title"],
                "description": generated_problem["description"],
                "difficulty": difficulty,
                "topic": topic,
                "test_cases": generated_problem["test_cases"],
                "constraints": generated_problem["constraints"],
                "examples": generated_problem["examples"],
                "hints": generated_problem["hints"],
                "points": generated_problem.get("points", 10),
                "time_limit": generated_problem.get("time_limit", 1000),
                "memory_limit": generated_problem.get("memory_limit", 256)
            }
        }
        
    except Exception as e:
        print(f"❌ [CODING] Failed to generate problem: {str(e)}")
        import traceback
        print(f"❌ [CODING] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/problems")
async def get_problems(
    skip: int = 0,
    limit: int = 20,
    difficulty: Optional[str] = None,
    topic: Optional[str] = None,
    current_user: UserModel = Depends(get_current_user)
):
    """Get coding problems with filtering"""
    try:
        db = await get_db()
        
        # Build query
        query = {"is_active": True}
        
        if difficulty:
            query["difficulty"] = difficulty
        if topic:
            query["topic"] = {"$regex": topic, "$options": "i"}
        
        # Get problems
        problems = await db.coding_problems.find(query).skip(skip).limit(limit).sort("created_at", -1).to_list(length=None)
        
        # Format response
        problem_list = []
        for problem in problems:
            # Check if user has solved this problem
            solved = False
            if current_user.role == "student":
                submission = await db.coding_submissions.find_one({
                    "problem_id": str(problem["_id"]),
                    "student_id": str(current_user.id),
                    "status": "accepted"
                })
                solved = submission is not None
            
            problem_list.append({
                "id": str(problem["_id"]),
                "title": problem["title"],
                "description": problem["description"],
                "difficulty": problem["difficulty"],
                "topic": problem["topic"],
                "points": problem.get("points", 10),
                "time_limit": problem.get("time_limit", 1000),
                "memory_limit": problem.get("memory_limit", 256),
                "created_by": problem["created_by"],
                "created_at": problem["created_at"].isoformat(),
                "solved": solved,
                "ai_generated": problem.get("ai_generated", False)
            })
        
        return {
            "problems": problem_list,
            "total_count": len(problem_list),
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/problems/{problem_id}")
async def get_problem(
    problem_id: str,
    current_user: UserModel = Depends(get_current_user)
):
    """Get detailed information about a specific coding problem"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(problem_id):
            raise HTTPException(status_code=400, detail="Invalid problem ID")
        
        # Get problem
        problem = await db.coding_problems.find_one({
            "_id": ObjectId(problem_id),
            "is_active": True
        })
        
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found")
        
        # Check if user has solved this problem
        solved = False
        user_submission = None
        if current_user.role == "student":
            submission = await db.coding_submissions.find_one({
                "problem_id": problem_id,
                "student_id": str(current_user.id),
                "status": "accepted"
            })
            solved = submission is not None
            
            # Get user's best submission
            user_submission = await db.coding_submissions.find_one({
                "problem_id": problem_id,
                "student_id": str(current_user.id)
            }, sort=[("score", -1)])
        
        # Get problem statistics
        total_submissions = await db.coding_submissions.count_documents({
            "problem_id": problem_id
        })
        
        accepted_submissions = await db.coding_submissions.count_documents({
            "problem_id": problem_id,
            "status": "accepted"
        })
        
        acceptance_rate = (accepted_submissions / max(total_submissions, 1)) * 100
        
        return {
            "problem": {
                "id": str(problem["_id"]),
                "title": problem["title"],
                "description": problem["description"],
                "difficulty": problem["difficulty"],
                "topic": problem["topic"],
                "test_cases": problem["test_cases"],
                "constraints": problem["constraints"],
                "examples": problem["examples"],
                "hints": problem["hints"],
                "code_templates": problem.get("code_templates", {}),
                "points": problem.get("points", 10),
                "time_limit": problem.get("time_limit", 1000),
                "memory_limit": problem.get("memory_limit", 256),
                "created_by": problem["created_by"],
                "created_at": problem["created_at"].isoformat(),
                "ai_generated": problem.get("ai_generated", False)
            },
            "user_status": {
                "solved": solved,
                "user_submission": {
                    "id": str(user_submission["_id"]),
                    "status": user_submission["status"],
                    "score": user_submission["score"],
                    "execution_time": user_submission["execution_time"],
                    "submitted_at": user_submission["submitted_at"].isoformat()
                } if user_submission else None
            },
            "statistics": {
                "total_submissions": total_submissions,
                "accepted_submissions": accepted_submissions,
                "acceptance_rate": round(acceptance_rate, 2)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/problems")
async def create_problem(
    problem_data: ProblemCreateRequest,
    current_user: UserModel = Depends(require_teacher)
):
    """Create a new coding problem"""
    try:
        db = await get_db()
        
        # Create problem document
        problem_doc = {
            "title": problem_data.title,
            "description": problem_data.description,
            "difficulty": problem_data.difficulty,
            "topic": problem_data.topic,
            "test_cases": problem_data.test_cases,
            "hidden_test_cases": [],
            "constraints": problem_data.constraints,
            "examples": problem_data.examples,
            "hints": problem_data.hints,
            "points": problem_data.points,
            "time_limit": problem_data.time_limit,
            "memory_limit": problem_data.memory_limit,
            "created_by": str(current_user.id),
            "created_at": datetime.now(timezone.utc),
            "is_active": True,
            "ai_generated": False
        }
        
        result = await db.coding_problems.insert_one(problem_doc)
        problem_id = str(result.inserted_id)
        
        return {
            "success": True,
            "problem_id": problem_id,
            "message": f"Problem '{problem_data.title}' created successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/problems/{problem_id}")
async def update_problem(
    problem_id: str,
    problem_data: dict,
    current_user: UserModel = Depends(require_teacher)
):
    """Update a coding problem"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(problem_id):
            raise HTTPException(status_code=400, detail="Invalid problem ID")
        
        # Check if problem exists and belongs to teacher
        problem = await db.coding_problems.find_one({
            "_id": ObjectId(problem_id),
            "created_by": str(current_user.id)
        })
        
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found or access denied")
        
        # Update problem
        update_data = {
            "updated_at": datetime.now(timezone.utc)
        }
        
        # Update allowed fields
        allowed_fields = [
            "title", "description", "difficulty", "topic", "test_cases",
            "constraints", "examples", "hints", "points", "time_limit", "memory_limit"
        ]
        
        for field in allowed_fields:
            if field in problem_data:
                update_data[field] = problem_data[field]
        
        await db.coding_problems.update_one(
            {"_id": ObjectId(problem_id)},
            {"$set": update_data}
        )
        
        return {
            "success": True,
            "message": f"Problem '{problem_data.get('title', problem['title'])}' updated successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/problems/{problem_id}")
async def delete_problem(
    problem_id: str,
    current_user: UserModel = Depends(require_teacher)
):
    """Delete a coding problem"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(problem_id):
            raise HTTPException(status_code=400, detail="Invalid problem ID")
        
        # Check if problem exists and belongs to teacher
        problem = await db.coding_problems.find_one({
            "_id": ObjectId(problem_id),
            "created_by": str(current_user.id)
        })
        
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found or access denied")
        
        # Soft delete by setting is_active to False
        await db.coding_problems.update_one(
            {"_id": ObjectId(problem_id)},
            {"$set": {"is_active": False, "deleted_at": datetime.now(timezone.utc)}}
        )
        
        return {
            "success": True,
            "message": f"Problem '{problem['title']}' deleted successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/problems/{problem_id}/submissions")
async def get_problem_submissions(
    problem_id: str,
    skip: int = 0,
    limit: int = 20,
    current_user: UserModel = Depends(get_current_user)
):
    """Get submissions for a specific problem"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(problem_id):
            raise HTTPException(status_code=400, detail="Invalid problem ID")
        
        # Check if problem exists
        problem = await db.coding_problems.find_one({
            "_id": ObjectId(problem_id),
            "is_active": True
        })
        
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found")
        
        # Get submissions
        submissions = await db.coding_submissions.find({
            "problem_id": problem_id
        }).skip(skip).limit(limit).sort("submitted_at", -1).to_list(length=None)
        
        # Format submissions
        submission_list = []
        for submission in submissions:
            submission_list.append({
                "id": str(submission["_id"]),
                "student_id": submission["student_id"],
                "student_name": submission["student_name"],
                "status": submission["status"],
                "score": submission["score"],
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
