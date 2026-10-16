from pydantic import BaseModel, Field
from typing import Optional, List
import time

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
    role: str = "field_agent"
    is_online: bool = True
    last_location: Optional[LocationPoint] = None
    last_updated: float = Field(default_factory=time.time)
    battery: Optional[int] = 100
