from datetime import timezone
"""
Admin Content Oversight
Handles content management, moderation, and oversight operations
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel
from ...db import get_db
from ...dependencies import require_admin
from ...models.models import UserModel

router = APIRouter(tags=["admin-content"])

@router.get("/content/overview")
async def get_content_overview(current_user: UserModel = Depends(require_admin)):
    """Get content overview and statistics"""
    try:
        db = await get_db()
        
        # Get content statistics
        total_assessments = await db.assessments.count_documents({})
        total_teacher_assessments = await db.teacher_assessments.count_documents({})
        total_questions = await db.ai_questions.count_documents({})
        total_batches = await db.batches.count_documents({})
        
        # Get recent content
        recent_assessments = await db.assessments.find({}).sort("created_at", -1).limit(10).to_list(length=None)
        recent_teacher_assessments = await db.teacher_assessments.find({}).sort("created_at", -1).limit(10).to_list(length=None)
        recent_batches = await db.batches.find({}).sort("created_at", -1).limit(10).to_list(length=None)
        
        # Format recent assessments
        recent_content = []
        
        for assessment in recent_assessments:
            recent_content.append({
                "id": str(assessment["_id"]),
                "title": assessment["title"],
                "subject": assessment["subject"],
                "difficulty": assessment["difficulty"],
                "type": "manual",
                "created_by": assessment["created_by"],
                "created_at": assessment["created_at"].isoformat(),
                "question_count": assessment["question_count"],
                "status": assessment.get("status", "draft")
            })
        
        for assessment in recent_teacher_assessments:
            recent_content.append({
                "id": str(assessment["_id"]),
                "title": assessment["title"],
                "subject": assessment.get("topic", "General"),
                "difficulty": assessment["difficulty"],
                "type": "ai_generated",
                "created_by": assessment["teacher_id"],
                "created_at": assessment["created_at"].isoformat(),
                "question_count": assessment["question_count"],
                "status": assessment.get("status", "active")
            })
        
        # Sort by creation date
        recent_content.sort(key=lambda x: x["created_at"], reverse=True)
        recent_content = recent_content[:10]
        
        # Format recent batches
        recent_batches_list = []
        for batch in recent_batches:
            # Get teacher name
            teacher = await db.users.find_one({"_id": ObjectId(batch["teacher_id"])})
            teacher_name = teacher.get("username", teacher.get("email", "Unknown")) if teacher else "Unknown"
            
            recent_batches_list.append({
                "id": str(batch["_id"]),
                "name": batch["name"],
                "teacher_name": teacher_name,
                "student_count": len(batch.get("student_ids", [])),
                "created_at": batch["created_at"].isoformat(),
                "status": batch.get("status", "active")
            })
        
        # Get content quality metrics
        quality_metrics = {
            "high_quality_assessments": 0,
            "needs_review": 0,
            "flagged_content": 0
        }
        
        # Use native count_documents instead of loading collections into memory
        quality_metrics["high_quality_assessments"] += await db.assessments.count_documents({
            "question_count": {"$gte": 5},
            "status": "published"
        })
        quality_metrics["needs_review"] += await db.assessments.count_documents({
            "status": "draft"
        })
        
        quality_metrics["high_quality_assessments"] += await db.teacher_assessments.count_documents({
            "question_count": {"$gte": 5},
            "is_active": True
        })
        
        return {
            "content_statistics": {
                "total_assessments": total_assessments + total_teacher_assessments,
                "total_questions": total_questions,
                "total_batches": total_batches,
                "manual_assessments": total_assessments,
                "ai_generated_assessments": total_teacher_assessments
            },
            "recent_content": recent_content,
            "recent_batches": recent_batches_list,
            "quality_metrics": quality_metrics,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/content/assessments")
async def get_all_assessments(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    type: Optional[str] = None,
    current_user: UserModel = Depends(require_admin)
):
    """Get all assessments with filtering and pagination"""
    try:
        db = await get_db()
        
        # Build query for regular assessments
        query = {}
        if status:
            query["status"] = status
        
        assessments = await db.assessments.find(query).skip(skip).limit(limit).to_list(length=None)
        
        # Build query for teacher assessments
        teacher_query = {}
        if status:
            teacher_query["status"] = status
        
        teacher_assessments = await db.teacher_assessments.find(teacher_query).skip(skip).limit(limit).to_list(length=None)
        
        # Format assessments
        assessment_list = []
        
        for assessment in assessments:
            # Get creator name safely
            creator_name = "Unknown"
            created_by = assessment.get("created_by")
            if created_by:
                try:
                    creator = await db.users.find_one({"_id": ObjectId(str(created_by))})
                    creator_name = creator.get("username", creator.get("email", "Unknown")) if creator else "Unknown"
                except Exception:
                    pass
            
            assessment_list.append({
                "id": str(assessment["_id"]),
                "title": assessment["title"],
                "subject": assessment["subject"],
                "difficulty": assessment["difficulty"],
                "type": "manual",
                "question_count": assessment["question_count"],
                "status": assessment.get("status", "draft"),
                "is_active": assessment.get("is_active", False),
                "created_by": creator_name,
                "created_at": assessment["created_at"].isoformat(),
                "assigned_batches": assessment.get("assigned_batches", [])
            })
        
        for assessment in teacher_assessments:
            # Get creator name safely
            creator_name = "Unknown"
            teacher_id = assessment.get("teacher_id")
            if teacher_id:
                try:
                    creator = await db.users.find_one({"_id": ObjectId(str(teacher_id))})
                    creator_name = creator.get("username", creator.get("email", "Unknown")) if creator else "Unknown"
                except Exception:
                    pass
            
            assessment_list.append({
                "id": str(assessment["_id"]),
                "title": assessment["title"],
                "subject": assessment.get("topic", "General"),
                "difficulty": assessment["difficulty"],
                "type": "ai_generated",
                "question_count": assessment["question_count"],
                "status": assessment.get("status", "active"),
                "is_active": assessment.get("is_active", False),
                "created_by": creator_name,
                "created_at": assessment["created_at"].isoformat(),
                "assigned_batches": assessment.get("batches", [])
            })
        
        # Sort by creation date
        assessment_list.sort(key=lambda x: x["created_at"], reverse=True)
        
        # Apply type filter if specified
        if type:
            assessment_list = [a for a in assessment_list if a["type"] == type]
        
        return {
            "assessments": assessment_list,
            "total_count": len(assessment_list),
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/content/assessments/{assessment_id}")
async def get_assessment_details(
    assessment_id: str,
    current_user: UserModel = Depends(require_admin)
):
    """Get detailed information about a specific assessment"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(assessment_id):
            raise HTTPException(status_code=400, detail="Invalid assessment ID")
        
        # Try regular assessments first
        assessment = await db.assessments.find_one({"_id": ObjectId(assessment_id)})
        assessment_type = "manual"
        
        if not assessment:
            # Try teacher assessments
            assessment = await db.teacher_assessments.find_one({"_id": ObjectId(assessment_id)})
            assessment_type = "ai_generated"
        
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Get creator information
        creator_id = assessment.get("created_by") or assessment.get("teacher_id")
        creator = await db.users.find_one({"_id": ObjectId(creator_id)})
        creator_name = creator.get("username", creator.get("email", "Unknown")) if creator else "Unknown"
        
        # Get submission statistics
        if assessment_type == "manual":
            submissions = await db.assessment_submissions.find({
                "assessment_id": assessment_id
            }).to_list(length=None)
        else:
            submissions = await db.teacher_assessment_results.find({
                "assessment_id": assessment_id
            }).to_list(length=None)
        
        # Calculate statistics
        if submissions:
            avg_performance = sum(sub["percentage"] for sub in submissions) / len(submissions)
            total_students = len(set(sub["student_id"] for sub in submissions))
            completion_rate = (len(submissions) / max(total_students, 1)) * 100
        else:
            avg_performance = 0
            total_students = 0
            completion_rate = 0
        
        # Get batch information
        batch_ids = assessment.get("assigned_batches", assessment.get("batches", []))
        batch_info = []
        
        for batch_id in batch_ids:
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
                "subject": assessment.get("subject", assessment.get("topic", "General")),
                "difficulty": assessment["difficulty"],
                "type": assessment_type,
                "question_count": assessment["question_count"],
                "questions": assessment.get("questions", []),
                "status": assessment.get("status", "draft"),
                "is_active": assessment.get("is_active", False),
                "created_by": creator_name,
                "created_at": assessment["created_at"].isoformat()
            },
            "statistics": {
                "total_submissions": len(submissions),
                "total_students": total_students,
                "average_performance": round(avg_performance, 2),
                "completion_rate": round(completion_rate, 2)
            },
            "batch_info": batch_info,
            "recent_submissions": [
                {
                    "student_id": sub["student_id"],
                    "student_name": sub["student_name"],
                    "score": sub["score"],
                    "percentage": sub["percentage"],
                    "submitted_at": sub["submitted_at"].isoformat()
                }
                for sub in submissions[:10]
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/content/assessments/{assessment_id}/moderate")
async def moderate_assessment(
    assessment_id: str,
    moderation_data: dict,
    current_user: UserModel = Depends(require_admin)
):
    """Moderate an assessment (approve, reject, flag)"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(assessment_id):
            raise HTTPException(status_code=400, detail="Invalid assessment ID")
        
        action = moderation_data.get("action")  # approve, reject, flag
        reason = moderation_data.get("reason", "")
        
        if action not in ["approve", "reject", "flag"]:
            raise HTTPException(status_code=400, detail="Invalid action")
        
        # Try regular assessments first
        assessment = await db.assessments.find_one({"_id": ObjectId(assessment_id)})
        collection_name = "assessments"
        
        if not assessment:
            # Try teacher assessments
            assessment = await db.teacher_assessments.find_one({"_id": ObjectId(assessment_id)})
            collection_name = "teacher_assessments"
        
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Update assessment based on action
        update_data = {
            "moderated_at": datetime.now(timezone.utc),
            "moderated_by": str(current_user.id),
            "moderation_action": action,
            "moderation_reason": reason
        }
        
        if action == "approve":
            update_data["status"] = "published"
            update_data["is_active"] = True
        elif action == "reject":
            update_data["status"] = "rejected"
            update_data["is_active"] = False
        elif action == "flag":
            update_data["status"] = "flagged"
            update_data["is_active"] = False
        
        await db[collection_name].update_one(
            {"_id": ObjectId(assessment_id)},
            {"$set": update_data}
        )
        
        # Create notification for assessment creator
        creator_id = assessment.get("created_by") or assessment.get("teacher_id")
        notification = {
            "user_id": creator_id,
            "type": "assessment_moderation",
            "title": f"Assessment {action.title()}d",
            "message": f"Your assessment '{assessment['title']}' has been {action}d. Reason: {reason}",
            "assessment_id": assessment_id,
            "created_at": datetime.now(timezone.utc),
            "is_read": False
        }
        
        await db.notifications.insert_one(notification)
        
        return {
            "success": True,
            "message": f"Assessment {action}d successfully",
            "action": action
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/content/questions")
async def get_all_questions(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    topic: Optional[str] = None,
    current_user: UserModel = Depends(require_admin)
):
    """Get all AI-generated questions with filtering"""
    try:
        db = await get_db()
        
        # Build query
        query = {}
        if status:
            query["status"] = status
        if topic:
            query["topic"] = {"$regex": topic, "$options": "i"}
        
        questions = await db.ai_questions.find(query).skip(skip).limit(limit).to_list(length=None)
        
        # Format questions
        question_list = []
        for question in questions:
            # Get teacher name - handle ObjectId conversion safely
            teacher_id = question.get("teacher_id")
            teacher_name = "Unknown"
            if teacher_id:
                try:
                    if not isinstance(teacher_id, ObjectId):
                        teacher_id = ObjectId(teacher_id)
                    teacher = await db.users.find_one({"_id": teacher_id})
                    teacher_name = teacher.get("username", teacher.get("email", "Unknown")) if teacher else "Unknown"
                except Exception:
                    teacher_name = "Unknown"
            
            question_list.append({
                "id": str(question["_id"]),
                "assessment_id": str(question.get("assessment_id", "")),
                "question_number": question.get("question_number", 0),
                "question": question.get("question", ""),
                "options": question.get("options", []),
                "correct_answer": question.get("correct_answer", ""),
                "explanation": question.get("explanation", ""),
                "difficulty": question.get("difficulty", "medium"),
                "topic": question.get("topic", "General"),
                "status": question.get("status", "active"),
                "teacher_name": teacher_name,
                "generated_at": question.get("generated_at", datetime.now(timezone.utc)).isoformat() if hasattr(question.get("generated_at"), 'isoformat') else str(question.get("generated_at", ""))
            })
        
        return {
            "questions": question_list,
            "total_count": len(question_list),
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/content/questions/{question_id}/moderate")
async def moderate_question(
    question_id: str,
    moderation_data: dict,
    current_user: UserModel = Depends(require_admin)
):
    """Moderate an AI-generated question"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(question_id):
            raise HTTPException(status_code=400, detail="Invalid question ID")
        
        action = moderation_data.get("action")  # approve, reject, flag
        reason = moderation_data.get("reason", "")
        
        if action not in ["approve", "reject", "flag"]:
            raise HTTPException(status_code=400, detail="Invalid action")
        
        # Get question
        question = await db.ai_questions.find_one({"_id": ObjectId(question_id)})
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        
        # Update question
        update_data = {
            "moderated_at": datetime.now(timezone.utc),
            "moderated_by": str(current_user.id),
            "moderation_action": action,
            "moderation_reason": reason
        }
        
        if action == "approve":
            update_data["status"] = "approved"
        elif action == "reject":
            update_data["status"] = "rejected"
        elif action == "flag":
            update_data["status"] = "flagged"
        
        await db.ai_questions.update_one(
            {"_id": ObjectId(question_id)},
            {"$set": update_data}
        )
        
        return {
            "success": True,
            "message": f"Question {action}d successfully",
            "action": action
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/content/batches")
async def get_all_batches(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    current_user: UserModel = Depends(require_admin)
):
    """Get all batches with filtering"""
    try:
        db = await get_db()
        
        # Build query
        query = {}
        if status:
            query["status"] = status
        
        batches = await db.batches.find(query).skip(skip).limit(limit).to_list(length=None)
        
        # Format batches
        batch_list = []
        for batch in batches:
            # Get teacher name
            teacher = await db.users.find_one({"_id": ObjectId(batch["teacher_id"])})
            teacher_name = teacher.get("username", teacher.get("email", "Unknown")) if teacher else "Unknown"
            
            batch_list.append({
                "id": str(batch["_id"]),
                "name": batch["name"],
                "description": batch.get("description", ""),
                "teacher_name": teacher_name,
                "student_count": len(batch.get("student_ids", [])),
                "status": batch.get("status", "active"),
                "created_at": batch["created_at"].isoformat()
            })
        
        return {
            "batches": batch_list,
            "total_count": len(batch_list),
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# New CRUD endpoints for Content & Data Manager

@router.put("/content/assessments/{assessment_id}")
async def update_assessment(
    assessment_id: str,
    assessment_data: dict,
    current_user: UserModel = Depends(require_admin)
):
    """Update an assessment"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(assessment_id):
            raise HTTPException(status_code=400, detail="Invalid assessment ID")
        
        # Try regular assessments first
        assessment = await db.assessments.find_one({"_id": ObjectId(assessment_id)})
        collection_name = "assessments"
        
        if not assessment:
            # Try teacher assessments
            assessment = await db.teacher_assessments.find_one({"_id": ObjectId(assessment_id)})
            collection_name = "teacher_assessments"
        
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Prepare update data
        update_data = {}
        allowed_fields = ["title", "description", "subject", "topic", "difficulty", "status", "is_active", "time_limit"]
        
        for field in allowed_fields:
            if field in assessment_data:
                update_data[field] = assessment_data[field]
        
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc)
            
            await db[collection_name].update_one(
                {"_id": ObjectId(assessment_id)},
                {"$set": update_data}
            )
        
        return {
            "success": True,
            "message": "Assessment updated successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/content/assessments/{assessment_id}")
async def delete_assessment(
    assessment_id: str,
    current_user: UserModel = Depends(require_admin)
):
    """Delete an assessment"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(assessment_id):
            raise HTTPException(status_code=400, detail="Invalid assessment ID")
        
        # Try regular assessments first
        assessment = await db.assessments.find_one({"_id": ObjectId(assessment_id)})
        collection_name = "assessments"
        
        if not assessment:
            # Try teacher assessments
            assessment = await db.teacher_assessments.find_one({"_id": ObjectId(assessment_id)})
            collection_name = "teacher_assessments"
        
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Delete the assessment
        await db[collection_name].delete_one({"_id": ObjectId(assessment_id)})
        
        # Clean up related data
        await db.assessment_submissions.delete_many({"assessment_id": assessment_id})
        await db.teacher_assessment_results.delete_many({"assessment_id": assessment_id})
        await db.ai_questions.delete_many({"assessment_id": assessment_id})
        
        return {
            "success": True,
            "message": "Assessment and related data deleted successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/content/questions/{question_id}")
async def get_question_details(
    question_id: str,
    current_user: UserModel = Depends(require_admin)
):
    """Get detailed information about a specific question"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(question_id):
            raise HTTPException(status_code=400, detail="Invalid question ID")
        
        question = await db.ai_questions.find_one({"_id": ObjectId(question_id)})
        
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        
        # Get teacher information
        teacher = await db.users.find_one({"_id": ObjectId(question["teacher_id"])})
        teacher_name = teacher.get("username", teacher.get("email", "Unknown")) if teacher else "Unknown"
        
        # Get assessment information
        assessment = await db.teacher_assessments.find_one({"_id": ObjectId(question["assessment_id"])})
        assessment_title = assessment.get("title", "Unknown") if assessment else "Unknown"
        
        return {
            "id": str(question["_id"]),
            "assessment_id": question["assessment_id"],
            "assessment_title": assessment_title,
            "question_number": question["question_number"],
            "question": question["question"],
            "options": question["options"],
            "correct_answer": question["correct_answer"],
            "explanation": question.get("explanation", ""),
            "difficulty": question["difficulty"],
            "topic": question["topic"],
            "status": question["status"],
            "teacher_id": question["teacher_id"],
            "teacher_name": teacher_name,
            "generated_at": question["generated_at"].isoformat(),
            "moderated_at": question.get("moderated_at", "").isoformat() if question.get("moderated_at") else None,
            "moderation_action": question.get("moderation_action", ""),
            "moderation_reason": question.get("moderation_reason", "")
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/content/questions/{question_id}")
async def update_question(
    question_id: str,
    question_data: dict,
    current_user: UserModel = Depends(require_admin)
):
    """Update a question"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(question_id):
            raise HTTPException(status_code=400, detail="Invalid question ID")
        
        question = await db.ai_questions.find_one({"_id": ObjectId(question_id)})
        
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        
        # Prepare update data
        update_data = {}
        allowed_fields = ["question", "options", "correct_answer", "explanation", "difficulty", "topic", "status"]
        
        for field in allowed_fields:
            if field in question_data:
                update_data[field] = question_data[field]
        
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc)
            
            await db.ai_questions.update_one(
                {"_id": ObjectId(question_id)},
                {"$set": update_data}
            )
        
        return {
            "success": True,
            "message": "Question updated successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/content/questions/{question_id}")
async def delete_question(
    question_id: str,
    current_user: UserModel = Depends(require_admin)
):
    """Delete a question"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(question_id):
            raise HTTPException(status_code=400, detail="Invalid question ID")
        
        question = await db.ai_questions.find_one({"_id": ObjectId(question_id)})
        
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        
        # Delete the question
        await db.ai_questions.delete_one({"_id": ObjectId(question_id)})
        
        return {
            "success": True,
            "message": "Question deleted successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/content/results")
async def get_all_results(
    skip: int = 0,
    limit: int = 50,
    student_id: Optional[str] = None,
    assessment_id: Optional[str] = None,
    current_user: UserModel = Depends(require_admin)
):
    """Get all assessment results with filtering"""
    try:
        db = await get_db()
        
        # Build query for regular assessment submissions
        query = {}
        if student_id:
            query["student_id"] = student_id
        if assessment_id:
            query["assessment_id"] = assessment_id
        
        submissions = await db.assessment_submissions.find(query).skip(skip).limit(limit).sort("submitted_at", -1).to_list(length=None)
        teacher_submissions = await db.teacher_assessment_results.find(query).skip(skip).limit(limit).sort("submitted_at", -1).to_list(length=None)
        
        # Format results
        result_list = []
        
        for sub in submissions:
            try:
                # Get student info - handle ObjectId conversion safely
                student_id = sub.get("student_id")
                student_name = "Unknown"
                if student_id:
                    try:
                        if not isinstance(student_id, ObjectId):
                            student_id = ObjectId(student_id)
                        student = await db.users.find_one({"_id": student_id})
                        student_name = student.get("full_name", student.get("username", student.get("email", "Unknown"))) if student else "Unknown"
                    except Exception:
                        student_name = "Unknown"
                
                # Get assessment info - handle ObjectId conversion safely
                assessment_id = sub.get("assessment_id")
                assessment_title = "Unknown"
                if assessment_id:
                    try:
                        if not isinstance(assessment_id, ObjectId):
                            assessment_id = ObjectId(assessment_id)
                        assessment = await db.assessments.find_one({"_id": assessment_id})
                        assessment_title = assessment.get("title", "Unknown") if assessment else "Unknown"
                    except Exception:
                        assessment_title = "Unknown"
                
                # Handle submitted_at
                submitted_at = sub.get("submitted_at", datetime.now(timezone.utc))
                if hasattr(submitted_at, 'isoformat'):
                    submitted_at_str = submitted_at.isoformat()
                else:
                    submitted_at_str = str(submitted_at)
                
                result_list.append({
                    "id": str(sub["_id"]),
                    "type": "regular",
                    "student_id": str(sub.get("student_id", "")),
                    "student_name": student_name,
                    "assessment_id": str(sub.get("assessment_id", "")),
                    "assessment_title": assessment_title,
                    "score": sub.get("score", 0),
                    "total_questions": sub.get("total_questions", 0),
                    "percentage": sub.get("percentage", 0),
                    "time_taken": sub.get("time_taken", 0),
                    "submitted_at": submitted_at_str
                })
            except Exception as e:
                # Skip malformed submissions
                continue
        
        for sub in teacher_submissions:
            try:
                # Get student info - handle ObjectId conversion safely
                student_id = sub.get("student_id")
                student_name = "Unknown"
                if student_id:
                    try:
                        if not isinstance(student_id, ObjectId):
                            student_id = ObjectId(student_id)
                        student = await db.users.find_one({"_id": student_id})
                        student_name = student.get("full_name", student.get("username", student.get("email", "Unknown"))) if student else "Unknown"
                    except Exception:
                        student_name = "Unknown"
                
                # Get assessment info - handle ObjectId conversion safely
                assessment_id = sub.get("assessment_id")
                assessment_title = "Unknown"
                if assessment_id:
                    try:
                        if not isinstance(assessment_id, ObjectId):
                            assessment_id = ObjectId(assessment_id)
                        assessment = await db.teacher_assessments.find_one({"_id": assessment_id})
                        assessment_title = assessment.get("title", "Unknown") if assessment else "Unknown"
                    except Exception:
                        assessment_title = "Unknown"
                
                # Handle submitted_at
                submitted_at = sub.get("submitted_at", datetime.now(timezone.utc))
                if hasattr(submitted_at, 'isoformat'):
                    submitted_at_str = submitted_at.isoformat()
                else:
                    submitted_at_str = str(submitted_at)
                
                result_list.append({
                    "id": str(sub["_id"]),
                    "type": "teacher",
                    "student_id": str(sub.get("student_id", "")),
                    "student_name": student_name,
                    "assessment_id": str(sub.get("assessment_id", "")),
                    "assessment_title": assessment_title,
                    "score": sub.get("score", 0),
                    "total_questions": sub.get("total_questions", 0),
                    "percentage": sub.get("percentage", 0),
                    "time_taken": sub.get("time_taken", 0),
                    "submitted_at": submitted_at_str
                })
            except Exception as e:
                # Skip malformed submissions
                continue
        
        # Sort by submission date
        result_list.sort(key=lambda x: x["submitted_at"], reverse=True)
        
        return {
            "results": result_list,
            "total_count": len(result_list),
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/content/results/{result_id}")
async def get_result_details(
    result_id: str,
    current_user: UserModel = Depends(require_admin)
):
    """Get detailed information about a specific result"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(result_id):
            raise HTTPException(status_code=400, detail="Invalid result ID")
        
        # Try regular submissions first
        result = await db.assessment_submissions.find_one({"_id": ObjectId(result_id)})
        result_type = "regular"
        
        if not result:
            # Try teacher submissions
            result = await db.teacher_assessment_results.find_one({"_id": ObjectId(result_id)})
            result_type = "teacher"
        
        if not result:
            raise HTTPException(status_code=404, detail="Result not found")
        
        # Get student info
        student = await db.users.find_one({"_id": ObjectId(result["student_id"])})
        student_name = student.get("full_name", student.get("username", student.get("email", "Unknown"))) if student else "Unknown"
        student_email = student.get("email", "") if student else ""
        
        # Get assessment info
        if result_type == "regular":
            assessment = await db.assessments.find_one({"_id": ObjectId(result["assessment_id"])})
        else:
            assessment = await db.teacher_assessments.find_one({"_id": ObjectId(result["assessment_id"])})
        
        assessment_title = assessment.get("title", "Unknown") if assessment else "Unknown"
        
        return {
            "id": str(result["_id"]),
            "type": result_type,
            "student_id": result["student_id"],
            "student_name": student_name,
            "student_email": student_email,
            "assessment_id": result["assessment_id"],
            "assessment_title": assessment_title,
            "score": result.get("score", 0),
            "total_questions": result.get("total_questions", 0),
            "percentage": result.get("percentage", 0),
            "time_taken": result.get("time_taken", 0),
            "answers": result.get("answers", []),
            "submitted_at": result.get("submitted_at", datetime.now(timezone.utc)).isoformat(),
            "questions": assessment.get("questions", []) if assessment else []
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/content/results/{result_id}")
async def delete_result(
    result_id: str,
    current_user: UserModel = Depends(require_admin)
):
    """Delete an assessment result"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(result_id):
            raise HTTPException(status_code=400, detail="Invalid result ID")
        
        # Try regular submissions first
        result = await db.assessment_submissions.find_one({"_id": ObjectId(result_id)})
        collection_name = "assessment_submissions"
        
        if not result:
            # Try teacher submissions
            result = await db.teacher_assessment_results.find_one({"_id": ObjectId(result_id)})
            collection_name = "teacher_assessment_results"
        
        if not result:
            raise HTTPException(status_code=404, detail="Result not found")
        
        # Delete the result
        await db[collection_name].delete_one({"_id": ObjectId(result_id)})
        
        return {
            "success": True,
            "message": "Result deleted successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
