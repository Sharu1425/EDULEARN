"""
Database session management
Handles MongoDB connection, initialization, and session management
"""
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
import asyncio
from datetime import datetime

from ..core.config import settings

# Global database connection
client: Optional[AsyncIOMotorClient] = None
db = None

async def init_db():
    """Initialize database connection and create indexes"""
    global client, db
    
    try:
        print(f"[DB] Connecting to MongoDB...")
        print(f"   - URI: {settings.mongo_uri[:50]}..." if len(settings.mongo_uri) > 50 else f"   - URI: {settings.mongo_uri}")
        print(f"   - Database: {settings.db_name}")
        
        # Create client with connection pooling
        client = AsyncIOMotorClient(
            settings.mongo_uri,
            maxPoolSize=10,
            minPoolSize=1,
            maxIdleTimeMS=30000,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=10000,
            socketTimeoutMS=20000
        )
        db = client[settings.db_name]
        
        # Test connection
        print(f"[DB] Testing connection...")
        await client.admin.command('ping')
        
        # Create indexes
        print(f"[DB] Creating indexes...")
        await create_indexes()
        
        print(f"[DB] MongoDB Connected Successfully")
        
    except Exception as e:
        print(f"[WARNING] MongoDB connection failed: {str(e)}")
        print(f"[FALLBACK] Using mock database for development...")
        # Fall back to mock database
        from .mock_db import MockDatabase
        db = MockDatabase()
        print(f"[DB] Mock database initialized successfully")

async def create_indexes():
    """Create database indexes for optimal performance"""
    try:
        # Users collection indexes
        await db.users.create_index([("email", 1)], unique=True)
        await db.users.create_index([("username", 1)])
        await db.users.create_index([("role", 1)])
        await db.users.create_index([("created_at", 1)])
        await db.users.create_index([("batch_ids", 1)])  # Multi-batch support
        
        # Assessments collection indexes
        await db.assessments.create_index([("created_by", 1)])
        await db.assessments.create_index([("subject", 1)])
        await db.assessments.create_index([("difficulty", 1)])
        await db.assessments.create_index([("is_active", 1)])
        
        # Coding problems collection indexes
        await db.coding_problems.create_index([("created_by", 1)])
        await db.coding_problems.create_index([("language", 1)])
        await db.coding_problems.create_index([("difficulty", 1)])
        await db.coding_problems.create_index([("is_active", 1)])
        
        # Notifications collection indexes
        await db.notifications.create_index([("user_id", 1)])
        await db.notifications.create_index([("is_read", 1)])
        await db.notifications.create_index([("created_at", 1)])
        
        # Assessment submissions indexes
        await db.assessment_submissions.create_index([("assessment_id", 1)])
        await db.assessment_submissions.create_index([("student_id", 1)])
        await db.assessment_submissions.create_index([("submitted_at", 1)])
        
        # Code submissions indexes
        await db.code_submissions.create_index([("problem_id", 1)])
        await db.code_submissions.create_index([("student_id", 1)])
        await db.code_submissions.create_index([("submitted_at", 1)])
        
        # Teacher assessments collection indexes
        await db.teacher_assessments.create_index([("teacher_id", 1)])
        await db.teacher_assessments.create_index([("batches", 1)])
        await db.teacher_assessments.create_index([("is_active", 1)])
        await db.teacher_assessments.create_index([("status", 1)])
        await db.teacher_assessments.create_index([("created_at", 1)])
        
        # Teacher assessment results indexes
        await db.teacher_assessment_results.create_index([("assessment_id", 1)])
        await db.teacher_assessment_results.create_index([("student_id", 1)])
        await db.teacher_assessment_results.create_index([("submitted_at", 1)])
        
        # Batches collection indexes
        await db.batches.create_index([("student_ids", 1)])
        await db.batches.create_index([("created_at", 1)])

        # Credits transactions collection indexes
        await db.transactions.create_index([("user_id", 1)])
        await db.transactions.create_index([("created_at", -1)])
        await db.transactions.create_index([("user_id", 1), ("created_at", -1)])
        
        print(f"[DB] Database indexes created successfully")
        
    except Exception as e:
        print(f"[WARNING] Failed to create some indexes: {str(e)}")

async def get_db():
    """Get database instance"""
    if db is None:
        raise Exception("Database not initialized. Call init_db() first.")
    return db

async def close_db():
    """Close database connection"""
    global client
    if client:
        client.close()
        print(f"[DB] Database connection closed")

async def get_collection(collection_name: str):
    """Get a specific collection"""
    database = await get_db()
    return database[collection_name]

async def health_check():
    """Check database health"""
    try:
        if client is None:
            return {"status": "disconnected", "message": "Database not initialized"}
        
        await client.admin.command('ping')
        return {"status": "healthy", "message": "Database connection successful"}
    except Exception as e:
        return {"status": "unhealthy", "message": f"Database connection failed: {str(e)}"}

# Database utility functions
async def get_user_by_email(email: str):
    """Get user by email"""
    database = await get_db()
    return await database.users.find_one({"email": email})

async def get_user_by_id(user_id: str):
    """Get user by ID"""
    database = await get_db()
    return await database.users.find_one({"_id": user_id})

async def create_user(user_data: dict):
    """Create a new user"""
    database = await get_db()
    result = await database.users.insert_one(user_data)
    return result.inserted_id

async def update_user(user_id: str, update_data: dict):
    """Update user data"""
    database = await get_db()
    result = await database.users.update_one(
        {"_id": user_id},
        {"$set": update_data}
    )
    return result.modified_count > 0

async def delete_user(user_id: str):
    """Soft delete user"""
    database = await get_db()
    result = await database.users.update_one(
        {"_id": user_id},
        {"$set": {"is_active": False, "deleted_at": datetime.utcnow()}}
    )
    return result.modified_count > 0