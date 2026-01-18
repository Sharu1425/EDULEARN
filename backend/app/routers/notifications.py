from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime
from bson import ObjectId

from ..db import get_db
from ..models.models import UserModel
from ..dependencies import get_current_user

router = APIRouter()

@router.get("/")
async def get_notifications(
    current_user: UserModel = Depends(get_current_user)
):
    """Get all notifications for the current user"""
    db = await get_db()
    
    notifications = await db.notifications.find(
        {"user_id": current_user.id}
    ).sort("created_at", -1).limit(50).to_list(length=50)
    
    # Calculate unread count
    unread_count = await db.notifications.count_documents({
        "user_id": current_user.id,
        "is_read": False
    })
    
    # helper to convert ObjectId to str
    result = []
    for note in notifications:
        note["id"] = str(note["_id"])
        del note["_id"]
        # Convert user_id if needed, or leave it
        result.append(note)
        
    return {
        "notifications": result,
        "unread_count": unread_count
    }

@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: UserModel = Depends(get_current_user)
):
    """Mark a notification as read"""
    db = await get_db()
    
    if not ObjectId.is_valid(notification_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    result = await db.notifications.update_one(
        {"_id": ObjectId(notification_id), "user_id": current_user.id},
        {"$set": {"is_read": True}}
    )
    
    return {"success": True}

@router.post("/mark-all-read")
async def mark_all_read(
    current_user: UserModel = Depends(get_current_user)
):
    """Mark all notifications as read"""
    db = await get_db()
    
    await db.notifications.update_many(
        {"user_id": current_user.id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    return {"success": True}
    
@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: UserModel = Depends(get_current_user)
):
    """Delete a notification"""
    db = await get_db()
    
    if not ObjectId.is_valid(notification_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    await db.notifications.delete_one(
        {"_id": ObjectId(notification_id), "user_id": current_user.id}
    )
    
    return {"success": True}
