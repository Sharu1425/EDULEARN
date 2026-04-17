"""
Database models and schemas
Contains all MongoDB document models and Pydantic schemas
"""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from enum import Enum
import bcrypt

class PyObjectId(ObjectId):
    """Custom ObjectId type for Pydantic"""
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, validation_info=None):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema, handler):
        return {"type": "string"}

# Enums
class UserRole(str, Enum):
    student = "student"
    teacher = "teacher"
    admin = "admin"

class DifficultyLevel(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"

class NotificationType(str, Enum):
    info = "info"
    warning = "warning"
    success = "success"
    error = "error"

class NotificationPriority(str, Enum):
    low = "low"
    normal = "normal"
    high = "high"
    urgent = "urgent"

class TransactionType(str, Enum):
    credit = "credit"
    debit = "debit"

# User Model
class UserModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    bio: Optional[str] = None
    password_hash: str
    role: UserRole = UserRole.student
    profile_picture: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    settings: Optional[Dict[str, Any]] = None
    batch_ids: List[str] = Field(default_factory=list)
    credits: int = Field(default=0)  # Virtual currency balance

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

# Assessment Model
class AssessmentModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    title: str
    description: str
    subject: str
    difficulty: DifficultyLevel
    time_limit: int
    questions: List[Dict[str, Any]]
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    total_questions: int

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

# Notification Model
class NotificationModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    type: NotificationType
    title: str
    message: str
    priority: NotificationPriority = NotificationPriority.normal
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    read_at: Optional[datetime] = None

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

# Coding Models
class CodingProblemModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    title: str
    description: str
    difficulty: DifficultyLevel
    language: str
    test_cases: List[Dict[str, Any]]
    starter_code: str
    reference_solution: Optional[str] = None
    hints: Optional[List[str]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    is_active: bool = True

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class CodingSolutionModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    problem_id: str
    student_id: str
    code: str
    language: str
    status: str
    execution_time: int
    memory_used: int
    test_results: List[Dict[str, Any]]
    score: int
    max_score: int
    submitted_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class CodingSessionModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    problem_id: str
    student_id: str
    language: str
    code: str
    cursor_position: int = 0
    started_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class CodingAnalyticsModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    student_id: str
    total_problems_attempted: int = 0
    total_problems_solved: int = 0
    attempted_problem_ids: List[PyObjectId] = Field(default_factory=list)
    solved_problem_ids: List[PyObjectId] = Field(default_factory=list)
    average_time: float = 0.0
    success_rate: float = 0.0
    language_stats: Dict[str, int] = {}
    last_updated: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

# ThinkTrace Models
class ThinkTraceSessionModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    student_id: str
    topic: str
    difficulty: str
    subject_area: str
    question_count: int
    
    # Internal state tracking
    status: str = "active"  # "active", "completed", "error"
    current_question_index: int = 0
    questions: List[Dict[str, Any]] = Field(default_factory=list)
    answers: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Final Review Data
    skill_score: Optional[float] = None
    strong_answers: Optional[int] = None
    weak_answers: Optional[int] = None
    strong_percent: Optional[float] = None
    strengths: Optional[List[str]] = None
    weak_areas: Optional[List[str]] = None
    decision_pattern: Optional[str] = None
    conceptual_gaps: Optional[List[str]] = None
    learning_style: Optional[Dict[str, str]] = None
    improvement_suggestions: Optional[List[str]] = None
    teacher_notes: Optional[Dict[str, Any]] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class ActiveSessionModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    assessment_id: str
    student_id: str
    session_token: str
    started_at: datetime = Field(default_factory=datetime.utcnow)
    last_heartbeat: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )


# Credits / Ledger Transaction Model
class TransactionModel(BaseModel):
    """Immutable ledger record for every credits change."""
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    type: TransactionType                   # "credit" or "debit"
    amount: int                             # Always positive
    reason: str                             # e.g. "signup_bonus", "quiz_attempt"
    balance_after: int                      # Snapshot of balance after this transaction
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
