import os
import sys
from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database.session import SessionLocal, Base, engine
from app.models.user import User
from app.models.password_reset import PasswordResetOTP
from app.models.audit_log import AuditLog
from app.core.security import hash_password, verify_password, create_access_token
from app.core.rate_limiter import limiter


@pytest.fixture(autouse=True)
def reset_rate_limits():
    limiter.reset()
    yield
    limiter.reset()


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def test_user():
    db = SessionLocal()
    # Check if test manager exists
    user = db.query(User).filter(User.phone == "+919988776655").first()
    if not user:
        user = User(
            email="otp_test_user@bandhej.com",
            phone="+919988776655",
            full_name="Radha Patel",
            hashed_password=hash_password("OldPassword@123"),
            role="manager",
            is_active=True,
            is_locked=False,
            access_start_time="00:00",
            access_end_time="23:59",
            token_version=1
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    db.close()
    return user


def test_unregistered_phone_never_reveals_existence(client):
    """Requirement: Never reveal whether an unregistered mobile number exists."""
    res = client.post(
        "/api/v1/auth/forgot-password/request-otp",
        json={"phone": "+919000000000"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "If an account matches this mobile number" in data["message"]
    # dev_otp must be None for unregistered phones
    assert data["dev_otp"] is None


def test_registered_phone_requests_otp(client, test_user):
    """Requirement: Send an OTP via SMS to the registered mobile number with 5-minute expiry."""
    db = SessionLocal()
    # Reset cooldown window by clearing previous test OTPs for this user
    db.query(PasswordResetOTP).filter(PasswordResetOTP.user_id == test_user.id).delete()
    db.commit()
    db.close()

    res = client.post(
        "/api/v1/auth/forgot-password/request-otp",
        json={"phone": test_user.phone}
    )
    assert res.status_code == 200
    data = res.json()
    assert "verification code has been sent" in data["message"]
    assert data["dev_otp"] is not None
    assert len(data["dev_otp"]) == 6

    # Verify database state
    db = SessionLocal()
    otp_record = db.query(PasswordResetOTP).filter(
        PasswordResetOTP.phone == test_user.phone,
        PasswordResetOTP.is_used == False
    ).order_by(PasswordResetOTP.id.desc()).first()
    assert otp_record is not None
    assert otp_record.attempts == 0
    assert otp_record.max_attempts == 5
    assert not otp_record.is_expired()
    db.close()


def test_registered_email_requests_otp_option_a(client, test_user):
    """Option A: Request OTP via Email (100% Free Lifetime Delivery)."""
    db = SessionLocal()
    # Clear previous OTP records to avoid 60s cooldown
    db.query(PasswordResetOTP).filter(PasswordResetOTP.user_id == test_user.id).delete()
    db.commit()
    db.close()

    res = client.post(
        "/api/v1/auth/forgot-password/request-otp",
        json={"identifier": test_user.email, "channel": "email"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["channel"] == "email"
    assert "registered email" in data["message"]
    assert data["dev_otp"] is not None
    assert len(data["dev_otp"]) == 6

    # Verify database state
    db = SessionLocal()
    otp_record = db.query(PasswordResetOTP).filter(
        PasswordResetOTP.user_id == test_user.id,
        PasswordResetOTP.channel == "email",
        PasswordResetOTP.is_used == False
    ).order_by(PasswordResetOTP.id.desc()).first()
    assert otp_record is not None
    assert otp_record.email == test_user.email
    assert otp_record.attempts == 0
    db.close()


def test_otp_cooldown_rate_limit(client, test_user):
    """Requirement: Limit OTP resend attempts with 60-second cooldown."""
    # Attempting immediate resend must return 429
    res = client.post(
        "/api/v1/auth/forgot-password/request-otp",
        json={"phone": test_user.phone}
    )
    assert res.status_code == 429
    assert "wait" in res.json()["detail"].lower()


def test_incorrect_otp_attempt_limiting(client, test_user):
    """Requirement: Limit incorrect verification attempts before invalidating."""
    # Submit incorrect OTP code
    res = client.post(
        "/api/v1/auth/forgot-password/verify-otp",
        json={"phone": test_user.phone, "otp": "000000"}
    )
    assert res.status_code == 400
    assert "remaining" in res.json()["detail"].lower()

    db = SessionLocal()
    otp_record = db.query(PasswordResetOTP).filter(
        PasswordResetOTP.phone == test_user.phone,
        PasswordResetOTP.is_used == False
    ).order_by(PasswordResetOTP.id.desc()).first()
    assert otp_record.attempts == 1
    db.close()


def test_otp_expiry_enforcement(client, test_user):
    """Requirement: OTP must expire after a short period (5 minutes)."""
    db = SessionLocal()
    otp_record = db.query(PasswordResetOTP).filter(
        PasswordResetOTP.phone == test_user.phone,
        PasswordResetOTP.is_used == False
    ).order_by(PasswordResetOTP.id.desc()).first()
    # Artificially age the OTP record past 5 minutes
    otp_record.expires_at = datetime.utcnow() - timedelta(seconds=10)
    db.commit()
    db.close()

    res = client.post(
        "/api/v1/auth/forgot-password/verify-otp",
        json={"phone": test_user.phone, "otp": "123456"}
    )
    assert res.status_code == 400
    assert "expired" in res.json()["detail"].lower()


def test_complete_verified_password_reset_flow(client, test_user):
    """
    Requirement:
    - Send OTP
    - Verify OTP
    - Create new password
    - Invalidate all existing login sessions
    - Audit log security activity
    """
    db = SessionLocal()
    # Reset cooldown window by deleting previous test OTPs for this user
    db.query(PasswordResetOTP).filter(PasswordResetOTP.phone == test_user.phone).delete()
    db.commit()

    # Pre-generate an old active token for this user
    old_token_version = test_user.token_version
    old_jwt = create_access_token({
        "sub": str(test_user.id),
        "email": test_user.email,
        "role": test_user.role,
        "token_version": old_token_version
    })
    db.close()

    # Step 1: Request OTP
    req_res = client.post(
        "/api/v1/auth/forgot-password/request-otp",
        json={"phone": test_user.phone}
    )
    assert req_res.status_code == 200
    otp_code = req_res.json()["dev_otp"]
    assert otp_code is not None

    # Step 2: Verify OTP
    verify_res = client.post(
        "/api/v1/auth/forgot-password/verify-otp",
        json={"phone": test_user.phone, "otp": otp_code}
    )
    assert verify_res.status_code == 200
    reset_token = verify_res.json()["reset_token"]
    assert len(reset_token) > 20

    # Step 3: Reset Password
    reset_res = client.post(
        "/api/v1/auth/forgot-password/reset-password",
        json={
            "phone": test_user.phone,
            "reset_token": reset_token,
            "new_password": "NewSecurePassword@2026"
        }
    )
    assert reset_res.status_code == 200
    assert "successfully" in reset_res.json()["message"].lower()

    # Step 4: Verify Old Sessions Are Invalidated
    # The old token must be rejected because token_version was incremented
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {old_jwt}"})
    assert me_res.status_code == 401

    # Step 5: Verify Login With Old Password Fails
    old_login = client.post(
        "/api/v1/auth/login",
        json={"identifier": test_user.phone, "password": "OldPassword@123"}
    )
    assert old_login.status_code == 401

    # Step 6: Verify Login With New Password Succeeds
    new_login = client.post(
        "/api/v1/auth/login",
        json={"identifier": test_user.phone, "password": "NewSecurePassword@2026"}
    )
    assert new_login.status_code == 200
    assert "access_token" in new_login.json()

    # Step 7: Verify Audit Logging
    db = SessionLocal()
    audit_entries = db.query(AuditLog).filter(
        AuditLog.user_id == test_user.id,
        AuditLog.action.in_([
            "PASSWORD_RESET_OTP_REQUESTED",
            "PASSWORD_RESET_OTP_VERIFIED",
            "PASSWORD_RESET_SUCCESSFUL"
        ])
    ).all()
    actions = [a.action for a in audit_entries]
    assert "PASSWORD_RESET_OTP_REQUESTED" in actions
    assert "PASSWORD_RESET_OTP_VERIFIED" in actions
    assert "PASSWORD_RESET_SUCCESSFUL" in actions
    db.close()


def test_smtp_config_endpoints(client):
    """Test retrieving and updating SMTP configuration without credentials exposure."""
    # GET endpoint
    get_res = client.get("/api/v1/auth/smtp-config")
    assert get_res.status_code == 200
    data = get_res.json()
    assert "is_configured" in data
    assert "smtp_host" in data
    assert "smtp_port" in data

    # POST validation: invalid email rejected
    bad_res = client.post(
        "/api/v1/auth/smtp-config",
        json={"smtp_user": "invalid_email_format", "smtp_password": "any"}
    )
    assert bad_res.status_code == 400

    # POST save with skip test connection
    save_res = client.post(
        "/api/v1/auth/smtp-config",
        json={
            "smtp_user": "test.admin@gmail.com",
            "smtp_password": "abcd efgh ijkl mnop",
            "smtp_from_name": "BandhSetu Test",
            "test_connection": False
        }
    )
    assert save_res.status_code == 200
    saved_data = save_res.json()
    assert saved_data["is_configured"] is True
    assert saved_data["smtp_user"] == "test.admin@gmail.com"
    assert saved_data["masked_user"] is not None
    assert "password" not in saved_data  # Never leaks password!

