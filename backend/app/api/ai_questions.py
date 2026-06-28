from datetime import timezone
"""
AI Questions API
Manage AI-generated questions in a separate collection
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel
from app.dependencies import get_current_user, require_admin
from app.models.models import UserModel
from app.db.session import get_db
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter(tags=["ai-questions"])

class AIQuestionCreate(BaseModel):
    question: str
    options: List[str]
    answer: str
    explanation: str
    topic: str
    difficulty: str
    generated_by: str  # 'gemini', 'openai', etc.
    metadata: Optional[Dict[str, Any]] = None

class AIQuestionResponse(BaseModel):
    id: str
    question: str
    options: List[str]
    answer: str
    explanation: str
    topic: str
    difficulty: str
    generated_by: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: str
    status: str  # 'active', 'reviewed', 'archived'
    usage_count: int = 0
    quality_score: Optional[float] = None

class AIQuestionUpdate(BaseModel):
    status: Optional[str] = None
    quality_score: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None

@router.post("/", response_model=AIQuestionResponse)
async def create_ai_question(
    question_data: AIQuestionCreate,
    current_user: UserModel = Depends(get_current_user)
):
    """Create a new AI-generated question"""
    try:
        db = await get_db()
        
        question_doc = {
            "question": question_data.question,
            "options": question_data.options,
            "answer": question_data.answer,
            "explanation": question_data.explanation,
            "topic": question_data.topic,
            "difficulty": question_data.difficulty,
            "generated_by": question_data.generated_by,
            "metadata": question_data.metadata or {},
            "created_at": datetime.now(timezone.utc),
            "status": "active",
            "usage_count": 0,
            "quality_score": None,
            "created_by": current_user.id
        }
        
        result = await db.ai_questions.insert_one(question_doc)
        question_id = str(result.inserted_id)
        
        print(f"✅ [AI_QUESTIONS] Created AI question {question_id} for topic: {question_data.topic}")
        
        return AIQuestionResponse(
            id=question_id,
            question=question_data.question,
            options=question_data.options,
            answer=question_data.answer,
            explanation=question_data.explanation,
            topic=question_data.topic,
            difficulty=question_data.difficulty,
            generated_by=question_data.generated_by,
            metadata=question_data.metadata,
            created_at=question_doc["created_at"].isoformat(),
            status="active",
            usage_count=0,
            quality_score=None
        )
        
    except Exception as e:
        print(f"❌ [AI_QUESTIONS] Error creating AI question: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create AI question: {str(e)}"
        )

@router.get("/", response_model=List[AIQuestionResponse])
async def get_ai_questions(
    topic: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    generated_by: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: UserModel = Depends(require_admin)
):
    """Get AI-generated questions with filtering"""
    try:
        db = await get_db()
        
        # Build filter
        filter_dict = {}
        if topic:
            filter_dict["topic"] = {"$regex": topic, "$options": "i"}
        if difficulty:
            filter_dict["difficulty"] = difficulty.lower()
        if status:
            filter_dict["status"] = status
        if generated_by:
            filter_dict["generated_by"] = generated_by
        
        # Get questions
        cursor = db.ai_questions.find(filter_dict).skip(offset).limit(limit).sort("created_at", -1)
        questions = await cursor.to_list(length=limit)
        
        question_list = []
        for question in questions:
            question_list.append(AIQuestionResponse(
                id=str(question["_id"]),
                question=question["question"],
                options=question["options"],
                answer=question["answer"],
                explanation=question["explanation"],
                topic=question["topic"],
                difficulty=question["difficulty"],
                generated_by=question["generated_by"],
                metadata=question.get("metadata", {}),
                created_at=question["created_at"].isoformat(),
                status=question["status"],
                usage_count=question.get("usage_count", 0),
                quality_score=question.get("quality_score")
            ))
        
        return question_list
        
    except Exception as e:
        print(f"❌ [AI_QUESTIONS] Error getting AI questions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get AI questions: {str(e)}"
        )

@router.get("/stats")
async def get_ai_questions_stats(current_user: UserModel = Depends(require_admin)):
    """Get statistics about AI-generated questions"""
    try:
        db = await get_db()
        
        # Get total counts
        total_questions = await db.ai_questions.count_documents({})
        active_questions = await db.ai_questions.count_documents({"status": "active"})
        reviewed_questions = await db.ai_questions.count_documents({"status": "reviewed"})
        archived_questions = await db.ai_questions.count_documents({"status": "archived"})
        
        # Get questions by topic
        topic_pipeline = [
            {"$group": {"_id": "$topic", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        topic_stats = await db.ai_questions.aggregate(topic_pipeline).to_list(length=10)
        
        # Get questions by difficulty
        difficulty_pipeline = [
            {"$group": {"_id": "$difficulty", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        difficulty_stats = await db.ai_questions.aggregate(difficulty_pipeline).to_list(length=5)
        
        # Get questions by generator
        generator_pipeline = [
            {"$group": {"_id": "$generated_by", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        generator_stats = await db.ai_questions.aggregate(generator_pipeline).to_list(length=5)
        
        return {
            "total_questions": total_questions,
            "active_questions": active_questions,
            "reviewed_questions": reviewed_questions,
            "archived_questions": archived_questions,
            "topic_stats": topic_stats,
            "difficulty_stats": difficulty_stats,
            "generator_stats": generator_stats
        }
        
    except Exception as e:
        print(f"❌ [AI_QUESTIONS] Error getting AI questions stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get AI questions stats: {str(e)}"
        )

@router.put("/{question_id}", response_model=AIQuestionResponse)
async def update_ai_question(
    question_id: str,
    update_data: AIQuestionUpdate,
    current_user: UserModel = Depends(require_admin)
):
    """Update an AI-generated question"""
    try:
        db = await get_db()
        
        # Check if question exists
        question = await db.ai_questions.find_one({"_id": ObjectId(question_id)})
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="AI question not found"
            )
        
        # Build update document
        update_doc = {}
        if update_data.status is not None:
            update_doc["status"] = update_data.status
        if update_data.quality_score is not None:
            update_doc["quality_score"] = update_data.quality_score
        if update_data.metadata is not None:
            update_doc["metadata"] = update_data.metadata
        
        update_doc["updated_at"] = datetime.now(timezone.utc)
        update_doc["updated_by"] = current_user.id
        
        # Update question
        await db.ai_questions.update_one(
            {"_id": ObjectId(question_id)},
            {"$set": update_doc}
        )
        
        # Get updated question
        updated_question = await db.ai_questions.find_one({"_id": ObjectId(question_id)})
        
        return AIQuestionResponse(
            id=str(updated_question["_id"]),
            question=updated_question["question"],
            options=updated_question["options"],
            answer=updated_question["answer"],
            explanation=updated_question["explanation"],
            topic=updated_question["topic"],
            difficulty=updated_question["difficulty"],
            generated_by=updated_question["generated_by"],
            metadata=updated_question.get("metadata", {}),
            created_at=updated_question["created_at"].isoformat(),
            status=updated_question["status"],
            usage_count=updated_question.get("usage_count", 0),
            quality_score=updated_question.get("quality_score")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [AI_QUESTIONS] Error updating AI question: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update AI question: {str(e)}"
        )

@router.delete("/{question_id}")
async def delete_ai_question(
    question_id: str,
    current_user: UserModel = Depends(require_admin)
):
    """Delete an AI-generated question"""
    try:
        db = await get_db()
        
        # Check if question exists
        question = await db.ai_questions.find_one({"_id": ObjectId(question_id)})
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="AI question not found"
            )
        
        # Delete question
        await db.ai_questions.delete_one({"_id": ObjectId(question_id)})
        
        print(f"✅ [AI_QUESTIONS] Deleted AI question {question_id}")
        
        return {
            "success": True,
            "message": "AI question deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [AI_QUESTIONS] Error deleting AI question: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete AI question: {str(e)}"
        )

@router.post("/{question_id}/use")
async def mark_question_used(
    question_id: str,
    current_user: UserModel = Depends(get_current_user)
):
    """Mark an AI question as used (increment usage count)"""
    try:
        db = await get_db()
        
        # Increment usage count
        await db.ai_questions.update_one(
            {"_id": ObjectId(question_id)},
            {"$inc": {"usage_count": 1}}
        )
        
        return {
            "success": True,
            "message": "Question usage count updated"
        }
        
    except Exception as e:
        print(f"❌ [AI_QUESTIONS] Error marking question as used: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark question as used: {str(e)}"
        )
