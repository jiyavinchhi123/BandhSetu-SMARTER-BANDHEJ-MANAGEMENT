from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database.session import get_db
from app.core.security import verify_password, hash_password, create_access_token
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UserResponse,
    PasswordResetRequest,
)
from app.services.access_control_service import access_control_service
from app.utils.formatters import format_ist_datetime, get_current_ist_time
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/login", response_model=TokenResponse, summary="User & Manager Login (Email or Phone)")
def login(
    req: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Authenticates Admin or Manager using email address or mobile number.
    Server-side enforces Manager operating window and manual lock status.
    """
    identifier = req.identifier.strip()
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    # Find user by email OR phone
    user = db.query(User).filter(
        or_(
            User.email.ilike(identifier),
            User.phone == identifier
        )
    ).first()

    if not user or not verify_password(req.password, user.hashed_password):
        access_control_service.log_audit(
            db=db,
            action="LOGIN_FAILED",
            user_email=identifier,
            ip_address=client_ip,
            user_agent=user_agent,
            details="Invalid username, phone number, or password"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your email/phone and password."
        )

    # For managers, enforce server-side operating hours and lock status immediately on login attempt!
    if user.is_manager():
        permitted, reason = access_control_service.is_within_operating_hours(user)
        if not permitted:
            action_code = "LOGIN_BLOCKED_LOCKED" if user.is_locked else "LOGIN_BLOCKED_HOURS"
            access_control_service.log_audit(
                db=db,
                action=action_code,
                user_id=user.id,
                user_email=user.email,
                user_role=user.role,
                ip_address=client_ip,
                user_agent=user_agent,
                details=reason
            )
            # Raise 403 Forbidden with structured code
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "ACCOUNT_LOCKED" if user.is_locked else "ACCESS_HOURS_EXPIRED",
                    "message": reason,
                    "server_time_ist": format_ist_datetime(),
                    "role": user.role,
                }
            )

    # Successful Login: Update tracking metadata
    user.last_login_at = datetime.utcnow()
    user.last_login_ip = client_ip
    db.commit()

    access_control_service.log_audit(
        db=db,
        action="LOGIN_SUCCESS",
        user_id=user.id,
        user_email=user.email,
        user_role=user.role,
        ip_address=client_ip,
        user_agent=user_agent,
        details=f"Successful authentication via {identifier}"
    )

    # Create JWT
    token_payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "token_version": user.token_version,
    }
    token = create_access_token(token_payload)

    is_ext = False
    ext_str = None
    if user.temporary_extension_until:
        ext_str = format_ist_datetime(user.temporary_extension_until)
        is_ext = True

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user.role,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        access_start_time=user.access_start_time,
        access_end_time=user.access_end_time,
        is_extended=is_ext,
        extension_until=ext_str,
        server_time_ist=format_ist_datetime()
    )


@router.post("/logout", summary="Logout and invalidate session")
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Invalidates current session by bumping user token_version,
    preventing any future use of current JWT.
    """
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    current_user.token_version += 1
    db.commit()

    access_control_service.log_audit(
        db=db,
        action="LOGOUT",
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role,
        ip_address=client_ip,
        user_agent=user_agent,
        details="User initiated secure logout"
    )

    return {"message": "Successfully logged out. Active session invalidated."}


@router.get("/me", response_model=UserResponse, summary="Get Current Authenticated User")
def get_me(
    current_user: User = Depends(get_current_user)
):
    """Returns the authenticated user profile, permissions, and timings."""
    return current_user


@router.post("/reset-password", summary="Password Reset")
def reset_password(
    req: PasswordResetRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Resets user password and revokes any active sessions."""
    identifier = req.identifier.strip()
    user = db.query(User).filter(
        or_(
            User.email.ilike(identifier),
            User.phone == identifier
        )
    ).first()

    if not user:
        # Avoid user enumeration in public API
        return {"message": "If an account matches this identifier, the password has been updated."}

    user.hashed_password = hash_password(req.new_password)
    user.token_version += 1
    db.commit()

    client_ip = request.client.host if request.client else "unknown"
    access_control_service.log_audit(
        db=db,
        action="PASSWORD_RESET",
        user_id=user.id,
        user_email=user.email,
        user_role=user.role,
        ip_address=client_ip,
        details="Password was reset; all sessions invalidated."
    )

    return {"message": "Password successfully updated."}

