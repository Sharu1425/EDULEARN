from datetime import timezone
"""
Structured Logging and Audit Trail Service
Comprehensive logging system with audit trail for production monitoring
"""
import logging
import json
import traceback
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import uuid

class LogLevel(str, Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

class AuditAction(str, Enum):
    # User actions
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    USER_REGISTER = "user_register"
    USER_UPDATE = "user_update"
    USER_DELETE = "user_delete"
    
    # Assessment actions
    ASSESSMENT_CREATE = "assessment_create"
    ASSESSMENT_UPDATE = "assessment_update"
    ASSESSMENT_DELETE = "assessment_delete"
    ASSESSMENT_PUBLISH = "assessment_publish"
    ASSESSMENT_ASSIGN = "assessment_assign"
    
    # Batch actions
    BATCH_CREATE = "batch_create"
    BATCH_UPDATE = "batch_update"
    BATCH_DELETE = "batch_delete"
    BATCH_ADD_STUDENT = "batch_add_student"
    BATCH_REMOVE_STUDENT = "batch_remove_student"
    
    # Student actions
    STUDENT_SUBMIT_ASSESSMENT = "student_submit_assessment"
    STUDENT_VIEW_ASSESSMENT = "student_view_assessment"
    
    # Admin actions
    ADMIN_USER_MANAGEMENT = "admin_user_management"
    ADMIN_SYSTEM_CONFIG = "admin_system_config"
    
    # System actions
    SYSTEM_ERROR = "system_error"
    SYSTEM_STARTUP = "system_startup"
    SYSTEM_SHUTDOWN = "system_shutdown"

class StructuredLogger:
    """Structured logging service with audit trail"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.audit_collection = db.audit_logs
        self.application_logs_collection = db.application_logs
        
        # Configure Python logging
        self._setup_logging()
    
    def _setup_logging(self):
        """Setup Python logging configuration"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.StreamHandler(),
                logging.FileHandler('app.log')
            ]
        )
        
        # Create custom logger
        self.logger = logging.getLogger('edulearn')
    
    async def log_audit_event(
        self,
        action: AuditAction,
        user_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ):
        """Log an audit event"""
        try:
            audit_event = {
                "id": str(uuid.uuid4()),
                "action": action.value,
                "user_id": user_id,
                "resource_id": resource_id,
                "resource_type": resource_type,
                "details": details or {},
                "ip_address": ip_address,
                "user_agent": user_agent,
                "success": success,
                "error_message": error_message,
                "timestamp": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc)
            }
            
            await self.audit_collection.insert_one(audit_event)
            
            # Also log to application logs
            await self._log_to_application_logs(
                LogLevel.INFO,
                f"Audit event: {action.value}",
                audit_event
            )
            
        except Exception as e:
            self.logger.error(f"Failed to log audit event: {e}")
    
    async def log_application_event(
        self,
        level: LogLevel,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None,
        exception: Optional[Exception] = None
    ):
        """Log an application event"""
        try:
            log_entry = {
                "id": str(uuid.uuid4()),
                "level": level.value,
                "message": message,
                "context": context or {},
                "user_id": user_id,
                "request_id": request_id,
                "timestamp": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc)
            }
            
            if exception:
                log_entry["exception"] = {
                    "type": type(exception).__name__,
                    "message": str(exception),
                    "traceback": traceback.format_exc()
                }
            
            await self.application_logs_collection.insert_one(log_entry)
            
            # Also log to Python logger
            log_method = getattr(self.logger, level.value.lower())
            log_method(f"{message} | Context: {json.dumps(context or {})}")
            
        except Exception as e:
            self.logger.error(f"Failed to log application event: {e}")
    
    async def log_api_request(
        self,
        method: str,
        path: str,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None,
        status_code: int = 200,
        response_time_ms: float = 0,
        request_size: int = 0,
        response_size: int = 0,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Log API request details"""
        try:
            api_log = {
                "id": str(uuid.uuid4()),
                "method": method,
                "path": path,
                "user_id": user_id,
                "request_id": request_id,
                "status_code": status_code,
                "response_time_ms": response_time_ms,
                "request_size": request_size,
                "response_size": response_size,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "timestamp": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc)
            }
            
            await self.application_logs_collection.insert_one(api_log)
            
        except Exception as e:
            self.logger.error(f"Failed to log API request: {e}")
    
    async def log_security_event(
        self,
        event_type: str,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        severity: str = "medium"
    ):
        """Log security-related events"""
        try:
            security_event = {
                "id": str(uuid.uuid4()),
                "event_type": event_type,
                "user_id": user_id,
                "ip_address": ip_address,
                "details": details or {},
                "severity": severity,
                "timestamp": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc)
            }
            
            await self.application_logs_collection.insert_one(security_event)
            
            # Log to audit trail as well
            await self.log_audit_event(
                AuditAction.SYSTEM_ERROR,
                user_id=user_id,
                details={"security_event": security_event},
                success=False,
                error_message=f"Security event: {event_type}"
            )
            
        except Exception as e:
            self.logger.error(f"Failed to log security event: {e}")
    
    async def log_performance_metric(
        self,
        metric_name: str,
        value: float,
        unit: str = "ms",
        context: Optional[Dict[str, Any]] = None
    ):
        """Log performance metrics"""
        try:
            performance_log = {
                "id": str(uuid.uuid4()),
                "metric_name": metric_name,
                "value": value,
                "unit": unit,
                "context": context or {},
                "timestamp": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc)
            }
            
            await self.application_logs_collection.insert_one(performance_log)
            
        except Exception as e:
            self.logger.error(f"Failed to log performance metric: {e}")
    
    async def _log_to_application_logs(
        self,
        level: LogLevel,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ):
        """Internal method to log to application logs"""
        try:
            log_entry = {
                "id": str(uuid.uuid4()),
                "level": level.value,
                "message": message,
                "context": context or {},
                "timestamp": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc)
            }
            
            await self.application_logs_collection.insert_one(log_entry)
            
        except Exception as e:
            self.logger.error(f"Failed to log to application logs: {e}")
    
    async def get_audit_trail(
        self,
        user_id: Optional[str] = None,
        action: Optional[AuditAction] = None,
        resource_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100,
        skip: int = 0
    ) -> List[Dict[str, Any]]:
        """Get audit trail with filtering"""
        try:
            query = {}
            
            if user_id:
                query["user_id"] = user_id
            if action:
                query["action"] = action.value
            if resource_type:
                query["resource_type"] = resource_type
            if start_date or end_date:
                query["timestamp"] = {}
                if start_date:
                    query["timestamp"]["$gte"] = start_date
                if end_date:
                    query["timestamp"]["$lte"] = end_date
            
            cursor = self.audit_collection.find(query)\
                .sort("timestamp", -1)\
                .skip(skip)\
                .limit(limit)
            
            return await cursor.to_list(length=None)
            
        except Exception as e:
            self.logger.error(f"Failed to get audit trail: {e}")
            return []
    
    async def get_application_logs(
        self,
        level: Optional[LogLevel] = None,
        user_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100,
        skip: int = 0
    ) -> List[Dict[str, Any]]:
        """Get application logs with filtering"""
        try:
            query = {}
            
            if level:
                query["level"] = level.value
            if user_id:
                query["user_id"] = user_id
            if start_date or end_date:
                query["timestamp"] = {}
                if start_date:
                    query["timestamp"]["$gte"] = start_date
                if end_date:
                    query["timestamp"]["$lte"] = end_date
            
            cursor = self.application_logs_collection.find(query)\
                .sort("timestamp", -1)\
                .skip(skip)\
                .limit(limit)
            
            return await cursor.to_list(length=None)
            
        except Exception as e:
            self.logger.error(f"Failed to get application logs: {e}")
            return []
    
    async def cleanup_old_logs(self, days: int = 90):
        """Clean up old logs"""
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
            
            # Clean up audit logs
            audit_result = await self.audit_collection.delete_many({
                "timestamp": {"$lt": cutoff_date}
            })
            
            # Clean up application logs
            app_result = await self.application_logs_collection.delete_many({
                "timestamp": {"$lt": cutoff_date}
            })
            
            total_deleted = audit_result.deleted_count + app_result.deleted_count
            
            await self.log_application_event(
                LogLevel.INFO,
                f"Cleaned up {total_deleted} old log entries",
                {"audit_logs": audit_result.deleted_count, "app_logs": app_result.deleted_count}
            )
            
            return total_deleted
            
        except Exception as e:
            self.logger.error(f"Failed to cleanup old logs: {e}")
            return 0
    
    async def get_log_statistics(self) -> Dict[str, Any]:
        """Get logging statistics"""
        try:
            # Get audit log stats
            audit_stats = await self.audit_collection.aggregate([
                {
                    "$group": {
                        "_id": "$action",
                        "count": {"$sum": 1}
                    }
                }
            ]).to_list(length=None)
            
            # Get application log stats
            app_stats = await self.application_logs_collection.aggregate([
                {
                    "$group": {
                        "_id": "$level",
                        "count": {"$sum": 1}
                    }
                }
            ]).to_list(length=None)
            
            # Get total counts
            total_audit_logs = await self.audit_collection.count_documents({})
            total_app_logs = await self.application_logs_collection.count_documents({})
            
            return {
                "audit_logs": {
                    "total": total_audit_logs,
                    "by_action": {stat["_id"]: stat["count"] for stat in audit_stats}
                },
                "application_logs": {
                    "total": total_app_logs,
                    "by_level": {stat["_id"]: stat["count"] for stat in app_stats}
                },
                "total_logs": total_audit_logs + total_app_logs
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get log statistics: {e}")
            return {"error": str(e)}

# Global logger instance
structured_logger = None

def get_structured_logger() -> Optional[StructuredLogger]:
    """Get the global structured logger instance"""
    return structured_logger

def initialize_logging(db: AsyncIOMotorDatabase):
    """Initialize the structured logging system"""
    global structured_logger
    structured_logger = StructuredLogger(db)
    return structured_logger
