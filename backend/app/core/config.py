"""
Application configuration settings
"""
import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings"""

    # Pydantic v2 settings config
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Application
    app_name: str = "eduLearn API"
    app_description: str = "AI-powered Adaptive Learning Platform API"
    app_version: str = "1.0.0"
    debug: bool = False

    # Database
    mongo_uri: str = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/edulearn")
    db_name: str = os.getenv("DB_NAME", "edulearn")

    # Security
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # CORS
    @property
    def cors_origins(self) -> List[str]:
        origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
            "http://localhost:3000",
            "http://13.60.212.110",
            "https://13.60.212.110",
            "https://modlrn.vercel.app",
            "https://modlrn.onrender.com",
            "https://accounts.google.com",
            "https://oauth2.googleapis.com",
        ]
        
        # Add frontend URL from environment configuration
        frontend_url = os.getenv("FRONTEND_URL")
        if frontend_url and frontend_url not in origins:
            origins.append(frontend_url)
            
        return origins

    # AI Services
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "your-google-ai-api-key")

    # Google OAuth
    google_client_id: str = os.getenv(
        "GOOGLE_CLIENT_ID",
        "390673176588-srmffm0pi2t4u4qs4o7kdelh72vj47fq.apps.googleusercontent.com",
    )

    google_client_secret: str = os.getenv(
        "GOOGLE_CLIENT_SECRET", "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"
    )

    code_execution_timeout: int = 5
    code_memory_limit: int = 256

    hackerearth_client_secret: str = os.getenv("HACKEREARTH_CLIENT_SECRET", "")

    session_secret: str = os.getenv(
        "SESSION_SECRET", "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"
    )

settings = Settings()