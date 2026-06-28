from datetime import timezone
"""
Security utilities and JWT token management
"""
import os
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

class SecurityManager:
    """Centralized security management"""
    
    def __init__(self):
        from .config import settings
        self.secret_key = settings.effective_secret_key
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 30
        self.security = HTTPBearer()
    
    def create_access_token(self, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=self.access_token_expire_minutes)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def verify_token(self, credentials: HTTPAuthorizationCredentials) -> Dict[str, Any]:
        """Verify JWT token and return payload"""
        try:
            payload = jwt.decode(credentials.credentials, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    def get_current_user_id(self, credentials: HTTPAuthorizationCredentials = None) -> Optional[str]:
        """Get current user ID from token"""
        if not credentials:
            return None
        
        try:
            payload = self.verify_token(credentials)
            user_id = payload.get("sub")
            return user_id
        except HTTPException:
            return None

# Global security manager instance
security_manager = SecurityManager()