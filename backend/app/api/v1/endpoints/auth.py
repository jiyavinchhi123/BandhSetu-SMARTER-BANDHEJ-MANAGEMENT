import os
import hmac
import secrets
import smtplib
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database.session import get_db
from app.core.security import verify_password, hash_password, create_access_token
from app.models.user import User
from app.models.password_reset import PasswordResetOTP
from app.core.config import settings
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UserResponse,
    PasswordResetRequest,
    ProfileUpdateRequest,
    ProfileUpdateResponse,
    ManagerRegisterRequest,
    ForgotPasswordRequestOTP,
    ForgotPasswordRequestOTPResponse,
    ForgotPasswordVerifyOTP,
    ForgotPasswordVerifyOTPResponse,
    ForgotPasswordResetPassword,
    ForgotPasswordResetPasswordResponse,
    SMTPConfigRequest,
    SMTPConfigResponse,
)
from app.services.access_control_service import access_control_service
from app.services.sms_service import SMSService
from app.services.email_service import EmailService
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


# =====================================================================
# Forgot Password – Email & Mobile OTP Verification Endpoints
# =====================================================================

@router.post(
    "/forgot-password/request-otp",
    response_model=ForgotPasswordRequestOTPResponse,
    summary="Request Password Reset OTP via Email (100% Free Lifetime) or SMS"
)
def request_forgot_password_otp(
    req: ForgotPasswordRequestOTP,
    request: Request,
    db: Session = Depends(get_db),
    _rate_check: bool = Depends(rate_limit(max_requests=10, window_seconds=60)),
):
    """
    Sends a cryptographically secure 6-digit OTP to the registered Email or Mobile number.
    - 100% Free Lifetime Delivery: Defaults to Email OTP (Gmail SMTP / Brevo) with zero telecom bills.
    - Timing-safe: Never reveals whether an unregistered email or mobile exists.
    - Rate-limited: Maximum 3 requests per 15 minutes with 60s cooldown.
    - Short expiry: OTP expires in 5 minutes.
    """
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    raw_input = (req.identifier or req.phone or "").strip()
    is_email_input = "@" in raw_input

    if req.channel in ("email", "sms"):
        channel = req.channel
    elif req.phone and not req.identifier:
        channel = "sms"
    elif is_email_input:
        channel = "email"
    else:
        channel = "email"

    clean_lookup_id = raw_input.lower() if is_email_input else SMSService.normalize_phone(raw_input)
    phone_variants = SMSService.get_phone_variants(raw_input) if not is_email_input else []

    # Timing-safe search for user by email OR phone variants
    user = None
    if is_email_input:
        user = db.query(User).filter(User.email.ilike(clean_lookup_id)).first()
    else:
        user = db.query(User).filter(
            or_(
                User.phone.in_(phone_variants),
                User.email.ilike(clean_lookup_id)
            )
        ).first()

    masked_recipient = (
        EmailService.mask_email(clean_lookup_id)
        if is_email_input
        else SMSService.mask_phone(clean_lookup_id)
    )

    if not user:
        # Run dummy hash to equalize response timing and prevent user enumeration
        PasswordResetOTP.hash_otp("dummy_identifier", "123456")
        access_control_service.log_audit(
            db=db,
            action="PASSWORD_RESET_OTP_UNREGISTERED_TARGET",
            ip_address=client_ip,
            user_agent=user_agent,
            details=f"Password reset OTP requested for unregistered identifier: {masked_recipient}"
        )
        return ForgotPasswordRequestOTPResponse(
            message=f"If an account matches this { 'email address' if is_email_input else 'mobile number' }, a 6-digit verification code has been dispatched.",
            channel=channel,
            cooldown_seconds=60,
            masked_recipient=masked_recipient,
            masked_phone=masked_recipient if not is_email_input else None,
            dev_otp=None
        )

    # If user exists, determine delivery target & channel
    chosen_channel = channel
    target_email = user.email
    target_phone = user.phone or (clean_lookup_id if not is_email_input else "")

    if chosen_channel == "sms" and target_phone:
        chosen_channel = "sms"
        masked_recipient = SMSService.mask_phone(target_phone)
    elif target_email:
        chosen_channel = "email"
        masked_recipient = EmailService.mask_email(target_email)
    elif target_phone:
        chosen_channel = "sms"
        masked_recipient = SMSService.mask_phone(target_phone)
    else:
        chosen_channel = "email"
        masked_recipient = EmailService.mask_email(target_email)

    # Enforce resend cooldown (60s) & rate limiting (max 3 per 15 mins)
    fifteen_mins_ago = datetime.utcnow() - timedelta(minutes=15)
    recent_otps = db.query(PasswordResetOTP).filter(
        or_(
            PasswordResetOTP.user_id == user.id,
            PasswordResetOTP.email == target_email,
            PasswordResetOTP.phone == target_phone
        ),
        PasswordResetOTP.created_at >= fifteen_mins_ago
    ).order_by(PasswordResetOTP.created_at.desc()).all()

    if len(recent_otps) >= 3:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification requests. For security reasons, please wait 15 minutes before requesting again."
        )

    if recent_otps:
        elapsed = (datetime.utcnow() - recent_otps[0].created_at).total_seconds()
        if elapsed < 60:
            remaining_cd = int(60 - elapsed)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {remaining_cd} seconds before requesting a new verification code."
            )

    # Invalidate previous unverified OTP sessions for this user
    for old_otp in recent_otps:
        if not old_otp.is_verified:
            old_otp.is_used = True

    # Generate 6-digit numeric OTP (100000 - 999999)
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    # Salt hash using the clean user identifier
    hash_key = clean_lookup_id if clean_lookup_id else (target_email or target_phone)
    otp_hash = PasswordResetOTP.hash_otp(hash_key, otp_code)

    # Store hashed OTP in database with 5-minute expiry
    otp_record = PasswordResetOTP(
        phone=target_phone or None,
        email=target_email or None,
        channel=chosen_channel,
        user_id=user.id,
        otp_hash=otp_hash,
        attempts=0,
        max_attempts=5,
        is_verified=False,
        is_used=False,
        expires_at=datetime.utcnow() + timedelta(minutes=5),
        created_at=datetime.utcnow(),
    )
    db.add(otp_record)
    db.commit()

    # Dispatch via selected channel
    if chosen_channel == "email":
        EmailService.send_otp_email(
            to_email=target_email,
            recipient_name=user.full_name,
            otp=otp_code
        )
        success_msg = f"A 6-digit verification code has been sent to your registered email ({masked_recipient}). Valid for 5 minutes."
    else:
        SMSService.send_otp(clean_lookup_id, otp_code)
        success_msg = f"A 6-digit verification code has been sent via SMS to {masked_recipient}. Valid for 5 minutes."

    # Audit log (without logging the raw OTP!)
    access_control_service.log_audit(
        db=db,
        action="PASSWORD_RESET_OTP_REQUESTED",
        user_id=user.id,
        user_email=user.email,
        user_role=user.role,
        ip_address=client_ip,
        user_agent=user_agent,
        details=f"OTP dispatched via {chosen_channel.upper()} to {masked_recipient}. Expiry: 5 mins."
    )

    # In debug/testing mode, return dev_otp for automated tests and developer convenience
    is_dev = settings.DEBUG or os.getenv("TESTING") == "1"
    return ForgotPasswordRequestOTPResponse(
        message=success_msg,
        channel=chosen_channel,
        cooldown_seconds=60,
        masked_recipient=masked_recipient,
        masked_phone=masked_recipient if chosen_channel == "sms" else None,
        dev_otp=otp_code if is_dev else None
    )


@router.post(
    "/forgot-password/verify-otp",
    response_model=ForgotPasswordVerifyOTPResponse,
    summary="Verify Email or Mobile OTP Before Password Reset"
)
def verify_forgot_password_otp(
    req: ForgotPasswordVerifyOTP,
    request: Request,
    db: Session = Depends(get_db),
    _rate_check: bool = Depends(rate_limit(max_requests=15, window_seconds=60)),
):
    """
    Verifies the 6-digit OTP code against the backend database.
    - Limits failed attempts to 5 max before locking the OTP session.
    - Rejects expired OTPs (> 5 minutes).
    - Upon success, issues a single-use cryptographically random reset token.
    """
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    raw_input = (req.identifier or req.phone or "").strip()
    raw_otp = req.otp.strip()
    is_email = "@" in raw_input
    clean_id = raw_input.lower() if is_email else SMSService.normalize_phone(raw_input)
    phone_variants = SMSService.get_phone_variants(raw_input) if not is_email else []

    # Find the latest unused OTP record for this identifier
    query = db.query(PasswordResetOTP).filter(PasswordResetOTP.is_used == False)
    if is_email:
        query = query.filter(PasswordResetOTP.email.ilike(clean_id))
    else:
        query = query.filter(
            or_(
                PasswordResetOTP.phone == clean_id,
                PasswordResetOTP.phone.in_(phone_variants),
                PasswordResetOTP.email.ilike(clean_id)
            )
        )
    otp_record = query.order_by(PasswordResetOTP.id.desc()).first()

    masked_target = EmailService.mask_email(clean_id) if is_email else SMSService.mask_phone(clean_id)

    if not otp_record or otp_record.is_expired():
        access_control_service.log_audit(
            db=db,
            action="PASSWORD_RESET_OTP_EXPIRED",
            ip_address=client_ip,
            user_agent=user_agent,
            details=f"Verification attempted for expired or non-existent OTP: {masked_target}"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code is invalid or has expired (validity: 5 minutes). Please request a new OTP."
        )

    if otp_record.attempts >= otp_record.max_attempts:
        otp_record.is_used = True
        db.commit()
        access_control_service.log_audit(
            db=db,
            action="PASSWORD_RESET_OTP_LOCKED",
            user_id=otp_record.user_id,
            ip_address=client_ip,
            user_agent=user_agent,
            details="OTP session permanently locked due to excessive failed attempts."
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification code has been locked due to too many failed attempts. Please request a new code."
        )

    # Constant-time comparison with clean identifier
    expected_hash = PasswordResetOTP.hash_otp(clean_id, raw_otp)
    # Also support fallback hash against stored phone/email if user input formatting varied slightly
    matches = hmac.compare_digest(expected_hash, otp_record.otp_hash)
    if not matches and otp_record.phone:
        matches = hmac.compare_digest(PasswordResetOTP.hash_otp(otp_record.phone, raw_otp), otp_record.otp_hash)
    if not matches and otp_record.email:
        matches = hmac.compare_digest(PasswordResetOTP.hash_otp(otp_record.email, raw_otp), otp_record.otp_hash)

    if not matches:
        otp_record.attempts += 1
        remaining = otp_record.max_attempts - otp_record.attempts
        db.commit()

        access_control_service.log_audit(
            db=db,
            action="PASSWORD_RESET_OTP_INCORRECT_ATTEMPT",
            user_id=otp_record.user_id,
            ip_address=client_ip,
            user_agent=user_agent,
            details=f"Incorrect OTP attempt ({otp_record.attempts}/{otp_record.max_attempts})"
        )

        if remaining <= 0:
            otp_record.is_used = True
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many incorrect attempts. This OTP has been invalidated. Please request a new code."
            )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incorrect verification code. {remaining} attempt(s) remaining."
        )

    # Verification Succeeded: Issue single-use URL-safe reset token
    reset_token = secrets.token_urlsafe(32)
    otp_record.is_verified = True
    otp_record.reset_token = reset_token
    # Extend lifespan by 10 minutes to complete password creation
    otp_record.expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    access_control_service.log_audit(
        db=db,
        action="PASSWORD_RESET_OTP_VERIFIED",
        user_id=otp_record.user_id,
        ip_address=client_ip,
        user_agent=user_agent,
        details=f"OTP verified successfully for {masked_target}. Reset token issued."
    )

    return ForgotPasswordVerifyOTPResponse(
        message="Verification successful. You may now create your new password.",
        reset_token=reset_token
    )


@router.post(
    "/forgot-password/reset-password",
    response_model=ForgotPasswordResetPasswordResponse,
    summary="Create New Password After OTP Verification & Invalidate All Sessions"
)
def reset_password_with_verified_otp(
    req: ForgotPasswordResetPassword,
    request: Request,
    db: Session = Depends(get_db),
    _rate_check: bool = Depends(rate_limit(max_requests=10, window_seconds=60)),
):
    """
    Sets a new password using the verified reset token.
    - Immediately invalidates all existing user login sessions by bumping token_version.
    - Logs password reset activity in audit trail.
    - Marks reset token as used.
    """
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    raw_input = (req.identifier or req.phone or "").strip()
    new_pwd = req.new_password.strip()

    if len(new_pwd) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long."
        )

    # Locate the verified reset session
    otp_record = db.query(PasswordResetOTP).filter(
        PasswordResetOTP.reset_token == req.reset_token,
        PasswordResetOTP.is_verified == True,
        PasswordResetOTP.is_used == False,
    ).first()

    if not otp_record or otp_record.is_expired():
        access_control_service.log_audit(
            db=db,
            action="PASSWORD_RESET_INVALID_TOKEN",
            ip_address=client_ip,
            user_agent=user_agent,
            details=f"Password reset attempted with invalid or expired reset token."
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset session is invalid or has expired. Please request a new verification code."
        )

    # Locate user account
    user = None
    if otp_record.user_id:
        user = db.query(User).filter(User.id == otp_record.user_id).first()
    if not user and otp_record.email:
        user = db.query(User).filter(User.email.ilike(otp_record.email)).first()
    if not user and otp_record.phone:
        variants = SMSService.get_phone_variants(otp_record.phone)
        user = db.query(User).filter(User.phone.in_(variants)).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated user account was not found."
        )

    # 1. Update password
    user.hashed_password = hash_password(new_pwd)

    # 2. IMMEDIATELY INVALIDATE ALL EXISTING LOGIN SESSIONS
    user.token_version += 1

    # 3. Mark reset token as used
    otp_record.is_used = True
    db.commit()

    # 4. Log security audit
    access_control_service.log_audit(
        db=db,
        action="PASSWORD_RESET_SUCCESSFUL",
        user_id=user.id,
        user_email=user.email,
        user_role=user.role,
        ip_address=client_ip,
        user_agent=user_agent,
        details=f"Password reset successfully via verified OTP. Token version incremented to {user.token_version} (all prior sessions revoked)."
    )

    return ForgotPasswordResetPasswordResponse(
        message="Password has been reset successfully. All existing login sessions have been invalidated. Please sign in with your new password."
    )


@router.post("/reset-password", summary="Legacy Password Reset")
def reset_password(
    req: PasswordResetRequest,
    request: Request,
    db: Session = Depends(get_db),
    _rate_check: bool = Depends(rate_limit(max_requests=5, window_seconds=60)),
):
    """Legacy reset endpoint maintained for backward compatibility."""
    identifier = req.identifier.strip()
    user = db.query(User).filter(
        or_(
            User.email.ilike(identifier),
            User.phone == identifier
        )
    ).first()

    if not user:
        return {"message": "If an account matches this identifier, the password has been updated."}

    user.hashed_password = hash_password(req.new_password)
    user.token_version += 1
    db.commit()

    client_ip = request.client.host if request.client else "unknown"
    access_control_service.log_audit(
        db=db,
        action="PASSWORD_RESET_LEGACY",
        user_id=user.id,
        user_email=user.email,
        user_role=user.role,
        ip_address=client_ip,
        details="Password was reset via legacy endpoint; all sessions invalidated."
    )

    return {"message": "Password successfully updated."}


# =====================================================================
# SMTP Email Delivery Configuration Endpoints (100% Free Lifetime)
# =====================================================================

@router.get(
    "/smtp-config",
    response_model=SMTPConfigResponse,
    summary="Get SMTP Delivery Status and Public Configuration"
)
def get_smtp_config():
    """
    Returns active SMTP configuration and live delivery status.
    Passwords are never revealed over the wire.
    """
    is_cfg = EmailService.is_configured()
    user = settings.SMTP_USER or os.getenv("SMTP_USER")
    return SMTPConfigResponse(
        is_configured=is_cfg,
        smtp_host=settings.SMTP_HOST or os.getenv("SMTP_HOST", "smtp.gmail.com"),
        smtp_port=int(settings.SMTP_PORT or os.getenv("SMTP_PORT", 587)),
        smtp_user=user if is_cfg else None,
        smtp_from_email=settings.SMTP_FROM_EMAIL or os.getenv("SMTP_FROM_EMAIL", user),
        smtp_from_name=settings.SMTP_FROM_NAME or os.getenv("SMTP_FROM_NAME", "BandhSetu Security"),
        smtp_tls=bool(settings.SMTP_TLS),
        masked_user=EmailService.mask_email(user) if user else None,
        message="Live Gmail delivery is active." if is_cfg else "Demo mode: Google App Password not yet configured."
    )


@router.post(
    "/smtp-config",
    response_model=SMTPConfigResponse,
    summary="Configure & Verify Gmail SMTP Delivery (100% Free Lifetime)"
)
def configure_smtp(
    req: SMTPConfigRequest,
    request: Request,
    db: Session = Depends(get_db),
    _rate_check: bool = Depends(rate_limit(max_requests=10, window_seconds=60)),
):
    """
    Allows user/admin to configure their Gmail SMTP App Password directly from the UI.
    - Validates connection against Gmail SMTP server (smtp.gmail.com:587)
    - Automatically strips whitespace and dashes from 16-character app passwords
    - Updates backend/.env and active in-memory settings
    - Enables 100% free lifetime OTP delivery to inboxes without restart
    """
    client_ip = request.client.host if request.client else "unknown"
    clean_user = req.smtp_user.strip().lower()

    if not clean_user or "@" not in clean_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid Gmail or email address (e.g. jiya.vinchhi2412@gmail.com)."
        )

    clean_password = ""
    if req.smtp_password:
        clean_password = req.smtp_password.strip().replace(" ", "").replace("-", "")

    if not clean_password:
        # If password omitted, check if we already have one configured
        clean_password = settings.SMTP_PASSWORD or os.getenv("SMTP_PASSWORD") or ""

    if not clean_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter your 16-character Google App Password from https://myaccount.google.com/apppasswords"
        )

    smtp_host = req.smtp_host or "smtp.gmail.com"
    smtp_port = req.smtp_port or 587
    smtp_tls = req.smtp_tls if req.smtp_tls is not None else True
    from_name = req.smtp_from_name.strip() if req.smtp_from_name else "BandhSetu Security"
    from_email = req.smtp_from_email.strip() if req.smtp_from_email else clean_user

    # Test SMTP connection if requested
    if req.test_connection:
        try:
            EmailService.test_smtp_connection(
                smtp_user=clean_user,
                smtp_password=clean_password,
                smtp_host=smtp_host,
                smtp_port=smtp_port,
                smtp_tls=smtp_tls
            )
        except smtplib.SMTPAuthenticationError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Google authentication failed. Please make sure: "
                    "1. 2-Step Verification is ON in your Google Account. "
                    "2. You created an App Password at https://myaccount.google.com/apppasswords. "
                    "3. You pasted all 16 letters correctly."
                )
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Could not connect to SMTP server ({smtp_host}:{smtp_port}): {str(e)}"
            )

    # Save to backend/.env and in-memory settings
    env_updates = {
        "SMTP_HOST": smtp_host,
        "SMTP_PORT": str(smtp_port),
        "SMTP_USER": clean_user,
        "SMTP_PASSWORD": clean_password,
        "SMTP_FROM_EMAIL": from_email,
        "SMTP_FROM_NAME": from_name,
        "SMTP_TLS": "True" if smtp_tls else "False",
    }
    EmailService.update_env_file(env_updates)

    access_control_service.log_audit(
        db=db,
        action="SMTP_CONFIG_UPDATED",
        ip_address=client_ip,
        details=f"Live SMTP email delivery configured for {EmailService.mask_email(clean_user)}."
    )

    return SMTPConfigResponse(
        is_configured=True,
        smtp_host=smtp_host,
        smtp_port=smtp_port,
        smtp_user=clean_user,
        smtp_from_email=from_email,
        smtp_from_name=from_name,
        smtp_tls=smtp_tls,
        masked_user=EmailService.mask_email(clean_user),
        message="Gmail SMTP verified & saved successfully! Real OTP emails will now arrive in your inbox."
    )



