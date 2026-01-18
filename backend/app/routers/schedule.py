from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, UploadFile, File, Form
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import csv, io, logging, json
from bson import ObjectId

from ..db import get_db
from ..models.live_models import TimeSlot, LiveContent, AIPrepStatus, Assessment, Question, Material
from ..services.gemini_coding_service import GeminiCodingService
from ..dependencies import get_current_user, require_teacher_or_admin
from ..models.models import UserModel

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize service (assuming singleton pattern usage or similar instantiation)
gemini_service = GeminiCodingService()

class ScheduleCreateRequest(BaseModel):
    batch_id: str
    teacher_id: str
    start_time: datetime
    end_time: datetime
    day_of_week: str
    subject: str
    topic: str

class TopicUpdateRequest(BaseModel):
    timeslot_id: str
    new_topic: str

async def generate_live_content_task(timeslot_id: str, topic: str):
    """Background task to generate AI content for a class"""
    try:
        logger.info(f"Starting AI content generation for slot {timeslot_id}, topic: {topic}")
        db = await get_db()
        
        # 1. Generate content
        content_data = await gemini_service.generate_live_class_content(topic)
        
        if not content_data or (not content_data.get("quizzes") and not content_data.get("flashcards")):
            logger.warning(f"AI generation returned empty content for {topic}")
            return

        # 2. Structure data for LiveContent model
        # The AI returns dict, we need to convert to Pydantic models to ensure validity before saving, 
        # or save as dict if using loose schema. Let's try to map to models.
        
        quizzes = []
        for qz in content_data.get("quizzes", []):
            questions = []
            for q in qz.get("questions", []):
                 questions.append(Question(
                     text=q.get("text") or q.get("question"),
                     type=q.get("type", "MCQ"),
                     options=q.get("options", []),
                     correct_option=q.get("correct_option")
                 ))
            quizzes.append(Assessment(title=qz.get("title", "Quiz"), questions=questions))
            
        polls = []
        for p in content_data.get("polls", []):
            polls.append(Question(
                text=p.get("text"),
                type="POLL",
                options=p.get("options", [])
            ))
            
        flashcards = content_data.get("flashcards", [])
        
        live_content = LiveContent(
            timeslot_id=timeslot_id,
            quizzes=quizzes,
            polls=polls,
            flashcards=flashcards,
            materials=[]
        )
        
        # 3. Save to DB
        # Check if exists first
        existing = await db.live_content.find_one({"timeslot_id": timeslot_id})
        if existing:
            await db.live_content.update_one(
                {"timeslot_id": timeslot_id},
                {"$set": live_content.model_dump(by_alias=True, exclude={"id"})}
            )
        else:
            await db.live_content.insert_one(live_content.model_dump(by_alias=True, exclude={"id"}))
            
        # 4. Update TimeSlot status
        await db.timeslots.update_one(
            {"_id": timeslot_id}, # Note: timeslot_id passed as generic string, need to ensure type match
            {"$set": {"ai_prep_status": AIPrepStatus.READY}}
        )
        # Handle ObjectId conversion if needed (usually handled by PyObjectId in model, but raw queries need care)
        from bson import ObjectId
        if ObjectId.is_valid(timeslot_id):
             await db.timeslots.update_one(
                {"_id": ObjectId(timeslot_id)},
                {"$set": {"ai_prep_status": AIPrepStatus.READY}}
            )
            
        logger.info(f"AI content generation completed for {timeslot_id}")
        
    except Exception as e:
        logger.error(f"Error in generate_live_content_task: {e}")
        # Optionally set status to FAILED


@router.post("/create")
async def create_schedule(
    request: ScheduleCreateRequest,
    current_user: UserModel = Depends(require_teacher_or_admin)
):
    """Create a single schedule slot"""
    db = await get_db()
    
    # Create TimeSlot
    new_slot = TimeSlot(**request.model_dump())
    result = await db.timeslots.insert_one(new_slot.model_dump(by_alias=True, exclude={"id"}))
    
    return {"id": str(result.inserted_id), "message": "Schedule created"}

@router.post("/bulk-create")
async def bulk_create_schedule(
    file: UploadFile = File(...),
    current_user: UserModel = Depends(require_teacher_or_admin)
):
    """Bulk create schedule from CSV"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
        
    content = await file.read()
    text_content = content.decode('utf-8')
    csv_reader = csv.DictReader(io.StringIO(text_content))
    
    db = await get_db()
    created_count = 0
    
    for row in csv_reader:
        try:
            # Basic parsing - assumes CSV columns match model fields
            # Needs robust error handling for real prod
            slot = TimeSlot(
                batch_id=row['batch_id'],
                teacher_id=row.get('teacher_id', str(current_user.id)),
                start_time=datetime.fromisoformat(row['start_time']),
                end_time=datetime.fromisoformat(row['end_time']),
                day_of_week=row['day_of_week'],
                subject=row['subject'],
                topic=row['topic']
            )
            await db.timeslots.insert_one(slot.model_dump(by_alias=True, exclude={"id"}))
            created_count += 1
        except Exception as e:
            logger.error(f"Error parsing row {row}: {e}")
            
    return {"message": f"Successfully created {created_count} slots"}

@router.post("/update-topic")
async def update_topic(
    request: TopicUpdateRequest,
    background_tasks: BackgroundTasks,
    current_user: UserModel = Depends(require_teacher_or_admin)
):
    """Update topic and trigger AI generation"""
    db = await get_db()
    from bson import ObjectId
    
    try:
        oid = ObjectId(request.timeslot_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    result = await db.timeslots.update_one(
        {"_id": oid},
        {"$set": {
            "topic": request.new_topic,
            "ai_prep_status": AIPrepStatus.PENDING
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="TimeSlot not found")
        
    # Trigger AI generation
    background_tasks.add_task(generate_live_content_task, request.timeslot_id, request.new_topic)
    
    return {"message": "Topic updated, AI generation started"}

@router.get("/my-schedule")
async def get_my_schedule(current_user: UserModel = Depends(get_current_user)):
    """Get schedule for the current user (Teacher or Student)"""
    db = await get_db()
    
    query = {}
    if current_user.role == "teacher":
        query = {"teacher_id": str(current_user.id)}
    elif current_user.role == "student":
        # In a real app, query by batch_id of the student
        # For now, return all or mock logic
        # query = {"batch_id": current_user.batch_id}
        pass
        
    slots = await db.timeslots.find(query).sort("start_time", 1).to_list(length=100)
    return [TimeSlot(**slot) for slot in slots]

@router.delete("/all")
async def delete_all_schedules(
    current_user: UserModel = Depends(require_teacher_or_admin)
):
    """Delete all schedule slots for the current teacher"""
    db = await get_db()
    
    try:
        query = {}
        if current_user.role == "teacher":
            query["teacher_id"] = str(current_user.id)
            
        # Delete related content first (optional but cleaner)
        # Find IDs to be deleted
        slots = await db.timeslots.find(query, {"_id": 1}).to_list(None)
        slot_ids = [str(s["_id"]) for s in slots]
        
        if slot_ids:
             await db.live_content.delete_many({"timeslot_id": {"$in": slot_ids}})
        
        # Delete slots
        result = await db.timeslots.delete_many(query)
        
        return {
            "success": True, 
            "message": f"Deleted all {result.deleted_count} sessions",
            "count": result.deleted_count
        }
        
    except Exception as e:
        logger.error(f"Error clearing schedule: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear schedule: {e}")

@router.delete("/{schedule_id}")
async def delete_schedule(
    schedule_id: str,
    current_user: UserModel = Depends(require_teacher_or_admin)
):
    """Delete a schedule slot"""
    db = await get_db()
    
    try:
        if not ObjectId.is_valid(schedule_id):
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ID format")
        oid = ObjectId(schedule_id)
        
        # Verify ownership for teachers
        query = {"_id": oid}
        if current_user.role == "teacher":
            query["teacher_id"] = str(current_user.id)
            
        result = await db.timeslots.delete_one(query)
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found or permission denied")
            
        # Optional: Delete associated live content
        await db.live_content.delete_one({"timeslot_id": schedule_id})
        
        return {"success": True, "message": "Schedule deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting schedule {schedule_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete schedule: {str(e)}")


@router.post("/generate-from-handout")
async def generate_schedule_from_handout(
    handout_file: UploadFile = File(...),
    subject: str = Form(...),
    batch_id: str = Form(...),
    start_date: str = Form(...), # YYYY-MM-DD
    start_time: str = Form(...), # HH:MM
    days_of_week: str = Form(...), # comma separated, e.g. "Monday,Wednesday"
    syllabus_file: Optional[UploadFile] = File(None),
    current_user: UserModel = Depends(require_teacher_or_admin)
):
    """Generate schedule slots from course handout"""
    db = await get_db()
    
    try:
        # 1. Read file content
        content = await handout_file.read()
        filename = handout_file.filename.lower()
        content_type = handout_file.content_type
        
        # Determine mime type
        mime_type = "text/plain" # Default
        if filename.endswith(".pdf"):
            mime_type = "application/pdf"
        elif filename.endswith(".jpg") or filename.endswith(".jpeg"):
            mime_type = "image/jpeg"
        elif filename.endswith(".png"):
            mime_type = "image/png"
        elif content_type:
            mime_type = content_type
            
        print(f"📄 Processing handout: {filename} ({mime_type})")

        # 2. Call AI to parse sessions
        try:
            sessions_data = await gemini_service.parse_course_handout(content, mime_type, subject)
        except Exception as e:
            logger.error(f"Gemini service failed: {e}")
            sessions_data = []
        
        # Fallback if AI returns nothing
        if not sessions_data:
             logger.warning("AI returned no sessions, using fallback schedule.")
             sessions_data = [
                 {"topic": f"{subject} - Session {i+1}", "description": f"Standard session for {subject}"}
                 for i in range(10) # Default to 10 sessions
             ]
             
        # 3. Generate TimeSlots
        target_days = [d.strip().lower() for d in days_of_week.split(",")]
        day_map = {
            "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3, 
            "friday": 4, "saturday": 5, "sunday": 6
        }
        target_indices = [day_map[d] for d in target_days if d in day_map]
        
        if not target_indices:
             raise HTTPException(status_code=400, detail="Invalid days of week")
             
        target_indices.sort()
        
        current_date_obj = datetime.strptime(start_date, "%Y-%m-%d")
        
        # Advance to first valid day
        while current_date_obj.weekday() not in target_indices:
            current_date_obj += timedelta(days=1)
            
        created_slots = []
        
        # Helper to get next valid date
        def get_next_date(date_obj):
            next_d = date_obj + timedelta(days=1)
            while next_d.weekday() not in target_indices:
                next_d += timedelta(days=1)
            return next_d
            
        # Parse time
        h, m = map(int, start_time.split(":"))
        
        for session in sessions_data:
            topic = session.get("topic", "Untitled Session")
            
            # Construct start/end times
            s_time = current_date_obj.replace(hour=h, minute=m, second=0, microsecond=0)
            e_time = s_time + timedelta(hours=1) # Default 1 hour duration
            
            day_name = s_time.strftime("%A")
            
            slot = TimeSlot(
                batch_id=batch_id,
                teacher_id=str(current_user.id),
                start_time=s_time,
                end_time=e_time,
                day_of_week=day_name,
                subject=subject,
                topic=topic,
                ai_prep_status=AIPrepStatus.PENDING 
            )
            
            result = await db.timeslots.insert_one(slot.model_dump(by_alias=True, exclude={"id"}))
            created_slots.append(str(result.inserted_id))
            
            # Move to next date
            current_date_obj = get_next_date(current_date_obj)
            
        return {
            "success": True, 
            "message": f"Created {len(created_slots)} sessions based on handout",
            "count": len(created_slots),
            "generated_topics": [s.get("topic") for s in sessions_data]
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating from handout: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
