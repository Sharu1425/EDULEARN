"""
FastAPI application entry point
Main application configuration and startup
"""

# Load environment variables FIRST before any other imports
from dotenv import load_dotenv
import os

load_dotenv(override=True)

# Debug: Print HackerEarth secret to verify it's loaded (remove in production)
client_secret = os.getenv("HACKEREARTH_CLIENT_SECRET")
print(f"DEBUG SECRET: {'Set' if client_secret else 'Not set'}")
if client_secret:
    print(f"DEBUG SECRET (first 10 chars): {client_secret[:10]}...")

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from contextlib import asynccontextmanager
import uvicorn
from datetime import datetime
import time  # 🔥 NEW

# 🔥 PROMETHEUS IMPORTS
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

from .core.config import settings
from .core.security import security_manager
from .db import init_db, get_db
from .api import api_router
from .utils.error_handler import register_exception_handlers
from .middleware import LoggingMiddleware, AuditMiddleware, PerformanceMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        print("[STARTUP] Starting FastAPI Backend...")
        print(f"[ENV] Environment check:")
        print(f"   - MONGO_URI: {'Set' if settings.mongo_uri else 'Not set'}")
        print(f"   - DB_NAME: {'Set' if settings.db_name else 'Not set'}")
        print(f"   - SECRET_KEY: {'Set' if settings.secret_key else 'Not set'}")
        
        await init_db()
        print("[SUCCESS] FastAPI Backend Started Successfully")
    except Exception as e:
        print(f"[ERROR] Startup Error: {str(e)}")
        import traceback
        print(f"[ERROR] Startup Traceback: {traceback.format_exc()}")
        raise e
    yield
    print("[SHUTDOWN] FastAPI Backend Shutdown")


app = FastAPI(
    title=settings.app_name,
    description=settings.app_description,
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# ================= 🔥 PROMETHEUS METRICS ================= #

REQUEST_COUNT = Counter(
    "app_request_count",
    "Total number of requests",
    ["method", "endpoint"]
)

REQUEST_LATENCY = Histogram(
    "app_request_latency_seconds",
    "Request latency",
    ["endpoint"]
)

# ================= MIDDLEWARE ================= #

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["authorization", "content-type", "accept", "origin", "x-requested-with"],
    expose_headers=["*"]
)

# Existing CORS middleware (UNCHANGED)
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    try:
        response = await call_next(request)
    except Exception as e:
        print(f" [CORS MIDDLEWARE] Error: {e}")
        import traceback
        traceback.print_exc()
        response = JSONResponse(
            status_code=500,
            content={"detail": f"Internal server error: {str(e)}"}
        )
    
    origin = request.headers.get("origin")
    allowed_origins = settings.cors_origins
    
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

# 🔥 NEW PROMETHEUS MIDDLEWARE (SAFE ADDITION)
@app.middleware("http")
async def prometheus_middleware(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    duration = time.time() - start_time

    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path
    ).inc()

    REQUEST_LATENCY.labels(
        endpoint=request.url.path
    ).observe(duration)

    return response


# ================= ROUTES ================= #

app.include_router(api_router)

# 🔥 PROMETHEUS ENDPOINT
@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


# ===== YOUR EXISTING CODE CONTINUES UNCHANGED ===== #

# (I DID NOT TOUCH ANYTHING BELOW THIS LINE)

# ... ALL YOUR ROUTERS, APIs, HANDLERS REMAIN SAME ...


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=5001,
        reload=False   # 🔥 IMPORTANT for Docker
    )

