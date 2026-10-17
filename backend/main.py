from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
import json
import time
import uuid
from datetime import datetime, timedelta

from database import engine, Base, get_db, SessionLocal
from models import (
    User, LocationLog,
    UserState, LocationPoint,
    UserLoginRequest, SystemSetupRequest, ForgotPasswordRequest, ResetPasswordRequest,
    UserCreateAdminRequest, UserProfileUpdateRequest, AdminUserUpdateRequest, UserResponse, TokenResponse
)
from auth import hash_password, verify_password, create_access_token
from connection_manager import manager

# Ensure tables and schema alterations exist
def init_and_migrate_db():
    try:
        Base.metadata.create_all(bind=engine)
        print("[Database] Schema tables initialized.")
    except Exception as e:
        print(f"[Database] Table initialization notice: {e}")

    # Auto-migrate any newly added columns if running against existing MySQL
    try:
        with engine.connect() as conn:
            columns_to_check = [
                ("email", "VARCHAR(100) NULL"),
                ("country", "VARCHAR(100) NULL DEFAULT 'Pakistan'"),
                ("reset_token", "VARCHAR(255) NULL"),
                ("reset_token_expires", "DATETIME NULL"),
            ]
            for col_name, col_def in columns_to_check:
                try:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_def};"))
                    conn.commit()
                    print(f"[Migration] Added column '{col_name}' to users table.")
                except Exception:
                    pass # Column already exists
    except Exception as e:
        print(f"[Migration Notice] {e}")

init_and_migrate_db()

app = FastAPI(
    title="GNSS Real-Time Position Monitoring API",
    description="Enterprise GIS & Position Tracking System with MySQL 8.0, WebSockets, and Multi-Role Access Control",
    version="1.1.0"
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
        "version": "1.1.0",
        "docs_url": "/docs",
        "timestamp": time.time()
    }

# ================= SYSTEM INITIALIZATION & ONBOARDING =================

@app.get("/api/system/status")
def get_system_status(db: Session = Depends(get_db)):
    """Check if the system has completed initial installation / setup"""
    admin_count = db.query(User).filter(User.role == "admin").count()
    return {
        "is_initialized": admin_count > 0,
        "admin_count": admin_count
    }

@app.post("/api/system/setup", response_model=TokenResponse)
def system_setup(req: SystemSetupRequest, db: Session = Depends(get_db)):
    """First-time system initialization wizard: Creates the Root System Administrator"""
    existing_admin = db.query(User).filter(User.role == "admin").first()
    if existing_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System is already initialized. Please sign in via the portal."
        )

    # Check for existing username or email
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username is already taken.")
    if req.email and db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email is already registered.")

    admin_user = User(
        username=req.username,
        email=req.email,
        full_name=req.full_name,
        country=req.country or "Pakistan",
        password_hash=hash_password(req.password),
        role="admin",
        is_active=True
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    token = create_access_token({"sub": admin_user.username, "role": admin_user.role, "id": admin_user.id})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=admin_user.id,
            username=admin_user.username,
            email=admin_user.email,
            role=admin_user.role,
            full_name=admin_user.full_name,
            country=admin_user.country,
            is_active=admin_user.is_active
        )
    )

# ================= AUTHENTICATION & PASSWORD RECOVERY =================

@app.post("/api/auth/login", response_model=TokenResponse)
def login(req: UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticate with username and password, returns role and session token"""
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact your System Administrator."
        )

    token = create_access_token({"sub": user.username, "role": user.role, "id": user.id})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            role=user.role,
            full_name=user.full_name,
            country=user.country,
            is_active=user.is_active
        )
    )

@app.post("/api/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Forgot Password workflow:
    - If user is System Administrator: Generates secure reset token & link.
    - If user is Manager or Field Agent: Instructs them to confirm credentials with their Administrator.
    """
    clean_email = req.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered user found with this email address."
        )

    if user.role == "admin":
        reset_token = str(uuid.uuid4())
        user.reset_token = reset_token
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        db.commit()

        return {
            "status": "admin_reset",
            "role": "admin",
            "username": user.username,
            "reset_token": reset_token,
            "reset_link": f"/reset-password?token={reset_token}",
            "message": f"Administrator identity verified for '{user.username}'. Please proceed to reset your password."
        }
    else:
        # Standard user policy: Instruct to contact Administrator
        return {
            "status": "contact_admin",
            "role": user.role,
            "username": user.username,
            "message": "Password recovery request submitted. Under organizational security policies, please contact your System Administrator to confirm your username and issue a new password."
        }

@app.post("/api/auth/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using verified reset token"""
    user = db.query(User).filter(User.reset_token == req.token).first()
    if not user or not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token."
        )

    user.password_hash = hash_password(req.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()

    return {
        "status": "success",
        "message": "Password reset successfully. You may now sign in with your new credentials."
    }

# ================= ADMIN USER MANAGEMENT =================

@app.get("/api/admin/users", response_model=List[UserResponse])
def get_all_managed_users(db: Session = Depends(get_db)):
    """Retrieve all users in the system for admin settings"""
    users = db.query(User).order_by(User.id.asc()).all()
    return [
        UserResponse(
            id=u.id,
            username=u.username,
            email=u.email,
            role=u.role,
            full_name=u.full_name,
            country=u.country,
            is_active=u.is_active
        )
        for u in users
    ]

@app.post("/api/admin/users", response_model=UserResponse)
def create_managed_user(req: UserCreateAdminRequest, db: Session = Depends(get_db)):
    """Admin endpoint to create a new user and assign role ('admin', 'manager', 'agent')"""
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username is already taken.")
    if req.email and db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email is already assigned to another user.")

    role_val = req.role.lower() if req.role.lower() in ["admin", "manager", "agent", "driver"] else "agent"
    if role_val == "driver":
        role_val = "agent"

    new_user = User(
        username=req.username,
        email=req.email,
        full_name=req.full_name or req.username,
        country=req.country or "Pakistan",
        password_hash=hash_password(req.password),
        role=role_val,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return UserResponse(
        id=new_user.id,
        username=new_user.username,
        email=new_user.email,
        role=new_user.role,
        full_name=new_user.full_name,
        country=new_user.country,
        is_active=new_user.is_active
    )

@app.delete("/api/admin/users/{user_id}")
def delete_managed_user(user_id: int, db: Session = Depends(get_db)):
    """Deactivate or remove a managed user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Protect deleting the last admin
    if user.role == "admin":
        admin_count = db.query(User).filter(User.role == "admin").count()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the sole System Administrator.")

    db.delete(user)
    db.commit()
    return {"status": "success", "message": f"User {user.username} deleted successfully."}

@app.put("/api/auth/profile", response_model=UserResponse)
def update_profile(req: UserProfileUpdateRequest, db: Session = Depends(get_db)):
    """Update profile information for the authenticated user (any role)"""
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")

    if req.email and req.email != user.email:
        clean_email = req.email.strip().lower()
        conflict = db.query(User).filter(User.email == clean_email, User.id != user.id).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Email is already registered with another account.")
        user.email = clean_email

    if req.full_name is not None and req.full_name.strip():
        user.full_name = req.full_name.strip()
    if req.country is not None and req.country.strip():
        user.country = req.country.strip()

    # Optional password change
    if req.new_password:
        if not req.current_password or not verify_password(req.current_password, user.password_hash):
            raise HTTPException(status_code=400, detail="Current password verification failed.")
        if len(req.new_password) < 6:
            raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")
        user.password_hash = hash_password(req.new_password)

    db.commit()
    db.refresh(user)

    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        full_name=user.full_name,
        country=user.country,
        is_active=user.is_active
    )

@app.put("/api/admin/users/{user_id}", response_model=UserResponse)
def admin_update_user(user_id: int, req: AdminUserUpdateRequest, db: Session = Depends(get_db)):
    """Admin endpoint to update any user's profile, role, status, or reset their password"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if req.username and req.username.strip() and req.username.strip() != user.username:
        clean_username = req.username.strip()
        conflict = db.query(User).filter(User.username == clean_username, User.id != user.id).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Username is already taken by another account.")
        user.username = clean_username

    if req.email and req.email != user.email:
        clean_email = req.email.strip().lower()
        conflict = db.query(User).filter(User.email == clean_email, User.id != user.id).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Email is already assigned to another account.")
        user.email = clean_email

    if req.full_name is not None and req.full_name.strip():
        user.full_name = req.full_name.strip()
    if req.country is not None and req.country.strip():
        user.country = req.country.strip()
    if req.role is not None:
        role_val = req.role.lower() if req.role.lower() in ["admin", "manager", "agent"] else "agent"
        user.role = role_val
    if req.is_active is not None:
        user.is_active = req.is_active
    if req.new_password:
        if len(req.new_password) < 6:
            raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")
        user.password_hash = hash_password(req.new_password)

    db.commit()
    db.refresh(user)

    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        full_name=user.full_name,
        country=user.country,
        is_active=user.is_active
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

    return manager.get_user_history(user_id)

@app.post("/api/ping")
async def ping_location(payload: dict, db: Session = Depends(get_db)):
    """HTTP endpoint for GNSS location pings and database logging"""
    user_id = payload.get("user_id")
    user_name = payload.get("user_name", "Vehicle")
    loc = payload.get("location", {})
    if not user_id or "lat" not in loc or "lng" not in loc:
        raise HTTPException(status_code=400, detail="Missing user_id, lat or lng")

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
    Streams real-time updates of all field devices directly onto the digital map canvas.
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
                        pass

                    await manager.update_user_location(user_id, user_name, loc)

                elif msg_type == "HEARTBEAT":
                    await websocket.send_text(json.dumps({"type": "ACK", "timestamp": time.time()}))
            except Exception as e:
                print(f"Error handling tracker packet: {e}")
    except WebSocketDisconnect:
        await manager.set_user_offline(user_id)
    except Exception:
        await manager.set_user_offline(user_id)
