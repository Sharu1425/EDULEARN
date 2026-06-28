from datetime import timezone
"""
Assessment Service
Centralized assessment business logic and operations
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from ..db import get_db
from ..services.notification_service import notification_service

class AssessmentService:
    """Centralized assessment service"""
    
    def __init__(self):
        self.db = None
    
    async def initialize(self):
        """Initialize the service with database connection"""
        self.db = await get_db()
    
    async def create_assessment(
        self,
        assessment_data: dict,
        user_id: str,
        assessment_type: str = "manual"
    ):
        """Create a new assessment"""
        try:
            if not self.db:
                await self.initialize()
            
            # Create assessment document
            assessment_doc = {
                "title": assessment_data["title"],
                "subject": assessment_data.get("subject", assessment_data.get("topic", "General")),
                "difficulty": assessment_data["difficulty"],
                "description": assessment_data.get("description", ""),
                "time_limit": assessment_data.get("time_limit", 30),
                "max_attempts": assessment_data.get("max_attempts", 1),
                "type": assessment_type,
                "created_by": user_id,
                "created_at": datetime.now(timezone.utc),
                "status": "draft",
                "question_count": len(assessment_data.get("questions", [])),
                "questions": assessment_data.get("questions", []),
                "assigned_batches": assessment_data.get("batches", []),
                "is_active": False
            }
            
            result = await self.db.assessments.insert_one(assessment_doc)
            assessment_id = str(result.inserted_id)
            
            # Generate AI questions if needed
            if assessment_type == "ai" and len(assessment_data.get("questions", [])) == 0:
                await self._generate_ai_questions(assessment_id, assessment_data)
            
            return assessment_id
            
        except Exception as e:
            print(f"❌ [ASSESSMENT] Failed to create assessment: {str(e)}")
            raise e
    
    async def create_teacher_assessment(
        self,
        assessment_data: dict,
        teacher_id: str
    ):
        """Create a teacher-generated assessment"""
        try:
            if not self.db:
                await self.initialize()
            
            # Generate questions using AI
            from .gemini_coding_service import GeminiCodingService
            gemini_service = GeminiCodingService()
            
            generated_questions = await gemini_service.generate_mcq_questions(
                topic=assessment_data["topic"],
                difficulty=assessment_data["difficulty"],
                count=assessment_data["question_count"]
            )
            
            # Create teacher assessment document
            assessment_doc = {
                "title": assessment_data["title"],
                "topic": assessment_data["topic"],
                "difficulty": assessment_data["difficulty"],
                "question_count": assessment_data["question_count"],
                "questions": generated_questions,
                "batches": assessment_data["batches"],
                "teacher_id": teacher_id,
                "type": "ai_generated",
                "created_at": datetime.now(timezone.utc),
                "is_active": True,
                "status": "published"
            }
            
            result = await self.db.teacher_assessments.insert_one(assessment_doc)
            assessment_id = str(result.inserted_id)
            
            # Store questions in ai_questions collection
            await self._store_ai_questions(assessment_id, generated_questions, teacher_id, assessment_data)
            
            # Send notifications
            await notification_service.send_assessment_notification(
                assessment_id, assessment_data["batches"], assessment_data["title"]
            )
            
            return assessment_id
            
        except Exception as e:
            print(f"❌ [ASSESSMENT] Failed to create teacher assessment: {str(e)}")
            raise e
    
    async def submit_assessment(
        self,
        assessment_id: str,
        student_id: str,
        answers: List[int],
        time_taken: int,
        assessment_type: str = "manual"
    ):
        """Submit assessment answers"""
        try:
            if not self.db:
                await self.initialize()
            
            # Get assessment
            if assessment_type == "manual":
                assessment = await self.db.assessments.find_one({"_id": ObjectId(assessment_id)})
            else:
                assessment = await self.db.teacher_assessments.find_one({"_id": ObjectId(assessment_id)})
            
            if not assessment:
                raise ValueError("Assessment not found")
            
            # Check if already submitted
            if assessment_type == "manual":
                existing_submission = await self.db.assessment_submissions.find_one({
                    "assessment_id": assessment_id,
                    "student_id": student_id
                })
            else:
                existing_submission = await self.db.teacher_assessment_results.find_one({
                    "assessment_id": assessment_id,
                    "student_id": student_id
                })
            
            if existing_submission:
                raise ValueError("Assessment already submitted")
            
            # Calculate score
            questions = assessment.get("questions", [])
            correct_answers = 0
            
            for i, question in enumerate(questions):
                if i < len(answers) and answers[i] == question.get("correct_answer", -1):
                    correct_answers += 1
            
            score = correct_answers
            percentage = (correct_answers / len(questions)) * 100 if questions else 0
            
            # Get student info
            student = await self.db.users.find_one({"_id": ObjectId(student_id)})
            student_name = student.get("username", student.get("email", "Unknown")) if student else "Unknown"
            
            # Create submission record
            submission_doc = {
                "assessment_id": assessment_id,
                "student_id": student_id,
                "student_name": student_name,
                "answers": answers,
                "score": score,
                "percentage": percentage,
                "time_taken": time_taken,
                "submitted_at": datetime.now(timezone.utc),
                "total_questions": len(questions),
                "attempt_number": 1
            }
            
            if assessment_type == "manual":
                result = await self.db.assessment_submissions.insert_one(submission_doc)
            else:
                result = await self.db.teacher_assessment_results.insert_one(submission_doc)
            
            # Gamification removed
            
            # Send completion notification
            teacher_id = assessment.get("created_by") or assessment.get("teacher_id")
            await notification_service.send_assessment_completion_notification(
                student_id, assessment["title"], percentage, teacher_id
            )
            
            return str(result.inserted_id)
            
        except Exception as e:
            print(f"❌ [ASSESSMENT] Failed to submit assessment: {str(e)}")
            raise e
    
    async def get_assessment_details(
        self,
        assessment_id: str,
        user_id: str,
        user_role: str
    ):
        """Get assessment details with proper access control"""
        try:
            if not self.db:
                await self.initialize()
            
            # Try regular assessments first
            assessment = await self.db.assessments.find_one({"_id": ObjectId(assessment_id)})
            assessment_type = "manual"
            
            if not assessment:
                # Try teacher assessments
                assessment = await self.db.teacher_assessments.find_one({"_id": ObjectId(assessment_id)})
                assessment_type = "teacher"
            
            if not assessment:
                raise ValueError("Assessment not found")
            
            # Check permissions
            if user_role == "student":
                if assessment.get("status") not in ["published", "active"]:
                    raise ValueError("Assessment not available")
            elif user_role == "teacher":
                if assessment.get("created_by") != user_id and assessment.get("teacher_id") != user_id:
                    raise ValueError("Access denied")
            
            return assessment, assessment_type
            
        except Exception as e:
            print(f"❌ [ASSESSMENT] Failed to get assessment details: {str(e)}")
            raise e
    
    async def publish_assessment(
        self,
        assessment_id: str,
        user_id: str
    ):
        """Publish an assessment"""
        try:
            if not self.db:
                await self.initialize()
            
            # Update assessment status
            result = await self.db.assessments.update_one(
                {"_id": ObjectId(assessment_id), "created_by": user_id},
                {"$set": {"status": "active", "is_active": True}}
            )
            
            if result.matched_count == 0:
                raise ValueError("Assessment not found or access denied")
            
            # Get assessment details for notifications
            assessment = await self.db.assessments.find_one({"_id": ObjectId(assessment_id)})
            assigned_batches = assessment.get("assigned_batches", [])
            
            # Send notifications
            await notification_service.send_assessment_notification(
                assessment_id, assigned_batches, assessment["title"]
            )
            
            return True
            
        except Exception as e:
            print(f"❌ [ASSESSMENT] Failed to publish assessment: {str(e)}")
            raise e
    
    async def _generate_ai_questions(
        self,
        assessment_id: str,
        assessment_data: dict
    ):
        """Generate AI questions for an assessment"""
        try:
            from .gemini_coding_service import GeminiCodingService
            gemini_service = GeminiCodingService()
            
            generated_questions = await gemini_service.generate_mcq_questions(
                topic=assessment_data["subject"],
                difficulty=assessment_data["difficulty"],
                count=10
            )
            
            # Update assessment with generated questions
            await self.db.assessments.update_one(
                {"_id": ObjectId(assessment_id)},
                {"$set": {
                    "questions": generated_questions,
                    "question_count": len(generated_questions),
                    "is_active": True,
                    "status": "active"
                }}
            )
            
            # Send notifications
            await notification_service.send_assessment_notification(
                assessment_id, assessment_data.get("batches", []), assessment_data["title"]
            )
            
        except Exception as e:
            print(f"❌ [ASSESSMENT] Failed to generate AI questions: {str(e)}")
    
    async def _store_ai_questions(
        self,
        assessment_id: str,
        questions: List[Dict],
        teacher_id: str,
        assessment_data: dict
    ):
        """Store AI-generated questions in the ai_questions collection"""
        try:
            for i, question in enumerate(questions):
                ai_question_doc = {
                    "assessment_id": assessment_id,
                    "question_number": i + 1,
                    "question": question["question"],
                    "options": question["options"],
                    "correct_answer": question["correct_answer"],
                    "explanation": question.get("explanation", ""),
                    "difficulty": assessment_data["difficulty"],
                    "topic": assessment_data["topic"],
                    "generated_at": datetime.now(timezone.utc),
                    "teacher_id": teacher_id,
                    "status": "generated"
                }
                await self.db.ai_questions.insert_one(ai_question_doc)
                
        except Exception as e:
            print(f"❌ [ASSESSMENT] Failed to store AI questions: {str(e)}")
    
    # Gamification methods removed per user request

# Global assessment service instance
assessment_service = AssessmentService()
