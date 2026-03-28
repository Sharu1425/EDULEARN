"""
Teacher-Specific Assessment Operations
Handles teacher analytics, question management, and assessment administration
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
import logging
from ...db import get_db
from ...schemas.schemas import (
    QuestionCreate, QuestionResponse, CodingQuestionCreate, CodingQuestionResponse,
    AssessmentResponse, StudentNotification
)
from ...dependencies import require_teacher, get_current_user
from ...models.models import UserModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assessments/teacher", tags=["assessments-teacher"])

@router.post("/{assessment_id}/assign-batches")
async def assign_teacher_assessment_to_batches(
    assessment_id: str,
    batch_ids: List[str],
    user: UserModel = Depends(require_teacher)
):
    """Assign a teacher-created assessment to batches and notify students."""
    try:
        print(f"🔔 [ASSIGN-BATCHES] Starting batch assignment for assessment {assessment_id}")
        print(f"🔔 [ASSIGN-BATCHES] Teacher: {user.email} (ID: {user.id})")
        print(f"🔔 [ASSIGN-BATCHES] Batch IDs to assign: {batch_ids}")
        
        db = await get_db()

        if not ObjectId.is_valid(assessment_id):
            print(f"❌ [ASSIGN-BATCHES] Invalid assessment ID: {assessment_id}")
            raise HTTPException(status_code=400, detail="Invalid assessment ID")

        print(f"🔍 [ASSIGN-BATCHES] Looking for assessment {assessment_id} owned by teacher {user.id}")
        
        assessment = await db.teacher_assessments.find_one({
            "_id": ObjectId(assessment_id),
            "teacher_id": str(user.id)
        })
        if not assessment:
            print(f"🔍 [ASSIGN-BATCHES] Assessment not found with string teacher_id, trying ObjectId...")
            # Try with ObjectId comparison as well
            assessment = await db.teacher_assessments.find_one({
                "_id": ObjectId(assessment_id),
                "teacher_id": ObjectId(user.id)
            })
        if not assessment:
            print(f"❌ [ASSIGN-BATCHES] Assessment not found or access denied")
            raise HTTPException(status_code=404, detail="Assessment not found or access denied")

        print(f"✅ [ASSIGN-BATCHES] Found assessment: {assessment.get('title', 'Untitled')}")
        print(f"📝 [ASSIGN-BATCHES] Assessment details: ID={assessment_id}, Title={assessment.get('title')}, Topic={assessment.get('topic')}")

        await db.teacher_assessments.update_one(
            {"_id": ObjectId(assessment_id)},
            {"$set": {"batches": batch_ids}}
        )
        print(f"✅ [ASSIGN-BATCHES] Updated assessment with batch IDs: {batch_ids}")

        total_students_notified = 0
        
        for batch_id in batch_ids:
            print(f"🔍 [ASSIGN-BATCHES] Processing batch: {batch_id}")
            
            if not ObjectId.is_valid(batch_id):
                print(f"❌ [ASSIGN-BATCHES] Invalid batch ID: {batch_id}")
                continue
                
            batch = await db.batches.find_one({"_id": ObjectId(batch_id)})
            if not batch:
                print(f"❌ [ASSIGN-BATCHES] Batch not found: {batch_id}")
                continue
                
            print(f"✅ [ASSIGN-BATCHES] Found batch: {batch.get('name', 'Unknown')}")
            student_ids = batch.get("student_ids", [])
            print(f"👥 [ASSIGN-BATCHES] Batch has {len(student_ids)} students: {student_ids}")
            
            # Note: Notifications are sent when assessment is published, not on batch assignment
            # This prevents duplicate notifications when assign-batches and publish are called separately
            for student_id in student_ids:
                total_students_notified += 1

        print(f"👥 [ASSIGN-BATCHES] Total students in batches: {total_students_notified}")
        print(f"📢 [ASSIGN-BATCHES] Students will be notified when assessment is published")

        return {"success": True, "message": f"Batches assigned and {total_students_notified} students notified"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [ASSIGN-BATCHES] Error: {str(e)}")
        import traceback
        print(f"❌ [ASSIGN-BATCHES] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{assessment_id}/publish")
async def publish_teacher_assessment(
    assessment_id: str,
    user: UserModel = Depends(require_teacher)
):
    """Publish a teacher-created assessment and notify assigned batches."""
    try:
        print(f"📢 [PUBLISH] Starting publish for assessment {assessment_id}")
        print(f"📢 [PUBLISH] Teacher: {user.email} (ID: {user.id})")
        
        db = await get_db()

        if not ObjectId.is_valid(assessment_id):
            print(f"❌ [PUBLISH] Invalid assessment ID: {assessment_id}")
            raise HTTPException(status_code=400, detail="Invalid assessment ID")

        print(f"🔍 [PUBLISH] Looking for assessment {assessment_id} owned by teacher {user.id}")
        
        assessment = await db.teacher_assessments.find_one({
            "_id": ObjectId(assessment_id),
            "teacher_id": str(user.id)
        })
        if not assessment:
            print(f"🔍 [PUBLISH] Assessment not found with string teacher_id, trying ObjectId...")
            # Try with ObjectId comparison as well
            assessment = await db.teacher_assessments.find_one({
                "_id": ObjectId(assessment_id),
                "teacher_id": ObjectId(user.id)
            })
        if not assessment:
            print(f"❌ [PUBLISH] Assessment not found or access denied")
            raise HTTPException(status_code=404, detail="Assessment not found or access denied")

        print(f"✅ [PUBLISH] Found assessment: {assessment.get('title', 'Untitled')}")
        
        questions = assessment.get("questions", [])
        print(f"📝 [PUBLISH] Assessment has {len(questions)} questions")
        
        if len(questions) == 0:
            print(f"❌ [PUBLISH] Assessment has no questions, cannot publish")
            raise HTTPException(status_code=400, detail="Assessment must have at least one question to publish")

        await db.teacher_assessments.update_one(
            {"_id": ObjectId(assessment_id)},
            {"$set": {"status": "active", "is_active": True, "published_at": datetime.utcnow()}}
        )
        print(f"✅ [PUBLISH] Updated assessment status to active and published")

        batch_ids = assessment.get("batches", [])
        print(f"🔍 [PUBLISH] Assessment assigned to batches: {batch_ids}")
        
        notifications: List[Dict[str, Any]] = []
        total_students_notified = 0
        
        for batch_id in batch_ids:
            print(f"🔍 [PUBLISH] Processing batch: {batch_id}")
            
            if not ObjectId.is_valid(batch_id):
                print(f"❌ [PUBLISH] Invalid batch ID: {batch_id}")
                continue
                
            batch = await db.batches.find_one({"_id": ObjectId(batch_id)})
            if not batch:
                print(f"❌ [PUBLISH] Batch not found: {batch_id}")
                continue
                
            print(f"✅ [PUBLISH] Found batch: {batch.get('name', 'Unknown')}")
            student_ids = batch.get("student_ids", [])
            print(f"👥 [PUBLISH] Batch has {len(student_ids)} students: {student_ids}")
            
            for student_id in student_ids:
                print(f"🔔 [PUBLISH] Creating notification for student: {student_id}")
                
                notification = {
                    "student_id": student_id,
                    "type": "assessment_assigned",
                    "title": f"New Assessment: {assessment.get('title', 'Untitled')}",
                    "message": f"A new {assessment.get('difficulty', 'medium')} assessment on {assessment.get('topic', 'General')} has been assigned to you.",
                    "assessment_id": assessment_id,
                    "created_at": datetime.utcnow(),
                    "is_read": False
                }
                notifications.append(notification)
                total_students_notified += 1
                print(f"📝 [PUBLISH] Notification created: {notification['title']}")

        print(f"📊 [PUBLISH] Total notifications to create: {len(notifications)}")
        print(f"👥 [PUBLISH] Total students to notify: {total_students_notified}")

        if notifications:
            result = await db.notifications.insert_many(notifications)
            print(f"✅ [PUBLISH] Inserted {len(result.inserted_ids)} notifications successfully")
            print(f"📝 [PUBLISH] Notification IDs: {[str(id) for id in result.inserted_ids]}")
        else:
            print(f"⚠️ [PUBLISH] No notifications created - no students found in batches")

        return {"success": True, "message": f"Assessment published successfully and {total_students_notified} students notified"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [PUBLISH] Error: {str(e)}")
        import traceback
        print(f"❌ [PUBLISH] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
@router.get("/class-performance")
async def get_class_performance_overview(user: UserModel = Depends(require_teacher)):
    """Get overall class performance analytics for teacher"""
    try:
        db = await get_db()
        
        # Get all students
        students = await db.users.find({"role": "student"}).to_list(length=None)
        
        def parse_date(date_val):
            if isinstance(date_val, datetime):
                return date_val
            if isinstance(date_val, str):
                try:
                    # Handle Z notation
                    clean_date = date_val.replace('Z', '+00:00')
                    # Handle missing timezone offset length
                    if '+' in clean_date and len(clean_date.split('+')[1]) == 4:
                        clean_date = clean_date[:-2] + ':' + clean_date[-2:]
                    return datetime.fromisoformat(clean_date)
                except ValueError:
                    return datetime.min
            return datetime.min
            
        class_performance = []
        total_students = len(students)
        
        for student in students:
            student_id = str(student["_id"])
            
            # Get student's assessment results
            all_results = []
            
            # Regular assessments
            regular_submissions = await db.assessment_submissions.find({"student_id": student_id}).to_list(length=None)
            for submission in regular_submissions:
                assessment = await db.assessments.find_one({"_id": ObjectId(submission["assessment_id"])})
                if assessment:
                    all_results.append({
                        "score": submission.get("score", 0),
                        "total": submission.get("total_questions", 0),
                        "percentage": submission.get("percentage", 0),
                        "subject": assessment.get("subject", ""),
                        "submitted_at": submission.get("submitted_at")
                    })
            
            # Teacher assessments
            teacher_submissions = await db.teacher_assessment_results.find({"student_id": student_id}).to_list(length=None)
            for submission in teacher_submissions:
                assessment_id = submission.get("assessment_id")
                assessment = None
                if assessment_id:
                    try:
                        assessment = await db.teacher_assessments.find_one({"_id": ObjectId(assessment_id)})
                    except Exception:
                        assessment = await db.assessments.find_one({"_id": ObjectId(assessment_id)})
                
                if assessment:
                    all_results.append({
                        "score": submission.get("score", 0),
                        "total": submission.get("total_questions", 0),
                        "percentage": submission.get("percentage", 0),
                        "subject": assessment.get("topic", assessment.get("subject", "")),
                        "submitted_at": submission.get("submitted_at")
                    })
            
            # AI assessments
            ai_results = await db.results.find({"user_id": student_id}).to_list(length=None)
            for result in ai_results:
                all_results.append({
                    "score": result.get("score", 0),
                    "total": result.get("total_questions", 0),
                    "percentage": (result.get("score", 0) / result.get("total_questions", 1)) * 100,
                    "subject": result.get("topic", ""),
                    "submitted_at": result.get("submitted_at")
                })
            
            # Calculate performance metrics
            total_assessments = len(all_results)
            if total_assessments > 0:
                average_score = sum([r["percentage"] for r in all_results]) / total_assessments
                recent_scores = [r["percentage"] for r in sorted(all_results, key=lambda x: parse_date(x.get("submitted_at")), reverse=True)[:5]]
                recent_average = sum(recent_scores) / len(recent_scores) if recent_scores else 0
                
                # Subject breakdown
                subjects = {}
                for result in all_results:
                    subject = result.get("subject", "Unknown")
                    if subject not in subjects:
                        subjects[subject] = []
                    subjects[subject].append(result["percentage"])
                
                subject_averages = {}
                for subject, scores in subjects.items():
                    subject_averages[subject] = sum(scores) / len(scores)
                
                class_performance.append({
                    "id": student_id,
                    "student_id": student_id,
                    "name": student.get("name") or student.get("username", student.get("email", "Unknown")),
                    "student_name": student.get("name") or student.get("username", ""),
                    "email": student.get("email", ""),
                    "student_email": student.get("email", ""),
                    "batch": student.get("batch_name", "No Batch"),
                    "batch_id": student.get("batch_id") or (student.get("batch_ids", [None])[0] if student.get("batch_ids") else ""),
                    "batch_ids": student.get("batch_ids", []),
                    "total_assessments": total_assessments,
                    "average_score": round(average_score, 2),
                    "recent_average": round(recent_average, 2),
                    "subject_averages": subject_averages,
                    "last_activity": max([parse_date(r.get("submitted_at")) for r in all_results]).isoformat() if all_results else None,
                    "performance_trend": "improving" if recent_average > average_score else "declining" if recent_average < average_score else "stable"
                })
        
        # Sort by average score (highest first)
        class_performance.sort(key=lambda x: x["average_score"], reverse=True)
        
        # Calculate class statistics
        if class_performance:
            class_average = sum([s["average_score"] for s in class_performance]) / len(class_performance)
            top_performers = class_performance[:3]
            struggling_students = [s for s in class_performance if s["average_score"] < 60]
        else:
            class_average = 0
            top_performers = []
            struggling_students = []
        
        # Count students active in the last 7 days
        active_students_count = 0
        for s in class_performance:
            if s.get("last_activity"):
                try:
                    last_dt = parse_date(s.get("last_activity"))
                    if last_dt != datetime.min and (datetime.utcnow() - last_dt.replace(tzinfo=None)).days <= 7:
                        active_students_count += 1
                except Exception:
                    pass
        
        return {
            "success": True,
            "class_statistics": {
                "total_students": total_students,
                "class_average": round(class_average, 2),
                "top_performers": top_performers,
                "struggling_students": struggling_students,
                "students_with_recent_activity": active_students_count
            },
            "student_performance": class_performance
        }
        
    except Exception as e:
        print(f"❌ [ASSESSMENT-TEACHER] Error fetching class performance: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/student-results/{student_id}")
async def get_student_detailed_results(
    student_id: str, 
    user: UserModel = Depends(require_teacher)
):
    """Get detailed results for a specific student across all assessments - Teacher only"""
    try:
        db = await get_db()
        
        # Get student info
        student = None
        try:
            if ObjectId.is_valid(student_id):
                student = await db.users.find_one({"_id": ObjectId(student_id)})
        except Exception:
            pass
        if not student:
            student = await db.users.find_one({"_id": student_id})
        
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Get all assessment results for this student
        all_results = []
        
        # 1. Regular assessment submissions
        regular_submissions = await db.assessment_submissions.find({"student_id": student_id}).sort("submitted_at", -1).to_list(length=None)
        for submission in regular_submissions:
            assessment = await db.assessments.find_one({"_id": ObjectId(submission["assessment_id"])})
            if assessment:
                all_results.append({
                    "result_id": str(submission["_id"]),
                    "assessment_id": str(submission["assessment_id"]),
                    "assessment_title": assessment.get("title", "Assessment"),
                    "assessment_type": "regular",
                    "subject": assessment.get("subject", ""),
                    "difficulty": assessment.get("difficulty", "medium"),
                    "score": submission.get("score", 0),
                    "total_questions": submission.get("total_questions", 0),
                    "percentage": submission.get("percentage", 0),
                    "time_taken": submission.get("time_taken", 0),
                    "submitted_at": submission.get("submitted_at"),
                    "questions": submission.get("questions", []),
                    "user_answers": submission.get("answers", []),
                    "is_completed": True
                })
        
        # 2. Teacher assessment results
        teacher_submissions = await db.teacher_assessment_results.find({"student_id": student_id}).sort("submitted_at", -1).to_list(length=None)
        for submission in teacher_submissions:
            assessment_id = submission.get("assessment_id")
            assessment = None
            if assessment_id:
                try:
                    assessment = await db.teacher_assessments.find_one({"_id": ObjectId(assessment_id)})
                except Exception:
                    assessment = await db.assessments.find_one({"_id": ObjectId(assessment_id)})
            
            if assessment:
                all_results.append({
                    "result_id": str(submission["_id"]),
                    "assessment_id": str(assessment_id),
                    "assessment_title": assessment.get("title", "Assessment"),
                    "assessment_type": "teacher_assigned",
                    "subject": assessment.get("topic", assessment.get("subject", "")),
                    "difficulty": assessment.get("difficulty", "medium"),
                    "score": submission.get("score", 0),
                    "total_questions": submission.get("total_questions", 0),
                    "percentage": submission.get("percentage", 0),
                    "time_taken": submission.get("time_taken", 0),
                    "submitted_at": submission.get("submitted_at"),
                    "questions": submission.get("questions", []),
                    "user_answers": submission.get("user_answers", []),
                    "is_completed": True
                })
        
        # 3. AI-generated assessment results
        ai_results = await db.results.find({"user_id": student_id}).sort("submitted_at", -1).to_list(length=None)
        for result in ai_results:
            all_results.append({
                "result_id": str(result["_id"]),
                "assessment_id": "ai_generated",
                "assessment_title": result.get("test_name", "AI Assessment"),
                "assessment_type": "ai_generated",
                "subject": result.get("topic", ""),
                "difficulty": result.get("difficulty", "medium"),
                "score": result.get("score", 0),
                "total_questions": result.get("total_questions", 0),
                "percentage": (result.get("score", 0) / result.get("total_questions", 1)) * 100,
                "time_taken": result.get("time_spent", 0),
                "submitted_at": result.get("submitted_at"),
                "questions": result.get("questions", []),
                "user_answers": result.get("user_answers", []),
                "is_completed": True
            })
        
        # 4. Coding assessment results
        coding_results = await db.coding_solutions.find({"student_id": student_id}).sort("submitted_at", -1).to_list(length=None)
        for result in coding_results:
            problem = await db.coding_problems.find_one({"_id": ObjectId(result["problem_id"])})
            if problem:
                all_results.append({
                    "result_id": str(result["_id"]),
                    "assessment_id": str(result["problem_id"]),
                    "assessment_title": problem.get("title", "Coding Problem"),
                    "assessment_type": "coding",
                    "subject": "Programming",
                    "difficulty": problem.get("difficulty", "medium"),
                    "score": result.get("score", 0),
                    "total_questions": 1,  # Coding problems are typically single problems
                    "percentage": (result.get("score", 0) / result.get("max_score", 1)) * 100,
                    "time_taken": result.get("execution_time", 0),
                    "submitted_at": result.get("submitted_at"),
                    "code": result.get("code", ""),
                    "language": result.get("language", ""),
                    "test_results": result.get("test_results", []),
                    "is_completed": True
                })
        
        # Sort by submission date (most recent first)
        def parse_date_local(date_val):
            if isinstance(date_val, datetime):
                return date_val
            if isinstance(date_val, str):
                try:
                    clean_date = date_val.replace('Z', '+00:00')
                    return datetime.fromisoformat(clean_date)
                except ValueError:
                    return datetime.min
            return datetime.min
        
        # Convert all submitted_at to strings for JSON serialization
        for r in all_results:
            if isinstance(r.get("submitted_at"), datetime):
                r["submitted_at"] = r["submitted_at"].isoformat()
        
        all_results.sort(key=lambda x: parse_date_local(x.get("submitted_at")), reverse=True)
        
        # Calculate performance insights
        total_assessments = len(all_results)
        completed_assessments = len([r for r in all_results if r.get("is_completed", False)])
        average_score = sum([r.get("percentage", 0) for r in all_results]) / total_assessments if total_assessments > 0 else 0
        
        # Subject-wise performance
        subject_performance = {}
        for result in all_results:
            subject = result.get("subject", "Unknown")
            if subject not in subject_performance:
                subject_performance[subject] = {"total": 0, "scores": [], "count": 0}
            subject_performance[subject]["count"] += 1
            subject_performance[subject]["scores"].append(result.get("percentage", 0))
            subject_performance[subject]["total"] += result.get("percentage", 0)
        
        # Calculate averages for each subject
        for subject in subject_performance:
            subject_performance[subject]["average"] = subject_performance[subject]["total"] / subject_performance[subject]["count"]
        
        return {
            "success": True,
            "student": {
                "id": str(student["_id"]),
                "name": student.get("name") or student.get("username", ""),
                "email": student.get("email", ""),
                "batch": student.get("batch_name", ""),
                "batch_id": student.get("batch_id") or (student.get("batch_ids", [None])[0] if student.get("batch_ids") else ""),
                "batch_ids": student.get("batch_ids", [])
            },
            "results": all_results,
            "performance_insights": {
                "total_assessments": total_assessments,
                "completed_assessments": completed_assessments,
                "average_score": round(average_score, 2),
                "subject_performance": subject_performance,
                "recent_activity": all_results[:5]  # Last 5 assessments
            }
        }
    except Exception as e:
        print(f"❌ [STUDENT-RESULTS] Unexpected error: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
        
        logger.info(f"✅ [STUDENT-RESULTS] Returning {len(all_results)} results for student {student_id}")
        if all_results:
            logger.info(f"📋 [STUDENT-RESULTS] Sample result assessment_id: {all_results[0].get('assessment_id')}, result_id: {all_results[0].get('result_id')}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [STUDENT-RESULTS] Unexpected error: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/assessment-analytics/{assessment_id}")
async def get_assessment_analytics(
    assessment_id: str, 
    user: UserModel = Depends(require_teacher)
):
    """Get detailed analytics for a specific assessment - Teacher only"""
    try:
        db = await get_db()
        
        # Get assessment details
        assessment = None
        try:
            assessment = await db.teacher_assessments.find_one({"_id": ObjectId(assessment_id)})
        except Exception:
            pass
        
        if not assessment:
            assessment = await db.assessments.find_one({"_id": ObjectId(assessment_id)})
        
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Get all submissions for this assessment
        all_submissions = []
        
        # Regular assessment submissions
        regular_submissions = await db.assessment_submissions.find({"assessment_id": assessment_id}).to_list(length=None)
        for submission in regular_submissions:
            student = await db.users.find_one({"_id": ObjectId(submission["student_id"])})
            if student:
                all_submissions.append({
                    "student_id": str(submission["student_id"]),
                    "student_name": student.get("name") or student.get("username", ""),
                    "student_email": student.get("email", ""),
                    "batch": student.get("batch_name", ""),
                    "score": submission.get("score", 0),
                    "total_questions": submission.get("total_questions", 0),
                    "percentage": submission.get("percentage", 0),
                    "time_taken": submission.get("time_taken", 0),
                    "submitted_at": submission.get("submitted_at"),
                    "answers": submission.get("answers", []),
                    "questions": submission.get("questions", [])
                })
        
        # Teacher assessment results
        teacher_submissions = await db.teacher_assessment_results.find({"assessment_id": assessment_id}).to_list(length=None)
        for submission in teacher_submissions:
            student = await db.users.find_one({"_id": ObjectId(submission["student_id"])})
            if student:
                all_submissions.append({
                    "student_id": str(submission["student_id"]),
                    "student_name": student.get("name") or student.get("username", ""),
                    "student_email": student.get("email", ""),
                    "batch": student.get("batch_name", ""),
                    "score": submission.get("score", 0),
                    "total_questions": submission.get("total_questions", 0),
                    "percentage": submission.get("percentage", 0),
                    "time_taken": submission.get("time_taken", 0),
                    "submitted_at": submission.get("submitted_at"),
                    "answers": submission.get("user_answers", []),
                    "questions": submission.get("questions", [])
                })
        
        # Convert all submitted_at to strings for JSON serialization
        for r in all_submissions:
            if isinstance(r.get("submitted_at"), datetime):
                r["submitted_at"] = r["submitted_at"].isoformat()
                
        if not all_submissions:
            return {
                "success": True,
                "assessment": {
                    "id": str(assessment["_id"]),
                    "title": assessment.get("title", "Assessment"),
                    "subject": assessment.get("topic", assessment.get("subject", "")),
                    "difficulty": assessment.get("difficulty", "medium"),
                    "total_questions": len(assessment.get("questions", []))
                },
                "analytics": {
                    "total_submissions": 0,
                    "average_score": 0,
                    "completion_rate": 0,
                    "question_analysis": [],
                    "batch_performance": {},
                    "time_analysis": {}
                },
                "submissions": []
            }
        
        # Calculate analytics
        total_submissions = len(all_submissions)
        average_score = sum([s["percentage"] for s in all_submissions]) / total_submissions
        
        # Question-wise analysis
        questions = assessment.get("questions", [])
        question_analysis = []
        for i, question in enumerate(questions):
            correct_count = 0
            total_attempts = 0
            
            for submission in all_submissions:
                if i < len(submission.get("answers", [])):
                    total_attempts += 1
                    user_answer = submission["answers"][i]
                    correct_answer = question.get("answer", "")
                    correct_answer_index = question.get("correct_answer", -1)
                    
                    # Handle different answer formats
                    if isinstance(correct_answer_index, int) and 0 <= correct_answer_index < len(question.get("options", [])):
                        correct_answer = question["options"][correct_answer_index]
                    
                    if user_answer == correct_answer:
                        correct_count += 1
            
            accuracy = (correct_count / total_attempts * 100) if total_attempts > 0 else 0
            question_analysis.append({
                "question_index": i,
                "question_text": question.get("question", ""),
                "correct_answer": correct_answer,
                "total_attempts": total_attempts,
                "correct_attempts": correct_count,
                "accuracy": round(accuracy, 2),
                "difficulty_level": "easy" if accuracy >= 80 else "medium" if accuracy >= 60 else "hard"
            })
        
        # Batch-wise performance
        batch_performance = {}
        for submission in all_submissions:
            batch = submission.get("batch", "No Batch")
            if batch not in batch_performance:
                batch_performance[batch] = {"scores": [], "count": 0}
            batch_performance[batch]["scores"].append(submission["percentage"])
            batch_performance[batch]["count"] += 1
        
        for batch in batch_performance:
            scores = batch_performance[batch]["scores"]
            batch_performance[batch]["average"] = sum(scores) / len(scores)
            batch_performance[batch]["highest"] = max(scores)
            batch_performance[batch]["lowest"] = min(scores)
        
        # Time analysis
        time_taken = [s["time_taken"] for s in all_submissions if s["time_taken"] > 0]
        time_analysis = {}
        if time_taken:
            time_analysis = {
                "average_time": sum(time_taken) / len(time_taken),
                "fastest_completion": min(time_taken),
                "slowest_completion": max(time_taken),
                "median_time": sorted(time_taken)[len(time_taken) // 2]
            }
        
        return {
            "success": True,
            "assessment": {
                "id": str(assessment["_id"]),
                "title": assessment.get("title", "Assessment"),
                "subject": assessment.get("topic", assessment.get("subject", "")),
                "difficulty": assessment.get("difficulty", "medium"),
                "total_questions": len(questions),
                "time_limit": assessment.get("time_limit", 30)
            },
            "analytics": {
                "total_submissions": total_submissions,
                "average_score": round(average_score, 2),
                "completion_rate": 100,  # All submissions are completed
                "question_analysis": question_analysis,
                "batch_performance": batch_performance,
                "time_analysis": time_analysis,
                "score_distribution": {
                    "excellent": len([s for s in all_submissions if s["percentage"] >= 90]),
                    "good": len([s for s in all_submissions if 80 <= s["percentage"] < 90]),
                    "average": len([s for s in all_submissions if 60 <= s["percentage"] < 80]),
                    "poor": len([s for s in all_submissions if s["percentage"] < 60])
                }
            },
            "submissions": all_submissions
        }
    except Exception as e:
        print(f"❌ [ASSESSMENT-TEACHER] Error fetching assessment analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{assessment_id}/questions", response_model=QuestionResponse)
async def add_question_to_assessment(
    assessment_id: str,
    question_data: QuestionCreate,
    user: UserModel = Depends(require_teacher)
):
    """Add a question to an assessment"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(assessment_id):
            raise HTTPException(status_code=400, detail="Invalid assessment ID")
        
        # Verify assessment belongs to teacher
        assessment = await db.assessments.find_one({
            "_id": ObjectId(assessment_id),
            "created_by": str(user.id)
        })
        
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Create question document
        question_doc = {
            "question": question_data.question,
            "options": question_data.options,
            "correct_answer": question_data.correct_answer,
            "explanation": question_data.explanation,
            "difficulty": question_data.difficulty,
            "points": question_data.points
        }
        
        # Add question to assessment
        await db.assessments.update_one(
            {"_id": ObjectId(assessment_id)},
            {
                "$push": {"questions": question_doc},
                "$inc": {"question_count": 1}
            }
        )
        
        return QuestionResponse(
            id=str(ObjectId()),
            question=question_data.question,
            options=question_data.options,
            correct_answer=question_data.correct_answer,
            explanation=question_data.explanation,
            points=question_data.points
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{assessment_id}/coding-questions", response_model=CodingQuestionResponse)
async def add_coding_question_to_assessment(
    assessment_id: str,
    question_data: CodingQuestionCreate,
    user: UserModel = Depends(require_teacher)
):
    """Add a coding question to an assessment"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(assessment_id):
            raise HTTPException(status_code=400, detail="Invalid assessment ID")
        
        # Verify assessment belongs to teacher
        assessment = await db.assessments.find_one({
            "_id": ObjectId(assessment_id),
            "created_by": str(user.id)
        })
        
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Create coding question document
        question_doc = {
            "id": str(ObjectId()),
            "title": question_data.title,
            "description": question_data.description,
            "problem_statement": question_data.problem_statement,
            "constraints": question_data.constraints,
            "examples": question_data.examples,
            "test_cases": question_data.test_cases,
            "hidden_test_cases": question_data.hidden_test_cases,
            "expected_complexity": question_data.expected_complexity,
            "hints": question_data.hints,
            "points": question_data.points,
            "time_limit": question_data.time_limit,
            "memory_limit": question_data.memory_limit
        }
        
        # Add question to assessment
        await db.assessments.update_one(
            {"_id": ObjectId(assessment_id)},
            {
                "$push": {"questions": question_doc},
                "$inc": {"question_count": 1}
            }
        )
        
        return CodingQuestionResponse(
            id=question_doc["id"],
            title=question_data.title,
            description=question_data.description,
            problem_statement=question_data.problem_statement,
            constraints=question_data.constraints,
            examples=question_data.examples,
            hints=question_data.hints,
            points=question_data.points,
            time_limit=question_data.time_limit,
            memory_limit=question_data.memory_limit,
            test_cases=question_data.test_cases
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{assessment_id}/ai-generate-questions")
async def ai_generate_questions(
    assessment_id: str,
    request_data: dict,
    user: UserModel = Depends(require_teacher)
):
    """Generate questions using AI for an assessment"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(assessment_id):
            raise HTTPException(status_code=400, detail="Invalid assessment ID")
        
        # Verify assessment belongs to teacher
        assessment = await db.assessments.find_one({
            "_id": ObjectId(assessment_id),
            "created_by": str(user.id)
        })
        
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        topic = request_data.get("topic", assessment["subject"])
        difficulty = request_data.get("difficulty", assessment["difficulty"])
        count = request_data.get("count", 5)
        
        # Generate questions using AI
        from app.services.gemini_coding_service import GeminiCodingService
        gemini_service = GeminiCodingService()
        
        generated_questions = await gemini_service.generate_mcq_questions(
            topic=topic,
            difficulty=difficulty,
            count=count
        )
        
        # Add questions to assessment
        await db.assessments.update_one(
            {"_id": ObjectId(assessment_id)},
            {
                "$push": {"questions": {"$each": generated_questions}},
                "$inc": {"question_count": len(generated_questions)}
            }
        )
        
        return {
            "success": True,
            "message": f"Generated {len(generated_questions)} questions",
            "questions_added": len(generated_questions)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{assessment_id}")
async def get_teacher_assessment_info(
    assessment_id: str,
    user: UserModel = Depends(get_current_user)
):
    """Get basic assessment information for teachers"""
    try:
        db = await get_db()
        
        if not ObjectId.is_valid(assessment_id):
            raise HTTPException(status_code=400, detail="Invalid assessment ID")
        
        # Try to find in assessments collection
        assessment = await db.assessments.find_one({"_id": ObjectId(assessment_id)})
        
        # Try teacher_assessments collection if not found
        if not assessment:
            assessment = await db.teacher_assessments.find_one({"_id": ObjectId(assessment_id)})
        
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Build response
        return {
            "id": str(assessment["_id"]),
            "title": assessment.get("title", "Untitled Assessment"),
            "subject": assessment.get("subject", assessment.get("topic", "General")),
            "difficulty": assessment.get("difficulty", "medium"),
            "description": assessment.get("description", ""),
            "time_limit": assessment.get("time_limit", 30),
            "question_count": assessment.get("question_count", len(assessment.get("questions", []))),
            "questions": assessment.get("questions", []),
            "created_at": assessment.get("created_at", datetime.utcnow()).isoformat(),
            "status": assessment.get("status", "draft"),
            "is_active": assessment.get("is_active", False)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{assessment_id}/results")
async def get_assessment_results_list(
    assessment_id: str,
    user: UserModel = Depends(get_current_user)
):
    """Get list of all student results for an assessment - for teachers"""
    try:
        db = await get_db()
        
        print(f"📊 [RESULTS] Getting results for assessment: {assessment_id}, user: {user.email}, role: {user.role}")
        
        # Check if user is teacher or admin
        if user.role not in ["teacher", "admin"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get submissions from both collections
        submissions = []
        
        # Get from assessment_submissions (regular assessments)
        try:
            regular_subs = await db.assessment_submissions.find({
                "assessment_id": assessment_id
            }).to_list(length=None)
            print(f"📊 [RESULTS] Found {len(regular_subs)} regular submissions")
            submissions.extend(regular_subs)
        except Exception as e:
            print(f"⚠️ [RESULTS] Error getting regular submissions: {e}")
            pass
        
        # Get from teacher_assessment_results (teacher-created assessments)
        try:
            teacher_subs = await db.teacher_assessment_results.find({
                "assessment_id": assessment_id
            }).to_list(length=None)
            print(f"📊 [RESULTS] Found {len(teacher_subs)} teacher submissions")
            submissions.extend(teacher_subs)
        except Exception as e:
            print(f"⚠️ [RESULTS] Error getting teacher submissions: {e}")
            pass
        
        # Format results
        results = []
        for sub in submissions:
            try:
                student_id = sub.get("student_id")
                
                # Convert student_id to string if it's an ObjectId
                if isinstance(student_id, ObjectId):
                    student_id_str = str(student_id)
                else:
                    student_id_str = student_id
                
                # Get student info
                student = None
                if student_id:
                    try:
                        # Try with ObjectId first
                        if ObjectId.is_valid(student_id_str):
                            student = await db.users.find_one({"_id": ObjectId(student_id_str)})
                        
                        # If not found and student_id is ObjectId, try direct match
                        if not student and isinstance(student_id, ObjectId):
                            student = await db.users.find_one({"_id": student_id})
                        
                        # If still not found, try string match
                        if not student:
                            student = await db.users.find_one({"_id": student_id_str})
                    except Exception as e:
                        print(f"⚠️ [RESULTS] Error getting student {student_id}: {e}")
                        pass
                
                student_name = student.get("full_name", "Unknown") if student else "Unknown"
                student_email = student.get("email", "") if student else ""
                
                # Handle submitted_at safely
                submitted_at = sub.get("submitted_at")
                if submitted_at:
                    if hasattr(submitted_at, 'isoformat'):
                        submitted_at_str = submitted_at.isoformat()
                    else:
                        submitted_at_str = str(submitted_at)
                else:
                    submitted_at_str = datetime.utcnow().isoformat()
                
                results.append({
                    "student_id": student_id_str,
                    "student_name": student_name,
                    "student_email": student_email,
                    "score": sub.get("score", 0),
                    "total_questions": sub.get("total_questions", 0),
                    "percentage": sub.get("percentage", 0),
                    "time_taken": sub.get("time_taken", 0),
                    "submitted_at": submitted_at_str
                })
            except Exception as e:
                print(f"⚠️ [RESULTS] Error formatting submission: {e}")
                continue
        
        print(f"✅ [RESULTS] Returning {len(results)} results")
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [RESULTS] Error getting results: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{assessment_id}/assigned-students")
async def get_assigned_students_with_results(
    assessment_id: str,
    user: UserModel = Depends(get_current_user)
):
    """Get list of assigned students with their submission status"""
    try:
        db = await get_db()
        
        # Check if user is teacher or admin
        if user.role not in ["teacher", "admin"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if not ObjectId.is_valid(assessment_id):
            raise HTTPException(status_code=400, detail="Invalid assessment ID")
        
        # Get assessment
        assessment = await db.assessments.find_one({"_id": ObjectId(assessment_id)})
        if not assessment:
            assessment = await db.teacher_assessments.find_one({"_id": ObjectId(assessment_id)})
        
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        
        # Get assigned batches
        batch_ids = assessment.get("assigned_batches", assessment.get("batches", []))
        
        # Get students from batches
        assigned_students = []
        
        # Build comprehensive ID filters for submission lookup
        id_filters = [{"assessment_id": assessment_id}]
        if ObjectId.is_valid(assessment_id):
            oid = ObjectId(assessment_id)
            id_filters.append({"assessment_id": oid})
            id_filters.append({"assessment_id": str(oid)})
        
        # Fetch all submissions at once for better performance
        teacher_submissions = []
        regular_submissions = []
        try:
            teacher_submissions = await db.teacher_assessment_results.find({"$or": id_filters}).to_list(length=None)
        except Exception:
            teacher_submissions = []
        try:
            regular_submissions = await db.assessment_submissions.find({"$or": id_filters}).to_list(length=None)
        except Exception:
            regular_submissions = []
        
        # Map submissions by student_id (handle both ObjectId and string formats)
        submissions_by_student: dict[str, dict] = {}
        for sub in teacher_submissions:
            sid = sub.get("student_id")
            if sid is None:
                continue
            sid_str = str(sid)
            submission_data = {
                "result_id": str(sub.get("_id")),
                "score": sub.get("score", 0),
                "percentage": sub.get("percentage", 0.0),
                "time_taken": sub.get("time_taken", 0),
                "submitted_at": sub.get("submitted_at")
            }
            submissions_by_student[sid_str] = submission_data
            if ObjectId.is_valid(sid_str):
                submissions_by_student[str(ObjectId(sid_str))] = submission_data
        
        for sub in regular_submissions:
            sid = sub.get("student_id")
            if sid is None:
                continue
            sid_str = str(sid)
            if sid_str not in submissions_by_student:
                submission_data = {
                    "result_id": str(sub.get("_id")),
                    "score": sub.get("score", 0),
                    "percentage": sub.get("percentage", 0.0),
                    "time_taken": sub.get("time_taken", 0),
                    "submitted_at": sub.get("submitted_at")
                }
                submissions_by_student[sid_str] = submission_data
                if ObjectId.is_valid(sid_str):
                    submissions_by_student[str(ObjectId(sid_str))] = submission_data
        
        for batch_id_str in batch_ids:
            try:
                batch = await db.batches.find_one({"_id": ObjectId(batch_id_str)})
                if batch:
                    student_ids = batch.get("student_ids", [])
                    for student_id in student_ids:
                        try:
                            student = await db.users.find_one({"_id": ObjectId(student_id) if ObjectId.is_valid(student_id) else student_id})
                            if student:
                                student_id_str = str(student_id)
                                
                                # Look up submission (try multiple ID formats)
                                submission = submissions_by_student.get(student_id_str)
                                if not submission and ObjectId.is_valid(student_id_str):
                                    submission = submissions_by_student.get(str(ObjectId(student_id_str)))
                                
                                print(f"  - Student {student_id_str}: {'✅ Submitted' if submission else '❌ Not submitted'}")
                                
                                assigned_students.append({
                                    "student_id": str(student["_id"]),
                                    "student_name": student.get("full_name", student.get("username", "Unknown")),
                                    "student_email": student.get("email", ""),
                                    "submitted": submission is not None,
                                    "present": submission is not None,  # Also include 'present' field for frontend
                                    "result_id": submission.get("result_id") if submission else None,
                                    "score": submission.get("score", 0) if submission else 0,
                                    "total_questions": assessment.get("question_count", len(assessment.get("questions", []))),
                                    "percentage": submission.get("percentage", 0) if submission else 0,
                                    "time_taken": submission.get("time_taken", 0) if submission else 0,
                                    "submitted_at": (submission.get("submitted_at").isoformat() if hasattr(submission.get("submitted_at"), "isoformat") else submission.get("submitted_at")) if submission and submission.get("submitted_at") else None,
                                })
                        except Exception as e:
                            print(f"Error processing student {student_id}: {e}")
                            continue
            except Exception as e:
                print(f"Error processing batch {batch_id_str}: {e}")
                continue
        
        return assigned_students
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))