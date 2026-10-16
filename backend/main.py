from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import json
import time

from models import UserState, LocationPoint
from connection_manager import manager

app = FastAPI(
    title="Live Location Tracker API",
    description="Real-time location tracking backend with FastAPI and WebSockets",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Live Location Tracker API",
        "docs_url": "/docs",
        "timestamp": time.time()
    }

# ================= REST ENDPOINTS =================

@app.get("/api/users")
def get_all_users():
    """Get all current users and their last known locations"""
    return manager.get_all_users()

@app.get("/api/history/{user_id}")
def get_user_history(user_id: str):
    """Get breadcrumb route history for a specific user"""
    return manager.get_user_history(user_id)

@app.post("/api/ping")
async def ping_location(payload: dict):
    """HTTP fallback endpoint for location updates"""
    user_id = payload.get("user_id")
    user_name = payload.get("user_name", "Anonymous Rider")
    loc = payload.get("location", {})
    if not user_id or "lat" not in loc or "lng" not in loc:
        raise HTTPException(status_code=400, detail="Missing user_id, lat or lng")

    await manager.update_user_location(user_id, user_name, loc)
    return {"status": "success", "received_at": time.time()}

# ================= WEBSOCKETS (REALTIME STREAMING) =================

@app.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    """
    WebSocket connection for Admin Web Dashboard.
    Streams live updates for all active users directly onto the map.
    """
    await manager.connect_dashboard(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "PING":
                    await websocket.send_text(json.dumps({"type": "PONG", "timestamp": time.time()}))
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect_dashboard(websocket)
    except Exception:
        manager.disconnect_dashboard(websocket)

@app.websocket("/ws/tracker/{user_id}")
async def websocket_tracker(websocket: WebSocket, user_id: str, name: str = Query("Rider")):
    """
    WebSocket connection for Mobile Tracker.
    Streams GPS coordinates from the user's phone to the admin map.
    """
    await websocket.accept()
    await manager.register_user_online(user_id, name)
    try:
        while True:
            text = await websocket.receive_text()
            try:
                data = json.loads(text)
                msg_type = data.get("type", "LOCATION")
                
                if msg_type == "LOCATION":
                    loc = {
                        "lat": data.get("lat"),
                        "lng": data.get("lng"),
                        "accuracy": data.get("accuracy", 0.0),
                        "speed": data.get("speed", 0.0),
                        "heading": data.get("heading", 0.0),
                        "battery": data.get("battery", 100),
                        "timestamp": data.get("timestamp", time.time())
                    }
                    user_name = data.get("user_name", name)
                    await manager.update_user_location(user_id, user_name, loc)
                elif msg_type == "HEARTBEAT":
                    await websocket.send_text(json.dumps({"type": "ACK", "timestamp": time.time()}))
            except Exception as e:
                print(f"Error parsing tracker message: {e}")
    except WebSocketDisconnect:
        await manager.set_user_offline(user_id)
    except Exception:
        await manager.set_user_offline(user_id)
