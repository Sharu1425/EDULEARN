from typing import Dict, List
from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # active_connections: Maps batch_id to a dictionary of {user_id: {"websocket": WebSocket, "level": int}}
        self.active_connections: Dict[str, Dict[str, dict]] = {}

    async def connect(self, websocket: WebSocket, batch_id: str, user_id: str, level: int = 0):
        await websocket.accept()
        if batch_id not in self.active_connections:
            self.active_connections[batch_id] = {}
        
        # If user already has a connection, close the old one or just replace?
        # Usually replacing is better to handle ghost connections, but we must be careful.
        if user_id in self.active_connections[batch_id]:
            logger.info(f"User {user_id} reconnecting to batch {batch_id}. Replacing old connection.")
            # Optional: await self.active_connections[batch_id][user_id].close()
        
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
        if batch_id in self.active_connections and user_id in self.active_connections[batch_id]:
            websocket = self.active_connections[batch_id][user_id]["websocket"]
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error sending personal message to {user_id}: {e}")
                self.disconnect(batch_id, user_id)

    async def broadcast_to_batch(self, batch_id: str, message: dict, exclude_user: str = None):
        if batch_id in self.active_connections:
            for user_id, data in list(self.active_connections[batch_id].items()):
                if user_id == exclude_user:
                    continue
                try:
                    await data["websocket"].send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to {user_id}: {e}")
                    # Might need to disconnect dead sockets
                    # self.disconnect(batch_id, user_id) 
                    # Avoid modifying dict while iterating, handle cleanup separately or safely

    async def broadcast_to_level(self, batch_id: str, level: int, message: dict):
        if batch_id in self.active_connections:
            for user_id, data in list(self.active_connections[batch_id].items()):
                if data["level"] == level:
                    try:
                        await data["websocket"].send_json(message)
                    except Exception as e:
                        logger.error(f"Error broadcasting to level {level} user {user_id}: {e}")

socket_manager = ConnectionManager()
