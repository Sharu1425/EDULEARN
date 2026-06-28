from datetime import timezone
"""
Query Optimization Service
Handles database query optimization, batching, and pagination
"""
import asyncio
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import math

logger = logging.getLogger(__name__)

class QueryOptimizationService:
    """Service for optimizing database queries and operations"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.query_cache = {}  # In production, use Redis
        self.batch_size = 1000  # Default batch size for bulk operations
    
    async def get_paginated_results(
        self,
        collection_name: str,
        query: Dict[str, Any],
        page: int = 1,
        limit: int = 50,
        sort_field: str = "created_at",
        sort_direction: int = -1,
        projection: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Get paginated results with optimized queries"""
        try:
            collection = self.db[collection_name]
            
            # Validate pagination parameters
            if page < 1:
                page = 1
            if limit < 1 or limit > 1000:
                limit = 50
            
            # Calculate skip value
            skip = (page - 1) * limit
            
            # Get total count (with optimization for large collections)
            total_count = await self._get_optimized_count(collection, query)
            
            # Get results with projection
            cursor = collection.find(query, projection)
            cursor = cursor.sort(sort_field, sort_direction)
            cursor = cursor.skip(skip).limit(limit)
            
            results = await cursor.to_list(length=None)
            
            # Calculate pagination metadata
            total_pages = math.ceil(total_count / limit) if total_count > 0 else 1
            has_next = page < total_pages
            has_prev = page > 1
            
            return {
                "results": results,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total_count": total_count,
                    "total_pages": total_pages,
                    "has_next": has_next,
                    "has_prev": has_prev,
                    "next_page": page + 1 if has_next else None,
                    "prev_page": page - 1 if has_prev else None
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get paginated results: {e}")
            return {
                "results": [],
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total_count": 0,
                    "total_pages": 0,
                    "has_next": False,
                    "has_prev": False,
                    "next_page": None,
                    "prev_page": None
                }
            }
    
    async def _get_optimized_count(self, collection, query: Dict[str, Any]) -> int:
        """Get count with optimization for large collections"""
        try:
            # For simple queries, use count_documents
            if len(query) <= 2 and not any(isinstance(v, dict) for v in query.values()):
                return await collection.count_documents(query)
            
            # For complex queries, use estimated_document_count if query is empty
            if not query:
                return await collection.estimated_document_count()
            
            # For complex queries, use count_documents with limit
            return await collection.count_documents(query)
            
        except Exception as e:
            logger.error(f"Failed to get optimized count: {e}")
            return 0
    
    async def batch_insert(
        self,
        collection_name: str,
        documents: List[Dict[str, Any]],
        batch_size: Optional[int] = None
    ) -> Dict[str, Any]:
        """Insert documents in batches for better performance"""
        try:
            if not documents:
                return {"success": True, "inserted_count": 0}
            
            collection = self.db[collection_name]
            batch_size = batch_size or self.batch_size
            
            total_inserted = 0
            total_failed = 0
            
            # Process documents in batches
            for i in range(0, len(documents), batch_size):
                batch_docs = documents[i:i + batch_size]
                
                try:
                    result = await collection.insert_many(batch_docs, ordered=False)
                    total_inserted += len(result.inserted_ids)
                    
                except Exception as e:
                    logger.error(f"Failed to insert batch {i//batch_size + 1}: {e}")
                    total_failed += len(batch_docs)
            
            logger.info(f"Batch insert completed: {total_inserted} inserted, {total_failed} failed")
            
            return {
                "success": True,
                "inserted_count": total_inserted,
                "failed_count": total_failed,
                "total_documents": len(documents)
            }
            
        except Exception as e:
            logger.error(f"Failed to batch insert: {e}")
            return {
                "success": False,
                "error": str(e),
                "inserted_count": 0,
                "failed_count": len(documents),
                "total_documents": len(documents)
            }
    
    async def batch_update(
        self,
        collection_name: str,
        updates: List[Tuple[Dict[str, Any], Dict[str, Any]]],
        batch_size: Optional[int] = None
    ) -> Dict[str, Any]:
        """Update documents in batches for better performance"""
        try:
            if not updates:
                return {"success": True, "updated_count": 0}
            
            collection = self.db[collection_name]
            batch_size = batch_size or self.batch_size
            
            total_updated = 0
            total_failed = 0
            
            # Process updates in batches
            for i in range(0, len(updates), batch_size):
                batch_updates = updates[i:i + batch_size]
                
                try:
                    # Use bulk_write for better performance
                    operations = []
                    for query, update in batch_updates:
                        operations.append({
                            "updateOne": {
                                "filter": query,
                                "update": update,
                                "upsert": False
                            }
                        })
                    
                    result = await collection.bulk_write(operations, ordered=False)
                    total_updated += result.modified_count
                    
                except Exception as e:
                    logger.error(f"Failed to update batch {i//batch_size + 1}: {e}")
                    total_failed += len(batch_updates)
            
            logger.info(f"Batch update completed: {total_updated} updated, {total_failed} failed")
            
            return {
                "success": True,
                "updated_count": total_updated,
                "failed_count": total_failed,
                "total_updates": len(updates)
            }
            
        except Exception as e:
            logger.error(f"Failed to batch update: {e}")
            return {
                "success": False,
                "error": str(e),
                "updated_count": 0,
                "failed_count": len(updates),
                "total_updates": len(updates)
            }
    
    async def batch_delete(
        self,
        collection_name: str,
        queries: List[Dict[str, Any]],
        batch_size: Optional[int] = None
    ) -> Dict[str, Any]:
        """Delete documents in batches for better performance"""
        try:
            if not queries:
                return {"success": True, "deleted_count": 0}
            
            collection = self.db[collection_name]
            batch_size = batch_size or self.batch_size
            
            total_deleted = 0
            total_failed = 0
            
            # Process deletions in batches
            for i in range(0, len(queries), batch_size):
                batch_queries = queries[i:i + batch_size]
                
                try:
                    # Use bulk_write for better performance
                    operations = []
                    for query in batch_queries:
                        operations.append({
                            "deleteOne": {
                                "filter": query
                            }
                        })
                    
                    result = await collection.bulk_write(operations, ordered=False)
                    total_deleted += result.deleted_count
                    
                except Exception as e:
                    logger.error(f"Failed to delete batch {i//batch_size + 1}: {e}")
                    total_failed += len(batch_queries)
            
            logger.info(f"Batch delete completed: {total_deleted} deleted, {total_failed} failed")
            
            return {
                "success": True,
                "deleted_count": total_deleted,
                "failed_count": total_failed,
                "total_queries": len(queries)
            }
            
        except Exception as e:
            logger.error(f"Failed to batch delete: {e}")
            return {
                "success": False,
                "error": str(e),
                "deleted_count": 0,
                "failed_count": len(queries),
                "total_queries": len(queries)
            }
    
    async def get_aggregated_results(
        self,
        collection_name: str,
        pipeline: List[Dict[str, Any]],
        allow_disk_use: bool = True
    ) -> List[Dict[str, Any]]:
        """Execute aggregation pipeline with optimization"""
        try:
            collection = self.db[collection_name]
            
            # Execute aggregation with optimization
            cursor = collection.aggregate(pipeline, allowDiskUse=allow_disk_use)
            results = await cursor.to_list(length=None)
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to execute aggregation: {e}")
            return []
    
    async def get_cached_query(
        self,
        cache_key: str,
        query_func,
        ttl_seconds: int = 300
    ) -> Any:
        """Get cached query result or execute and cache"""
        try:
            # Check cache first
            if cache_key in self.query_cache:
                cached_data, timestamp = self.query_cache[cache_key]
                if datetime.now(timezone.utc) - timestamp < timedelta(seconds=ttl_seconds):
                    return cached_data
            
            # Execute query
            result = await query_func()
            
            # Cache result
            self.query_cache[cache_key] = (result, datetime.now(timezone.utc))
            
            # Clean up old cache entries
            await self._cleanup_cache()
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to get cached query: {e}")
            return None
    
    async def _cleanup_cache(self):
        """Clean up old cache entries"""
        try:
            current_time = datetime.now(timezone.utc)
            cutoff_time = current_time - timedelta(hours=1)
            
            # Remove old cache entries
            keys_to_remove = []
            for key, (_, timestamp) in self.query_cache.items():
                if timestamp < cutoff_time:
                    keys_to_remove.append(key)
            
            for key in keys_to_remove:
                del self.query_cache[key]
                
        except Exception as e:
            logger.error(f"Failed to cleanup cache: {e}")
    
    async def optimize_collection_queries(self, collection_name: str) -> Dict[str, Any]:
        """Analyze and optimize queries for a collection"""
        try:
            collection = self.db[collection_name]
            
            # Get collection stats
            stats = await self.db.command("collStats", collection_name)
            
            # Analyze indexes
            indexes = await collection.list_indexes().to_list(length=None)
            
            # Get query patterns (simplified analysis)
            query_analysis = {
                "collection_name": collection_name,
                "document_count": stats.get("count", 0),
                "average_document_size": stats.get("avgObjSize", 0),
                "total_size": stats.get("size", 0),
                "index_count": len(indexes),
                "indexes": [idx.get("name", "unknown") for idx in indexes],
                "recommendations": []
            }
            
            # Generate recommendations
            if query_analysis["document_count"] > 10000:
                query_analysis["recommendations"].append("Consider adding compound indexes for common query patterns")
            
            if query_analysis["index_count"] > 10:
                query_analysis["recommendations"].append("Review indexes - too many indexes can slow down writes")
            
            if query_analysis["average_document_size"] > 1024:
                query_analysis["recommendations"].append("Consider document size optimization")
            
            return query_analysis
            
        except Exception as e:
            logger.error(f"Failed to optimize collection queries: {e}")
            return {
                "collection_name": collection_name,
                "error": str(e),
                "recommendations": ["Failed to analyze collection"]
            }
    
    async def get_query_performance_stats(self) -> Dict[str, Any]:
        """Get overall query performance statistics"""
        try:
            # Get database stats
            db_stats = await self.db.command("dbStats")
            
            # Get collection stats
            collections = await self.db.list_collection_names()
            collection_stats = {}
            
            for collection_name in collections:
                try:
                    stats = await self.db.command("collStats", collection_name)
                    collection_stats[collection_name] = {
                        "count": stats.get("count", 0),
                        "size": stats.get("size", 0),
                        "avg_obj_size": stats.get("avgObjSize", 0),
                        "indexes": stats.get("nindexes", 0)
                    }
                except Exception as e:
                    logger.warning(f"Failed to get stats for {collection_name}: {e}")
                    collection_stats[collection_name] = {"error": str(e)}
            
            return {
                "database_stats": {
                    "collections": len(collections),
                    "data_size": db_stats.get("dataSize", 0),
                    "storage_size": db_stats.get("storageSize", 0),
                    "index_size": db_stats.get("indexSize", 0)
                },
                "collection_stats": collection_stats,
                "cache_stats": {
                    "cached_queries": len(self.query_cache),
                    "cache_memory_usage": len(str(self.query_cache))
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get query performance stats: {e}")
            return {"error": str(e)}
    
    async def create_optimized_indexes(self, collection_name: str, indexes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Create optimized indexes for a collection"""
        try:
            collection = self.db[collection_name]
            
            created_indexes = []
            failed_indexes = []
            
            for index_spec in indexes:
                try:
                    result = await collection.create_index(
                        index_spec["keys"],
                        name=index_spec.get("name"),
                        unique=index_spec.get("unique", False),
                        sparse=index_spec.get("sparse", False),
                        background=index_spec.get("background", True)
                    )
                    created_indexes.append(result)
                    
                except Exception as e:
                    logger.error(f"Failed to create index {index_spec.get('name', 'unnamed')}: {e}")
                    failed_indexes.append({
                        "index": index_spec,
                        "error": str(e)
                    })
            
            return {
                "success": True,
                "created_indexes": created_indexes,
                "failed_indexes": failed_indexes,
                "total_requested": len(indexes)
            }
            
        except Exception as e:
            logger.error(f"Failed to create optimized indexes: {e}")
            return {
                "success": False,
                "error": str(e),
                "created_indexes": [],
                "failed_indexes": indexes,
                "total_requested": len(indexes)
            }
