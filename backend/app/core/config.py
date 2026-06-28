"""
Application configuration settings
"""
import os
from typing import List, Any
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator


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
    secret_key: str = ""
    
    @model_validator(mode='after')
    def validate_secrets(self) -> 'Settings':
        if not self.debug and not self.secret_key:
            raise ValueError("SECRET_KEY environment variable is required in production (DEBUG=False).")
        return self
    
    @property
    def effective_secret_key(self) -> str:
        """Return SECRET_KEY if set, otherwise fallback to a dev key (only allowed if debug=True)"""
        if self.secret_key:
            return self.secret_key
        if self.debug:
            return "dev-only-unsafe-secret-key"
        raise ValueError("SECRET_KEY is missing")

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
            "http://localhost:5001",
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
    hackerearth_client_id: str = ""
    hackerearth_client_secret: str = ""


settings = Settings()