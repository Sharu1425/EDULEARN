from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Dict, Any, List
from bson import ObjectId
from app.models.models import ThinkTraceSessionModel
from app.dependencies import get_current_user
from app.db import get_db
from app.services.thinktrace_service import ThinkTraceService
from datetime import datetime
import json

router = APIRouter(tags=["thinktrace"])
thinktrace_service = ThinkTraceService()

# Helper to get _id string safely from auth user format
def _get_user_id(current_user: Any) -> str:
    if hasattr(current_user, "id"):
        return str(current_user.id)
    if isinstance(current_user, dict):
        user_id = current_user.get("_id") or current_user.get("id")
        return str(user_id)
    return str(current_user)

def _get_user_name(current_user: Any) -> str:
    if hasattr(current_user, "username"):
        return current_user.username
    if isinstance(current_user, dict):
        return current_user.get("username", "Student")
    return "Student"

def _convert_session(doc) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc

@router.post("/start")
async def start_thinktrace_session(
    params: Dict[str, Any],
    current_user: Any = Depends(get_current_user)
):
    try:
        db = await get_db()
        user_id_str = _get_user_id(current_user)
        user_name = _get_user_name(current_user)

        new_session = ThinkTraceSessionModel(
            student_id=user_id_str,
            topic=params.get("topic", "General Programming"),
            difficulty=params.get("difficulty", "medium"),
            subject_area=params.get("subject_area", "Computer Science"),
            question_count=int(params.get("question_count", 5)),
            status="active"
        )
        
        session_dict = new_session.model_dump(by_alias=True, exclude_none=True)
        if "_id" in session_dict and session_dict["_id"] is None:
            del session_dict["_id"]

        result = await db.thinktrace_sessions.insert_one(session_dict)
        session_id = str(result.inserted_id)
        new_session.id = session_id
        
        # Start AI interaction
        first_q = await thinktrace_service.generate_next_question(new_session, user_name)
        new_session.questions.append(first_q)
        
        await db.thinktrace_sessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"questions": new_session.questions}}
        )
        
        updated_doc = await db.thinktrace_sessions.find_one({"_id": ObjectId(session_id)})
        return _convert_session(updated_doc)

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{session_id}/answer")
async def submit_thinktrace_answer(
    session_id: str,
    answer_data: Dict[str, Any],
    current_user: Any = Depends(get_current_user)
):
    try:
        db = await get_db()
        user_name = _get_user_name(current_user)
        session_data = await db.thinktrace_sessions.find_one({"_id": ObjectId(session_id)})
        if not session_data:
            raise HTTPException(status_code=404, detail="Session not found")
            
        session = ThinkTraceSessionModel(**session_data)
        
        # Determine exactly what the user chose
        chosen_opt = answer_data.get("chosen_option")
        q_idx = session.current_question_index
        current_q = session.questions[q_idx]
        chosen_text = current_q["option_a"] if chosen_opt == "A" else current_q["option_b"]
        
        answer_record = {
            "q_number": current_q["q_number"],
            "dimension": current_q["dimension"],
            "chosen_option": chosen_opt,
            "chosen_text": chosen_text,
            "timestamp": datetime.utcnow().isoformat()
        }
        session.answers.append(answer_record)
        
        session.current_question_index += 1
        
        is_finished = session.current_question_index >= session.question_count
        
        await db.thinktrace_sessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {
                "answers": session.answers,
                "current_question_index": session.current_question_index,
                "status": "completed" if is_finished else "active"
            }}
        )

        if is_finished:
            # Generate Final Review using AI and parse JSON code block
            raw_review = await thinktrace_service.generate_final_review(session, user_name)
            
            review_data = {}
            try:
                # Expecting ```json {} ``` format based on the prompt
                cleaned = thinktrace_service._clean_json_response(raw_review)
                review_data = json.loads(cleaned)
                
                update_payload = {
                    "skill_score": review_data.get("skill_score"),
                    "strong_answers": review_data.get("strong_answers"),
                    "weak_answers": review_data.get("weak_answers"),
                    "strong_percent": review_data.get("accuracy_percent"),
                    "strengths": review_data.get("strengths"),
                    "weak_areas": review_data.get("weak_areas"),
                    "decision_pattern": review_data.get("decision_pattern"),
                    "conceptual_gaps": review_data.get("conceptual_gaps"),
                    "learning_style": review_data.get("learning_style"),
                    "improvement_suggestions": review_data.get("improvement_suggestions"),
                    "teacher_notes": review_data.get("teacher_notes"),
                    "answer_trace": review_data.get("answer_trace"),
                    "overall_strategy": review_data.get("overall_strategy"),
                    "completed_at": datetime.utcnow()
                }
                
                await db.thinktrace_sessions.update_one(
                    {"_id": ObjectId(session_id)},
                    {"$set": update_payload}
                )
                
                # Award credits for good performance (> 75%)
                accuracy = review_data.get("accuracy_percent", 0)
                if accuracy >= 75:
                    try:
                        from ..services import credits_service
                        await credits_service.add_credits(
                            user_id_str, 
                            5, 
                            f"thinktrace_performance_bonus_{session_id}"
                        )
                        print(f"💰 [CREDITS] Awarded 5 credits to student {user_id_str} for ThinkTrace accuracy: {accuracy}%")
                    except Exception as credits_err:
                        print(f"⚠️ [CREDITS] Failed to award ThinkTrace bonus: {credits_err}")
            except Exception as e:
                print(f"[ERROR] [THINKTRACE] Could not parse JSON from review: {e}")
                # Save raw review directly if parsing fails
                await db.thinktrace_sessions.update_one(
                    {"_id": ObjectId(session_id)},
                    {"$set": {
                        "decision_pattern": f"Parse Error. Raw model output:\n{raw_review}",
                        "completed_at": datetime.utcnow()
                    }}
                )
                
            updated_doc = await db.thinktrace_sessions.find_one({"_id": ObjectId(session_id)})
            return _convert_session(updated_doc)
            
        else:
            # Ask the next AI question
            next_q = await thinktrace_service.generate_next_question(session, user_name)
            session.questions.append(next_q)
            await db.thinktrace_sessions.update_one(
                {"_id": ObjectId(session_id)},
                {"$push": {"questions": next_q}}
            )
            updated_doc = await db.thinktrace_sessions.find_one({"_id": ObjectId(session_id)})
            return _convert_session(updated_doc)

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/sessions")
async def get_user_thinktrace_sessions(
    current_user: Any = Depends(get_current_user)
):
    try:
        db = await get_db()
        user_id_str = _get_user_id(current_user)
        cursor = db.thinktrace_sessions.find(
            {"student_id": user_id_str}
        ).sort("created_at", -1)
        
        sessions = await cursor.to_list(length=100)
        return [_convert_session(s) for s in sessions]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/teacher/analytics")
async def get_teacher_thinktrace_analytics(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    # Skip role check for simplicity in demo
    try:
        db = await get_db()
        cursor = db.thinktrace_sessions.find({"status": "completed"})
        sessions = await cursor.to_list(length=500)
        
        if not sessions:
            return {"total_sessions": 0, "average_score": 0, "common_gaps": []}
            
        valid = [s for s in sessions if s.get("skill_score") is not None]
        avg_score = sum(s["skill_score"] for s in valid) / len(valid) if valid else 0
        
        gaps_freq = {}
        for s in valid:
            for gap in s.get("conceptual_gaps", []):
                gaps_freq[gap] = gaps_freq.get(gap, 0) + 1
                
        top_gaps = [{"gap": k, "count": v} for k, v in sorted(gaps_freq.items(), key=lambda item: item[1], reverse=True)[:5]]
        
        return {
            "total_sessions": len(sessions),
            "average_score": round(avg_score, 1),
            "common_gaps": top_gaps,
            "recent_sessions": [_convert_session(s) for s in sessions[-5:]]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{session_id}")
async def get_thinktrace_session(
    session_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    try:
        db = await get_db()
        session = await db.thinktrace_sessions.find_one({"_id": ObjectId(session_id)})
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return _convert_session(session)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
