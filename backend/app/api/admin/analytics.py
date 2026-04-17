"""
Admin Analytics and Statistics
Handles platform analytics, system health, and performance metrics
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
from pydantic import BaseModel
from ...db import get_db
from ...dependencies import require_admin
from ...models.models import UserModel

router = APIRouter(tags=["admin-analytics"])

# Response Models
class PlatformStatsResponse(BaseModel):
    total_users: int
    total_students: int
    total_teachers: int
    total_assessments: int
    total_submissions: int
    active_users_today: int
    platform_uptime: str

class SystemHealthResponse(BaseModel):
    database_status: str
    ai_service_status: str
    storage_status: str
    overall_health: str
    last_updated: str

@router.get("/analytics/platform", response_model=PlatformStatsResponse)
@router.get("/stats/platform", response_model=PlatformStatsResponse)
async def get_platform_stats(current_user: UserModel = Depends(require_admin)):
    """Get comprehensive platform statistics"""
    try:
        db = await get_db()
        
        # Get user counts
        total_users = await db.users.count_documents({})
        total_students = await db.users.count_documents({"role": "student"})
        total_teachers = await db.users.count_documents({"role": "teacher"})
        
        # Get assessment counts
        total_assessments = await db.assessments.count_documents({})
        teacher_assessments = await db.teacher_assessments.count_documents({})
        total_assessments += teacher_assessments
        
        # Get submission counts
        total_submissions = await db.assessment_submissions.count_documents({})
        teacher_submissions = await db.teacher_assessment_results.count_documents({})
        total_submissions += teacher_submissions
        
        # Get active users today
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        active_users_today = await db.users.count_documents({
            "last_login": {"$gte": today}
        })
        
        # Calculate platform uptime (simplified)
        platform_uptime = "99.9%"  # In production, calculate actual uptime
        
        return PlatformStatsResponse(
            total_users=total_users,
            total_students=total_students,
            total_teachers=total_teachers,
            total_assessments=total_assessments,
            total_submissions=total_submissions,
            active_users_today=active_users_today,
            platform_uptime=platform_uptime
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/overview")
async def get_analytics_overview(current_user: UserModel = Depends(require_admin)):
    """Get comprehensive analytics overview"""
    try:
        db = await get_db()
        
        # Get basic counts
        total_users = await db.users.count_documents({})
        total_students = await db.users.count_documents({"role": "student"})
        total_teachers = await db.users.count_documents({"role": "teacher"})
        total_batches = await db.batches.count_documents({})
        total_assessments = await db.assessments.count_documents({})
        total_teacher_assessments = await db.teacher_assessments.count_documents({})
        
        # Get recent activity (last 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        
        recent_submissions = await db.assessment_submissions.count_documents({
            "submitted_at": {"$gte": seven_days_ago}
        })
        
        recent_teacher_submissions = await db.teacher_assessment_results.count_documents({
            "submitted_at": {"$gte": seven_days_ago}
        })
        
        recent_users = await db.users.count_documents({
            "created_at": {"$gte": seven_days_ago}
        })
        
        # Get performance metrics
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
            completion_rate = len(set(sub["student_id"] for sub in all_recent_submissions)) / max(total_students, 1) * 100
        else:
            avg_performance = 0
            high_performers = 0
            completion_rate = 0
        
        # Get batch analytics
        batches = await db.batches.find({}).to_list(length=None)
        batch_analytics = []
        
        for batch in batches:
            student_count = len(batch.get("student_ids", []))
            batch_submissions = await db.assessment_submissions.count_documents({
                "student_id": {"$in": batch.get("student_ids", [])}
            })
            
            batch_analytics.append({
                "batch_id": str(batch["_id"]),
                "batch_name": batch["name"],
                "teacher_id": batch["teacher_id"],
                "student_count": student_count,
                "submission_count": batch_submissions,
                "created_at": batch["created_at"].isoformat()
            })
        
        # Get user growth trends (last 30 days)
        user_growth = []
        for day in range(30):
            day_start = datetime.utcnow() - timedelta(days=day+1)
            day_end = datetime.utcnow() - timedelta(days=day)
            
            new_users = await db.users.count_documents({
                "created_at": {"$gte": day_start, "$lt": day_end}
            })
            
            user_growth.append({
                "date": day_start.strftime("%Y-%m-%d"),
                "new_users": new_users
            })
        
        # Get top performing students
        top_students = await db.users.find({
            "role": "student",
            "average_score": {"$gte": 80}
        }).sort("average_score", -1).limit(10).to_list(length=None)
        
        top_students_list = []
        for student in top_students:
            top_students_list.append({
                "id": str(student["_id"]),
                "name": student.get("username", student.get("email", "Unknown")),
                "email": student["email"],
                "average_score": student.get("average_score", 0),
                "level": student.get("level", 1),
                "xp": student.get("xp", 0),
                "completed_assessments": student.get("completed_assessments", 0)
            })
        
        return {
            "overview": {
                "total_users": total_users,
                "total_students": total_students,
                "total_teachers": total_teachers,
                "total_batches": total_batches,
                "total_assessments": total_assessments + total_teacher_assessments
            },
            "recent_activity": {
                "new_users_7_days": recent_users,
                "submissions_7_days": recent_submissions + recent_teacher_submissions,
                "average_performance": round(avg_performance, 2),
                "high_performers": high_performers,
                "completion_rate": round(completion_rate, 2)
            },
            "batch_analytics": batch_analytics,
            "user_growth": user_growth,
            "top_students": top_students_list,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users/analytics")
async def get_users_analytics(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("activity_score", pattern="^(activity_score|username|email|created_at|last_login)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    role: Optional[str] = Query(None),
    days: int = Query(30, ge=1, le=365),
    current_user: UserModel = Depends(require_admin)
):
    """Get paginated list of users with analytics data"""
    try:
        db = await get_db()
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Build query
        query = {}
        if role:
            query["role"] = role
        
        # Get total count
        total_count = await db.users.count_documents(query)
        
        # Get all users matching the filter
        all_users = await db.users.find(query).to_list(length=None)
        
        # Build user analytics data
        users_with_analytics = []
        for user in all_users:
            user_id = str(user["_id"])
            
            # Calculate activity score
            submissions = await db.assessment_submissions.find({
                "student_id": user_id,
                "submitted_at": {"$gte": cutoff_date}
            }).to_list(length=None)
            
            teacher_submissions = await db.teacher_assessment_results.find({
                "student_id": user_id,
                "submitted_at": {"$gte": cutoff_date}
            }).to_list(length=None)
            
            all_submissions = submissions + teacher_submissions
            activity_score = len(all_submissions) * 10 + user.get("xp", 0)
            
            # Calculate average score
            if all_submissions:
                avg_score = sum(sub.get("percentage", 0) for sub in all_submissions) / len(all_submissions)
            else:
                avg_score = user.get("average_score", 0)
            
            # Get last login
            last_login = user.get("last_login")
            if last_login and hasattr(last_login, 'isoformat'):
                last_login_str = last_login.isoformat()
            elif last_login:
                last_login_str = str(last_login)
            else:
                last_login_str = None
            
            # Get created_at
            created_at = user.get("created_at", datetime.utcnow())
            if hasattr(created_at, 'isoformat'):
                created_at_str = created_at.isoformat()
            else:
                created_at_str = str(created_at)
            
            users_with_analytics.append({
                "id": user_id,
                "name": user.get("full_name") or user.get("username", "Unknown"),
                "username": user.get("username", ""),
                "email": user.get("email", ""),
                "role": user.get("role", "student"),
                "is_active": user.get("is_active", True),
                "level": user.get("level", 1),
                "xp": user.get("xp", 0),
                "completed_assessments": len(all_submissions),
                "average_score": round(avg_score, 2),
                "activity_score": activity_score,
                "last_login": last_login_str,
                "created_at": created_at_str,
                "total_logins": user.get("total_logins", 0),
                "progress_percentage": user.get("progress_percentage", 0),
                "assessments_taken": len(all_submissions),
                "badges_earned": user.get("badges_earned", 0),
                "streak_days": user.get("streak_days", 0)
            })
        
        # Sort users
        reverse = (order == "desc")
        if sort_by == "activity_score":
            users_with_analytics.sort(key=lambda x: x["activity_score"], reverse=reverse)
        elif sort_by == "username":
            users_with_analytics.sort(key=lambda x: x["username"], reverse=reverse)
        elif sort_by == "email":
            users_with_analytics.sort(key=lambda x: x["email"], reverse=reverse)
        elif sort_by == "created_at":
            users_with_analytics.sort(key=lambda x: x["created_at"], reverse=reverse)
        elif sort_by == "last_login":
            users_with_analytics.sort(key=lambda x: x["last_login"] or "", reverse=reverse)
        
        # Apply pagination
        paginated_users = users_with_analytics[offset:offset + limit]
        
        return {
            "users": paginated_users,
            "total_count": total_count,
            "limit": limit,
            "offset": offset,
            "has_more": offset + limit < total_count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/system/health", response_model=SystemHealthResponse)
async def get_system_health(current_user: UserModel = Depends(require_admin)):
    """Get system health status"""
    try:
        db = await get_db()
        
        # Check database connectivity
        try:
            await db.users.find_one({})
            database_status = "healthy"
        except Exception:
            database_status = "unhealthy"
        
        # Check AI service status (simplified)
        try:
            from app.services.gemini_coding_service import GeminiCodingService
            gemini_service = GeminiCodingService()
            # Simple test - in production, implement proper health check
            ai_service_status = "healthy"
        except Exception:
            ai_service_status = "unhealthy"
        
        # Check storage status (simplified)
        storage_status = "healthy"  # In production, check actual storage
        
        # Determine overall health
        if database_status == "healthy" and ai_service_status == "healthy" and storage_status == "healthy":
            overall_health = "healthy"
        elif database_status == "unhealthy":
            overall_health = "critical"
        else:
            overall_health = "degraded"
        
        return SystemHealthResponse(
            database_status=database_status,
            ai_service_status=ai_service_status,
            storage_status=storage_status,
            overall_health=overall_health,
            last_updated=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/trends")
async def get_analytics_trends(
    period: str = "30d",
    current_user: UserModel = Depends(require_admin)
):
    """Get analytics trends over time"""
    try:
        db = await get_db()
        
        # Parse period
        if period == "7d":
            days = 7
        elif period == "30d":
            days = 30
        elif period == "90d":
            days = 90
        else:
            days = 30
        
        trends = {
            "user_growth": [],
            "assessment_creation": [],
            "submission_trends": [],
            "performance_trends": []
        }
        
        # Calculate trends for each day
        for i in range(days):
            day_start = datetime.utcnow() - timedelta(days=i+1)
            day_end = datetime.utcnow() - timedelta(days=i)
            
            # User growth
            new_users = await db.users.count_documents({
                "created_at": {"$gte": day_start, "$lt": day_end}
            })
            
            # Assessment creation
            new_assessments = await db.assessments.count_documents({
                "created_at": {"$gte": day_start, "$lt": day_end}
            })
            
            new_teacher_assessments = await db.teacher_assessments.count_documents({
                "created_at": {"$gte": day_start, "$lt": day_end}
            })
            
            # Submissions
            submissions = await db.assessment_submissions.count_documents({
                "submitted_at": {"$gte": day_start, "$lt": day_end}
            })
            
            teacher_submissions = await db.teacher_assessment_results.count_documents({
                "submitted_at": {"$gte": day_start, "$lt": day_end}
            })
            
            # Performance trends
            day_submissions = await db.assessment_submissions.find({
                "submitted_at": {"$gte": day_start, "$lt": day_end}
            }).to_list(length=None)
            
            teacher_day_submissions = await db.teacher_assessment_results.find({
                "submitted_at": {"$gte": day_start, "$lt": day_end}
            }).to_list(length=None)
            
            all_day_submissions = day_submissions + teacher_day_submissions
            
            if all_day_submissions:
                avg_performance = sum(sub["percentage"] for sub in all_day_submissions) / len(all_day_submissions)
            else:
                avg_performance = 0
            
            trends["user_growth"].append({
                "date": day_start.strftime("%Y-%m-%d"),
                "new_users": new_users
            })
            
            trends["assessment_creation"].append({
                "date": day_start.strftime("%Y-%m-%d"),
                "new_assessments": new_assessments + new_teacher_assessments
            })
            
            trends["submission_trends"].append({
                "date": day_start.strftime("%Y-%m-%d"),
                "submissions": submissions + teacher_submissions
            })
            
            trends["performance_trends"].append({
                "date": day_start.strftime("%Y-%m-%d"),
                "average_performance": round(avg_performance, 2)
            })
        
        # Reverse to get chronological order
        for key in trends:
            trends[key].reverse()
        
        return {
            "period": period,
            "trends": trends,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
