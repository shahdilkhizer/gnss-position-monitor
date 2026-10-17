from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import time

from database import engine, Base, get_db, SessionLocal
from models import (
    User, LocationLog,
    UserState, LocationPoint,
    UserRegisterRequest, UserLoginRequest, UserResponse, TokenResponse
)
from auth import hash_password, verify_password, create_access_token
from connection_manager import manager

# Create database tables automatically
try:
    Base.metadata.create_all(bind=engine)
    print("[Database] Schema tables initialized successfully.")
except Exception as e:
    print(f"[Database] Table initialization notice: {e}")

# Seed initial default users if table is empty
def seed_default_users():
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            print("[Database] Seeding default accounts (manager & driver)...")
            manager_user = User(
                username="manager",
                password_hash=hash_password("admin123"),
                role="manager",
                full_name="Fleet Operations Manager"
            )
            driver_user = User(
                username="driver1",
                password_hash=hash_password("driver123"),
                role="driver",
                full_name="Vehicle 01 - Field Driver"
            )
            db.add(manager_user)
            db.add(driver_user)
            db.commit()
            print("[Database] Default users created: manager (admin123), driver1 (driver123)")
    except Exception as e:
        print(f"[Database] Seeding notice: {e}")
    finally:
        db.close()

seed_default_users()

app = FastAPI(
    title="GNSS Real-Time Position Monitoring API",
    description="FastAPI Backend with WebSockets, MySQL persistence, and role-based access",
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
        "system": "GNSS-Based Real-Time Position Monitoring System",
        "docs_url": "/docs",
        "timestamp": time.time()
    }

# ================= AUTHENTICATION ENDPOINTS =================

@app.post("/api/auth/register", response_model=UserResponse)
def register(req: UserRegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account with role ('manager' or 'driver')"""
    existing_user = db.query(User).filter(User.username == req.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered. Please choose another username."
        )

    role_val = req.role.lower() if req.role.lower() in ["manager", "driver"] else "driver"
    new_user = User(
        username=req.username,
        password_hash=hash_password(req.password),
        role=role_val,
        full_name=req.full_name or req.username
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return UserResponse(
        id=new_user.id,
        username=new_user.username,
        role=new_user.role,
        full_name=new_user.full_name
    )

@app.post("/api/auth/login", response_model=TokenResponse)
def login(req: UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with username and password, returns JWT token and role"""
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    token = create_access_token({"sub": user.username, "role": user.role, "id": user.id})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            username=user.username,
            role=user.role,
            full_name=user.full_name
        )
    )

# ================= GNSS TELEMETRY & ROUTE HISTORY =================

@app.get("/api/users")
def get_all_users():
    """Get snapshot of all currently active or recently connected tracking devices"""
    return manager.get_all_users()

@app.get("/api/history/{user_id}")
def get_user_history(user_id: str, db: Session = Depends(get_db)):
    """Get breadcrumb route history for a device (from MySQL database)"""
    try:
        logs = db.query(LocationLog).filter(
            LocationLog.device_id == user_id
        ).order_by(LocationLog.id.asc()).limit(150).all()

        if logs:
            return [l.to_dict() for l in logs]
    except Exception as e:
        print(f"[History DB Query] Notice: {e}")

    # Fallback to in-memory active cache
    return manager.get_user_history(user_id)

@app.post("/api/ping")
async def ping_location(payload: dict, db: Session = Depends(get_db)):
    """HTTP fallback endpoint for GNSS location pings and database logging"""
    user_id = payload.get("user_id")
    user_name = payload.get("user_name", "Vehicle")
    loc = payload.get("location", {})
    if not user_id or "lat" not in loc or "lng" not in loc:
        raise HTTPException(status_code=400, detail="Missing user_id, lat or lng")

    # Persist log to MySQL
    try:
        log_entry = LocationLog(
            device_id=user_id,
            user_name=user_name,
            latitude=loc.get("lat"),
            longitude=loc.get("lng"),
            speed=loc.get("speed", 0.0),
            heading=loc.get("heading", 0.0),
            accuracy=loc.get("accuracy", 0.0),
            battery=loc.get("battery", 100)
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        print(f"[DB Log Save] Notice: {e}")

    await manager.update_user_location(user_id, user_name, loc)
    return {"status": "success", "received_at": time.time()}

# ================= WEBSOCKETS (HIGH-FREQUENCY GNSS STREAMING) =================

@app.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    """
    WebSocket connection for Central Position Monitoring Web Dashboard.
    Streams real-time updates of all field devices directly onto the digital map.
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
async def websocket_tracker(websocket: WebSocket, user_id: str, name: str = Query("Vehicle")):
    """
    WebSocket connection for Field Device / Vehicle Transmitter.
    Streams real-time GNSS coordinates from the field to the central dashboard and database.
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

                    # Persist coordinate to database
                    try:
                        db = SessionLocal()
                        log_entry = LocationLog(
                            device_id=user_id,
                            user_name=user_name,
                            latitude=loc["lat"],
                            longitude=loc["lng"],
                            speed=loc["speed"],
                            heading=loc["heading"],
                            accuracy=loc["accuracy"],
                            battery=loc["battery"]
                        )
                        db.add(log_entry)
                        db.commit()
                        db.close()
                    except Exception as db_err:
                        pass # Continue uninterrupted stream

                    await manager.update_user_location(user_id, user_name, loc)

                elif msg_type == "HEARTBEAT":
                    await websocket.send_text(json.dumps({"type": "ACK", "timestamp": time.time()}))
            except Exception as e:
                print(f"Error handling tracker packet: {e}")
    except WebSocketDisconnect:
        await manager.set_user_offline(user_id)
    except Exception:
        await manager.set_user_offline(user_id)
