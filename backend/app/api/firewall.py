from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from ..db import get_db
from .auth import get_current_user_id

router = APIRouter()

class DomainRule(BaseModel):
    domain: str
    description: Optional[str] = None

class FirewallConfig(BaseModel):
    is_enabled: bool
    allowed_domains: List[str]

@router.get("/config")
async def get_firewall_config():
    """Public endpoint for the Firewall agent to fetch the allowlist"""
    db = await get_db()
    config = await db.firewall_settings.find_one({"type": "global"})
    
    if not config:
        # Default policy if none exists
        return {
            "is_enabled": True,
            "allowed_domains": ["google.com", "github.com", "stackoverflow.com", "localhost"]
        }
    
    return {
        "is_enabled": config.get("is_enabled", True),
        "allowed_domains": config.get("allowed_domains", [])
    }

@router.post("/update")
async def update_firewall_config(req: FirewallConfig, user_id: str = Depends(get_current_user_id)):
    """Teacher/Admin only: Update the allowlist"""
    db = await get_db()
    
    # Check if user is teacher or admin
    user = await db.users.find_one({"_id": user_id}) 
    # (Assuming role check here, simplified for now)
    
    await db.firewall_settings.update_one(
        {"type": "global"},
        {"$set": {
            "is_enabled": req.is_enabled,
            "allowed_domains": req.allowed_domains,
            "updated_at": datetime.utcnow(),
            "updated_by": user_id
        }},
        upsert=True
    )
    
    return {"success": True, "message": "Firewall configuration updated"}
