from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from bson import ObjectId
from enum import Enum
from .models import PyObjectId

# Enums
class SessionState(str, Enum):
    WAITING = "WAITING"
    QUIZ = "QUIZ"
    POLL = "POLL"
    MATERIAL = "MATERIAL"
    ENDED = "ENDED"

class AIPrepStatus(str, Enum):
    PENDING = "pending"
    READY = "ready"

# Embedded Models
class FileUrl(BaseModel):
    name: str
    url: str
    type: str  # pdf, image, etc.

class QuestionType(str, Enum):
    MCQ = "MCQ"
    POLL = "POLL"

class Question(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    text: str
    type: QuestionType
    options: List[str]  # e.g., ["A", "B", "C", "D"]
    correct_option: Optional[int] = None  # Index of correct option (0-3)

class Material(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    title: str
    file_url: str
    type: str

class Assessment(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    title: str
    questions: List[Question]

# Database Models

class TimeSlot(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    batch_id: str
    teacher_id: str
    start_time: datetime
    end_time: datetime
    day_of_week: str
    subject: str
    topic: str
    ai_prep_status: AIPrepStatus = AIPrepStatus.PENDING
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class LiveSession(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    timeslot_id: str
    active_students: List[str] = [] # List of user_ids
    current_state: SessionState = SessionState.WAITING
    active_content_payload: Optional[Dict[str, Any]] = None
    session_code: str
    batch_id: str # Denormalized for easier lookup
    started_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class LiveContent(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    timeslot_id: str
    quizzes: List[Assessment] = []
    flashcards: List[str] = [] # List of key definitions
    materials: List[Material] = []
    polls: List[Question] = [] # Pulse Check polls
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class Attendance(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    session_id: str
    batch_id: str
    date: datetime
    present_students: List[str] # List of user_ids
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
