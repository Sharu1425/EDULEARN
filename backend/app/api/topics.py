from datetime import timezone
"""
Topics and assessment configuration endpoints
Handles topic selection and assessment configuration
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any
from pydantic import BaseModel

from ..core.security import security_manager
from ..db import get_db
from ..dependencies import get_current_user
from ..models.models import UserModel

router = APIRouter()

# Response Models
class TopicResponse(BaseModel):
    topic: str
    qnCount: int
    difficulty: str

class AssessmentConfigResponse(BaseModel):
    success: bool
    topic: str
    qnCount: int
    difficulty: str
    error: str = None

@router.get("/", response_model=AssessmentConfigResponse)
async def get_assessment_config(
    current_user: UserModel = Depends(get_current_user)
):
    """Get assessment configuration for topic selection"""
    try:
        db = await get_db()
        
        # Try to get the latest assessment configuration for this user
        from bson import ObjectId
        try:
            user_id = ObjectId(current_user.id)
        except Exception:
            user_id = current_user.id
            
        # Look for the most recent assessment configuration
        config_doc = await db.assessment_configs.find_one(
            {"user_id": user_id},
            sort=[("created_at", -1)]
        )
        
        if config_doc:
            print(f"📋 [TOPICS] Found saved config for user {current_user.id}: {config_doc}")
            return AssessmentConfigResponse(
                success=True,
                topic=config_doc.get("topic", "Python Programming"),
                qnCount=config_doc.get("qnCount", 10),
                difficulty=config_doc.get("difficulty", "medium")
            )
        else:
            # Return default configuration if no saved config found
            print(f"📋 [TOPICS] No saved config found for user {current_user.id}, using defaults")
            return AssessmentConfigResponse(
                success=True,
                topic="Python Programming",
                qnCount=10,
                difficulty="medium"
            )
            
    except Exception as e:
        print(f"❌ [TOPICS] Error getting assessment config: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get assessment configuration: {str(e)}"
        )

@router.post("/", response_model=AssessmentConfigResponse)
async def process_topic_config(
    config: TopicResponse,
    current_user: UserModel = Depends(get_current_user)
):
    """Process topic configuration for assessment generation"""
    try:
        # Validate the configuration
        if not config.topic or not config.topic.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Topic is required"
            )
        
        if config.qnCount < 1 or config.qnCount > 50:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Question count must be between 1 and 50"
            )
        
        # Normalize difficulty to lowercase for validation
        difficulty_lower = config.difficulty.lower()
        if difficulty_lower not in ["easy", "medium", "hard", "very easy", "very hard"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Difficulty must be Easy, Medium, Hard, Very Easy, or Very Hard"
            )
        
        # Save the configuration to the database
        db = await get_db()
        from bson import ObjectId
        from datetime import datetime
        
        try:
            user_id = ObjectId(current_user.id)
        except Exception:
            user_id = current_user.id
        
        # Save the assessment configuration
        config_doc = {
            "user_id": user_id,
            "topic": config.topic,
            "qnCount": config.qnCount,
            "difficulty": config.difficulty,
            "created_at": datetime.now(timezone.utc)
        }
        
        # Insert or update the configuration
        await db.assessment_configs.replace_one(
            {"user_id": user_id},
            config_doc,
            upsert=True
        )
        
        print(f"💾 [TOPICS] Saved assessment config for user {current_user.id}: {config_doc}")
        
        return AssessmentConfigResponse(
            success=True,
            topic=config.topic,
            qnCount=config.qnCount,
            difficulty=config.difficulty
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process topic configuration: {str(e)}"
        )

@router.get("/available", response_model=Dict[str, Any])
async def get_available_topics():
    """Get list of available topics for assessment"""
    try:
        topics = [
            {"name": "Python Programming", "difficulty": ["easy", "medium", "hard"]},
            {"name": "JavaScript", "difficulty": ["easy", "medium", "hard"]},
            {"name": "Data Structures", "difficulty": ["medium", "hard"]},
            {"name": "Algorithms", "difficulty": ["medium", "hard"]},
            {"name": "Web Development", "difficulty": ["easy", "medium"]},
            {"name": "Database Design", "difficulty": ["medium", "hard"]}
        ]
        
        return {
            "success": True,
            "topics": topics
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get available topics: {str(e)}"
        )
