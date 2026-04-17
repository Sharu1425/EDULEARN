"""
FastAPI application entry point
Main application configuration and startup
"""
# Load environment variables FIRST before any other imports
from dotenv import load_dotenv
import os

# Load .env file — must be called before importing any modules that use environment variables
load_dotenv(override=True)

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from contextlib import asynccontextmanager
import uvicorn
from datetime import datetime

from .core.config import settings
from .core.security import security_manager
from .db import init_db, get_db
from .api import api_router
from .utils.error_handler import register_exception_handlers
from .middleware import LoggingMiddleware, AuditMiddleware, PerformanceMiddleware
from .middleware.metrics import MetricsMiddleware, generate_latest, CONTENT_TYPE_LATEST

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    try:
        print("[STARTUP] FastAPI Backend starting...")
        # Compact env variable check — shows ✓ if set, ✗ if missing/placeholder
        env_checks = {
            "MONGO_URI":               bool(settings.mongo_uri and "change-me" not in settings.mongo_uri),
            "DB_NAME":                 bool(settings.db_name),
            "SECRET_KEY":             bool(settings.secret_key and "change-me" not in settings.secret_key),
            "GEMINI_API_KEY":         bool(settings.gemini_api_key and settings.gemini_api_key != "not-set"),
            "GOOGLE_CLIENT_ID":       bool(settings.google_client_id and settings.google_client_id != "not-set"),
            "HACKEREARTH_SECRET":     bool(settings.hackerearth_client_secret),
            "FRONTEND_URL":           bool(os.getenv("FRONTEND_URL")),
        }
        for key, ok in env_checks.items():
            print(f"  [ENV] {'✓' if ok else '✗'} {key}")

        await init_db()
        print("[STARTUP] Backend ready")
    except Exception as e:
        print(f"[ERROR] Startup failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise e
    yield
    # Shutdown
    print("[SHUTDOWN] FastAPI Backend stopped")

# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description=settings.app_description,
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Register exception handlers
# register_exception_handlers(app)

# Prometheus metrics middleware (must be added before CORS for full coverage)
app.add_middleware(MetricsMiddleware)

# Add logging and monitoring middleware
# app.add_middleware(LoggingMiddleware)
# app.add_middleware(AuditMiddleware)
# app.add_middleware(PerformanceMiddleware)

# CORS middleware - Use settings from config
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["authorization", "content-type", "accept", "origin", "x-requested-with"],
    expose_headers=["*"]
)

# Request logging middleware — compact single-line log per request
@app.middleware("http")
async def request_logger(request: Request, call_next):
    import time
    start = time.time()
    try:
        response = await call_next(request)
    except Exception as e:
        print(f"[ERROR] {request.method} {request.url.path} → 500 ({e})")
        from fastapi.responses import JSONResponse
        response = JSONResponse(status_code=500, content={"detail": f"Internal server error: {str(e)}"})
    elapsed = round((time.time() - start) * 1000)
    # Skip logging for /metrics and /health to reduce noise
    if request.url.path not in ("/metrics", "/health", "/api/health"):
        print(f"[API] {request.method} {request.url.path} → {response.status_code} ({elapsed}ms)")
    return response

# Global exception handler to ensure CORS headers are always set
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler that ensures CORS headers are set"""
    origin = request.headers.get("origin")
    allowed_origins = settings.cors_origins
    
    # Handle specific exception types properly
    if isinstance(exc, HTTPException):
        # Let FastAPI handle HTTP exceptions properly
        status_code = exc.status_code
        content = {"detail": exc.detail}
    else:
        # Only return 500 for actual server errors
        status_code = 500
        content = {"detail": "Internal server error"}
        print(f" [GLOBAL HANDLER] Unhandled exception: {type(exc).__name__}: {str(exc)}")
        # Only print full traceback in debug mode
        import os
        if os.getenv("DEBUG", "").lower() == "true" or os.getenv("LOG_LEVEL", "").upper() == "DEBUG":
            import traceback
            traceback.print_exc()
    
    response = JSONResponse(
        status_code=status_code,
        content=content
    )
    
    # Set CORS headers even for exceptions
    if origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    elif origin and ("localhost" in origin or "127.0.0.1" in origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, PATCH, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "authorization, content-type, accept, origin, x-requested-with"
    response.headers["Access-Control-Expose-Headers"] = "*"
    
    return response

# Include API router
app.include_router(api_router)

# Backward compatibility routes (for frontend)
from .api.auth import router as auth_router
from .api.bulk_students import router as bulk_students_router
from .api.bulk_teachers import router as bulk_teachers_router

# Include backward compatibility routes (without /api prefix)
app.include_router(auth_router, prefix="/auth", tags=["Authentication (Legacy)"])
app.include_router(bulk_students_router, prefix="/bulk-students", tags=["Bulk Students"])
app.include_router(bulk_teachers_router, prefix="/bulk-teachers", tags=["Bulk Teachers"])

# Include Live Class WebSocket Router
from .routers import live_socket
app.include_router(live_socket.router, tags=["Live Class"])

# Include Schedule Router
from .routers import schedule
app.include_router(schedule.router, prefix="/api/schedule", tags=["Schedule"])

# Include Live Session Management Router
from .routers import live_session
app.include_router(live_session.router, prefix="/api/sessions", tags=["Live Session"])

# Include Notifications Router
from .routers import notifications
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])

# Add /db/questions endpoint for backward compatibility
@app.get("/db/questions")
async def get_questions_from_db(
    topic: str = "Python Programming",
    difficulty: str = "medium", 
    count: int = 10
):
    """Generate AI-powered MCQ questions - always generate unique questions"""
    try:
        from app.services.gemini_coding_service import gemini_coding_service
        
        print(f" [QUESTIONS] Generating {count} unique {difficulty} questions for topic: {topic}")
        
        # Always generate fresh questions using Gemini AI
        questions = await gemini_coding_service.generate_mcq_questions(
            topic=topic,
            difficulty=difficulty,
            count=count
        )
        
        # Transform questions to convert letter answers to actual option text
        transformed_questions = []
        for question in questions:
            # Convert letter answer (A, B, C, D) to actual option text
            answer_letter = question.get("answer", "")
            options = question.get("options", [])
            
            # Convert letter to index (A=0, B=1, C=2, D=3)
            if answer_letter in ["A", "B", "C", "D"]:
                answer_index = ord(answer_letter) - ord("A")
                if answer_index < len(options):
                    question["answer"] = options[answer_index]
                    question["correct_answer"] = answer_index  # Add correct_answer field for frontend
                else:
                    question["answer"] = options[0] if options else ""
                    question["correct_answer"] = 0
            else:
                # If answer is already text, keep it as is
                question["correct_answer"] = -1  # No index available
            
            transformed_questions.append(question)
        
        print(f" [QUESTIONS] Generated {len(transformed_questions)} questions successfully")
        return transformed_questions
        
    except Exception as e:
        print(f" [QUESTIONS] Error generating questions: {str(e)}")
        # Fallback to mock data if AI fails
        mock_questions = []
        for i in range(count):
            correct_index = i % 4
            question = {
                "id": f"q{i+1}",
                "question": f"Sample question {i+1} about {topic}",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "answer": f"Option {chr(65 + correct_index)}",  # Actual option text
                "correct_answer": correct_index,  # Index of correct answer
                "explanation": f"This is the explanation for question {i+1}",
                "difficulty": difficulty,
                "topic": topic
            }
            mock_questions.append(question)
        return mock_questions

# CORS preflight handler
@app.options("/{path:path}")
async def options_handler(path: str, request: Request):
    """Handle CORS preflight requests"""
    origin = request.headers.get("origin")
    allowed_origins = settings.cors_origins
    
    headers = {
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type, accept, origin, x-requested-with",
    }
    
    # Only set origin and credentials if origin is allowed
    if origin in allowed_origins:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    
    return Response(status_code=200, headers=headers)

# Health check endpoints
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "EDULEARN API is running",
        "version": settings.app_version,
        "status": "healthy"
    }

@app.get("/metrics", include_in_schema=False)
async def metrics():
    """Prometheus metrics endpoint — scraped by Prometheus at /metrics"""
    from fastapi.responses import Response as FastAPIResponse
    return FastAPIResponse(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/health")
async def health_check():
    """Health check endpoint for backend status"""
    try:
        # Test database connection
        db = await get_db()
        await db.command("ping")
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    return {
        "status": "healthy",
        "message": "Backend is running",
        "database": db_status,
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.app_version
    }

@app.get("/api/health")
async def api_health():
    """API health check"""
    return {
        "success": True,
        "status": "healthy",
        "message": "API is running",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/test-db")
async def test_database():
    """Test database connection specifically"""
    try:
        db = await get_db()
        await db.command("ping")
        return {
            "success": True,
            "message": "Database connection successful",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Database connection failed: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=5001,
        reload=True
    )
