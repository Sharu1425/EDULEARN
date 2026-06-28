from datetime import timezone
"""
Teacher Reports and Analytics
Handles teacher analytics, reports, and performance insights
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
from pydantic import BaseModel
from ...db import get_db
from ...dependencies import require_teacher_or_admin, require_analytics_access
from ...models.models import UserModel

router = APIRouter(tags=["teacher-reports"])

# Response Models
class TeacherDashboardResponse(BaseModel):
    total_students: int
    total_batches: int
    total_assessments: int
    recent_activity: List[Dict]
    performance_summary: Dict

class StudentPerformanceResponse(BaseModel):
    id: str
    name: str
    email: str
    batch_name: str
    level: int
    xp: int
    completed_assessments: int
    average_score: float
    last_activity: str

@router.get("/dashboard", response_model=TeacherDashboardResponse)
async def get_teacher_dashboard(current_user: UserModel = Depends(require_teacher_or_admin)):
    """Get teacher dashboard overview"""
    try:
        db = await get_db()
        
        print(f"[DEBUG] [TEACHER] Getting dashboard for teacher: {current_user.id}")
        
        # Get teacher's batches
        batches = await db.batches.find({"teacher_id": str(current_user.id)}).to_list(length=None)
        batch_ids = [str(batch["_id"]) for batch in batches]
        
        # Get total students in teacher's batches
        total_students = 0
        if batch_ids:
            total_students = await db.users.count_documents({
                "batch_id": {"$in": [ObjectId(bid) for bid in batch_ids]},
                "role": "student"
            })
        
        # Get total assessments created by teacher
        total_assessments = await db.assessments.count_documents({
            "created_by": str(current_user.id)
        })
        
        # Add teacher assessments
        teacher_assessments_count = await db.teacher_assessments.count_documents({
            "teacher_id": str(current_user.id)
        })
        total_assessments += teacher_assessments_count
        
        # Get recent activity (last 7 days)
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        
        # Get recent submissions
        recent_submissions = await db.assessment_submissions.find({
            "submitted_at": {"$gte": seven_days_ago}
        }).sort("submitted_at", -1).limit(10).to_list(length=None)
        
        # Get teacher assessment results
        recent_teacher_submissions = await db.teacher_assessment_results.find({
            "submitted_at": {"$gte": seven_days_ago}
        }).sort("submitted_at", -1).limit(10).to_list(length=None)
        
        # Combine and format recent activity
        recent_activity = []
        
        for submission in recent_submissions:
            # Check if student is in teacher's batch
            student = await db.users.find_one({"_id": ObjectId(submission["student_id"])})
            if student and student.get("batch_id") in batch_ids:
                recent_activity.append({
                    "type": "assessment_submission",
                    "student_name": submission["student_name"],
                    "assessment_id": submission["assessment_id"],
                    "score": submission["score"],
                    "percentage": submission["percentage"],
                    "timestamp": submission["submitted_at"].isoformat()
                })
        
        for submission in recent_teacher_submissions:
            recent_activity.append({
                "type": "teacher_assessment_submission",
                "student_name": submission["student_name"],
                "assessment_id": submission["assessment_id"],
                "score": submission["score"],
                "percentage": submission["percentage"],
                "timestamp": submission["submitted_at"].isoformat()
            })
        
        # Sort by timestamp
        recent_activity.sort(key=lambda x: x["timestamp"], reverse=True)
        recent_activity = recent_activity[:10]  # Limit to 10 most recent
        
        # Calculate performance summary
        all_submissions = await db.assessment_submissions.find({
            "submitted_at": {"$gte": seven_days_ago}
        }).to_list(length=None)
        
        teacher_submissions = await db.teacher_assessment_results.find({
            "submitted_at": {"$gte": seven_days_ago}
        }).to_list(length=None)
        
        all_recent_submissions = all_submissions + teacher_submissions
        
        if all_recent_submissions:
            avg_performance = sum(sub["percentage"] for sub in all_recent_submissions) / len(all_recent_submissions)
            high_performers = len([sub for sub in all_recent_submissions if sub["percentage"] >= 80])
            total_submissions = len(all_recent_submissions)
        else:
            avg_performance = 0
            high_performers = 0
            total_submissions = 0
        
        performance_summary = {
            "average_performance": round(avg_performance, 2),
            "high_performers": high_performers,
            "total_submissions": total_submissions,
            "completion_rate": round((total_submissions / max(total_students, 1)) * 100, 2)
        }
        
        print(f"[SUCCESS] [TEACHER] Dashboard data retrieved successfully")
        
        return TeacherDashboardResponse(
            total_students=total_students,
            total_batches=len(batches),
            total_assessments=total_assessments,
            recent_activity=recent_activity,
            performance_summary=performance_summary
        )
        
    except Exception as e:
        print(f"[ERROR] [TEACHER] Error getting dashboard: {str(e)}")
        import traceback
        print(f"[ERROR] [TEACHER] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/overview")
async def get_analytics_overview(current_user: UserModel = Depends(require_analytics_access)):
    """Get comprehensive analytics overview for teacher"""
    try:
        db = await get_db()
        
        # Get teacher's batches
        batches = await db.batches.find({"teacher_id": str(current_user.id)}).to_list(length=None)
        batch_ids = [str(batch["_id"]) for batch in batches]
        
        if not batch_ids:
            return {
                "batch_analytics": [],
                "student_performance": [],
                "assessment_performance": [],
                "trends": {
                    "weekly_submissions": [],
                    "performance_trend": []
                }
            }
        
        # Get all students in teacher's batches
        students = await db.users.find({
            "batch_id": {"$in": [ObjectId(bid) for bid in batch_ids]},
            "role": "student"
        }).to_list(length=None)
        
        student_ids = [str(student["_id"]) for student in students]
        
        # Batch-wise analytics
        batch_analytics = []
        for batch in batches:
            batch_students = [s for s in students if str(s.get("batch_id")) == str(batch["_id"])]
            batch_student_ids = [str(s["_id"]) for s in batch_students]
            
            # Get submissions for this batch
            batch_submissions = await db.assessment_submissions.find({
                "student_id": {"$in": batch_student_ids}
            }).to_list(length=None)
            
            teacher_batch_submissions = await db.teacher_assessment_results.find({
                "student_id": {"$in": batch_student_ids}
            }).to_list(length=None)
            
            all_batch_submissions = batch_submissions + teacher_batch_submissions
            
            if all_batch_submissions:
                avg_performance = sum(sub["percentage"] for sub in all_batch_submissions) / len(all_batch_submissions)
                completion_rate = len(set(sub["student_id"] for sub in all_batch_submissions)) / len(batch_students) * 100
            else:
                avg_performance = 0
                completion_rate = 0
            
            batch_analytics.append({
                "batch_id": str(batch["_id"]),
                "batch_name": batch["name"],
                "student_count": len(batch_students),
                "average_performance": round(avg_performance, 2),
                "completion_rate": round(completion_rate, 2),
                "total_submissions": len(all_batch_submissions)
            })
        
        # Student performance analytics
        student_performance = []
        for student in students:
            # Get student's submissions
            student_submissions = await db.assessment_submissions.find({
                "student_id": str(student["_id"])
            }).to_list(length=None)
            
            teacher_student_submissions = await db.teacher_assessment_results.find({
                "student_id": str(student["_id"])
            }).to_list(length=None)
            
            all_student_submissions = student_submissions + teacher_student_submissions
            
            if all_student_submissions:
                avg_score = sum(sub["percentage"] for sub in all_student_submissions) / len(all_student_submissions)
                total_questions = sum(sub["total_questions"] for sub in all_student_submissions)
            else:
                avg_score = 0
                total_questions = 0
            
            student_performance.append({
                "student_id": str(student["_id"]),
                "name": student.get("username", student.get("email", "Unknown")),
                "email": student["email"],
                "level": student.get("level", 1),
                "xp": student.get("xp", 0),
                "completed_assessments": len(all_student_submissions),
                "average_score": round(avg_score, 2),
                "total_questions_answered": total_questions,
                "last_activity": student.get("last_activity", datetime.now(timezone.utc)).isoformat()
            })
        
        # Assessment performance analytics
        assessments = await db.assessments.find({
            "created_by": str(current_user.id)
        }).to_list(length=None)
        
        teacher_assessments = await db.teacher_assessments.find({
            "teacher_id": str(current_user.id)
        }).to_list(length=None)
        
        assessment_performance = []
        
        for assessment in assessments:
            submissions = await db.assessment_submissions.find({
                "assessment_id": str(assessment["_id"])
            }).to_list(length=None)
            
            if submissions:
                avg_performance = sum(sub["percentage"] for sub in submissions) / len(submissions)
                completion_rate = len(set(sub["student_id"] for sub in submissions)) / max(len(student_ids), 1) * 100
            else:
                avg_performance = 0
                completion_rate = 0
            
            assessment_performance.append({
                "assessment_id": str(assessment["_id"]),
                "title": assessment["title"],
                "subject": assessment["subject"],
                "difficulty": assessment["difficulty"],
                "question_count": assessment["question_count"],
                "total_submissions": len(submissions),
                "average_performance": round(avg_performance, 2),
                "completion_rate": round(completion_rate, 2),
                "created_at": assessment["created_at"].isoformat()
            })
        
        for assessment in teacher_assessments:
            submissions = await db.teacher_assessment_results.find({
                "assessment_id": str(assessment["_id"])
            }).to_list(length=None)
            
            if submissions:
                avg_performance = sum(sub["percentage"] for sub in submissions) / len(submissions)
                completion_rate = len(set(sub["student_id"] for sub in submissions)) / max(len(student_ids), 1) * 100
            else:
                avg_performance = 0
                completion_rate = 0
            
            assessment_performance.append({
                "assessment_id": str(assessment["_id"]),
                "title": assessment["title"],
                "subject": assessment.get("topic", "General"),
                "difficulty": assessment["difficulty"],
                "question_count": assessment["question_count"],
                "total_submissions": len(submissions),
                "average_performance": round(avg_performance, 2),
                "completion_rate": round(completion_rate, 2),
                "created_at": assessment["created_at"].isoformat()
            })
        
        # Weekly trends (last 7 weeks)
        weekly_submissions = []
        performance_trend = []
        
        for week in range(7):
            week_start = datetime.now(timezone.utc) - timedelta(weeks=week+1)
            week_end = datetime.now(timezone.utc) - timedelta(weeks=week)
            
            week_submissions = await db.assessment_submissions.find({
                "student_id": {"$in": student_ids},
                "submitted_at": {"$gte": week_start, "$lt": week_end}
            }).to_list(length=None)
            
            teacher_week_submissions = await db.teacher_assessment_results.find({
                "student_id": {"$in": student_ids},
                "submitted_at": {"$gte": week_start, "$lt": week_end}
            }).to_list(length=None)
            
            all_week_submissions = week_submissions + teacher_week_submissions
            
            weekly_submissions.append({
                "week": f"Week {7-week}",
                "submissions": len(all_week_submissions)
            })
            
            if all_week_submissions:
                avg_performance = sum(sub["percentage"] for sub in all_week_submissions) / len(all_week_submissions)
                performance_trend.append({
                    "week": f"Week {7-week}",
                    "average_performance": round(avg_performance, 2)
                })
            else:
                performance_trend.append({
                    "week": f"Week {7-week}",
                    "average_performance": 0
                })
        
        return {
            "batch_analytics": batch_analytics,
            "student_performance": student_performance,
            "assessment_performance": assessment_performance,
            "trends": {
                "weekly_submissions": weekly_submissions,
                "performance_trend": performance_trend
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batches/{batch_id}/students/{student_id}/feedback")
async def add_student_feedback(
    batch_id: str,
    student_id: str,
    feedback_data: dict,
    current_user: UserModel = Depends(require_teacher_or_admin)
):
    """Add feedback for a specific student"""
    try:
        db = await get_db()
        
        # Verify batch belongs to teacher
        batch = await db.batches.find_one({
            "_id": ObjectId(batch_id),
            "teacher_id": str(current_user.id)
        })
        
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        
        # Verify student is in the batch
        student = await db.users.find_one({
            "_id": ObjectId(student_id),
            "batch_id": ObjectId(batch_id),
            "role": "student"
        })
        
        if not student:
            raise HTTPException(status_code=404, detail="Student not found in batch")
        
        # Create feedback document
        feedback_doc = {
            "student_id": student_id,
            "batch_id": batch_id,
            "teacher_id": str(current_user.id),
            "feedback": feedback_data.get("feedback", ""),
            "rating": feedback_data.get("rating", 0),
            "created_at": datetime.now(timezone.utc),
            "type": feedback_data.get("type", "general")
        }
        
        await db.student_feedback.insert_one(feedback_doc)
        
        # Create notification for student
        notification = {
            "student_id": student_id,
            "type": "teacher_feedback",
            "title": "New Feedback from Teacher",
            "message": f"You have received new feedback from {current_user.username or 'your teacher'}",
            "created_at": datetime.now(timezone.utc),
            "is_read": False
        }
        
        await db.notifications.insert_one(notification)
        
        return {"success": True, "message": "Feedback added successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ai-reports/{teacher_id}")
async def generate_ai_reports(teacher_id: str, current_user: UserModel = Depends(require_teacher_or_admin)):
    """Generate AI-powered reports for teacher"""
    try:
        db = await get_db()
        
        # Verify teacher access
        if str(current_user.id) != teacher_id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get teacher's data
        batches = await db.batches.find({"teacher_id": teacher_id}).to_list(length=None)
        batch_ids = [str(batch["_id"]) for batch in batches]
        
        if not batch_ids:
            return {"message": "No batches found for this teacher"}
        
        # Get students
        students = await db.users.find({
            "batch_id": {"$in": [ObjectId(bid) for bid in batch_ids]},
            "role": "student"
        }).to_list(length=None)
        
        student_ids = [str(student["_id"]) for student in students]
        
        # Get submissions
        submissions = await db.assessment_submissions.find({
            "student_id": {"$in": student_ids}
        }).to_list(length=None)
        
        teacher_submissions = await db.teacher_assessment_results.find({
            "student_id": {"$in": student_ids}
        }).to_list(length=None)
        
        all_submissions = submissions + teacher_submissions
        
        # Generate AI insights (simplified - in production, use proper AI service)
        insights = {
            "overall_performance": {
                "average_score": sum(sub["percentage"] for sub in all_submissions) / len(all_submissions) if all_submissions else 0,
                "total_students": len(students),
                "total_submissions": len(all_submissions)
            },
            "top_performers": [],
            "needs_attention": [],
            "recommendations": [
                "Consider providing additional practice materials for struggling students",
                "Implement peer learning activities for high performers",
                "Schedule regular progress reviews with students"
            ]
        }
        
        # Identify top performers and students needing attention
        student_performance = {}
        for submission in all_submissions:
            student_id = submission["student_id"]
            if student_id not in student_performance:
                student_performance[student_id] = []
            student_performance[student_id].append(submission["percentage"])
        
        for student_id, scores in student_performance.items():
            avg_score = sum(scores) / len(scores)
            student = next((s for s in students if str(s["_id"]) == student_id), None)
            
            if student:
                student_info = {
                    "name": student.get("username", student.get("email", "Unknown")),
                    "average_score": round(avg_score, 2),
                    "total_assessments": len(scores)
                }
                
                if avg_score >= 80:
                    insights["top_performers"].append(student_info)
                elif avg_score < 60:
                    insights["needs_attention"].append(student_info)
        
        return {
            "teacher_id": teacher_id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "insights": insights,
            "data_summary": {
                "total_batches": len(batches),
                "total_students": len(students),
                "total_assessments": len(all_submissions)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
