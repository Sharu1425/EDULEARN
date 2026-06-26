from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from bson import ObjectId
from app.db import get_db
from app.models.models import MasteryRoadmapModel, MasteryProgressModel, TopicStatus
from app.schemas.schemas import (
    MasteryRoadmapGenerateRequest,
    MasteryQuizGenerateRequest,
    MasterySummaryGenerateRequest,
    MasteryFinalExamGenerateRequest,
    UpdateProgressRequest
)
from app.api.auth import get_current_user
from app.services.mastery_service import mastery_service
from app.services.credits_service import add_credits
from datetime import datetime, timedelta
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
        roadmap_coll = db.get_collection("mastery_roadmaps")
        existing = await roadmap_coll.find_one({"user_id": str(current_user["id"]), "subject": request.subject})
        if existing:
            return {"id": str(existing.get("_id", existing.get("id"))), "message": "Roadmap already exists", "subject": request.subject}

        roadmap_data = await mastery_service.generate_roadmap(request.subject)
        
        roadmap = MasteryRoadmapModel(
            user_id=str(current_user["id"]),
            subject=request.subject,
            topics=roadmap_data.get("clusters", [])
        )
        
        result = await roadmap_coll.insert_one(roadmap.model_dump(by_alias=True, exclude_none=True))
        roadmap_id = str(result.inserted_id)

        # Create progress records for all subtopics in all clusters
        progress_coll = db.get_collection("mastery_progresses")
        progress_records = []
        is_first = True
        
        for cluster in roadmap_data.get("clusters", []):
            for topic in cluster.get("subtopics", []):
                # Simply unlock the first one, or unlock ones without prerequisites
                status = TopicStatus.available.value if is_first else TopicStatus.locked.value
                is_first = False
                
                progress = MasteryProgressModel(
                    user_id=str(current_user["id"]),
                    roadmap_id=roadmap_id,
                    topic_id=topic["id"],
                    status=status
                )
                progress_records.append(progress.model_dump(by_alias=True, exclude_none=True))
        
        if progress_records:
            await progress_coll.insert_many(progress_records)

        return {"id": roadmap_id, "subject": request.subject, "roadmap_data": roadmap_data}
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
        
        total_topics = 0
        for item in r.get("topics", []):
            if "subtopics" in item:
                total_topics += len(item.get("subtopics", []))
            else:
                total_topics += 1
                
        completed_count = await progress_coll.count_documents({
            "roadmap_id": r["id"],
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
    progresses = await cursor.to_list(length=200)
    
    progress_map = {}
    for p in progresses:
        p_id = p.pop("_id", None) or p.get("id")
        p["id"] = str(p_id)
        progress_map[p["topic_id"]] = p
        
    # Check if legacy format (no subtopics)
    is_legacy = False
    if len(roadmap.get("topics", [])) > 0 and "subtopics" not in roadmap["topics"][0]:
        is_legacy = True
        legacy_topics = roadmap["topics"]
        roadmap["topics"] = [
            {
                "cluster_id": "legacy_cluster_1",
                "cluster_title": "Core Concepts",
                "subtopics": legacy_topics
            }
        ]
        
    # Attach progress back to subtopics
    for cluster in roadmap.get("topics", []):
        for topic in cluster.get("subtopics", []):
            p = progress_map.get(topic["id"], {})
            topic["status"] = p.get("status", TopicStatus.locked.value)
            topic["quiz_score"] = p.get("quiz_score")
            topic["progress_id"] = p.get("id")
            topic["attempts"] = p.get("attempts", 0)
            topic["locked_until"] = p.get("locked_until")
        
    user_coll = db.get_collection("users")
    user = await user_coll.find_one({"_id": ObjectId(current_user["id"])})
    roadmap["streak_count"] = user.get("streak_count", 0)
        
    return roadmap

@router.post("/summary")
async def generate_summary(
    request: MasterySummaryGenerateRequest,
    current_user=Depends(get_current_user)
):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        summary = await mastery_service.generate_summary(request.subtopic_id, request.subtopic_title, request.difficulty)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-quiz")
async def generate_quiz(
    request: MasteryQuizGenerateRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Forbidden")
        
    progress_coll = db.get_collection("mastery_progresses")
    progress = await progress_coll.find_one({"topic_id": request.subtopic_id, "user_id": str(current_user["id"])})
    
    attempts = progress.get("attempts", 0) if progress else 0
    locked_until = progress.get("locked_until") if progress else None
    
    if locked_until and locked_until > datetime.utcnow():
        raise HTTPException(status_code=403, detail=f"Topic is locked until {locked_until}")
        
    attempt_num = attempts + 1
        
    try:
        quiz = await mastery_service.generate_quiz(request.subtopic_id, request.subtopic_title, request.difficulty, attempt_num)
        return quiz
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/final-exam")
async def generate_final_exam(
    request: MasteryFinalExamGenerateRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Forbidden")
        
    roadmap_coll = db.get_collection("mastery_roadmaps")
    roadmap = await roadmap_coll.find_one({"_id": ObjectId(request.roadmap_id), "user_id": str(current_user["id"])})
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
        
    completed_subtopics = []
    for cluster in roadmap.get("topics", []):
        for topic in cluster.get("subtopics", []):
            completed_subtopics.append({"id": topic["id"], "title": topic["title"], "difficulty": topic.get("difficulty", 3)})
            
    try:
        exam = await mastery_service.generate_final_exam(roadmap["subject"], completed_subtopics)
        return exam
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
    new_attempts = current.get("attempts", 0) + 1
    
    if body.status == "completed" and current["status"] != TopicStatus.completed.value:
        await progress_coll.update_one(
            {"_id": current["_id"]},
            {"$set": {
                "status": TopicStatus.completed.value,
                "quiz_score": body.quiz_score,
                "attempts": new_attempts,
                "completed_at": datetime.utcnow(),
                "locked_until": None
            }}
        )
        
        roadmap_coll = db.get_collection("mastery_roadmaps")
        roadmap = await roadmap_coll.find_one({"_id": ObjectId(roadmap_id)})
        
        # Unlock logic: unlock any topic whose prerequisites are all met.
        if roadmap:
            all_topics = []
            for c in roadmap.get("topics", []):
                all_topics.extend(c.get("subtopics", []))
                
            progress_docs = await progress_coll.find({"roadmap_id": roadmap_id}).to_list(length=200)
            completed_ids = {p["topic_id"] for p in progress_docs if p["status"] == TopicStatus.completed.value}
            completed_ids.add(topic_id)
            
            for t in all_topics:
                t_id = t["id"]
                prereqs = set(t.get("prerequisites", []))
                
                # If all prereqs are in completed_ids, unlock it
                if prereqs.issubset(completed_ids):
                    await progress_coll.update_one(
                        {"roadmap_id": roadmap_id, "topic_id": t_id, "status": TopicStatus.locked.value},
                        {"$set": {"status": TopicStatus.available.value}}
                    )
        
        # Calculate XP Multiplier based on attempts
        xp_multiplier = 1.0
        if new_attempts == 2:
            xp_multiplier = 0.6
        elif new_attempts >= 3:
            xp_multiplier = 0.3
            
        credits_to_add = int(10 * xp_multiplier)
            
        user_id = ObjectId(current_user["id"])
        await mastery_service.check_and_update_streak(db.client.get_database("edulearn"), user_id)
        if credits_to_add > 0:
            await add_credits(
                user_id=str(user_id),
                amount=credits_to_add,
                reason=f"mastery_topic_completed:{topic_id}:attempt_{new_attempts}"
            )
    else:
        # User failed the quiz. Apply cooldown lock.
        cooldown_minutes = 10
        locked_until = datetime.utcnow() + timedelta(minutes=cooldown_minutes)
        await progress_coll.update_one(
            {"_id": current["_id"]},
            {"$set": {
                "attempts": new_attempts,
                "locked_until": locked_until
            }}
        )
        
    cursor = progress_coll.find({"roadmap_id": roadmap_id})
    all_progress = await cursor.to_list(length=200)
    for p in all_progress:
        p_id = p.pop("_id", None) or p.get("id")
        p["id"] = str(p_id)
        
    user_doc = await db.get_collection("users").find_one({"_id": ObjectId(current_user["id"])})
    credits_total = user_doc.get("credits", 0) if user_doc else 0
        
    return {"progress": all_progress, "credits": credits_total}
