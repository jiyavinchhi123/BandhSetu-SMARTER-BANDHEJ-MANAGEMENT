from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class LoginRequest(BaseModel):
    company_name: Optional[str] = Field(default=None, description="Company / Business Name", json_schema_extra={"example": "Vinchhi Bandhej"})
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
    business_id: int = 1
    company_name: str = "Vinchhi Bandhej"
    company_code: str = "COMP-0001"
    is_primary_admin: bool = False
    access_start_time: Optional[str] = "09:00"
    access_end_time: Optional[str] = "20:00"
    is_extended: bool = False
    extension_until: Optional[str] = None
    server_time_ist: str


class CompanyRegisterRequest(BaseModel):
    company_name: str = Field(..., min_length=2, description="Registered Company Name", json_schema_extra={"example": "Shree Radhe Bandhej"})
    legal_name: Optional[str] = Field(default=None, description="Legal Business Name")
    full_name: str = Field(..., min_length=2, description="Primary Admin Full Name", json_schema_extra={"example": "Rameshbhai Patel"})
    email: str = Field(..., min_length=5, description="Primary Admin Email", json_schema_extra={"example": "ramesh@radhebandhej.com"})
    phone: str = Field(..., min_length=8, description="Primary Admin Phone", json_schema_extra={"example": "+919825099999"})
    password: str = Field(..., min_length=6, description="Admin Password")
    city: Optional[str] = Field(default="Jamnagar")
    state: Optional[str] = Field(default="Gujarat")


class AdminCreateRequest(BaseModel):
    email: str = Field(..., min_length=5, description="New Admin email address")
    phone: Optional[str] = None
    full_name: str = Field(..., min_length=2)
    password: str = Field(..., min_length=6)


class CompanyResponse(BaseModel):
    id: int
    code: str
    name: str
    legal_name: Optional[str] = None
    owner_admin_id: Optional[int] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gst_number: Optional[str] = None
    status: str = "Active"
    suspension_reason: Optional[str] = None
    suspended_at: Optional[datetime] = None
    operating_hours_start: Optional[str] = "08:00"
    operating_hours_end: Optional[str] = "20:00"
    operating_days: Optional[str] = "Mon,Tue,Wed,Thu,Fri,Sat"
    allow_manager_weekend_access: bool = False
    is_deleted: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CompanyUpdateRequest(BaseModel):
    legal_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gst_number: Optional[str] = None
    operating_hours_start: Optional[str] = None
    operating_hours_end: Optional[str] = None
    operating_days: Optional[str] = None
    allow_manager_weekend_access: Optional[bool] = None


class CompanySuspendRequest(BaseModel):
    reason: str = Field(..., min_length=3, description="Detailed reason for suspending the company")
    password: str = Field(..., min_length=4, description="Primary Admin password for re-authentication")


class CompanyReactivateRequest(BaseModel):
    password: str = Field(..., min_length=4, description="Primary Admin password for re-authentication")


class CompanyDeleteRequest(BaseModel):
    confirmation_phrase: str = Field(..., description="Must match 'DELETE <company_code>' or 'DELETE <company_name>'")
    password: str = Field(..., min_length=4, description="Primary Admin password for re-authentication")


class UserResponse(BaseModel):
    id: int
    business_id: int = 1
    is_primary_admin: bool = False
    authorized_by_id: Optional[int] = None
    email: str
    phone: Optional[str] = None
    full_name: str
    role: str
    is_active: bool
    is_locked: bool
    lock_reason: Optional[str] = None
    access_start_time: Optional[str] = "09:00"
    access_end_time: Optional[str] = "20:00"
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


class ManagerRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, description="Manager full name")
    phone: str = Field(..., min_length=10, description="Mobile number")
    email: str = Field(..., min_length=5, description="Email address")
    password: str = Field(..., min_length=4, description="Password")


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


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, description="User full name")
    phone: Optional[str] = Field(None, min_length=7, description="Mobile number")
    email: Optional[str] = Field(None, min_length=5, description="Email address")
    password: Optional[str] = Field(None, min_length=4, description="New password")
    old_password: Optional[str] = Field(None, description="Current/old password for verification")


class ProfileUpdateResponse(BaseModel):
    user: UserResponse
    access_token: Optional[str] = None
    message: str


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


# =====================================================================
# Forgot Password Mobile OTP Verification Schemas
# =====================================================================

class ForgotPasswordRequestOTP(BaseModel):
    identifier: Optional[str] = Field(None, description="Registered email address or mobile number")
    phone: Optional[str] = Field(None, description="Registered mobile number (backward compatibility)")
    channel: Optional[str] = Field(default=None, description="Delivery channel: 'email' (100% free lifetime) or 'sms'")


class ForgotPasswordRequestOTPResponse(BaseModel):
    message: str
    channel: str = "email"
    cooldown_seconds: int = 60
    masked_recipient: Optional[str] = None
    masked_phone: Optional[str] = None
    dev_otp: Optional[str] = None


class ForgotPasswordVerifyOTP(BaseModel):
    identifier: Optional[str] = None
    phone: Optional[str] = None
    otp: str = Field(..., min_length=4, max_length=10, description="6-digit verification code")


class ForgotPasswordVerifyOTPResponse(BaseModel):
    message: str
    reset_token: str


class ForgotPasswordResetPassword(BaseModel):
    identifier: Optional[str] = None
    phone: Optional[str] = None
    reset_token: str = Field(..., min_length=16, description="Reset token from OTP verification")
    new_password: str = Field(..., min_length=6, description="New secure password (min 6 characters)")


class ForgotPasswordResetPasswordResponse(BaseModel):
    message: str


# =====================================================================
# SMTP Email Delivery Configuration Schemas (100% Free Lifetime)
# =====================================================================

class SMTPConfigRequest(BaseModel):
    smtp_user: str = Field(..., min_length=5, description="Gmail address e.g. jiya.vinchhi2412@gmail.com")
    smtp_password: Optional[str] = Field(None, description="16-character Google App Password")
    smtp_from_name: Optional[str] = Field(default="BandhSetu Security", description="Display name for sent emails")
    smtp_from_email: Optional[str] = Field(None, description="From email address")
    smtp_host: Optional[str] = Field(default="smtp.gmail.com", description="SMTP server host")
    smtp_port: Optional[int] = Field(default=587, description="SMTP server port")
    smtp_tls: Optional[bool] = Field(default=True, description="Enable STARTTLS encryption")
    test_connection: Optional[bool] = Field(default=True, description="Verify credentials with SMTP server before saving")


class SMTPConfigResponse(BaseModel):
    is_configured: bool
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: str = "BandhSetu Security"
    smtp_tls: bool = True
    masked_user: Optional[str] = None
    message: str = "SMTP configuration updated successfully."


