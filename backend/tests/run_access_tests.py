import asyncio
from datetime import datetime
import zoneinfo
import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database.session import Base, get_db
from app.models.user import User
from app.core.security import hash_password
from app.services.access_control_service import access_control_service

IST = zoneinfo.ZoneInfo("Asia/Kolkata")

TEST_SQLALCHEMY_DATABASE_URL = "sqlite:///./test_access_control.db"
test_engine = create_engine(TEST_SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


def setup_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()

    # 1. Admin account (24/7 access)
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

    # 2. Manager with standard 09:00 - 20:00 IST hours
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
    db.close()
    print("[INIT] Database setup completed with Admin and Manager accounts.")


async def run_all_tests():
    setup_db()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:

        # ---------------------------------------------------------
        # TEST 1: Admin access anytime 24/7
        # ---------------------------------------------------------
        print("\n--- TEST 1: Admin access anytime 24/7 ---")
        res = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "admin@bandhej.com", "password": "Admin@123"}
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        admin_data = res.json()
        assert admin_data["role"] == "admin"
        admin_token = admin_data["access_token"]
        print(f"[PASS] Admin login succeeded at anytime: {admin_data['email']} (role: {admin_data['role']})")

        me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
        assert me_res.status_code == 200
        print("[PASS] Admin can access protected endpoints.")

        # ---------------------------------------------------------
        # TEST 2: Manager access within permitted hours (e.g. 02:00 PM IST)
        # ---------------------------------------------------------
        print("\n--- TEST 2: Manager access within permitted hours (14:00 IST) ---")
        mock_day = datetime(2026, 11, 9, 14, 0, 0, tzinfo=IST)
        access_control_service.get_ist_now = lambda: mock_day

        res = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "manager@bandhej.com", "password": "Manager@123"}
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        manager_data = res.json()
        assert manager_data["role"] == "manager"
        manager_token = manager_data["access_token"]
        manager_id = manager_data["user_id"]
        print(f"[PASS] Manager login succeeded during operating hours: {manager_data['email']}")

        me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {manager_token}"})
        assert me_res.status_code == 200
        print("[PASS] Manager accessed protected endpoints within hours.")

        # ---------------------------------------------------------
        # TEST 3: Manager login outside permitted hours (e.g. 10:30 PM IST)
        # ---------------------------------------------------------
        print("\n--- TEST 3: Manager login outside permitted hours (22:30 IST) ---")
        mock_night = datetime(2026, 11, 9, 22, 30, 0, tzinfo=IST)
        access_control_service.get_ist_now = lambda: mock_night

        res = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "manager@bandhej.com", "password": "Manager@123"}
        )
        assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
        err = res.json()["detail"]
        assert err["code"] == "ACCESS_HOURS_EXPIRED"
        print(f"[PASS] Manager login correctly blocked outside hours: {err['message']}")

        # ---------------------------------------------------------
        # TEST 4: Automatic session expiration when clock passes end time
        # ---------------------------------------------------------
        print("\n--- TEST 4: Automatic session expiration when time passes 20:00 ---")
        # Login just before closing at 19:55 IST
        access_control_service.get_ist_now = lambda: datetime(2026, 11, 9, 19, 55, 0, tzinfo=IST)
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "manager@bandhej.com", "password": "Manager@123"}
        )
        assert login_res.status_code == 200
        active_token = login_res.json()["access_token"]

        # Advance time to 20:05 IST (past closing time)
        access_control_service.get_ist_now = lambda: datetime(2026, 11, 9, 20, 5, 0, tzinfo=IST)
        blocked_call = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {active_token}"})
        assert blocked_call.status_code == 403
        assert blocked_call.json()["detail"]["code"] == "ACCESS_HOURS_EXPIRED"
        print("[PASS] Active Manager token automatically rejected the moment clock passed 20:00 IST.")

        # ---------------------------------------------------------
        # TEST 5: Manual lock overrides operating window
        # ---------------------------------------------------------
        print("\n--- TEST 5: Manual lock overrides operating window ---")
        # Time is back to normal valid operating hours (11:00 AM IST)
        access_control_service.get_ist_now = lambda: datetime(2026, 11, 9, 11, 0, 0, tzinfo=IST)

        # Manager logs in
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "manager@bandhej.com", "password": "Manager@123"}
        )
        assert login_res.status_code == 200
        token_before_lock = login_res.json()["access_token"]

        # Admin locks manager immediately
        lock_res = await client.post(
            f"/api/v1/managers/{manager_id}/lock",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"reason": "Emergency audit required"}
        )
        assert lock_res.status_code == 200
        assert lock_res.json()["is_locked"] is True
        print("[PASS] Admin locked Manager account immediately.")

        # Active session is instantly revoked
        blocked_check = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token_before_lock}"})
        assert blocked_check.status_code in (401, 403)
        print("[PASS] Manager's active session is blocked on next request.")

        # New login attempt is blocked with ACCOUNT_LOCKED
        login_attempt = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "manager@bandhej.com", "password": "Manager@123"}
        )
        assert login_attempt.status_code == 403
        assert login_attempt.json()["detail"]["code"] == "ACCOUNT_LOCKED"
        print("[PASS] Manager login attempt blocked: Account is locked.")

        # ---------------------------------------------------------
        # TEST 6: Manual unlock by Admin allows access again
        # ---------------------------------------------------------
        print("\n--- TEST 6: Manual unlock by Admin ---")
        unlock_res = await client.post(
            f"/api/v1/managers/{manager_id}/unlock",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert unlock_res.status_code == 200
        assert unlock_res.json()["is_locked"] is False
        print("[PASS] Admin unlocked Manager account.")

        # Manager can log in again
        relogin = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "manager@bandhej.com", "password": "Manager@123"}
        )
        assert relogin.status_code == 200
        print("[PASS] Manager login restored after Admin unlocked.")

        # ---------------------------------------------------------
        # TEST 7: Manager cannot perform administrative actions
        # ---------------------------------------------------------
        print("\n--- TEST 7: Manager restricted from Admin actions ---")
        unlocked_token = relogin.json()["access_token"]

        # Cannot list managers
        r1 = await client.get("/api/v1/managers/", headers={"Authorization": f"Bearer {unlocked_token}"})
        assert r1.status_code == 403

        # Cannot change own timing
        r2 = await client.put(
            f"/api/v1/managers/{manager_id}/timing",
            headers={"Authorization": f"Bearer {unlocked_token}"},
            json={"access_start_time": "00:00", "access_end_time": "23:59"}
        )
        assert r2.status_code == 403

        # Cannot lock/unlock
        r3 = await client.post(
            f"/api/v1/managers/{manager_id}/unlock",
            headers={"Authorization": f"Bearer {unlocked_token}"}
        )
        assert r3.status_code == 403
        print("[PASS] Manager is strictly forbidden from administrative actions.")

        print("\n=======================================================")
        print("ALL 7 SECURITY & ACCESS CONTROL TESTS PASSED (100%)")
        print("=======================================================")


if __name__ == "__main__":
    asyncio.run(run_all_tests())
