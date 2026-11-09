from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Email address or Mobile Number", json_schema_extra={"example": "admin@bandhej.com"})
    password: str = Field(..., min_length=4, json_schema_extra={"example": "Admin@123"})


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    full_name: str
    email: str
    phone: Optional[str] = None
    access_start_time: str
    access_end_time: str
    is_extended: bool = False
    extension_until: Optional[str] = None
    server_time_ist: str


class UserResponse(BaseModel):
    id: int
    email: str
    phone: Optional[str] = None
    full_name: str
    role: str
    is_active: bool
    is_locked: bool
    lock_reason: Optional[str] = None
    access_start_time: str
    access_end_time: str
    temporary_extension_until: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    last_login_ip: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ManagerCreateRequest(BaseModel):
    email: str = Field(..., min_length=5, description="Manager email address")
    phone: Optional[str] = None
    full_name: str = Field(..., min_length=2)
    password: str = Field(..., min_length=6)
    access_start_time: str = Field(default="09:00", pattern=r"^\d{2}:\d{2}$")
    access_end_time: str = Field(default="20:00", pattern=r"^\d{2}:\d{2}$")


class ManagerTimingUpdateRequest(BaseModel):
    access_start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$", json_schema_extra={"example": "09:00"})
    access_end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$", json_schema_extra={"example": "20:00"})


class ManagerExtendHoursRequest(BaseModel):
    extend_minutes: int = Field(..., ge=15, le=720, description="Minutes to extend from now (e.g., 30, 60, 120)")
    reason: Optional[str] = Field(default="Overtime urgent batch dispatch")


class ManagerLockRequest(BaseModel):
    reason: Optional[str] = Field(default="Administrative manual lock")


class PasswordResetRequest(BaseModel):
    identifier: str
    new_password: str = Field(..., min_length=6)


class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    user_role: Optional[str] = None
    action: str
    ip_address: Optional[str] = None
    details: Optional[str] = None
    timestamp_ist: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
