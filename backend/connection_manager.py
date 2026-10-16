from fastapi import WebSocket
from typing import Dict, List, Set
import json
import time
from models import UserState, LocationPoint

class ConnectionManager:
    def __init__(self):
        # Set of active dashboard WebSocket connections
        self.dashboard_connections: Set[WebSocket] = set()
        # user_id -> UserState
        self.active_users: Dict[str, UserState] = {}
        # user_id -> List of LocationPoint (last 100 points for route trail)
        self.user_history: Dict[str, List[dict]] = {}

    async def connect_dashboard(self, websocket: WebSocket):
        await websocket.accept()
        self.dashboard_connections.add(websocket)

        # Send initial snapshot of all active users
        await websocket.send_text(json.dumps({
            "type": "SNAPSHOT",
            "users": self.get_all_users()
        }))

    def disconnect_dashboard(self, websocket: WebSocket):
        self.dashboard_connections.discard(websocket)

    async def register_user_online(self, user_id: str, user_name: str):
        user = self.active_users.get(user_id)
        if not user:
            user = UserState(
                user_id=user_id,
                user_name=user_name,
                is_online=True,
                last_updated=time.time()
            )
            self.active_users[user_id] = user
        else:
            user.is_online = True
            user.user_name = user_name
            user.last_updated = time.time()

        await self.broadcast({
            "type": "USER_STATUS",
            "user": user.model_dump()
        })

    async def update_user_location(self, user_id: str, user_name: str, location_data: dict):
        if user_id not in self.user_history:
            self.user_history[user_id] = []

        loc_point = LocationPoint(
            lat=location_data.get("lat"),
            lng=location_data.get("lng"),
            accuracy=location_data.get("accuracy", 0.0),
            speed=location_data.get("speed", 0.0),
            heading=location_data.get("heading", 0.0),
            timestamp=location_data.get("timestamp", time.time())
        )

        user = self.active_users.get(user_id)
        if not user:
            user = UserState(
                user_id=user_id,
                user_name=user_name,
                is_online=True,
                last_location=loc_point,
                last_updated=time.time(),
                battery=location_data.get("battery", 100)
            )
            self.active_users[user_id] = user
        else:
            user.last_location = loc_point
            user.is_online = True
            user.user_name = user_name
            user.last_updated = time.time()
            if "battery" in location_data:
                user.battery = location_data["battery"]

        # Keep last 100 coordinates for breadcrumb trail
        self.user_history[user_id].append(loc_point.model_dump())
        if len(self.user_history[user_id]) > 100:
            self.user_history[user_id].pop(0)

        # Broadcast real-time location to all open map dashboards
        await self.broadcast({
            "type": "LOCATION_UPDATE",
            "user": user.model_dump()
        })

    async def set_user_offline(self, user_id: str):
        if user_id in self.active_users:
            user = self.active_users[user_id]
            user.is_online = False
            user.last_updated = time.time()
            await self.broadcast({
                "type": "USER_STATUS",
                "user": user.model_dump()
            })

    async def broadcast(self, message: dict):
        message_str = json.dumps(message)
        dead = set()
        for ws in list(self.dashboard_connections):
            try:
                await ws.send_text(message_str)
            except Exception:
                dead.add(ws)
        for d in dead:
            self.dashboard_connections.discard(d)

    def get_all_users(self) -> List[dict]:
        return [u.model_dump() for u in self.active_users.values()]

    def get_user_history(self, user_id: str) -> List[dict]:
        return self.user_history.get(user_id, [])

manager = ConnectionManager()
