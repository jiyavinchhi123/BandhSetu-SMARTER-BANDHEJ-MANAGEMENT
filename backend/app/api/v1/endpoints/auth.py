from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database.session import get_db
from app.core.security import verify_password, hash_password, create_access_token
from app.models.user import User
from app.core.config import settings
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UserResponse,
    PasswordResetRequest,
    ProfileUpdateRequest,
    ProfileUpdateResponse,
    ManagerRegisterRequest,
)
from app.services.access_control_service import access_control_service
from app.utils.formatters import format_ist_datetime, get_current_ist_time
from app.api.deps import get_current_user
from app.core.rate_limiter import rate_limit

router = APIRouter()


@router.post("/login", response_model=TokenResponse, summary="User & Manager Login (Email or Phone)")
def login(
    req: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
    _rate_check: bool = Depends(rate_limit(max_requests=10, window_seconds=60)),
):
    """
    Authenticates Admin or Manager using email address or mobile number.
    Server-side enforces Manager operating window and manual lock status.
    """
    identifier = req.identifier.strip()
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    # Normalize identifier for phone lookup (support with/without spaces, +91, dashes)
    clean_phone = identifier.replace(" ", "").replace("-", "")
    phone_variants = {identifier, clean_phone}
    digits_only = "".join(ch for ch in identifier if ch.isdigit())
    if digits_only:
        phone_variants.add(digits_only)
        if len(digits_only) == 10:
            phone_variants.add(f"+91{digits_only}")
            phone_variants.add(f"+91 {digits_only}")
        elif len(digits_only) == 12 and digits_only.startswith("91"):
            phone_variants.add(f"+{digits_only}")
            phone_variants.add(digits_only[2:])

    # Find user by email OR phone variants
    user = db.query(User).filter(
        or_(
            User.email.ilike(identifier),
            User.phone.in_(list(phone_variants))
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

    # For managers, enforce approval status, operating hours, and lock status immediately on login attempt!
    if user.is_manager():
        if not user.is_active:
            reason = (
                "Manager account registration is pending Admin approval. You will be able to log in once approved by the workshop administrator."
                if user.lock_reason == "PENDING_APPROVAL"
                else "Manager account has been disabled by Owner."
            )
            code = "ACCOUNT_PENDING_APPROVAL" if user.lock_reason == "PENDING_APPROVAL" else "ACCOUNT_DISABLED"
            access_control_service.log_audit(
                db=db,
                action="LOGIN_BLOCKED_PENDING" if user.lock_reason == "PENDING_APPROVAL" else "LOGIN_BLOCKED_DISABLED",
                user_id=user.id,
                user_email=user.email,
                user_role=user.role,
                ip_address=client_ip,
                user_agent=user_agent,
                details=reason
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": code,
                    "message": reason,
                    "server_time_ist": format_ist_datetime(),
                    "role": user.role,
                }
            )

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


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Manager Self-Registration (Pending Admin Approval)")
def register_manager(
    req: ManagerRegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
    _rate_check: bool = Depends(rate_limit(max_requests=10, window_seconds=60)),
):
    """
    Self-registration endpoint for workshop managers.
    Newly registered accounts are created in inactive status (is_active=False) with
    lock_reason='PENDING_APPROVAL' until approved by an administrator.
    """
    client_ip = request.client.host if request.client else "unknown"
    clean_email = req.email.strip().lower()

    # Format mobile number
    raw_phone = req.phone.strip()
    digits = "".join(ch for ch in raw_phone if ch.isdigit())
    if len(digits) == 10:
        clean_phone = f"+91{digits}"
    elif len(digits) == 12 and digits.startswith("91"):
        clean_phone = f"+{digits}"
    else:
        clean_phone = raw_phone

    # Check for existing email
    existing_email = db.query(User).filter(User.email.ilike(clean_email)).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Check for existing phone
    existing_phone = db.query(User).filter(User.phone == clean_phone).first()
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this mobile number already exists."
        )

    new_manager = User(
        email=clean_email,
        phone=clean_phone,
        full_name=req.full_name.strip(),
        hashed_password=hash_password(req.password.strip()),
        role="manager",
        is_active=False,  # Inactive until admin approval
        is_locked=False,
        lock_reason="PENDING_APPROVAL",
        access_start_time=settings.DEFAULT_MANAGER_START_TIME,
        access_end_time=settings.DEFAULT_MANAGER_END_TIME,
        token_version=1
    )
    db.add(new_manager)
    db.commit()
    db.refresh(new_manager)

    access_control_service.log_audit(
        db=db,
        action="MANAGER_REGISTERED",
        user_id=new_manager.id,
        user_email=new_manager.email,
        user_role="manager",
        ip_address=client_ip,
        details="Manager self-registered. Status: PENDING_APPROVAL."
    )

    return new_manager


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


@router.put("/me", response_model=ProfileUpdateResponse, summary="Update Current User Profile & Login Credentials")
def update_me(
    req: ProfileUpdateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Updates the authenticated user's Name, Mobile Number, Email ID, and Password.
    """
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    # 1. Update Full Name
    if req.full_name is not None and req.full_name.strip():
        current_user.full_name = req.full_name.strip()

    # 2. Update Email ID
    if req.email is not None and req.email.strip():
        clean_email = req.email.strip().lower()
        existing_email = db.query(User).filter(
            User.email.ilike(clean_email),
            User.id != current_user.id
        ).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email address is already in use by another account."
            )
        current_user.email = clean_email

    # 3. Update Mobile Number
    if req.phone is not None and req.phone.strip():
        raw_phone = req.phone.strip()
        digits = "".join(ch for ch in raw_phone if ch.isdigit())
        if len(digits) == 10:
            clean_phone = f"+91{digits}"
        elif len(digits) == 12 and digits.startswith("91"):
            clean_phone = f"+{digits}"
        else:
            clean_phone = raw_phone

        existing_phone = db.query(User).filter(
            User.phone == clean_phone,
            User.id != current_user.id
        ).first()
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This mobile number is already registered to another account."
            )
        current_user.phone = clean_phone

    # 4. Update Password (if provided)
    new_token = None
    if req.password is not None and req.password.strip():
        # Verify old password
        if not req.old_password or not req.old_password.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter your current (old) password to set a new password."
            )
        if not verify_password(req.old_password.strip(), current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current (old) password is incorrect. Please verify and try again."
            )

        new_pwd = req.password.strip()
        if len(new_pwd) < 4:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be at least 4 characters long."
            )
        current_user.hashed_password = hash_password(new_pwd)
        current_user.token_version += 1
        new_token = create_access_token(
            data={
                "sub": str(current_user.id),
                "role": current_user.role,
                "email": current_user.email,
                "token_version": current_user.token_version
            }
        )

    db.commit()
    db.refresh(current_user)

    access_control_service.log_audit(
        db=db,
        action="PROFILE_UPDATED",
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role,
        ip_address=client_ip,
        user_agent=user_agent,
        details="User updated login credentials / profile information"
    )

    return ProfileUpdateResponse(
        user=current_user,
        access_token=new_token,
        message="Login credentials and profile updated successfully."
    )


@router.post("/reset-password", summary="Password Reset")
def reset_password(
    req: PasswordResetRequest,
    request: Request,
    db: Session = Depends(get_db),
    _rate_check: bool = Depends(rate_limit(max_requests=5, window_seconds=60)),
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

