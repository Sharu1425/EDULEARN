"""
Validation Middleware
FastAPI middleware for request validation and error handling
"""
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Dict, Any, List
import json
import logging
import time
from ..services.validation_service import ValidationService, ValidationError

logger = logging.getLogger(__name__)

class ValidationMiddleware(BaseHTTPMiddleware):
    """Middleware for validating requests and handling validation errors"""
    
    def __init__(self, app, validation_service: ValidationService = None):
        super().__init__(app)
        self.validation_service = validation_service or ValidationService()
    
    async def dispatch(self, request: Request, call_next):
        """Process the request and validate it"""
        try:
            # Validate request based on endpoint
            await self._validate_request(request)
            
            # Process the request
            response = await call_next(request)
            return response
            
        except ValidationError as e:
            logger.warning(f"Validation error: {e.message}")
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Validation Error",
                    "message": e.message,
                    "field": e.field
                }
            )
        except Exception as e:
            logger.error(f"Unexpected error in validation middleware: {e}")
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "error": "Internal Server Error",
                    "message": "An unexpected error occurred"
                }
            )
    
    async def _validate_request(self, request: Request):
        """Validate the request based on the endpoint"""
        path = request.url.path
        method = request.method
        
        # Skip validation for certain endpoints
        if self._should_skip_validation(path):
            return
        
        # Validate based on endpoint patterns
        if path.startswith("/api/assessments") and method == "POST":
            await self._validate_assessment_creation(request)
        elif path.startswith("/api/teacher/batches") and method == "POST":
            await self._validate_batch_creation(request)
        elif path.startswith("/api/teacher/students") and method == "POST":
            await self._validate_student_creation(request)
        elif path.startswith("/api/teacher/students/bulk") and method == "POST":
            await self._validate_bulk_student_creation(request)
        elif "search" in path:
            await self._validate_search_request(request)
    
    def _should_skip_validation(self, path: str) -> bool:
        """Check if validation should be skipped for this path"""
        skip_paths = [
            "/docs",
            "/redoc",
            "/openapi.json",
            "/health",
            "/metrics"
        ]
        return any(path.startswith(skip_path) for skip_path in skip_paths)
    
    async def _validate_assessment_creation(self, request: Request):
        """Validate assessment creation request"""
        try:
            body = await request.json()
        except json.JSONDecodeError:
            raise ValidationError("Invalid JSON in request body")
        
        # Validate title
        title = body.get("title", "")
        title_validation = self.validation_service.validate_assessment_title(title)
        if not title_validation["is_valid"]:
            raise ValidationError("; ".join(title_validation["errors"]), "title")
        
        # Validate description
        description = body.get("description", "")
        desc_validation = self.validation_service.validate_assessment_description(description)
        if not desc_validation["is_valid"]:
            raise ValidationError("; ".join(desc_validation["errors"]), "description")
        
        # Validate time limit
        time_limit = body.get("time_limit", 0)
        time_validation = self.validation_service.validate_time_limit(time_limit)
        if not time_validation["is_valid"]:
            raise ValidationError("; ".join(time_validation["errors"]), "time_limit")
        
        # Validate question count
        question_count = body.get("question_count", 0)
        qcount_validation = self.validation_service.validate_question_count(question_count)
        if not qcount_validation["is_valid"]:
            raise ValidationError("; ".join(qcount_validation["errors"]), "question_count")
        
        # Validate batch assignment
        batch_ids = body.get("batches", [])
        batch_validation = self.validation_service.validate_batch_assignment(batch_ids)
        if not batch_validation["is_valid"]:
            raise ValidationError("; ".join(batch_validation["errors"]), "batches")
    
    async def _validate_batch_creation(self, request: Request):
        """Validate batch creation request"""
        try:
            body = await request.json()
        except json.JSONDecodeError:
            raise ValidationError("Invalid JSON in request body")
        
        # Validate batch name
        name = body.get("name", "")
        name_validation = self.validation_service.validate_batch_name(name)
        if not name_validation["is_valid"]:
            raise ValidationError("; ".join(name_validation["errors"]), "name")
    
    async def _validate_student_creation(self, request: Request):
        """Validate student creation request"""
        try:
            body = await request.json()
        except json.JSONDecodeError:
            raise ValidationError("Invalid JSON in request body")
        
        # Validate student data
        student_data = {
            "name": body.get("student_name", ""),
            "email": body.get("student_email", "")
        }
        student_validation = self.validation_service.validate_student_data(student_data)
        if not student_validation["is_valid"]:
            raise ValidationError("; ".join(student_validation["errors"]))
    
    async def _validate_bulk_student_creation(self, request: Request):
        """Validate bulk student creation request"""
        try:
            body = await request.json()
        except json.JSONDecodeError:
            raise ValidationError("Invalid JSON in request body")
        
        students_data = body.get("students", [])
        bulk_validation = self.validation_service.validate_bulk_upload_data(students_data)
        if not bulk_validation["is_valid"]:
            raise ValidationError("; ".join(bulk_validation["errors"]))
    
    async def _validate_search_request(self, request: Request):
        """Validate search request"""
        query = request.query_params.get("q", "")
        if query:
            search_validation = self.validation_service.validate_search_query(query)
            if not search_validation["is_valid"]:
                raise ValidationError("; ".join(search_validation["errors"]), "q")

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware for rate limiting requests"""
    
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests = {}  # In production, use Redis or similar
    
    async def dispatch(self, request: Request, call_next):
        """Check rate limit and process request"""
        client_ip = request.client.host if request.client else "unknown"
        current_time = int(time.time())
        
        # Clean old entries
        self._clean_old_entries(current_time)
        
        # Check rate limit
        if self._is_rate_limited(client_ip, current_time):
            return JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "error": "Rate Limit Exceeded",
                    "message": f"Maximum {self.requests_per_minute} requests per minute allowed"
                }
            )
        
        # Record request
        self._record_request(client_ip, current_time)
        
        # Process request
        response = await call_next(request)
        return response
    
    def _clean_old_entries(self, current_time: int):
        """Remove entries older than 1 minute"""
        minute_ago = current_time - 60
        self.requests = {
            ip: times for ip, times in self.requests.items()
            if any(t > minute_ago for t in times)
        }
    
    def _is_rate_limited(self, client_ip: str, current_time: int) -> bool:
        """Check if client is rate limited"""
        if client_ip not in self.requests:
            return False
        
        minute_ago = current_time - 60
        recent_requests = [t for t in self.requests[client_ip] if t > minute_ago]
        return len(recent_requests) >= self.requests_per_minute
    
    def _record_request(self, client_ip: str, current_time: int):
        """Record a request from the client"""
        if client_ip not in self.requests:
            self.requests[client_ip] = []
        self.requests[client_ip].append(current_time)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware for adding security headers"""
    
    async def dispatch(self, request: Request, call_next):
        """Add security headers to response"""
        response = await call_next(request)
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        
        return response

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging requests"""
    
    def __init__(self, app):
        super().__init__(app)
        self.logger = logging.getLogger("request_logger")
    
    async def dispatch(self, request: Request, call_next):
        """Log request details"""
        start_time = time.time()
        
        # Log request
        self.logger.info(f"Request: {request.method} {request.url.path}")
        
        # Process request
        response = await call_next(request)
        
        # Log response
        process_time = time.time() - start_time
        self.logger.info(
            f"Response: {response.status_code} - "
            f"{request.method} {request.url.path} - "
            f"{process_time:.3f}s"
        )
        
        return response
