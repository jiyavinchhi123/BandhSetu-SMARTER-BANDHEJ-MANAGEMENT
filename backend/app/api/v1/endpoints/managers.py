from datetime import datetime, timedelta
import zoneinfo
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.auth import (
    UserResponse,
    ManagerCreateRequest,
    ManagerTimingUpdateRequest,
    ManagerExtendHoursRequest,
    ManagerLockRequest,
    AuditLogResponse,
)
from app.core.security import hash_password
from app.api.deps import require_admin
from app.services.access_control_service import access_control_service
from app.utils.formatters import format_ist_datetime

router = APIRouter()
IST = zoneinfo.ZoneInfo("Asia/Kolkata")


@router.get("/", response_model=List[UserResponse], summary="List all Manager accounts (Admin Only)")
def list_managers(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin retrieves all Manager accounts with operating windows, lock states and activity."""
    managers = db.query(User).filter(User.role == "manager").order_by(User.id.asc()).all()
    return managers


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Create Manager account (Admin Only)")
def create_manager(
    req: ManagerCreateRequest,
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Admin creates an Authorized Operator / Manager account.
    Manager accounts can never be created with Admin role.
    """
    # Check for existing email or phone
    existing = db.query(User).filter(
        (User.email == req.email) | (User.phone == req.phone if req.phone else False)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email or phone number already exists."
        )

    new_manager = User(
        email=req.email,
        phone=req.phone,
        full_name=req.full_name,
        hashed_password=hash_password(req.password),
        role="manager",  # Strictly manager
        is_active=True,
        is_locked=False,
        access_start_time=req.access_start_time,
        access_end_time=req.access_end_time,
        token_version=1
    )
    db.add(new_manager)
    db.commit()
    db.refresh(new_manager)

    client_ip = request.client.host if request.client else "unknown"
    access_control_service.log_audit(
        db=db,
        action="MANAGER_CREATED",
        user_id=admin_user.id,
        user_email=admin_user.email,
        user_role="admin",
        ip_address=client_ip,
        details=f"Created Manager account {new_manager.email} with hours {new_manager.access_start_time}-{new_manager.access_end_time} IST"
    )

    return new_manager


@router.post("/{manager_id}/lock", response_model=UserResponse, summary="Lock Manager account immediately (Admin Only)")
def lock_manager(
    manager_id: int,
    req: ManagerLockRequest,
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Admin locks Manager immediately, even during permitted hours.
    Manual lock overrides the scheduled access window and immediately revokes all active sessions.
    """
    manager = db.query(User).filter(User.id == manager_id, User.role == "manager").first()
    if not manager:
        raise HTTPException(status_code=404, detail="Manager account not found.")

    manager.is_locked = True
    manager.lock_reason = req.reason or "Locked immediately by Admin"
    manager.locked_at = datetime.utcnow()
    # Revoke all active sessions immediately
    manager.token_version += 1
    db.commit()
    db.refresh(manager)

    client_ip = request.client.host if request.client else "unknown"
    access_control_service.log_audit(
        db=db,
        action="MANAGER_LOCKED",
        user_id=admin_user.id,
        user_email=admin_user.email,
        user_role="admin",
        ip_address=client_ip,
        details=f"Admin locked Manager {manager.email}. Reason: {manager.lock_reason}. Active sessions revoked."
    )

    return manager


@router.post("/{manager_id}/unlock", response_model=UserResponse, summary="Unlock Manager account (Admin Only)")
def unlock_manager(
    manager_id: int,
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Only Admin can unlock a manually locked Manager account.
    """
    manager = db.query(User).filter(User.id == manager_id, User.role == "manager").first()
    if not manager:
        raise HTTPException(status_code=404, detail="Manager account not found.")

    manager.is_locked = False
    manager.lock_reason = None
    manager.locked_at = None
    db.commit()
    db.refresh(manager)

    client_ip = request.client.host if request.client else "unknown"
    access_control_service.log_audit(
        db=db,
        action="MANAGER_UNLOCKED",
        user_id=admin_user.id,
        user_email=admin_user.email,
        user_role="admin",
        ip_address=client_ip,
        details=f"Admin unlocked Manager account {manager.email}."
    )

    return manager


@router.post("/{manager_id}/toggle-active", response_model=UserResponse, summary="Enable/Disable Manager account (Admin Only)")
def toggle_manager_active(
    manager_id: int,
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin enables or disables a Manager account."""
    manager = db.query(User).filter(User.id == manager_id, User.role == "manager").first()
    if not manager:
        raise HTTPException(status_code=404, detail="Manager account not found.")

    manager.is_active = not manager.is_active
    manager.token_version += 1  # Revoke session if disabled
    db.commit()
    db.refresh(manager)

    action = "MANAGER_ENABLED" if manager.is_active else "MANAGER_DISABLED"
    client_ip = request.client.host if request.client else "unknown"
    access_control_service.log_audit(
        db=db,
        action=action,
        user_id=admin_user.id,
        user_email=admin_user.email,
        user_role="admin",
        ip_address=client_ip,
        details=f"Admin changed {manager.email} active status to {manager.is_active}."
    )

    return manager


@router.put("/{manager_id}/timing", response_model=UserResponse, summary="Configure Manager operating hours (Admin Only)")
def update_manager_timing(
    manager_id: int,
    req: ManagerTimingUpdateRequest,
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Admin updates start and end operating hours for Manager in IST (HH:MM format).
    """
    manager = db.query(User).filter(User.id == manager_id, User.role == "manager").first()
    if not manager:
        raise HTTPException(status_code=404, detail="Manager account not found.")

    manager.access_start_time = req.access_start_time
    manager.access_end_time = req.access_end_time
    db.commit()
    db.refresh(manager)

    client_ip = request.client.host if request.client else "unknown"
    access_control_service.log_audit(
        db=db,
        action="HOURS_MODIFIED",
        user_id=admin_user.id,
        user_email=admin_user.email,
        user_role="admin",
        ip_address=client_ip,
        details=f"Updated operational hours for {manager.email} to {req.access_start_time} - {req.access_end_time} IST"
    )

    return manager


@router.post("/{manager_id}/extend-hours", response_model=UserResponse, summary="Temporarily extend Manager access hours (Admin Only)")
def extend_manager_hours(
    manager_id: int,
    req: ManagerExtendHoursRequest,
    request: Request,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Admin temporarily extends Manager access hours beyond normal closing time.
    """
    manager = db.query(User).filter(User.id == manager_id, User.role == "manager").first()
    if not manager:
        raise HTTPException(status_code=404, detail="Manager account not found.")

    now_ist = datetime.now(IST)
    new_extension_ist = now_ist + timedelta(minutes=req.extend_minutes)
    manager.temporary_extension_until = new_extension_ist
    db.commit()
    db.refresh(manager)

    client_ip = request.client.host if request.client else "unknown"
    access_control_service.log_audit(
        db=db,
        action="HOURS_EXTENDED",
        user_id=admin_user.id,
        user_email=admin_user.email,
        user_role="admin",
        ip_address=client_ip,
        details=f"Extended access for {manager.email} by {req.extend_minutes} mins until {format_ist_datetime(new_extension_ist)}. Reason: {req.reason}"
    )

    return manager


@router.get("/audit-logs/all", response_model=List[AuditLogResponse], summary="Get System Security Audit Logs (Admin Only)")
def get_all_audit_logs(
    limit: int = 50,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin views recent login, logout, lock, and security activity history."""
    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(limit).all()
    return logs


@router.get("/{manager_id}/audit-logs", response_model=List[AuditLogResponse], summary="Get Manager Audit Logs (Admin Only)")
def get_manager_audit_logs(
    manager_id: int,
    limit: int = 30,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin inspects login, logout, and activity logs specifically for a Manager."""
    logs = db.query(AuditLog).filter(AuditLog.user_id == manager_id).order_by(AuditLog.id.desc()).limit(limit).all()
    return logs
