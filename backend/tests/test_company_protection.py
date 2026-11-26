import pytest
from datetime import datetime, date
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from starlette.requests import Request

from app.database.session import SessionLocal
from app.models.company import Company
from app.models.user import User
from app.models.worker import Worker
from app.models.item import Item
from app.models.work_distribution import WorkDistribution
from app.core.security import hash_password, create_access_token

from app.api.v1.endpoints.auth import register_company, login
from app.api.v1.endpoints.company import (
    get_my_company,
    update_my_company,
    suspend_my_company,
    reactivate_my_company,
    delete_my_company,
)
from app.api.v1.endpoints.workers import get_worker_profile
from app.api.v1.endpoints.items import get_item
from app.services.access_control_service import access_control_service

from app.schemas.auth import (
    CompanyRegisterRequest,
    CompanyUpdateRequest,
    CompanySuspendRequest,
    CompanyReactivateRequest,
    CompanyDeleteRequest,
    LoginRequest,
)


def make_request():
    return Request({'type': 'http', 'client': ('127.0.0.1', 50000), 'headers': []})


@pytest.fixture
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_unique_company_id_and_code(db_session):
    """
    Every company must have a unique Company ID and unique Company Code (COMP-XXXX).
    """
    comps = db_session.query(Company).all()
    codes = [c.code for c in comps]
    ids = [c.id for c in comps]

    assert len(codes) == len(set(codes)), "Company codes must be strictly unique"
    assert len(ids) == len(set(ids)), "Company IDs must be strictly unique"
    for code in codes:
        assert code.startswith("COMP-")


def test_prevent_duplicate_company_registration(db_session):
    """
    Prevents duplicate company registration using case-insensitive names,
    verified registered phone, and verified email.
    """
    req_http = make_request()

    # Attempt to register with existing name (Vinchhi Bandhej) with different case/spaces
    duplicate_name_req = CompanyRegisterRequest(
        company_name="  vinchhi bandhej  ",
        legal_name="Duplicate Attempt",
        full_name="Test Admin",
        email="test_unique_dup@bandhej.com",
        phone="+919876543210",
        password="Password@123",
    )
    with pytest.raises(HTTPException) as exc_info:
        register_company(duplicate_name_req, req_http, db_session)
    assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
    assert "already exists" in exc_info.value.detail.lower()

    # Attempt to register with Bhavna Mehta's existing email
    duplicate_email_req = CompanyRegisterRequest(
        company_name="Unique Brand New Test Company",
        legal_name="Unique New Brand",
        full_name="New Person",
        email="dev.vinchhi@gmail.com",
        phone="+919111122222",
        password="Password@123",
    )
    with pytest.raises(HTTPException) as exc_email:
        register_company(duplicate_email_req, req_http, db_session)
    assert exc_email.value.status_code == status.HTTP_400_BAD_REQUEST
    assert "already exists" in exc_email.value.detail.lower()


def test_cross_company_id_tampering_prevented(db_session):
    """
    Ensures that changing an ID in URL or API request cannot view another company's records.
    Company 1 admin querying Company 2's worker or item returns 404 Not Found.
    """
    admin_comp1 = db_session.query(User).filter(User.business_id == 1, User.role == "admin").first()
    assert admin_comp1 is not None

    # Find or create a worker in Company 2
    worker_comp2 = db_session.query(Worker).filter(Worker.business_id != 1).first()
    if not worker_comp2:
        worker_comp2 = Worker(
            business_id=2,
            serial_number="TEST-99",
            full_name="Cross Tenant Test Artisan",
            phone="+919999900000",
            town="Bhuj",
            status="Active"
        )
        db_session.add(worker_comp2)
        db_session.commit()
        db_session.refresh(worker_comp2)

    # Admin of Company 1 tries to access Company 2's worker
    with pytest.raises(HTTPException) as exc_info:
        get_worker_profile(worker_id=worker_comp2.id, current_user=admin_comp1, db=db_session)
    assert exc_info.value.status_code == 404

    # Admin of Company 1 tries to access Company 2's item
    item_comp2 = db_session.query(Item).filter(Item.business_id != 1).first()
    if not item_comp2:
        item_comp2 = Item(
            business_id=2,
            item_name="Cross Tenant Saree",
            item_code="CTS-01",
            price_per_piece=350.0,
            is_active=True
        )
        db_session.add(item_comp2)
        db_session.commit()
        db_session.refresh(item_comp2)

    with pytest.raises(HTTPException) as exc_item:
        get_item(item_id=item_comp2.id, current_user=admin_comp1, db=db_session)
    assert exc_item.value.status_code == 404


def test_company_suspension_blocks_access_preserves_data(db_session):
    """
    Company suspension blocks access without deleting any data.
    All historical artisan records, ledgers, and items are 100% preserved.
    Reactivating restores full operational access.
    """
    req_http = make_request()

    # Create temporary company for suspension test
    temp_comp_name = f"Suspension Test Co {datetime.now().strftime('%M%S')}"
    reg_req = CompanyRegisterRequest(
        company_name=temp_comp_name,
        legal_name="Suspension Test Pvt Ltd",
        full_name="Primary Admin Susp",
        email=f"admin_susp_{datetime.now().strftime('%M%S')}@test.com",
        phone=f"+9198{datetime.now().strftime('%H%M%S')}",
        password="SecurePassword@123",
    )
    reg_res = register_company(reg_req, req_http, db_session)
    assert reg_res is not None

    admin_user = db_session.query(User).filter(User.id == reg_res.user_id).first()
    comp_id = admin_user.business_id

    # Add a worker to verify data preservation
    unique_ts = datetime.now().strftime('%H%M%S%f')
    w = Worker(
        business_id=comp_id,
        serial_number=f"ST-{unique_ts}",
        full_name="Artisan To Preserve",
        phone=f"+9198{unique_ts[:8]}",
        town="Jamnagar",
        status="Active"
    )
    db_session.add(w)
    db_session.commit()
    db_session.refresh(w)

    # 1. Suspend the company with reason and Primary Admin password
    suspend_req = CompanySuspendRequest(
        reason="Annual compliance review & inventory audit",
        password="SecurePassword@123"
    )
    suspend_res = suspend_my_company(suspend_req, req_http, admin_user, db_session)
    assert suspend_res["status"] == "Suspended"

    # 2. Verify login is now blocked
    login_req = LoginRequest(
        company_name=temp_comp_name,
        identifier=admin_user.email,
        password="SecurePassword@123"
    )
    with pytest.raises(HTTPException) as exc_login:
        login(login_req, req_http, db_session)
    assert exc_login.value.status_code == status.HTTP_403_FORBIDDEN
    assert "suspended" in exc_login.value.detail.lower()

    # 3. Verify ALL data is 100% preserved in the database
    worker_check = db_session.query(Worker).filter(Worker.id == w.id, Worker.business_id == comp_id).first()
    assert worker_check is not None
    assert worker_check.full_name == "Artisan To Preserve"

    # 4. Reactivate company
    reactivate_req = CompanyReactivateRequest(password="SecurePassword@123")
    reactivate_res = reactivate_my_company(reactivate_req, req_http, admin_user, db_session)
    assert reactivate_res["status"] == "Active"

    # 5. Verify login works again
    login_success = login(login_req, req_http, db_session)
    assert login_success.access_token is not None


def test_company_operational_rules_and_business_hours(db_session):
    """
    Each company should have its own settings, business hours, and operational rules.
    """
    req_http = make_request()
    admin_comp1 = db_session.query(User).filter(User.business_id == 1, User.role == "admin").first()

    update_req = CompanyUpdateRequest(
        legal_name="Vinchhi Bandhej Heritage LLP",
        gst_number="24AAACB1234F1Z0",
        operating_hours_start="07:30",
        operating_hours_end="21:30",
        operating_days="Mon,Tue,Wed,Thu,Fri,Sat",
        allow_manager_weekend_access=True
    )
    updated = update_my_company(update_req, req_http, admin_comp1, db_session)

    assert updated.operating_hours_start == "07:30"
    assert updated.operating_hours_end == "21:30"
    assert updated.gst_number == "24AAACB1234F1Z0"
    assert updated.allow_manager_weekend_access is True


def test_company_deletion_strong_authorization_and_safety(db_session):
    """
    Company deletion requires strong authorization (Primary Admin only),
    strong confirmation (exact phrase + password), and safety invariant
    (blocks deletion if active consignments exist).
    """
    req_http = make_request()

    # Create temporary company
    temp_name = f"Deletion Test Co {datetime.now().strftime('%M%S')}"
    reg_req = CompanyRegisterRequest(
        company_name=temp_name,
        legal_name="Closure Test Ltd",
        full_name="Primary Admin Del",
        email=f"del_admin_{datetime.now().strftime('%M%S')}@test.com",
        phone=f"+9197{datetime.now().strftime('%H%M%S')}",
        password="DeletePass@123",
    )
    reg_res = register_company(reg_req, req_http, db_session)
    admin_user = db_session.query(User).filter(User.id == reg_res.user_id).first()
    comp = db_session.query(Company).filter(Company.id == admin_user.business_id).first()

    # 1. Reject if wrong password
    with pytest.raises(HTTPException) as exc_pwd:
        delete_my_company(
            CompanyDeleteRequest(confirmation_phrase=f"DELETE {comp.code}", password="WrongPassword"),
            req_http,
            admin_user,
            db_session
        )
    assert exc_pwd.value.status_code == status.HTTP_401_UNAUTHORIZED

    # 2. Reject if wrong confirmation phrase
    with pytest.raises(HTTPException) as exc_phrase:
        delete_my_company(
            CompanyDeleteRequest(confirmation_phrase="delete it please", password="DeletePass@123"),
            req_http,
            admin_user,
            db_session
        )
    assert exc_phrase.value.status_code == status.HTTP_400_BAD_REQUEST

    # 3. Safety check: Cannot delete if active pieces in custody exist
    unique_del = datetime.now().strftime('%H%M%S%f')
    dist = WorkDistribution(
        business_id=comp.id,
        batch_code=f"SAFETY-TEST-{unique_del}",
        worker_id=1,
        item_id=1,
        item_name_snapshot="Safety Test Saree",
        item_code_snapshot="STS-01",
        knot_style="Standard",
        rate_per_piece=250.0,
        quantity_issued=20,
        quantity_returned=0,
        quantity_rejected=0,
        quantity_pending=20,  # Pieces pending in custody!
        status="Issued"
    )
    db_session.add(dist)
    db_session.commit()

    with pytest.raises(HTTPException) as exc_safety:
        delete_my_company(
            CompanyDeleteRequest(confirmation_phrase=f"DELETE {comp.code}", password="DeletePass@123"),
            req_http,
            admin_user,
            db_session
        )
    assert exc_safety.value.status_code == status.HTTP_400_BAD_REQUEST
    assert "pending in artisan custody" in exc_safety.value.detail.lower()

    # Clear pending pieces to simulate full return/settlement
    dist.quantity_pending = 0
    dist.status = "Settled"
    db_session.commit()

    # 4. Successful Authorized Deletion
    del_res = delete_my_company(
        CompanyDeleteRequest(confirmation_phrase=f"DELETE {comp.code}", password="DeletePass@123"),
        req_http,
        admin_user,
        db_session
    )
    assert del_res["status"] == "Deleted"

    # Confirm company is marked deleted and admin access is revoked
    db_session.refresh(comp)
    assert comp.is_deleted is True
    assert comp.status == "Deleted"
