"""
Application configuration settings
"""
import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings"""

    # Pydantic v2 settings config — reads from .env automatically
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Application
    app_name: str = "eduLearn API"
    app_description: str = "AI-powered Adaptive Learning Platform API"
    app_version: str = "1.0.0"
    debug: bool = False

    # Database — loaded from .env: MONGO_URI, DB_NAME
    mongo_uri: str = "mongodb://127.0.0.1:27017/edulearn"
    db_name: str = "edulearn"

    # Security — loaded from .env: SECRET_KEY
    secret_key: str = "change-me-not-set-in-env"
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
            "https://edulearn-omega.vercel.app",
            "https://accounts.google.com",
            "https://oauth2.googleapis.com",
        ]

        # Add FRONTEND_URL from .env if set
        frontend_url = os.getenv("FRONTEND_URL")
        if frontend_url:
            frontend_url = frontend_url.rstrip("/")
            if frontend_url not in origins:
                origins.append(frontend_url)

        return origins

    # AI Services — loaded from .env: GEMINI_API_KEY, GEMINI_MODEL
    gemini_api_key: str = "not-set"
    gemini_model: str = "gemini-3.1-flash-lite-preview"

    # Google OAuth — loaded from .env
    google_client_id: str = "not-set"
    google_client_secret: str = "not-set"

    code_execution_timeout: int = 5
    code_memory_limit: int = 256

    # HackerEarth — loaded from .env
    hackerearth_client_secret: str = ""

    # Session — loaded from .env: SESSION_SECRET
    session_secret: str = "change-me-not-set-in-env"


settings = Settings()