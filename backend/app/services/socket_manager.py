import asyncio
import json
import logging
from typing import Dict, List, Optional
from fastapi import WebSocket
import redis.asyncio as redis
from ..core.config import settings

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # active_connections: Maps batch_id to a dictionary of {user_id: {"websocket": WebSocket, "level": int}}
        self.active_connections: Dict[str, Dict[str, dict]] = {}
        
        self.redis_client = None
        self.pubsub = None
        self.channel_name = "live_session_events"
        self._listener_task: Optional[asyncio.Task] = None

    async def connect_redis(self):
        """Initialize Redis connection and start pub/sub listener."""
        if not self.redis_client:
            try:
                self.redis_client = redis.from_url(settings.redis_url, decode_responses=True)
                self.pubsub = self.redis_client.pubsub()
                await self.pubsub.subscribe(self.channel_name)
                
                # Start listener task
                self._listener_task = asyncio.create_task(self._listen_to_redis())
                logger.info(f"Connected to Redis and subscribed to {self.channel_name}")
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {e}")
                self.redis_client = None

    async def _listen_to_redis(self):
        """Background task that listens to Redis messages and broadcasts locally."""
        try:
            async for message in self.pubsub.listen():
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    batch_id = data.get("batch_id")
                    target = data.get("target")  # "batch", "level", or "user"
                    payload = data.get("payload")
                    exclude_user = data.get("exclude_user")
                    level = data.get("level")
                    target_user_id = data.get("target_user_id")

                    # Broadcast only to locally connected clients
                    if batch_id in self.active_connections:
                        for user_id, user_data in list(self.active_connections[batch_id].items()):
                            if exclude_user and user_id == exclude_user:
                                continue
                            if target == "level" and user_data["level"] != level:
                                continue
                            if target == "user" and user_id != target_user_id:
                                continue
                            
                            try:
                                await user_data["websocket"].send_json(payload)
                            except Exception as e:
                                logger.error(f"Error forwarding Redis msg to locally connected {user_id}: {e}")
                                # Self-healing: remove dead sockets
                                self.disconnect(batch_id, user_id)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Redis listener encountered an error: {e}")
            pass

    async def connect(self, websocket: WebSocket, batch_id: str, user_id: str, level: int = 0):
        # Ensure Redis is connected when the first user connects
        if not self.redis_client:
            await self.connect_redis()

        await websocket.accept()
        if batch_id not in self.active_connections:
            self.active_connections[batch_id] = {}
        
        if user_id in self.active_connections[batch_id]:
            logger.info(f"User {user_id} reconnecting to batch {batch_id}. Replacing old connection.")
        
        self.active_connections[batch_id][user_id] = {"websocket": websocket, "level": level}
        logger.info(f"User {user_id} connected to batch {batch_id} at level {level}")

    def disconnect(self, batch_id: str, user_id: str):
        if batch_id in self.active_connections:
            if user_id in self.active_connections[batch_id]:
                del self.active_connections[batch_id][user_id]
                logger.info(f"User {user_id} disconnected from batch {batch_id}")
            
            if not self.active_connections[batch_id]:
                del self.active_connections[batch_id]

    async def send_personal_message(self, message: dict, batch_id: str, user_id: str):
        if self.redis_client:
            redis_msg = {
                "batch_id": batch_id,
                "target": "user",
                "payload": message,
                "target_user_id": user_id
            }
            await self.redis_client.publish(self.channel_name, json.dumps(redis_msg))
        else:
            # Fallback to local
            if batch_id in self.active_connections and user_id in self.active_connections[batch_id]:
                websocket = self.active_connections[batch_id][user_id]["websocket"]
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending personal message to {user_id}: {e}")
                    self.disconnect(batch_id, user_id)

    async def broadcast_to_batch(self, batch_id: str, message: dict, exclude_user: str = None):
        if self.redis_client:
            redis_msg = {
                "batch_id": batch_id,
                "target": "batch",
                "payload": message,
                "exclude_user": exclude_user
            }
            await self.redis_client.publish(self.channel_name, json.dumps(redis_msg))
        else:
            # Fallback to local broadcast if Redis is down/unavailable
            if batch_id in self.active_connections:
                for user_id, data in list(self.active_connections[batch_id].items()):
                    if user_id == exclude_user:
                        continue
                    try:
                        await data["websocket"].send_json(message)
                    except Exception as e:
                        logger.error(f"Error broadcasting to {user_id}: {e}")
                        self.disconnect(batch_id, user_id)

    async def broadcast_to_level(self, batch_id: str, level: int, message: dict):
        if self.redis_client:
            redis_msg = {
                "batch_id": batch_id,
                "target": "level",
                "level": level,
                "payload": message
            }
            await self.redis_client.publish(self.channel_name, json.dumps(redis_msg))
        else:
            # Fallback to local broadcast
            if batch_id in self.active_connections:
                for user_id, data in list(self.active_connections[batch_id].items()):
                    if data["level"] == level:
                        try:
                            await data["websocket"].send_json(message)
                        except Exception as e:
                            logger.error(f"Error broadcasting to level {level} user {user_id}: {e}")
                            self.disconnect(batch_id, user_id)

socket_manager = ConnectionManager()
