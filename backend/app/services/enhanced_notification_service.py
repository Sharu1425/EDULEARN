from datetime import timezone
"""
Enhanced Notification Service
Handles notifications with duplicate detection, batching, and spam prevention
"""
import asyncio
import logging
from typing import List, Dict, Any, Optional, Set
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import hashlib

logger = logging.getLogger(__name__)

class EnhancedNotificationService:
    """Enhanced notification service with spam prevention and batching"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.notifications_collection = db.notifications
        self.duplicate_cache = {}  # In production, use Redis
        self.batch_queue = {}  # In production, use Redis
        self.rate_limits = {}  # In production, use Redis
    
    async def create_notification(
        self,
        user_id: str,
        title: str,
        message: str,
        notification_type: str = "info",
        priority: str = "normal",
        assessment_id: Optional[str] = None,
        batch_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """Create a notification with duplicate detection and rate limiting"""
        try:
            # Check for duplicates
            if await self._is_duplicate_notification(user_id, title, message, assessment_id):
                logger.info(f"Skipping duplicate notification for user {user_id}")
                return None
            
            # Check rate limits
            if await self._is_rate_limited(user_id, notification_type):
                logger.warning(f"Rate limit exceeded for user {user_id}")
                return None
            
            # Create notification document
            notification_doc = {
                "user_id": user_id,
                "title": title,
                "message": message,
                "type": notification_type,
                "priority": priority,
                "is_read": False,
                "created_at": datetime.now(timezone.utc),
                "read_at": None,
                "assessment_id": assessment_id,
                "batch_id": batch_id,
                "metadata": metadata or {},
                "duplicate_hash": self._generate_duplicate_hash(user_id, title, message, assessment_id)
            }
            
            # Insert notification
            result = await self.notifications_collection.insert_one(notification_doc)
            notification_id = str(result.inserted_id)
            
            # Update rate limit counter
            await self._update_rate_limit(user_id, notification_type)
            
            # Add to duplicate cache
            await self._add_to_duplicate_cache(user_id, notification_doc["duplicate_hash"])
            
            logger.info(f"Created notification {notification_id} for user {user_id}")
            return notification_id
            
        except Exception as e:
            logger.error(f"Failed to create notification: {e}")
            return None
    
    async def create_batch_notifications(
        self,
        user_ids: List[str],
        title: str,
        message: str,
        notification_type: str = "info",
        priority: str = "normal",
        assessment_id: Optional[str] = None,
        batch_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        batch_size: int = 100
    ) -> Dict[str, Any]:
        """Create notifications for multiple users with batching"""
        try:
            total_users = len(user_ids)
            successful_notifications = 0
            skipped_notifications = 0
            failed_notifications = 0
            
            logger.info(f"Creating batch notifications for {total_users} users")
            
            # Process users in batches
            for i in range(0, total_users, batch_size):
                batch_user_ids = user_ids[i:i + batch_size]
                
                # Process batch
                batch_results = await self._process_notification_batch(
                    batch_user_ids,
                    title,
                    message,
                    notification_type,
                    priority,
                    assessment_id,
                    batch_id,
                    metadata
                )
                
                successful_notifications += batch_results["successful"]
                skipped_notifications += batch_results["skipped"]
                failed_notifications += batch_results["failed"]
                
                # Small delay between batches to prevent overwhelming the system
                if i + batch_size < total_users:
                    await asyncio.sleep(0.1)
            
            logger.info(f"Batch notification completed: {successful_notifications} successful, {skipped_notifications} skipped, {failed_notifications} failed")
            
            return {
                "success": True,
                "total_users": total_users,
                "successful_notifications": successful_notifications,
                "skipped_notifications": skipped_notifications,
                "failed_notifications": failed_notifications
            }
            
        except Exception as e:
            logger.error(f"Failed to create batch notifications: {e}")
            return {
                "success": False,
                "error": str(e),
                "total_users": len(user_ids),
                "successful_notifications": 0,
                "skipped_notifications": 0,
                "failed_notifications": len(user_ids)
            }
    
    async def _process_notification_batch(
        self,
        user_ids: List[str],
        title: str,
        message: str,
        notification_type: str,
        priority: str,
        assessment_id: Optional[str],
        batch_id: Optional[str],
        metadata: Optional[Dict[str, Any]]
    ) -> Dict[str, int]:
        """Process a batch of notifications"""
        successful = 0
        skipped = 0
        failed = 0
        
        # Prepare notification documents
        notifications_to_insert = []
        
        for user_id in user_ids:
            try:
                # Check for duplicates
                if await self._is_duplicate_notification(user_id, title, message, assessment_id):
                    skipped += 1
                    continue
                
                # Check rate limits
                if await self._is_rate_limited(user_id, notification_type):
                    skipped += 1
                    continue
                
                # Create notification document
                notification_doc = {
                    "user_id": user_id,
                    "title": title,
                    "message": message,
                    "type": notification_type,
                    "priority": priority,
                    "is_read": False,
                    "created_at": datetime.now(timezone.utc),
                    "read_at": None,
                    "assessment_id": assessment_id,
                    "batch_id": batch_id,
                    "metadata": metadata or {},
                    "duplicate_hash": self._generate_duplicate_hash(user_id, title, message, assessment_id)
                }
                
                notifications_to_insert.append(notification_doc)
                
            except Exception as e:
                logger.error(f"Failed to prepare notification for user {user_id}: {e}")
                failed += 1
        
        # Bulk insert notifications
        if notifications_to_insert:
            try:
                await self.notifications_collection.insert_many(notifications_to_insert)
                successful = len(notifications_to_insert)
                
                # Update rate limits and duplicate cache
                for notification in notifications_to_insert:
                    await self._update_rate_limit(notification["user_id"], notification_type)
                    await self._add_to_duplicate_cache(notification["user_id"], notification["duplicate_hash"])
                    
            except Exception as e:
                logger.error(f"Failed to bulk insert notifications: {e}")
                failed += len(notifications_to_insert)
                successful = 0
        
        return {
            "successful": successful,
            "skipped": skipped,
            "failed": failed
        }
    
    async def _is_duplicate_notification(
        self,
        user_id: str,
        title: str,
        message: str,
        assessment_id: Optional[str]
    ) -> bool:
        """Check if a notification is a duplicate"""
        try:
            # Generate hash for duplicate detection
            duplicate_hash = self._generate_duplicate_hash(user_id, title, message, assessment_id)
            
            # Check in-memory cache first
            cache_key = f"{user_id}:{duplicate_hash}"
            if cache_key in self.duplicate_cache:
                return True
            
            # Check database for recent duplicates (last 24 hours)
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=24)
            
            existing_notification = await self.notifications_collection.find_one({
                "user_id": user_id,
                "duplicate_hash": duplicate_hash,
                "created_at": {"$gte": cutoff_time}
            })
            
            return existing_notification is not None
            
        except Exception as e:
            logger.error(f"Failed to check duplicate notification: {e}")
            return False
    
    async def _is_rate_limited(self, user_id: str, notification_type: str) -> bool:
        """Check if user is rate limited for this notification type"""
        try:
            # Different rate limits for different notification types
            rate_limits = {
                "info": {"max_per_hour": 10, "max_per_day": 50},
                "success": {"max_per_hour": 5, "max_per_day": 20},
                "warning": {"max_per_hour": 3, "max_per_day": 10},
                "error": {"max_per_hour": 5, "max_per_day": 15}
            }
            
            limits = rate_limits.get(notification_type, rate_limits["info"])
            
            # Check hourly limit
            hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
            hourly_count = await self.notifications_collection.count_documents({
                "user_id": user_id,
                "type": notification_type,
                "created_at": {"$gte": hour_ago}
            })
            
            if hourly_count >= limits["max_per_hour"]:
                return True
            
            # Check daily limit
            day_ago = datetime.now(timezone.utc) - timedelta(days=1)
            daily_count = await self.notifications_collection.count_documents({
                "user_id": user_id,
                "type": notification_type,
                "created_at": {"$gte": day_ago}
            })
            
            if daily_count >= limits["max_per_day"]:
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to check rate limit: {e}")
            return False
    
    async def _update_rate_limit(self, user_id: str, notification_type: str):
        """Update rate limit counter"""
        try:
            # In production, use Redis for rate limiting
            # For now, we rely on database queries
            pass
        except Exception as e:
            logger.error(f"Failed to update rate limit: {e}")
    
    async def _add_to_duplicate_cache(self, user_id: str, duplicate_hash: str):
        """Add notification to duplicate cache"""
        try:
            cache_key = f"{user_id}:{duplicate_hash}"
            self.duplicate_cache[cache_key] = datetime.now(timezone.utc)
            
            # Clean up old cache entries (older than 24 hours)
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=24)
            self.duplicate_cache = {
                k: v for k, v in self.duplicate_cache.items()
                if v > cutoff_time
            }
            
        except Exception as e:
            logger.error(f"Failed to add to duplicate cache: {e}")
    
    def _generate_duplicate_hash(
        self,
        user_id: str,
        title: str,
        message: str,
        assessment_id: Optional[str]
    ) -> str:
        """Generate hash for duplicate detection"""
        content = f"{user_id}:{title}:{message}:{assessment_id or ''}"
        return hashlib.md5(content.encode()).hexdigest()
    
    async def get_user_notifications(
        self,
        user_id: str,
        limit: int = 50,
        skip: int = 0,
        unread_only: bool = False
    ) -> List[Dict[str, Any]]:
        """Get notifications for a user with pagination"""
        try:
            query = {"user_id": user_id}
            if unread_only:
                query["is_read"] = False
            
            notifications = await self.notifications_collection.find(query)\
                .sort("created_at", -1)\
                .skip(skip)\
                .limit(limit)\
                .to_list(length=None)
            
            return notifications
            
        except Exception as e:
            logger.error(f"Failed to get user notifications: {e}")
            return []
    
    async def mark_notification_read(self, notification_id: str, user_id: str) -> bool:
        """Mark a notification as read"""
        try:
            result = await self.notifications_collection.update_one(
                {"_id": ObjectId(notification_id), "user_id": user_id},
                {
                    "$set": {
                        "is_read": True,
                        "read_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Failed to mark notification as read: {e}")
            return False
    
    async def mark_all_notifications_read(self, user_id: str) -> int:
        """Mark all notifications as read for a user"""
        try:
            result = await self.notifications_collection.update_many(
                {"user_id": user_id, "is_read": False},
                {
                    "$set": {
                        "is_read": True,
                        "read_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            return result.modified_count
            
        except Exception as e:
            logger.error(f"Failed to mark all notifications as read: {e}")
            return 0
    
    async def delete_notification(self, notification_id: str, user_id: str) -> bool:
        """Delete a notification"""
        try:
            result = await self.notifications_collection.delete_one({
                "_id": ObjectId(notification_id),
                "user_id": user_id
            })
            
            return result.deleted_count > 0
            
        except Exception as e:
            logger.error(f"Failed to delete notification: {e}")
            return False
    
    async def cleanup_old_notifications(self, days: int = 90) -> int:
        """Clean up old notifications"""
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
            
            result = await self.notifications_collection.delete_many({
                "is_read": True,
                "read_at": {"$lt": cutoff_date}
            })
            
            logger.info(f"Cleaned up {result.deleted_count} old notifications")
            return result.deleted_count
            
        except Exception as e:
            logger.error(f"Failed to cleanup old notifications: {e}")
            return 0
    
    async def get_notification_stats(self, user_id: str) -> Dict[str, Any]:
        """Get notification statistics for a user"""
        try:
            total_notifications = await self.notifications_collection.count_documents({
                "user_id": user_id
            })
            
            unread_notifications = await self.notifications_collection.count_documents({
                "user_id": user_id,
                "is_read": False
            })
            
            # Get notifications by type
            type_counts = {}
            for notification_type in ["info", "success", "warning", "error"]:
                count = await self.notifications_collection.count_documents({
                    "user_id": user_id,
                    "type": notification_type
                })
                type_counts[notification_type] = count
            
            return {
                "total_notifications": total_notifications,
                "unread_notifications": unread_notifications,
                "read_notifications": total_notifications - unread_notifications,
                "type_counts": type_counts
            }
            
        except Exception as e:
            logger.error(f"Failed to get notification stats: {e}")
            return {
                "total_notifications": 0,
                "unread_notifications": 0,
                "read_notifications": 0,
                "type_counts": {}
            }
