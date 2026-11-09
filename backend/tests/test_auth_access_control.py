from datetime import datetime
import zoneinfo
import pytest
from fastapi.testclient import TestClient
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


@pytest.fixture(scope="module", autouse=True)
def setup_database():
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

    # 2. Standard Manager with 09:00 - 20:00 IST hours
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
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_admin_access_anytime(client):
    """Requirement: Admin can log in at any time 24/7."""
    res = client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin@bandhej.com", "password": "Admin@123"}
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["role"] == "admin"
    assert "access_token" in data

    # Verify protected endpoint access with Admin token
    token = data["access_token"]
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "admin@bandhej.com"


def test_manager_access_within_permitted_hours(client, monkeypatch):
    """Requirement: Login within permitted hours (e.g. 02:00 PM IST is inside 09:00 - 20:00)."""
    # Mock IST time to 14:00 (02:00 PM IST)
    mock_now = datetime(2026, 11, 9, 14, 0, 0, tzinfo=IST)
    monkeypatch.setattr(access_control_service, "get_ist_now", lambda: mock_now)

    res = client.post(
        "/api/v1/auth/login",
        json={"identifier": "manager@bandhej.com", "password": "Manager@123"}
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["role"] == "manager"
    assert "access_token" in data

    token = data["access_token"]
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "manager"


def test_manager_login_outside_permitted_hours(client, monkeypatch):
    """Requirement: Login outside permitted hours (e.g. 10:30 PM IST is outside 09:00 - 20:00)."""
    mock_night = datetime(2026, 11, 9, 22, 30, 0, tzinfo=IST)
    monkeypatch.setattr(access_control_service, "get_ist_now", lambda: mock_night)

    res = client.post(
        "/api/v1/auth/login",
        json={"identifier": "manager@bandhej.com", "password": "Manager@123"}
    )
    assert res.status_code == 403
    err = res.json()["detail"]
    assert err["code"] == "ACCESS_HOURS_EXPIRED"
    assert "Manager access hours" in err["message"]


def test_automatic_session_expiration_when_time_passes(client, monkeypatch):
    """
    Requirement: Manager gets a token during valid hours,
    but subsequent API calls after end-time must be automatically blocked!
    """
    # 1. Login at 19:55 (07:55 PM IST - within hours)
    login_time = datetime(2026, 11, 9, 19, 55, 0, tzinfo=IST)
    monkeypatch.setattr(access_control_service, "get_ist_now", lambda: login_time)

    login_res = client.post(
        "/api/v1/auth/login",
        json={"identifier": "manager@bandhej.com", "password": "Manager@123"}
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # 2. Advance time to 20:05 (08:05 PM IST - past end time 20:00)
    expired_time = datetime(2026, 11, 9, 20, 5, 0, tzinfo=IST)
    monkeypatch.setattr(access_control_service, "get_ist_now", lambda: expired_time)

    # 3. Request protected endpoint -> MUST BE BLOCKED
    api_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert api_res.status_code == 403
    assert api_res.json()["detail"]["code"] == "ACCESS_HOURS_EXPIRED"


def test_manual_lock_and_unlock(client, monkeypatch):
    """
    Requirement:
    - Admin can lock Manager immediately, even during valid hours.
    - Manual lock overrides scheduled hours.
    - Active sessions are immediately blocked.
    - Only Admin can unlock.
    """
    valid_time = datetime(2026, 11, 9, 11, 0, 0, tzinfo=IST)
    monkeypatch.setattr(access_control_service, "get_ist_now", lambda: valid_time)

    # 1. Get Admin token
    admin_login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin@bandhej.com", "password": "Admin@123"}
    )
    admin_token = admin_login.json()["access_token"]

    # 2. Get Manager token
    manager_login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "manager@bandhej.com", "password": "Manager@123"}
    )
    manager_token = manager_login.json()["access_token"]
    manager_id = manager_login.json()["user_id"]

    # Manager works before lock
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {manager_token}"})
    assert res.status_code == 200

    # 3. Admin locks manager account immediately
    lock_res = client.post(
        f"/api/v1/managers/{manager_id}/lock",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"reason": "Audit verification required"}
    )
    assert lock_res.status_code == 200
    assert lock_res.json()["is_locked"] is True

    # 4. Manager's active session is IMMEDIATELY blocked on next request
    blocked_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {manager_token}"})
    assert blocked_res.status_code in (401, 403)

    # 5. Manager trying to login again is blocked
    relogin_res = client.post(
        "/api/v1/auth/login",
        json={"identifier": "manager@bandhej.com", "password": "Manager@123"}
    )
    assert relogin_res.status_code == 403
    assert relogin_res.json()["detail"]["code"] == "ACCOUNT_LOCKED"

    # 6. Admin unlocks Manager account
    unlock_res = client.post(
        f"/api/v1/managers/{manager_id}/unlock",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert unlock_res.status_code == 200
    assert unlock_res.json()["is_locked"] is False

    # 7. Manager can log in again
    new_login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "manager@bandhej.com", "password": "Manager@123"}
    )
    assert new_login.status_code == 200


def test_manager_cannot_perform_admin_actions(client, monkeypatch):
    """
    Requirement: Manager must NOT be allowed to access admin endpoints,
    modify timings, unlock accounts, or create other users.
    """
    valid_time = datetime(2026, 11, 9, 12, 0, 0, tzinfo=IST)
    monkeypatch.setattr(access_control_service, "get_ist_now", lambda: valid_time)

    manager_login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "manager@bandhej.com", "password": "Manager@123"}
    )
    manager_token = manager_login.json()["access_token"]
    manager_id = manager_login.json()["user_id"]

    # Attempt to list managers -> 403 Forbidden
    res1 = client.get("/api/v1/managers/", headers={"Authorization": f"Bearer {manager_token}"})
    assert res1.status_code == 403

    # Attempt to change own timing -> 403 Forbidden
    res2 = client.put(
        f"/api/v1/managers/{manager_id}/timing",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"access_start_time": "00:00", "access_end_time": "23:59"}
    )
    assert res2.status_code == 403

    # Attempt to unlock -> 403 Forbidden
    res3 = client.post(
        f"/api/v1/managers/{manager_id}/unlock",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert res3.status_code == 403
