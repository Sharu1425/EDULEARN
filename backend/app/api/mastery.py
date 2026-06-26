from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from bson import ObjectId
from app.db import get_db
from app.models.models import MasteryRoadmapModel, MasteryProgressModel, TopicStatus
from app.schemas.schemas import (
    MasteryRoadmapGenerateRequest,
    MasteryQuizGenerateRequest,
    MasteryQuizGenerateResponse,
    MasterySubmitQuizRequest,
    MasterySubmitQuizResponse,
    UpdateProgressRequest
)
from app.api.auth import get_current_user
from app.services.mastery_service import mastery_service
from app.services.credits_service import add_credits
from datetime import datetime
import json

router = APIRouter()

@router.post("/generate-roadmap")
async def generate_roadmap(
    request: MasteryRoadmapGenerateRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can generate roadmaps")
        
    try:
        # Check if a roadmap for this subject already exists for the user
        roadmap_coll = db.get_collection("mastery_roadmaps")
        existing = await roadmap_coll.find_one({"user_id": str(current_user["id"]), "subject": request.subject})
        if existing:
            return {"id": str(existing.get("_id", existing.get("id"))), "message": "Roadmap already exists", "subject": request.subject}

        topics = await mastery_service.generate_roadmap(request.subject)
        
        roadmap = MasteryRoadmapModel(
            user_id=str(current_user["id"]),
            subject=request.subject,
            topics=topics
        )
        
        result = await roadmap_coll.insert_one(roadmap.model_dump(by_alias=True, exclude_none=True))
        roadmap_id = str(result.inserted_id)

        # Create progress records
        progress_coll = db.get_collection("mastery_progresses")
        progress_records = []
        for i, topic in enumerate(topics):
            status = TopicStatus.available.value if i == 0 else TopicStatus.locked.value
            progress = MasteryProgressModel(
                user_id=str(current_user["id"]),
                roadmap_id=roadmap_id,
                topic_id=topic["id"],
                status=status
            )
            progress_records.append(progress.model_dump(by_alias=True, exclude_none=True))
        
        if progress_records:
            await progress_coll.insert_many(progress_records)

        return {"id": roadmap_id, "subject": request.subject, "topics_count": len(topics)}
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=422, detail=f"AI returned invalid JSON: {str(e)}")
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/roadmaps")
async def get_roadmaps(
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can access roadmaps")
        
    roadmap_coll = db.get_collection("mastery_roadmaps")
    progress_coll = db.get_collection("mastery_progresses")
    
    cursor = roadmap_coll.find({"user_id": str(current_user["id"])})
    roadmaps = await cursor.to_list(length=100)
    
    result = []
    for r in roadmaps:
        r_id = r.pop("_id", None) or r.get("id")
        r["id"] = str(r_id)
        
        # Calc progress
        roadmap_id_str = r["id"]
        total_topics = len(r["topics"])
        completed_count = await progress_coll.count_documents({
            "roadmap_id": roadmap_id_str,
            "status": TopicStatus.completed.value
        })
        r["completed_count"] = completed_count
        r["total_count"] = total_topics
        
        result.append(r)
        
    return result

@router.get("/roadmaps/{roadmap_id}")
async def get_roadmap_details(
    roadmap_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    roadmap_coll = db.get_collection("mastery_roadmaps")
    roadmap = await roadmap_coll.find_one({"_id": ObjectId(roadmap_id), "user_id": str(current_user["id"])})
    
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
        
    roadmap_id_val = roadmap.pop("_id", None) or roadmap.get("id")
    roadmap["id"] = str(roadmap_id_val)
    
    progress_coll = db.get_collection("mastery_progresses")
    cursor = progress_coll.find({"roadmap_id": roadmap_id})
    progresses = await cursor.to_list(length=100)
    
    progress_map = {}
    for p in progresses:
        p_id = p.pop("_id", None) or p.get("id")
        p["id"] = str(p_id)
        progress_map[p["topic_id"]] = p
        
    # Attach progress back to topics
    for topic in roadmap["topics"]:
        p = progress_map.get(topic["id"], {})
        topic["status"] = p.get("status", TopicStatus.locked.value)
        topic["quiz_score"] = p.get("quiz_score")
        topic["progress_id"] = p.get("id")
        
    # User streak details
    user_coll = db.get_collection("users")
    user = await user_coll.find_one({"_id": ObjectId(current_user["id"])})
    roadmap["streak_count"] = user.get("streak_count", 0)
        
    return roadmap

@router.post("/generate-quiz")
async def generate_quiz(
    request: MasteryQuizGenerateRequest,
    current_user=Depends(get_current_user)
):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Forbidden")
        
    try:
        quiz = await mastery_service.generate_quiz(request.topic_title, request.concept_summary)
        return quiz
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/progress/{topic_id}")
async def update_progress(
    topic_id: str,
    body: UpdateProgressRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Forbidden")
        
    progress_coll = db.get_collection("mastery_progresses")
    current = await progress_coll.find_one({"topic_id": topic_id, "user_id": str(current_user["id"])})
    
    if not current:
        raise HTTPException(status_code=404, detail="Topic progress not found")
        
    roadmap_id = current["roadmap_id"]
    
    # 1. Mark current topic completed
    if current["status"] != TopicStatus.completed.value and body.status == "completed":
        await progress_coll.update_one(
            {"_id": current["_id"]},
            {"$set": {
                "status": TopicStatus.completed.value,
                "quiz_score": body.quiz_score,
                "completed_at": datetime.utcnow()
            }}
        )
        
        # 2. Unlock next topic
        roadmap_coll = db.get_collection("mastery_roadmaps")
        roadmap = await roadmap_coll.find_one({"_id": ObjectId(roadmap_id)})
        
        if roadmap:
            topics_ordered = sorted(roadmap["topics"], key=lambda t: t["order"])
            current_order = next((t["order"] for t in topics_ordered if t["id"] == topic_id), None)
            if current_order is not None:
                next_topic = next((t for t in topics_ordered if t["order"] == current_order + 1), None)
                if next_topic:
                    await progress_coll.update_one(
                        {"roadmap_id": roadmap_id, "topic_id": next_topic["id"]},
                        {"$set": {"status": TopicStatus.available.value}}
                    )
        
        # 3. Update streak & Award credits
        user_id = ObjectId(current_user["id"])
        await mastery_service.check_and_update_streak(db.client.get_database("edulearn"), user_id)
        await add_credits(
            user_id=str(user_id),
            amount=10,
            reason=f"mastery_topic_completed:{topic_id}"
        )
        
    # 4. Return all progress for this roadmap
    user_doc = await db.get_collection("users").find_one({"_id": ObjectId(current_user["id"])})
    credits_total = user_doc.get("credits", 0) if user_doc else 0
    
    cursor = progress_coll.find({"roadmap_id": roadmap_id})
    all_progress = await cursor.to_list(length=100)
    for p in all_progress:
        p_id = p.pop("_id", None) or p.get("id")
        p["id"] = str(p_id)
        
    return {"progress": all_progress, "credits": credits_total}
