from datetime import timezone
"""
Enhanced Validation Service
Comprehensive validation for batches, assessments, inputs, and other entities
"""
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field, validator, ValidationError
from datetime import datetime, timedelta
import re
from email_validator import validate_email, EmailNotValidError

class ValidationError(Exception):
    """Custom validation error"""
    def __init__(self, message: str, field: str = None):
        self.message = message
        self.field = field
        super().__init__(message)

class ValidationService:
    """Centralized validation service for all entities"""
    
    @staticmethod
    def validate_email_address(email: str) -> bool:
        """Validate email address format"""
        try:
            validate_email(email)
            return True
        except EmailNotValidError:
            return False
    
    @staticmethod
    def validate_password_strength(password: str) -> Dict[str, Any]:
        """Validate password strength"""
        result = {
            "is_valid": True,
            "errors": [],
            "strength": "weak"
        }
        
        if len(password) < 8:
            result["errors"].append("Password must be at least 8 characters long")
            result["is_valid"] = False
        
        if not re.search(r"[A-Z]", password):
            result["errors"].append("Password must contain at least one uppercase letter")
            result["is_valid"] = False
        
        if not re.search(r"[a-z]", password):
            result["errors"].append("Password must contain at least one lowercase letter")
            result["is_valid"] = False
        
        if not re.search(r"\d", password):
            result["errors"].append("Password must contain at least one digit")
            result["is_valid"] = False
        
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            result["errors"].append("Password must contain at least one special character")
            result["is_valid"] = False
        
        # Calculate strength
        if len(password) >= 12 and len(result["errors"]) == 0:
            result["strength"] = "strong"
        elif len(password) >= 10 and len(result["errors"]) <= 1:
            result["strength"] = "medium"
        
        return result
    
    @staticmethod
    def validate_batch_name(name: str) -> Dict[str, Any]:
        """Validate batch name"""
        result = {
            "is_valid": True,
            "errors": []
        }
        
        if not name or not name.strip():
            result["errors"].append("Batch name cannot be empty")
            result["is_valid"] = False
        
        if len(name.strip()) < 3:
            result["errors"].append("Batch name must be at least 3 characters long")
            result["is_valid"] = False
        
        if len(name.strip()) > 100:
            result["errors"].append("Batch name must be less than 100 characters")
            result["is_valid"] = False
        
        # Check for invalid characters
        if not re.match(r"^[a-zA-Z0-9\s\-_]+$", name.strip()):
            result["errors"].append("Batch name can only contain letters, numbers, spaces, hyphens, and underscores")
            result["is_valid"] = False
        
        return result
    
    @staticmethod
    def validate_assessment_title(title: str) -> Dict[str, Any]:
        """Validate assessment title"""
        result = {
            "is_valid": True,
            "errors": []
        }
        
        if not title or not title.strip():
            result["errors"].append("Assessment title cannot be empty")
            result["is_valid"] = False
        
        if len(title.strip()) < 5:
            result["errors"].append("Assessment title must be at least 5 characters long")
            result["is_valid"] = False
        
        if len(title.strip()) > 200:
            result["errors"].append("Assessment title must be less than 200 characters")
            result["is_valid"] = False
        
        return result
    
    @staticmethod
    def validate_assessment_description(description: str) -> Dict[str, Any]:
        """Validate assessment description"""
        result = {
            "is_valid": True,
            "errors": []
        }
        
        if not description or not description.strip():
            result["errors"].append("Assessment description cannot be empty")
            result["is_valid"] = False
        
        if len(description.strip()) < 10:
            result["errors"].append("Assessment description must be at least 10 characters long")
            result["is_valid"] = False
        
        if len(description.strip()) > 1000:
            result["errors"].append("Assessment description must be less than 1000 characters")
            result["is_valid"] = False
        
        return result
    
    @staticmethod
    def validate_question_text(question_text: str) -> Dict[str, Any]:
        """Validate question text"""
        result = {
            "is_valid": True,
            "errors": []
        }
        
        if not question_text or not question_text.strip():
            result["errors"].append("Question text cannot be empty")
            result["is_valid"] = False
        
        if len(question_text.strip()) < 10:
            result["errors"].append("Question text must be at least 10 characters long")
            result["is_valid"] = False
        
        if len(question_text.strip()) > 500:
            result["errors"].append("Question text must be less than 500 characters")
            result["is_valid"] = False
        
        return result
    
    @staticmethod
    def validate_question_options(options: List[str]) -> Dict[str, Any]:
        """Validate question options"""
        result = {
            "is_valid": True,
            "errors": []
        }
        
        if not options or len(options) < 2:
            result["errors"].append("At least 2 options are required")
            result["is_valid"] = False
        
        if len(options) > 6:
            result["errors"].append("Maximum 6 options allowed")
            result["is_valid"] = False
        
        # Check for empty options
        for i, option in enumerate(options):
            if not option or not option.strip():
                result["errors"].append(f"Option {i + 1} cannot be empty")
                result["is_valid"] = False
        
        # Check for duplicate options
        unique_options = set(option.strip().lower() for option in options if option.strip())
        if len(unique_options) != len([option for option in options if option.strip()]):
            result["errors"].append("Duplicate options are not allowed")
            result["is_valid"] = False
        
        return result
    
    @staticmethod
    def validate_time_limit(time_limit: int) -> Dict[str, Any]:
        """Validate time limit"""
        result = {
            "is_valid": True,
            "errors": []
        }
        
        if time_limit < 1:
            result["errors"].append("Time limit must be at least 1 minute")
            result["is_valid"] = False
        
        if time_limit > 300:
            result["errors"].append("Time limit cannot exceed 300 minutes")
            result["is_valid"] = False
        
        return result
    
    @staticmethod
    def validate_question_count(question_count: int) -> Dict[str, Any]:
        """Validate question count"""
        result = {
            "is_valid": True,
            "errors": []
        }
        
        if question_count < 1:
            result["errors"].append("At least 1 question is required")
            result["is_valid"] = False
        
        if question_count > 100:
            result["errors"].append("Maximum 100 questions allowed")
            result["is_valid"] = False
        
        return result
    
    @staticmethod
    def validate_batch_assignment(batch_ids: List[str], max_batches: int = 10) -> Dict[str, Any]:
        """Validate batch assignment"""
        result = {
            "is_valid": True,
            "errors": []
        }
        
        if not batch_ids:
            result["errors"].append("At least one batch must be selected")
            result["is_valid"] = False
        
        if len(batch_ids) > max_batches:
            result["errors"].append(f"Maximum {max_batches} batches can be assigned")
            result["is_valid"] = False
        
        # Check for duplicate batch IDs
        if len(set(batch_ids)) != len(batch_ids):
            result["errors"].append("Duplicate batch assignments are not allowed")
            result["is_valid"] = False
        
        return result
    
    @staticmethod
    def validate_student_data(student_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate student data"""
        result = {
            "is_valid": True,
            "errors": []
        }
        
        # Validate name
        name = student_data.get("name", "")
        if not name or not name.strip():
            result["errors"].append("Student name is required")
            result["is_valid"] = False
        elif len(name.strip()) < 2:
            result["errors"].append("Student name must be at least 2 characters long")
            result["is_valid"] = False
        elif len(name.strip()) > 100:
            result["errors"].append("Student name must be less than 100 characters")
            result["is_valid"] = False
        
        # Validate email
        email = student_data.get("email", "")
        if not email or not email.strip():
            result["errors"].append("Student email is required")
            result["is_valid"] = False
        elif not ValidationService.validate_email_address(email):
            result["errors"].append("Invalid email format")
            result["is_valid"] = False
        
        return result
    
    @staticmethod
    def validate_coding_question(question_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate coding question data"""
        result = {
            "is_valid": True,
            "errors": []
        }
        
        # Validate title
        title = question_data.get("title", "")
        if not title or not title.strip():
            result["errors"].append("Coding question title is required")
            result["is_valid"] = False
        elif len(title.strip()) < 5:
            result["errors"].append("Title must be at least 5 characters long")
            result["is_valid"] = False
        
        # Validate description
        description = question_data.get("description", "")
        if not description or not description.strip():
            result["errors"].append("Coding question description is required")
            result["is_valid"] = False
        elif len(description.strip()) < 20:
            result["errors"].append("Description must be at least 20 characters long")
            result["is_valid"] = False
        
        # Validate language
        language = question_data.get("language", "")
        valid_languages = ["python", "javascript", "java", "cpp", "c", "go", "rust"]
        if language not in valid_languages:
            result["errors"].append(f"Invalid language. Must be one of: {', '.join(valid_languages)}")
            result["is_valid"] = False
        
        # Validate test cases
        test_cases = question_data.get("test_cases", [])
        if not test_cases:
            result["errors"].append("At least one test case is required")
            result["is_valid"] = False
        
        # Validate time and memory limits
        time_limit = question_data.get("time_limit", 0)
        if time_limit < 1 or time_limit > 600:
            result["errors"].append("Time limit must be between 1 and 600 seconds")
            result["is_valid"] = False
        
        memory_limit = question_data.get("memory_limit", 0)
        if memory_limit < 64 or memory_limit > 512:
            result["errors"].append("Memory limit must be between 64 and 512 MB")
            result["is_valid"] = False
        
        return result
    
    @staticmethod
    def validate_assessment_schedule(schedule_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate assessment schedule"""
        result = {
            "is_valid": True,
            "errors": []
        }
        
        start_date = schedule_data.get("start_date")
        end_date = schedule_data.get("end_date")
        
        if start_date and end_date:
            if start_date >= end_date:
                result["errors"].append("End date must be after start date")
                result["is_valid"] = False
            
            # Check if schedule is too far in the future
            if start_date > datetime.now(timezone.utc) + timedelta(days=365):
                result["errors"].append("Assessment cannot be scheduled more than 1 year in advance")
                result["is_valid"] = False
        
        return result
    
    @staticmethod
    def validate_bulk_upload_data(upload_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Validate bulk upload data"""
        result = {
            "is_valid": True,
            "errors": [],
            "valid_records": [],
            "invalid_records": []
        }
        
        if not upload_data:
            result["errors"].append("No data provided for bulk upload")
            result["is_valid"] = False
            return result
        
        if len(upload_data) > 1000:
            result["errors"].append("Maximum 1000 records allowed per bulk upload")
            result["is_valid"] = False
        
        for i, record in enumerate(upload_data):
            record_validation = ValidationService.validate_student_data(record)
            if record_validation["is_valid"]:
                result["valid_records"].append(record)
            else:
                result["invalid_records"].append({
                    "index": i,
                    "data": record,
                    "errors": record_validation["errors"]
                })
        
        if not result["valid_records"]:
            result["errors"].append("No valid records found in bulk upload data")
            result["is_valid"] = False
        
        return result
    
    @staticmethod
    def validate_search_query(query: str, min_length: int = 2, max_length: int = 100) -> Dict[str, Any]:
        """Validate search query"""
        result = {
            "is_valid": True,
            "errors": []
        }
        
        if not query or not query.strip():
            result["errors"].append("Search query cannot be empty")
            result["is_valid"] = False
        
        if len(query.strip()) < min_length:
            result["errors"].append(f"Search query must be at least {min_length} characters long")
            result["is_valid"] = False
        
        if len(query.strip()) > max_length:
            result["errors"].append(f"Search query must be less than {max_length} characters")
            result["is_valid"] = False
        
        # Check for potentially harmful characters
        if re.search(r"[<>\"'%;()&+]", query):
            result["errors"].append("Search query contains invalid characters")
            result["is_valid"] = False
        
        return result
    
    @staticmethod
    def validate_pagination_params(page: int, limit: int) -> Dict[str, Any]:
        """Validate pagination parameters"""
        result = {
            "is_valid": True,
            "errors": []
        }
        
        if page < 1:
            result["errors"].append("Page number must be at least 1")
            result["is_valid"] = False
        
        if limit < 1:
            result["errors"].append("Limit must be at least 1")
            result["is_valid"] = False
        
        if limit > 100:
            result["errors"].append("Limit cannot exceed 100")
            result["is_valid"] = False
        
        return result

# Pydantic models for validation
class AssessmentValidationModel(BaseModel):
    """Pydantic model for assessment validation"""
    title: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=10, max_length=1000)
    subject: str = Field(..., min_length=2, max_length=50)
    topic: Optional[str] = Field(None, max_length=100)
    difficulty: str = Field(..., pattern="^(easy|medium|hard)$")
    time_limit: int = Field(..., ge=1, le=300)
    question_count: int = Field(..., ge=1, le=100)
    batch_ids: List[str] = Field(..., min_items=1, max_items=10)
    
    @validator('title')
    def validate_title(cls, v):
        validation = ValidationService.validate_assessment_title(v)
        if not validation['is_valid']:
            raise ValueError('; '.join(validation['errors']))
        return v
    
    @validator('description')
    def validate_description(cls, v):
        validation = ValidationService.validate_assessment_description(v)
        if not validation['is_valid']:
            raise ValueError('; '.join(validation['errors']))
        return v

class BatchValidationModel(BaseModel):
    """Pydantic model for batch validation"""
    name: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    
    @validator('name')
    def validate_name(cls, v):
        validation = ValidationService.validate_batch_name(v)
        if not validation['is_valid']:
            raise ValueError('; '.join(validation['errors']))
        return v

class StudentValidationModel(BaseModel):
    """Pydantic model for student validation"""
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., pattern=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    
    @validator('email')
    def validate_email(cls, v):
        if not ValidationService.validate_email_address(v):
            raise ValueError('Invalid email format')
        return v

# Create service instance
validation_service = ValidationService()