from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, func
from pydantic import BaseModel, Field
from typing import Optional, List
import datetime
import time

from database import Base

# ================= SQLALCHEMY ORM MODELS (MYSQL) =================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="driver") # 'manager' or 'driver'
    full_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "role": self.role,
            "full_name": self.full_name or self.username,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class LocationLog(Base):
    __tablename__ = "location_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    device_id = Column(String(100), index=True, nullable=False)
    user_name = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed = Column(Float, default=0.0)
    heading = Column(Float, default=0.0)
    accuracy = Column(Float, default=0.0)
    battery = Column(Integer, default=100)
    recorded_at = Column(DateTime, default=func.now(), index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "device_id": self.device_id,
            "user_name": self.user_name,
            "lat": self.latitude,
            "lng": self.longitude,
            "speed": self.speed,
            "heading": self.heading,
            "accuracy": self.accuracy,
            "battery": self.battery,
            "timestamp": self.recorded_at.timestamp() if self.recorded_at else time.time()
        }


# ================= PYDANTIC SCHEMAS =================

class LocationPoint(BaseModel):
    lat: float
    lng: float
    accuracy: Optional[float] = 0.0
    speed: Optional[float] = 0.0
    heading: Optional[float] = 0.0
    timestamp: float = Field(default_factory=time.time)

class UserState(BaseModel):
    user_id: str
    user_name: str
    role: str = "driver"
    is_online: bool = True
    last_location: Optional[LocationPoint] = None
    last_updated: float = Field(default_factory=time.time)
    battery: Optional[int] = 100

class UserRegisterRequest(BaseModel):
    username: str
    password: str
    role: str = "driver" # 'manager' or 'driver'
    full_name: Optional[str] = None

class UserLoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    full_name: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
