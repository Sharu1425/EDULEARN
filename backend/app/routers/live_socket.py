from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from typing import Optional
from ..services.socket_manager import socket_manager
from ..db import get_db
import jwt
import os
import logging
from bson import ObjectId

router = APIRouter()
logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"

async def validate_token_ws(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        return user_id
    except Exception as e:
        logger.error(f"WebSocket auth failed: {e}")
        return None

@router.websocket("/ws/live/{batch_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, batch_id: str, user_id: str, token: str = Query(...)):
    # 1. Validate Token
    token_user_id = await validate_token_ws(token)
    
    if not token_user_id or token_user_id != user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 2. Accept Connection via Manager
    await socket_manager.connect(websocket, batch_id, user_id)
    
    try:
        db = await get_db()
        
        # Fetch user name for broadcast
        user_name = "Student"
        try:
            user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
            if user_doc:
                user_name = user_doc.get("username") or user_doc.get("name") or user_doc.get("email").split("@")[0]
        except Exception:
            pass

        # Broadcast JOIN event to teacher and others
        await socket_manager.broadcast_to_batch(batch_id, {
            "type": "USER_JOIN",
            "user_id": user_id,
            "name": user_name
        }, exclude_user=user_id)
        
        # 3. Restore State
        try:
            # Find active session
            live_session = await db.live_sessions.find_one(
                {"batch_id": batch_id, "current_state": {"$ne": "ENDED"}}
            )
            
            if live_session:
                # Add user to active_students if not present
                if user_id not in live_session.get("active_students", []):
                     await db.live_sessions.update_one(
                        {"_id": live_session["_id"]},
                        {"$addToSet": {"active_students": user_id}}
                     )
                
                # Send current state
                state_message = {
                    "type": "STATE_RESTORE",
                    "payload": {
                        "current_state": live_session.get("current_state"),
                        "active_content": live_session.get("active_content_payload")
                    }
                }
                await websocket.send_json(state_message)
            else:
                # No active session found
                await websocket.send_json({"type": "INFO", "message": "No active live session."})

        except Exception as e:
            logger.error(f"Error fetching state for {user_id}: {e}")

        # 4. Listen loop
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                msg_type = message.get("type")
                
                if msg_type in ["PUSH_QUIZ", "PUSH_POLL", "PUSH_MATERIAL"]:
                    # Update active content in DB so late joiners see it
                    if msg_type in ["PUSH_QUIZ", "PUSH_POLL"]:
                        await db.live_sessions.update_one(
                            {"batch_id": batch_id, "current_state": {"$ne": "ENDED"}},
                            {"$set": {
                                "current_state": msg_type.replace("PUSH_", ""),
                                "active_content_payload": message.get("payload")
                            }}
                        )
                    
                    # Broadcast to everyone in batch
                    await socket_manager.broadcast_to_batch(batch_id, message)
                    
                elif msg_type == "RAISE_HAND":
                     await socket_manager.broadcast_to_batch(batch_id, {
                        "type": "RAISE_HAND",
                        "user_id": user_id,
                        "name": user_name
                    })
                    
                elif msg_type in ["SUBMIT_ANSWER", "SUBMIT_POLL"]:
                    # Forward to teacher (or everyone for analytics updates)
                    # For simplicty, broadcast as RESPONSE_RECEIVED
                    await socket_manager.broadcast_to_batch(batch_id, {
                        "type": "RESPONSE_RECEIVED",
                        "user_id": user_id,
                        "payload": message.get("payload")
                    })
                    
                elif msg_type == "FOCUS_CHANGE":
                    # Broadcast focus status to teacher (and others)
                    await socket_manager.broadcast_to_batch(batch_id, {
                        "type": "FOCUS_CHANGE",
                        "user_id": user_id,
                        "isFocused": message.get("payload", {}).get("isFocused", True)
                    })
                    
            except json.JSONDecodeError:
                pass
            except Exception as e:
                logger.error(f"Error processing message from {user_id}: {e}")

    except WebSocketDisconnect:
        socket_manager.disconnect(batch_id, user_id)
        # Optional: Remove from active_students in DB or mark as inactive?
        # Prompt says "real-time list of students joined". 
        # Usually we keep them in DB as "attended" but maybe remove from "online" list in UI via socket broadcast.
        await socket_manager.broadcast_to_batch(batch_id, {"type": "USER_LEFT", "user_id": user_id})

    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        socket_manager.disconnect(batch_id, user_id)
