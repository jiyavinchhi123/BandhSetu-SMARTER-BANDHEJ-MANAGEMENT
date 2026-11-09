import os
import sys
from datetime import datetime
import zoneinfo
from starlette.requests import Request
from fastapi import HTTPException

# Ensure backend path is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.session import Base, engine, SessionLocal
from app.models.user import User
from app.models.audit_log import AuditLog
from app.core.security import hash_password
from app.schemas.auth import (
    LoginRequest,
    ManagerTimingUpdateRequest,
    ManagerLockRequest,
    ManagerExtendHoursRequest,
)
from app.api.v1.endpoints.auth import login, logout, get_me
from app.api.v1.endpoints.managers import (
    list_managers,
    lock_manager,
    unlock_manager,
    update_manager_timing,
    extend_manager_hours,
    get_all_audit_logs,
)
from app.api.deps import get_current_user, require_admin
from app.services.access_control_service import access_control_service

IST = zoneinfo.ZoneInfo("Asia/Kolkata")


def make_request():
    return Request({'type': 'http', 'client': ('127.0.0.1', 50000), 'headers': []})


def run_tests():
    print("=================================================================")
    print("STARTING COMPLETE BANDHEJ AUTHENTICATION & ACCESS CONTROL TESTS")
    print("=================================================================")

    # Initialize fresh DB
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Seed Admin & Manager
    admin = User(
        email="admin@bandhej.com",
        phone="+919876543210",
        full_name="Bhavna Mehta (Admin)",
        hashed_password=hash_password("Admin@123"),
        role="admin",
        is_active=True,
        is_locked=False,
        access_start_time="00:00",
        access_end_time="23:59",
        token_version=1
    )
    db.add(admin)

    manager = User(
        email="manager@bandhej.com",
        phone="+919876543211",
        full_name="Rajesh Patel (Manager)",
        hashed_password=hash_password("Manager@123"),
        role="manager",
        is_active=True,
        is_locked=False,
        access_start_time="09:00",
        access_end_time="20:00",
        token_version=1
    )
    db.add(manager)
    db.commit()
    db.refresh(admin)
    db.refresh(manager)

    req = make_request()

    # -------------------------------------------------------------
    # TEST 1: Admin access anytime 24/7 (Even at midnight 02:00 AM)
    # -------------------------------------------------------------
    print("\n--- TEST 1: Admin access anytime (24/7) ---")
    access_control_service.get_ist_now = lambda: datetime(2026, 11, 9, 2, 0, 0, tzinfo=IST)
    admin_login = login(LoginRequest(identifier="admin@bandhej.com", password="Admin@123"), req, db)
    assert admin_login.role == "admin"
    assert admin_login.access_token is not None
    admin_token = admin_login.access_token

    # Verify Admin calling protected get_me
    admin_user = get_current_user(db=db, token=admin_token)
    assert admin_user.is_admin() is True
    print(f"[PASS] Admin login succeeded at 02:00 AM IST. Role verified: {admin_user.role}")

    # -------------------------------------------------------------
    # TEST 2: Mobile Number Login Support
    # -------------------------------------------------------------
    print("\n--- TEST 2: Mobile Number Login (+919876543210) ---")
    phone_login = login(LoginRequest(identifier="+919876543210", password="Admin@123"), req, db)
    assert phone_login.role == "admin"
    print(f"[PASS] Successfully authenticated using Indian mobile number identifier.")

    # -------------------------------------------------------------
    # TEST 3: Manager login within permitted hours (e.g. 02:30 PM IST)
    # -------------------------------------------------------------
    print("\n--- TEST 3: Manager login within permitted hours (14:30 IST) ---")
    access_control_service.get_ist_now = lambda: datetime(2026, 11, 9, 14, 30, 0, tzinfo=IST)
    manager_login = login(LoginRequest(identifier="manager@bandhej.com", password="Manager@123"), req, db)
    assert manager_login.role == "manager"
    manager_token = manager_login.access_token

    manager_user = get_current_user(db=db, token=manager_token)
    assert manager_user.is_manager() is True
    print(f"[PASS] Manager authenticated during active hours (09:00 - 20:00 IST).")

    # -------------------------------------------------------------
    # TEST 4: Manager login outside permitted hours (e.g. 10:15 PM IST)
    # -------------------------------------------------------------
    print("\n--- TEST 4: Manager login outside permitted hours (22:15 IST) ---")
    access_control_service.get_ist_now = lambda: datetime(2026, 11, 9, 22, 15, 0, tzinfo=IST)
    try:
        login(LoginRequest(identifier="manager@bandhej.com", password="Manager@123"), req, db)
        assert False, "Manager login should have been blocked!"
    except HTTPException as exc:
        assert exc.status_code == 403
        assert exc.detail["code"] == "ACCESS_HOURS_EXPIRED"
        print(f"[PASS] Manager login blocked with 403 outside operating hours: {exc.detail['message']}")

    # -------------------------------------------------------------
    # TEST 5: Automatic session expiration when clock passes end time
    # -------------------------------------------------------------
    print("\n--- TEST 5: Automatic session expiration when clock passes 20:00 IST ---")
    # 1. Login within hours at 19:50 IST
    access_control_service.get_ist_now = lambda: datetime(2026, 11, 9, 19, 50, 0, tzinfo=IST)
    valid_login = login(LoginRequest(identifier="manager@bandhej.com", password="Manager@123"), req, db)
    active_token = valid_login.access_token

    # Verify token works at 19:50
    user_at_1950 = get_current_user(db=db, token=active_token)
    assert user_at_1950 is not None

    # 2. Advance clock to 20:01 IST (Closing was 20:00)
    access_control_service.get_ist_now = lambda: datetime(2026, 11, 9, 20, 1, 0, tzinfo=IST)
    try:
        get_current_user(db=db, token=active_token)
        assert False, "Active token should be blocked after 20:00!"
    except HTTPException as exc:
        assert exc.status_code == 403
        assert exc.detail["code"] == "ACCESS_HOURS_EXPIRED"
        print(f"[PASS] Active session blocked instantly at 20:01 IST without code changes: {exc.detail['code']}")

    # -------------------------------------------------------------
    # TEST 6: Manual Lock Overrides Permitted Hours
    # -------------------------------------------------------------
    print("\n--- TEST 6: Manual Lock Overrides Permitted Hours ---")
    # Time is 11:00 AM IST (normally permitted)
    access_control_service.get_ist_now = lambda: datetime(2026, 11, 9, 11, 0, 0, tzinfo=IST)

    # Manager logs in
    m_login = login(LoginRequest(identifier="manager@bandhej.com", password="Manager@123"), req, db)
    token_before_lock = m_login.access_token

    # Admin locks manager immediately
    locked_m = lock_manager(
        manager_id=manager.id,
        req=ManagerLockRequest(reason="Manager absent; suspicious login check"),
        request=req,
        admin_user=admin,
        db=db
    )
    assert locked_m.is_locked is True
    print(f"[PASS] Admin manually locked Manager. is_locked={locked_m.is_locked}")

    # Active token is immediately rejected because token_version was incremented
    try:
        get_current_user(db=db, token=token_before_lock)
        assert False, "Token before lock should be rejected!"
    except HTTPException as exc:
        assert exc.status_code in (401, 403)
        print(f"[PASS] Active session was immediately revoked upon Admin lock.")

    # Manager login attempt is blocked with ACCOUNT_LOCKED
    try:
        login(LoginRequest(identifier="manager@bandhej.com", password="Manager@123"), req, db)
        assert False, "Locked manager should not be able to log in!"
    except HTTPException as exc:
        assert exc.status_code == 403
        assert exc.detail["code"] == "ACCOUNT_LOCKED"
        print(f"[PASS] New login blocked with code ACCOUNT_LOCKED.")

    # -------------------------------------------------------------
    # TEST 7: Manual Unlock by Admin
    # -------------------------------------------------------------
    print("\n--- TEST 7: Manual Unlock by Admin ---")
    unlocked_m = unlock_manager(
        manager_id=manager.id,
        request=req,
        admin_user=admin,
        db=db
    )
    assert unlocked_m.is_locked is False
    print(f"[PASS] Admin unlocked Manager. is_locked={unlocked_m.is_locked}")

    # Manager can log in again during active hours
    restored_login = login(LoginRequest(identifier="manager@bandhej.com", password="Manager@123"), req, db)
    assert restored_login.role == "manager"
    print(f"[PASS] Manager login restored successfully.")

    # -------------------------------------------------------------
    # TEST 8: Manager is strictly forbidden from Admin actions
    # -------------------------------------------------------------
    print("\n--- TEST 8: Manager forbidden from Admin actions ---")
    restored_manager_user = get_current_user(db=db, token=restored_login.access_token)
    try:
        require_admin(restored_manager_user)
        assert False, "require_admin should fail for manager!"
    except HTTPException as exc:
        assert exc.status_code == 403
        assert "Admin / Owner privileges required" in exc.detail
        print(f"[PASS] require_admin successfully blocked Manager: {exc.detail}")

    # -------------------------------------------------------------
    # TEST 9: Temporary Extension of Access Hours
    # -------------------------------------------------------------
    print("\n--- TEST 9: Temporary Hours Extension ---")
    # Time is 20:30 IST (after closing 20:00)
    access_control_service.get_ist_now = lambda: datetime(2026, 11, 9, 20, 30, 0, tzinfo=IST)
    # Admin extends hours by 60 minutes
    extended_m = extend_manager_hours(
        manager_id=manager.id,
        req=ManagerExtendHoursRequest(extend_minutes=60, reason="Urgent Diwali shipment"),
        request=req,
        admin_user=admin,
        db=db
    )
    assert extended_m.temporary_extension_until is not None

    # Manager can now log in because temporary extension is active!
    ext_login = login(LoginRequest(identifier="manager@bandhej.com", password="Manager@123"), req, db)
    assert ext_login.is_extended is True
    print(f"[PASS] Manager logged in past 20:00 thanks to temporary extension until {ext_login.extension_until}.")

    # -------------------------------------------------------------
    # TEST 10: Security Audit Log Verification
    # -------------------------------------------------------------
    print("\n--- TEST 10: Security Audit Logs Verification ---")
    logs = get_all_audit_logs(limit=20, admin_user=admin, db=db)
    assert len(logs) >= 5
    actions = [l.action for l in logs]
    print(f"[PASS] Verified {len(logs)} security audit logs generated. Actions tracked: {set(actions)}")

    db.close()
    print("\n=================================================================")
    print("ALL 10 TESTS PASSED (100% SUCCESS) - AUTHENTICATION & RBAC FULLY VERIFIED")
    print("=================================================================")


if __name__ == "__main__":
    run_tests()

