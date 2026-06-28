from datetime import timezone
"""
Unified Assessment Data Models
Contains comprehensive models for all assessment types and related entities
"""
from pydantic import BaseModel, Field, ConfigDict, validator
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from bson import ObjectId
from enum import Enum
from .models import PyObjectId, DifficultyLevel, UserRole

# Assessment Types
class AssessmentType(str, Enum):
    MCQ = "mcq"
    CODING = "coding"
    AI_GENERATED = "ai_generated"
    CHALLENGE = "challenge"
    MIXED = "mixed"

class AssessmentStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"

class QuestionType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    FILL_IN_BLANK = "fill_in_blank"
    CODING = "coding"
    ESSAY = "essay"

# Question Models
class QuestionOption(BaseModel):
    id: str
    text: str
    is_correct: bool = False
    explanation: Optional[str] = None

class Question(BaseModel):
    id: Optional[str] = None
    type: QuestionType
    question_text: str
    options: Optional[List[QuestionOption]] = None
    correct_answer: Optional[Union[int, str, List[str]]] = None
    explanation: Optional[str] = None
    points: int = 1
    difficulty: DifficultyLevel = DifficultyLevel.medium
    tags: List[str] = []
    metadata: Dict[str, Any] = {}

class CodingQuestion(BaseModel):
    id: Optional[str] = None
    title: str
    description: str
    difficulty: DifficultyLevel
    language: str
    starter_code: str
    test_cases: List[Dict[str, Any]]
    hints: List[str] = []
    points: int = 1
    time_limit: int = 300  # seconds
    memory_limit: int = 128  # MB
    tags: List[str] = []
    metadata: Dict[str, Any] = {}

# Assessment Models
class AssessmentConfig(BaseModel):
    time_limit: int = Field(..., ge=1, le=300)  # minutes
    max_attempts: int = Field(default=1, ge=1, le=10)
    shuffle_questions: bool = True
    shuffle_options: bool = True
    show_correct_answers: bool = False
    show_explanations: bool = False
    allow_review: bool = True
    auto_submit: bool = False
    proctoring_enabled: bool = False

class AssessmentSchedule(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    duration: Optional[int] = None  # minutes
    timezone: str = "UTC"
    is_scheduled: bool = False

class AssessmentAnalytics(BaseModel):
    total_attempts: int = 0
    average_score: float = 0.0
    completion_rate: float = 0.0
    average_time: float = 0.0
    difficulty_distribution: Dict[str, int] = {}
    question_analytics: Dict[str, Any] = {}
    last_updated: datetime = Field(default_factory=datetime.utcnow)

class UnifiedAssessmentModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    
    # Basic Information
    title: str
    description: str
    subject: str
    topic: Optional[str] = None
    difficulty: DifficultyLevel
    
    # Assessment Type and Status
    type: AssessmentType
    status: AssessmentStatus = AssessmentStatus.DRAFT
    
    # Questions
    questions: List[Union[Question, CodingQuestion]] = []
    total_questions: int = 0
    total_points: int = 0
    
    # Configuration
    config: AssessmentConfig
    schedule: AssessmentSchedule
    
    # Assignment and Access
    assigned_batches: List[str] = []
    assigned_students: List[str] = []
    access_control: Dict[str, Any] = {}
    
    # Metadata
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    published_at: Optional[datetime] = None
    
    # Analytics
    analytics: AssessmentAnalytics = Field(default_factory=AssessmentAnalytics)
    
    # Additional Fields
    tags: List[str] = []
    metadata: Dict[str, Any] = {}
    is_active: bool = True
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    @validator('total_questions', always=True)
    def validate_total_questions(cls, v, values):
        questions = values.get('questions', [])
        return len(questions)
    
    @validator('total_points', always=True)
    def validate_total_points(cls, v, values):
        questions = values.get('questions', [])
        return sum(q.points for q in questions)
    
    def add_question(self, question: Union[Question, CodingQuestion]):
        """Add a question to the assessment"""
        if question.id is None:
            question.id = f"q_{len(self.questions) + 1}"
        self.questions.append(question)
        self.total_questions = len(self.questions)
        self.total_points = sum(q.points for q in self.questions)
        self.updated_at = datetime.now(timezone.utc)
    
    def remove_question(self, question_id: str):
        """Remove a question from the assessment"""
        self.questions = [q for q in self.questions if q.id != question_id]
        self.total_questions = len(self.questions)
        self.total_points = sum(q.points for q in self.questions)
        self.updated_at = datetime.now(timezone.utc)
    
    def publish(self):
        """Publish the assessment"""
        if self.status == AssessmentStatus.DRAFT:
            self.status = AssessmentStatus.PUBLISHED
            self.published_at = datetime.now(timezone.utc)
            self.updated_at = datetime.now(timezone.utc)
    
    def archive(self):
        """Archive the assessment"""
        self.status = AssessmentStatus.ARCHIVED
        self.is_active = False
        self.updated_at = datetime.now(timezone.utc)

# Submission Models
class SubmissionAnswer(BaseModel):
    question_id: str
    answer: Union[str, int, List[str]]
    is_correct: Optional[bool] = None
    points_earned: int = 0
    time_spent: int = 0  # seconds

class AssessmentSubmission(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    assessment_id: str
    student_id: str
    batch_id: Optional[str] = None
    
    # Submission Data
    answers: List[SubmissionAnswer] = []
    total_score: int = 0
    max_score: int = 0
    percentage: float = 0.0
    
    # Timing
    started_at: datetime
    submitted_at: Optional[datetime] = None
    time_spent: int = 0  # seconds
    
    # Status
    status: str = "in_progress"  # in_progress, submitted, graded
    attempt_number: int = 1
    
    # Additional Data
    metadata: Dict[str, Any] = {}
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    def calculate_score(self):
        """Calculate the total score and percentage"""
        self.total_score = sum(answer.points_earned for answer in self.answers)
        if self.max_score > 0:
            self.percentage = (self.total_score / self.max_score) * 100
        else:
            self.percentage = 0.0
    
    def submit(self):
        """Mark the submission as submitted"""
        self.status = "submitted"
        self.submitted_at = datetime.now(timezone.utc)
        self.calculate_score()

# Batch Models
class BatchModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    name: str
    description: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Students
    student_ids: List[str] = []
    total_students: int = 0
    
    # Analytics
    average_performance: float = 0.0
    completion_rate: float = 0.0
    common_weaknesses: List[str] = []
    
    # Settings
    is_active: bool = True
    settings: Dict[str, Any] = {}
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    @validator('total_students', always=True)
    def validate_total_students(cls, v, values):
        student_ids = values.get('student_ids', [])
        return len(student_ids)
    
    def add_student(self, student_id: str):
        """Add a student to the batch"""
        if student_id not in self.student_ids:
            self.student_ids.append(student_id)
            self.total_students = len(self.student_ids)
            self.updated_at = datetime.now(timezone.utc)
    
    def remove_student(self, student_id: str):
        """Remove a student from the batch"""
        if student_id in self.student_ids:
            self.student_ids.remove(student_id)
            self.total_students = len(self.student_ids)
            self.updated_at = datetime.now(timezone.utc)

# Request/Response Models
class AssessmentCreateRequest(BaseModel):
    title: str
    description: str
    subject: str
    topic: Optional[str] = None
    difficulty: DifficultyLevel
    type: AssessmentType
    config: AssessmentConfig
    schedule: AssessmentSchedule
    assigned_batches: List[str] = []
    tags: List[str] = []

class AssessmentUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    subject: Optional[str] = None
    topic: Optional[str] = None
    difficulty: Optional[DifficultyLevel] = None
    config: Optional[AssessmentConfig] = None
    schedule: Optional[AssessmentSchedule] = None
    assigned_batches: Optional[List[str]] = None
    tags: Optional[List[str]] = None

class AssessmentResponse(BaseModel):
    id: str
    title: str
    description: str
    subject: str
    topic: Optional[str] = None
    difficulty: DifficultyLevel
    type: AssessmentType
    status: AssessmentStatus
    total_questions: int
    total_points: int
    config: AssessmentConfig
    schedule: AssessmentSchedule
    assigned_batches: List[str]
    created_by: str
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None
    analytics: AssessmentAnalytics
    tags: List[str]
    is_active: bool

class QuestionCreateRequest(BaseModel):
    type: QuestionType
    question_text: str
    options: Optional[List[QuestionOption]] = None
    correct_answer: Optional[Union[int, str, List[str]]] = None
    explanation: Optional[str] = None
    points: int = 1
    difficulty: DifficultyLevel = DifficultyLevel.medium
    tags: List[str] = []

class CodingQuestionCreateRequest(BaseModel):
    title: str
    description: str
    difficulty: DifficultyLevel
    language: str
    starter_code: str
    test_cases: List[Dict[str, Any]]
    hints: List[str] = []
    points: int = 1
    time_limit: int = 300
    memory_limit: int = 128
    tags: List[str] = []
