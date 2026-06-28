from datetime import timezone
"""
Health Check Endpoints
Comprehensive health monitoring and system status endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from ..db import get_db
from ..core.config import settings
import asyncio
import httpx
import psutil
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/health", tags=["Health Checks"])

class HealthCheckService:
    """Service for health monitoring and system status"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def get_basic_health(self) -> Dict[str, Any]:
        """Get basic health status"""
        try:
            return {
                "status": "healthy",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "service": "EduLearn API",
                "version": "1.0.0"
            }
        except Exception as e:
            logger.error(f"Basic health check failed: {e}")
            return {
                "status": "unhealthy",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error": str(e)
            }
    
    async def get_database_health(self) -> Dict[str, Any]:
        """Get database health status"""
        try:
            # Test database connection
            start_time = datetime.now(timezone.utc)
            await self.db.command("ping")
            response_time = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
            
            # Get database stats
            db_stats = await self.db.command("dbStats")
            
            # Test basic operations
            test_collection = self.db.health_check
            await test_collection.insert_one({"test": True, "timestamp": datetime.now(timezone.utc)})
            await test_collection.delete_many({"test": True})
            
            return {
                "status": "healthy",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "database": {
                    "connection": "ok",
                    "response_time_ms": round(response_time, 2),
                    "collections": db_stats.get("collections", 0),
                    "data_size": db_stats.get("dataSize", 0),
                    "storage_size": db_stats.get("storageSize", 0),
                    "index_size": db_stats.get("indexSize", 0)
                }
            }
            
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "status": "unhealthy",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "database": {
                    "connection": "failed",
                    "error": str(e)
                }
            }
    
    async def get_ai_service_health(self) -> Dict[str, Any]:
        """Get AI service health status"""
        try:
            if not hasattr(settings, 'AI_SERVICE_URL') or not settings.AI_SERVICE_URL:
                return {
                    "status": "not_configured",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "ai_service": {
                        "url": "not_configured",
                        "status": "disabled"
                    }
                }
            
            # Test AI service connection
            start_time = datetime.now(timezone.utc)
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{settings.AI_SERVICE_URL}/health")
                
            response_time = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
            
            if response.status_code == 200:
                ai_data = response.json()
                return {
                    "status": "healthy",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "ai_service": {
                        "url": settings.AI_SERVICE_URL,
                        "status": "ok",
                        "response_time_ms": round(response_time, 2),
                        "service_status": ai_data.get("status", "unknown")
                    }
                }
            else:
                return {
                    "status": "unhealthy",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "ai_service": {
                        "url": settings.AI_SERVICE_URL,
                        "status": "error",
                        "response_time_ms": round(response_time, 2),
                        "error": f"HTTP {response.status_code}"
                    }
                }
                
        except Exception as e:
            logger.error(f"AI service health check failed: {e}")
            return {
                "status": "unhealthy",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "ai_service": {
                    "url": getattr(settings, 'AI_SERVICE_URL', 'not_configured'),
                    "status": "failed",
                    "error": str(e)
                }
            }
    
    async def get_system_health(self) -> Dict[str, Any]:
        """Get system resource health status"""
        try:
            # Get system metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Get process info
            process = psutil.Process()
            process_memory = process.memory_info()
            
            return {
                "status": "healthy",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "system": {
                    "cpu_percent": cpu_percent,
                    "memory": {
                        "total": memory.total,
                        "available": memory.available,
                        "used": memory.used,
                        "percent": memory.percent
                    },
                    "disk": {
                        "total": disk.total,
                        "used": disk.used,
                        "free": disk.free,
                        "percent": (disk.used / disk.total) * 100
                    },
                    "process": {
                        "memory_rss": process_memory.rss,
                        "memory_vms": process_memory.vms,
                        "cpu_percent": process.cpu_percent()
                    }
                }
            }
            
        except Exception as e:
            logger.error(f"System health check failed: {e}")
            return {
                "status": "unhealthy",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "system": {
                    "error": str(e)
                }
            }
    
    async def get_application_health(self) -> Dict[str, Any]:
        """Get application-specific health status"""
        try:
            # Check critical collections
            collections_to_check = ["users", "assessments", "batches", "notifications"]
            collection_status = {}
            
            for collection_name in collections_to_check:
                try:
                    collection = self.db[collection_name]
                    count = await collection.count_documents({})
                    collection_status[collection_name] = {
                        "status": "ok",
                        "document_count": count
                    }
                except Exception as e:
                    collection_status[collection_name] = {
                        "status": "error",
                        "error": str(e)
                    }
            
            # Check recent activity
            recent_assessments = await self.db.assessments.count_documents({
                "created_at": {"$gte": datetime.now(timezone.utc) - timedelta(hours=24)}
            })
            
            recent_users = await self.db.users.count_documents({
                "created_at": {"$gte": datetime.now(timezone.utc) - timedelta(hours=24)}
            })
            
            return {
                "status": "healthy",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "application": {
                    "collections": collection_status,
                    "recent_activity": {
                        "assessments_created_24h": recent_assessments,
                        "users_registered_24h": recent_users
                    },
                    "features": {
                        "ai_generation": hasattr(settings, 'AI_SERVICE_URL') and bool(settings.AI_SERVICE_URL),
                        "notifications": True,
                        "batch_management": True,
                        "assessment_creation": True
                    }
                }
            }
            
        except Exception as e:
            logger.error(f"Application health check failed: {e}")
            return {
                "status": "unhealthy",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "application": {
                    "error": str(e)
                }
            }
    
    def _get_uptime(self) -> str:
        """Get application uptime"""
        try:
            boot_time = psutil.boot_time()
            uptime_seconds = datetime.now(timezone.utc).timestamp() - boot_time
            
            days = int(uptime_seconds // 86400)
            hours = int((uptime_seconds % 86400) // 3600)
            minutes = int((uptime_seconds % 3600) // 60)
            
            return f"{days}d {hours}h {minutes}m"
        except:
            return "unknown"

# Health check endpoints
@router.get("/")
async def health_check():
    """Basic health check endpoint"""
    return {"status": "healthy", "message": "API is running"}

@router.get("/db")
async def database_health_check(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Database health check endpoint"""
    service = HealthCheckService(db)
    health_data = await service.get_database_health()
    
    status_code = 200 if health_data["status"] == "healthy" else 503
    return JSONResponse(content=health_data, status_code=status_code)

@router.get("/ai")
async def ai_service_health_check(db: AsyncIOMotorDatabase = Depends(get_db)):
    """AI service health check endpoint"""
    service = HealthCheckService(db)
    health_data = await service.get_ai_service_health()
    
    status_code = 200 if health_data["status"] in ["healthy", "not_configured"] else 503
    return JSONResponse(content=health_data, status_code=status_code)

@router.get("/system")
async def system_health_check(db: AsyncIOMotorDatabase = Depends(get_db)):
    """System resource health check endpoint"""
    service = HealthCheckService(db)
    health_data = await service.get_system_health()
    
    status_code = 200 if health_data["status"] == "healthy" else 503
    return JSONResponse(content=health_data, status_code=status_code)

@router.get("/app")
async def application_health_check(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Application-specific health check endpoint"""
    service = HealthCheckService(db)
    health_data = await service.get_application_health()
    
    status_code = 200 if health_data["status"] == "healthy" else 503
    return JSONResponse(content=health_data, status_code=status_code)

@router.get("/comprehensive")
async def comprehensive_health_check(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Comprehensive health check endpoint"""
    service = HealthCheckService(db)
    
    # Run all health checks in parallel
    basic_health, db_health, ai_health, system_health, app_health = await asyncio.gather(
        service.get_basic_health(),
        service.get_database_health(),
        service.get_ai_service_health(),
        service.get_system_health(),
        service.get_application_health(),
        return_exceptions=True
    )
    
    # Determine overall status
    overall_status = "healthy"
    if any(health.get("status") != "healthy" for health in [basic_health, db_health, system_health, app_health]):
        overall_status = "unhealthy"
    
    comprehensive_data = {
        "status": overall_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {
            "basic": basic_health,
            "database": db_health,
            "ai_service": ai_health,
            "system": system_health,
            "application": app_health
        }
    }
    
    status_code = 200 if overall_status == "healthy" else 503
    return JSONResponse(content=comprehensive_data, status_code=status_code)

@router.get("/metrics")
async def health_metrics(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Health metrics endpoint for monitoring systems"""
    service = HealthCheckService(db)
    
    try:
        # Get system metrics
        system_health = await service.get_system_health()
        db_health = await service.get_database_health()
        
        metrics = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metrics": {
                "cpu_percent": system_health.get("system", {}).get("cpu_percent", 0),
                "memory_percent": system_health.get("system", {}).get("memory", {}).get("percent", 0),
                "disk_percent": system_health.get("system", {}).get("disk", {}).get("percent", 0),
                "db_response_time_ms": db_health.get("database", {}).get("response_time_ms", 0),
                "db_collections": db_health.get("database", {}).get("collections", 0)
            }
        }
        
        return JSONResponse(content=metrics, status_code=200)
        
    except Exception as e:
        logger.error(f"Health metrics failed: {e}")
        return JSONResponse(
            content={"error": str(e), "timestamp": datetime.now(timezone.utc).isoformat()},
            status_code=500
        )

@router.get("/readiness")
async def readiness_check(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Kubernetes readiness probe endpoint"""
    service = HealthCheckService(db)
    
    try:
        # Check critical dependencies
        db_health = await service.get_database_health()
        
        if db_health["status"] == "healthy":
            return JSONResponse(
                content={"status": "ready", "timestamp": datetime.now(timezone.utc).isoformat()},
                status_code=200
            )
        else:
            return JSONResponse(
                content={"status": "not_ready", "timestamp": datetime.now(timezone.utc).isoformat()},
                status_code=503
            )
            
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return JSONResponse(
            content={"status": "not_ready", "error": str(e), "timestamp": datetime.now(timezone.utc).isoformat()},
            status_code=503
        )

@router.get("/liveness")
async def liveness_check():
    """Kubernetes liveness probe endpoint"""
    return JSONResponse(
        content={"status": "alive", "timestamp": datetime.now(timezone.utc).isoformat()},
        status_code=200
    )
