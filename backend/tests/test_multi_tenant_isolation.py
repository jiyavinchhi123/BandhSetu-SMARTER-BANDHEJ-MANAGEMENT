import pytest
from datetime import date
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from starlette.requests import Request

from app.database.session import SessionLocal
from app.models.user import User
from app.models.company import Company
from app.models.worker import Worker
from app.models.item import Item
from app.models.work_distribution import WorkDistribution
from app.models.payment_record import PaymentRecord
from app.core.security import hash_password, create_access_token

from app.api.v1.endpoints.auth import register_company, login
from app.api.v1.endpoints.workers import get_worker_profile, register_worker, get_workers, update_worker_profile
from app.api.v1.endpoints.items import create_item, list_items, get_item, toggle_item_status
from app.api.v1.endpoints.company import list_company_admins, create_company_admin, deactivate_company_admin
from app.api.v1.endpoints.analytics import get_dashboard_metrics

from app.schemas.auth import CompanyRegisterRequest, LoginRequest, AdminCreateRequest
from app.schemas.worker import WorkerCreate, WorkerUpdate
from app.schemas.item import ItemCreate


def make_request():
    return Request({'type': 'http', 'client': ('127.0.0.1', 50000), 'headers': []})


@pytest.fixture
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_default_company_one_preservation(db_session):
    """
    Ensures that default Company 1 ('Vinchhi Bandhej', COMP-0001) exists,
    Primary Admin is Bhavna Mehta (user_id=1), and existing production records are intact.
    """
    comp1 = db_session.query(Company).filter(Company.id == 1).first()
    assert comp1 is not None
    assert comp1.code == "COMP-0001"
    assert "Vinchhi Bandhej" in comp1.name

    # Check Bhavna Mehta
    admin = db_session.query(User).filter(User.id == 1).first()
    assert admin is not None
    assert admin.business_id == 1
    assert admin.is_primary_admin is True

    # Check Radhikaben negative balance: 350 earned - 400 paid = -50
    radhika = db_session.query(Worker).filter(Worker.full_name.like("%Radhikaben%")).first()
    if radhika:
        assert radhika.business_id == 1
        profile = get_worker_profile(worker_id=radhika.id, current_user=admin, db=db_session)
        assert profile.payable_balance == -50.00 or profile.payable_balance < 0, f"Expected negative balance, got {profile.payable_balance}"


def test_company_registration_and_primary_admin(db_session):
    """
    Registers a new independent company 'Shree Radhe Bandhej'.
    Ensures creator is designated Primary Admin with unique COMP-XXXX code.
    Duplicate company registration must be rejected.
    """
    req = make_request()
    payload = CompanyRegisterRequest(
        company_name="Shree Radhe Bandhej",
        legal_name="Shree Radhe Bandhej Creations LLP",
        full_name="Rameshbhai Patel",
        email="ramesh@radhebandhej.com",
        phone="+919825099999",
        password="Password@123",
        city="Jamnagar",
        state="Gujarat"
    )

    try:
        res = register_company(req=payload, request=req, db=db_session)
        assert res.company_name == "Shree Radhe Bandhej"
        assert res.is_primary_admin is True
        assert res.role == "admin"
        assert res.access_token is not None
        assert res.business_id > 1
    except HTTPException as e:
        # If already created by previous run
        assert e.status_code == 400
        assert "already exists" in e.detail

    # Duplicate registration check
    with pytest.raises(HTTPException) as exc_info:
        register_company(req=payload, request=req, db=db_session)
    assert exc_info.value.status_code == 400
    assert "already exists" in exc_info.value.detail


def test_login_with_company_name(db_session):
    """
    Tests logging in using company name, email, and password.
    """
    req = make_request()
    login_payload = LoginRequest(
        company_name="Vinchhi Bandhej",
        identifier="dev.vinchhi@gmail.com",
        password="admin@123"
    )
    res = login(req=login_payload, request=req, db=db_session)
    assert res.company_name == "Vinchhi Bandhej"
    assert res.business_id == 1
    assert res.role == "admin"

    # Invalid company name must be rejected
    invalid_comp = LoginRequest(
        company_name="NonExistent Bandhej Ltd",
        identifier="dev.vinchhi@gmail.com",
        password="admin@123"
    )
    with pytest.raises(HTTPException) as exc_info:
        login(req=invalid_comp, request=req, db=db_session)
    assert exc_info.value.status_code == 401
    assert "not found" in exc_info.value.detail.lower()


def test_multi_tenant_worker_isolation(db_session):
    """
    Creates an artisan in Company 2 ('Shree Radhe Bandhej').
    Verifies that Company 1 Admin CANNOT see, retrieve, or update this artisan.
    """
    comp2 = db_session.query(Company).filter(Company.name == "Shree Radhe Bandhej").first()
    assert comp2 is not None

    admin1 = db_session.query(User).filter(User.id == 1).first()
    admin2 = db_session.query(User).filter(User.business_id == comp2.id, User.role == "admin").first()
    assert admin1 is not None
    assert admin2 is not None

    # 1. Admin 2 registers an artisan in Company 2
    worker_payload = WorkerCreate(
        full_name="Kajalben Vaghela",
        phone="+919876543219",
        town="Khambhalia",
        city="Jamnagar",
        village="Lalpur",
        status="Active"
    )
    existing_k = db_session.query(Worker).filter(Worker.phone == "+919876543219", Worker.business_id == comp2.id).first()
    if not existing_k:
        worker2 = register_worker(worker_in=worker_payload, current_user=admin2, db=db_session)
        worker2_id = worker2.id
    else:
        worker2_id = existing_k.id

    # 2. Company 2 admin lists workers -> sees Kajalben
    comp2_workers = get_workers(current_user=admin2, db=db_session)
    comp2_names = [w.full_name for w in comp2_workers]
    assert "Kajalben Vaghela" in comp2_names

    # 3. Company 1 admin lists workers -> DOES NOT see Kajalben!
    comp1_workers = get_workers(current_user=admin1, db=db_session)
    comp1_names = [w.full_name for w in comp1_workers]
    assert "Kajalben Vaghela" not in comp1_names

    # 4. Cross-tenant access: Company 1 Admin attempts to GET Company 2 artisan by ID -> 404!
    with pytest.raises(HTTPException) as exc_get:
        get_worker_profile(worker_id=worker2_id, current_user=admin1, db=db_session)
    assert exc_get.value.status_code == 404

    # 5. Cross-tenant update: Company 1 Admin attempts to PUT Company 2 artisan -> 404!
    with pytest.raises(HTTPException) as exc_put:
        update_worker_profile(
            worker_id=worker2_id,
            data=WorkerUpdate(town="HackedTown"),
            current_user=admin1,
            db=db_session
        )
    assert exc_put.value.status_code == 404


def test_multi_tenant_item_catalogue_isolation(db_session):
    """
    Creates an item in Company 2.
    Verifies Company 1 Admin cannot see, modify, or toggle it.
    """
    comp2 = db_session.query(Company).filter(Company.name == "Shree Radhe Bandhej").first()
    admin1 = db_session.query(User).filter(User.id == 1).first()
    admin2 = db_session.query(User).filter(User.business_id == comp2.id, User.role == "admin").first()

    # Admin 2 creates item in Company 2
    item_payload = ItemCreate(
        item_name="Radhe Gajji Silk Dupatta",
        price_per_piece=220.00,
        is_active=True,
        item_code="RADHE-01"
    )
    existing_item = db_session.query(Item).filter(Item.item_code == "RADHE-01", Item.business_id == comp2.id).first()
    if not existing_item:
        item2 = create_item(item_in=item_payload, admin_user=admin2, db=db_session)
        item2_id = item2.id
    else:
        item2_id = existing_item.id

    # Company 1 lists items -> does NOT include Radhe Gajji Silk
    comp1_items = list_items(current_user=admin1, db=db_session)
    comp1_names = [it.item_name for it in comp1_items]
    assert "Radhe Gajji Silk Dupatta" not in comp1_names

    # Cross-tenant access by ID -> 404
    with pytest.raises(HTTPException) as exc_get:
        get_item(item_id=item2_id, current_user=admin1, db=db_session)
    assert exc_get.value.status_code == 404

    # Cross-tenant toggle -> 404
    with pytest.raises(HTTPException) as exc_toggle:
        toggle_item_status(item_id=item2_id, admin_user=admin1, db=db_session)
    assert exc_toggle.value.status_code == 404


def test_multi_admin_authorization_within_company(db_session):
    """
    Tests Primary Admin inviting/authorizing a secondary Admin for their company.
    Verifies that Primary Admin cannot be deactivated, but secondary Admin can be deactivated.
    """
    comp2 = db_session.query(Company).filter(Company.name == "Shree Radhe Bandhej").first()
    primary_admin2 = db_session.query(User).filter(
        User.business_id == comp2.id,
        User.is_primary_admin == True
    ).first()

    # 1. Primary Admin authorizes secondary Admin
    sec_admin_email = "partner@radhebandhej.com"
    existing_sec = db_session.query(User).filter(User.email == sec_admin_email).first()
    req = make_request()
    if not existing_sec:
        sec_admin_data = create_company_admin(
            req=AdminCreateRequest(
                email=sec_admin_email,
                phone="+919825088888",
                full_name="Sureshbhai Partner",
                password="Password@456"
            ),
            request=req,
            admin_user=primary_admin2,
            db=db_session
        )
        assert sec_admin_data.is_primary_admin is False
        assert sec_admin_data.authorized_by_id == primary_admin2.id
        sec_admin_id = sec_admin_data.id
    else:
        sec_admin_id = existing_sec.id

    # 2. List company admins
    admins = list_company_admins(admin_user=primary_admin2, db=db_session)
    admin_emails = [a.email for a in admins]
    assert primary_admin2.email in admin_emails
    assert sec_admin_email in admin_emails

    # 3. Attempt to deactivate Primary Admin -> must fail (400)
    with pytest.raises(HTTPException) as exc_pri:
        deactivate_company_admin(admin_id=primary_admin2.id, request=req, admin_user=primary_admin2, db=db_session)
    assert exc_pri.value.status_code == 400
    assert "primary admin" in exc_pri.value.detail.lower()

    # 4. Deactivate secondary Admin -> succeeds
    sec_updated = deactivate_company_admin(admin_id=sec_admin_id, request=req, admin_user=primary_admin2, db=db_session)
    assert sec_updated.is_active is False


def test_dashboard_metrics_multi_tenant_isolation(db_session):
    """
    Verifies that dashboard KPI metrics are isolated per company.
    """
    admin1 = db_session.query(User).filter(User.id == 1).first()
    comp2 = db_session.query(Company).filter(Company.name == "Shree Radhe Bandhej").first()
    admin2 = db_session.query(User).filter(User.business_id == comp2.id, User.role == "admin").first()

    dash1 = get_dashboard_metrics(current_user=admin1, db=db_session)
    dash2 = get_dashboard_metrics(current_user=admin2, db=db_session)

    # Total registered women in Company 1 must differ from Company 2
    assert dash1.total_registered_women >= 2  # Simaben, Radhikaben, etc.
    assert dash2.total_registered_women >= 1  # Kajalben
    assert dash1.total_registered_women != dash2.total_registered_women


def test_company_initials_worker_id_and_numeric_search(db_session):
    """
    Requirement:
    1. Worker ID format: Company initials + '-' + number.
       For 'Paradise Bandhani' -> PB-1, PB-2, etc.
       For 'Vinchhi Bandhej' -> VB-1, VB-2, etc.
    2. Searching: allows searching by bare numbers like 1, 2, 3 as well as PB-1 or name.
    """
    from app.services.worker_service import WorkerService

    # 1. Verify prefix generation
    assert WorkerService.compute_company_prefix("Paradise Bandhani") == "PB"
    assert WorkerService.compute_company_prefix("Vinchhi Bandhej") == "VB"
    assert WorkerService.compute_company_prefix("Shree Radhe Bandhej") == "SRB"

    # 2. Register company "Paradise Bandhani" if not present
    req = make_request()
    pb_payload = CompanyRegisterRequest(
        company_name="Paradise Bandhani",
        legal_name="Paradise Bandhani LLP",
        full_name="Pravinbhai Paradise",
        email="pravin@paradisebandhani.com",
        phone="+919825111111",
        password="Password@123",
        city="Jamnagar",
        state="Gujarat"
    )
    pb_comp = db_session.query(Company).filter(Company.name == "Paradise Bandhani").first()
    if not pb_comp:
        reg_res = register_company(req=pb_payload, request=req, db=db_session)
        pb_comp = db_session.query(Company).filter(Company.name == "Paradise Bandhani").first()

    pb_admin = db_session.query(User).filter(User.business_id == pb_comp.id, User.role == "admin").first()

    # 3. Create first artisan for Paradise Bandhani -> must be PB-1!
    existing_w = db_session.query(Worker).filter(Worker.business_id == pb_comp.id).first()
    if not existing_w:
        w1 = register_worker(
            worker_in=WorkerCreate(
                full_name="Geetaben Solanki",
                phone="+919825122222",
                town="Jamnagar",
                status="Active"
            ),
            current_user=pb_admin,
            db=db_session
        )
        assert w1.serial_number == "PB-1", f"Expected PB-1, got {w1.serial_number}"
    else:
        assert existing_w.serial_number.startswith("PB-")

    # 4. Search by bare number '1' -> matches PB-1
    res_1, total_1 = WorkerService.search_workers(db=db_session, q="1", business_id=pb_comp.id)
    assert any(w.serial_number == "PB-1" for w in res_1)

    # 5. Search for Company 1 (Vinchhi Bandhej) workers by '1' and '2'
    res_vb1, _ = WorkerService.search_workers(db=db_session, q="1", business_id=1)
    assert any(w.serial_number == "VB-1" for w in res_vb1)

    res_vb2, _ = WorkerService.search_workers(db=db_session, q="2", business_id=1)
    assert any(w.serial_number == "VB-2" for w in res_vb2)


def test_excel_and_csv_export_has_company_name_on_top(db_session):
    """
    Requirement:
    Excel and CSV / PDF exports must have the Company Name on top.
    """
    from app.services.analytics_service import AnalyticsService

    # 1. Pending work report CSV export
    report_data = AnalyticsService.get_pending_work_report(db=db_session, business_id=1)
    csv_out = AnalyticsService.export_pending_work_csv(report_data, company_name="Paradise Bandhani")
    lines = [l.strip() for l in csv_out.strip().split("\n") if l.strip()]

    # First row must be the company name on top!
    assert "PARADISE BANDHANI" in lines[0].upper()
    assert "ARTISAN PENDING WORK" in lines[1].upper()
