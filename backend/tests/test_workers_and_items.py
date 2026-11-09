import os
import sys
from datetime import date
from starlette.requests import Request
from fastapi import HTTPException

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.session import Base, engine, SessionLocal
from app.models.user import User
from app.models.worker import Worker
from app.models.item import Item
from app.models.work_distribution import WorkDistribution
from app.core.security import hash_password
from app.schemas.worker import (
    WorkerCreate,
    WorkerUpdate,
    WorkDistributionCreate,
    PaymentRecordCreate,
)
from app.schemas.item import ItemCreate, ItemUpdate
from app.api.v1.endpoints.workers import (
    get_workers,
    register_worker,
    get_worker_profile,
    update_worker_profile,
    get_material_ledger,
    get_work_distribution,
    issue_work_consignment,
    record_worker_payment,
    get_complete_timeline,
)
from app.api.v1.endpoints.items import (
    list_items,
    create_item,
    get_item,
    update_item,
    toggle_item_status,
)
from app.services.worker_service import worker_service


def make_request():
    return Request({'type': 'http', 'client': ('127.0.0.1', 50000), 'headers': []})


def run_tests():
    print("=================================================================")
    print("STARTING STEP 3 — WORKER & ITEM MANAGEMENT AUTOMATED TEST SUITE")
    print("=================================================================")

    # Initialize tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # 1. Setup Admin and Manager users
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
    manager = User(
        email="manager@bandhej.com",
        phone="+919876543211",
        full_name="Rajesh Patel (Manager)",
        hashed_password=hash_password("Manager@123"),
        role="manager",
        is_active=True,
        is_locked=False,
        access_start_time="00:00",
        access_end_time="23:59",
        token_version=1
    )
    db.add_all([admin, manager])
    db.commit()

    # -------------------------------------------------------------
    # TEST 1: Serial Number Generation & Non-Reuse Guarantee
    # -------------------------------------------------------------
    print("\n--- TEST 1: Sequential & Non-Reusable Serial Numbers ---")
    sn1 = worker_service.generate_next_serial_number(db)
    assert sn1 == "WRK-0001", f"Expected WRK-0001, got {sn1}"

    # Register Worker 1
    w1_in = WorkerCreate(
        full_name="Kamlaben Vaghela",
        phone="+91 98250 12345",
        town="Anjar",
        city="Bhuj",
        village="Khavda",
        joining_date=date(2025, 4, 15),
        status="Active",
        remarks="Master artisan"
    )
    w1 = register_worker(w1_in, current_user=admin, db=db)
    assert w1.serial_number == "WRK-0001"

    # Register Worker 2
    w2_in = WorkerCreate(
        full_name="Santoshben Parmar",
        phone="+91 94280 67890",
        town="Mandvi",
        city="Bhuj",
        village="Madhapar",
        joining_date=date(2025, 6, 1),
        status="Active"
    )
    w2 = register_worker(w2_in, current_user=manager, db=db)
    assert w2.serial_number == "WRK-0002"

    # Register Worker 3, 4, 5 with 'R' names (all Active)
    w3 = register_worker(WorkerCreate(full_name="Rekhaben Rathod", phone="+91 97120 98765", town="Mundra", city="Bhuj", village="Mundra", status="Active"), current_user=admin, db=db)
    w4 = register_worker(WorkerCreate(full_name="Ranjanben Jadeja", phone="+91 98980 11223", town="Bhuj", city="Bhuj", village="Khavda", status="Active"), current_user=admin, db=db)
    w5 = register_worker(WorkerCreate(full_name="Rupalben Chauhan", phone="+91 94090 33445", town="Anjar", city="Gandhidham", village="Varsamedi", status="Active"), current_user=admin, db=db)

    assert w3.serial_number == "WRK-0003"
    assert w4.serial_number == "WRK-0004"
    assert w5.serial_number == "WRK-0005"
    print(f"[PASS] Sequential serial numbers issued: WRK-0001 through WRK-0005.")

    # Register a 6th worker and deactivate to test Non-Reuse
    w6 = register_worker(WorkerCreate(full_name="Geetaben Ahir", phone="+91 98765 11111", town="Bhuj", city="Bhuj", village="Khavda", status="Active"), current_user=admin, db=db)
    assert w6.serial_number == "WRK-0006"
    w6.status = "Inactive"
    db.commit()

    sn_next = worker_service.generate_next_serial_number(db)
    assert sn_next == "WRK-0007", f"Expected WRK-0007, got {sn_next}. Serial numbers must never be reused!"
    print(f"[PASS] Verified serial numbers are NEVER reused. Next serial is {sn_next}.")

    # -------------------------------------------------------------
    # TEST 2: Dynamic Search with Partial Matching (Typing 'R')
    # -------------------------------------------------------------
    print("\n--- TEST 2: Dynamic Search Partial Matching ---")
    # Search 'R' -> Matches Rekhaben, Ranjanben, Rupalben
    results_r = get_workers(q="r", status="Active", current_user=manager, db=db)
    r_names = [w.full_name for w in results_r]
    print(f"Search 'r' matched {len(results_r)} active artisans: {r_names}")
    assert any("Rekha" in name for name in r_names)
    assert any("Ranjan" in name for name in r_names)
    assert any("Rupal" in name for name in r_names)
    print("[PASS] Typing 'R' successfully returns Rekhaben, Ranjanben, Rupalben.")

    # Search by Serial Number
    results_sn = get_workers(q="WRK-0002", status="All", current_user=manager, db=db)
    assert len(results_sn) == 1
    assert results_sn[0].full_name == "Santoshben Parmar"
    print("[PASS] Search by serial number 'WRK-0002' verified.")

    # Search by Village
    results_vlg = get_workers(q="Khavda", status="All", current_user=manager, db=db)
    assert len(results_vlg) >= 2
    print(f"[PASS] Search by village 'Khavda' returned {len(results_vlg)} matching workers.")

    # Search by Mobile Number
    results_phone = get_workers(q="98250", status="All", current_user=manager, db=db)
    assert len(results_phone) == 1
    assert results_phone[0].full_name == "Kamlaben Vaghela"
    print("[PASS] Search by phone substring '98250' verified.")

    # -------------------------------------------------------------
    # TEST 3: Item Catalogue Management & Searchable Dropdown
    # -------------------------------------------------------------
    print("\n--- TEST 3: Item Catalogue Creation & Search ---")
    item1_in = ItemCreate(
        item_name="Pure Gajji Silk Saree - Bharti Knot",
        item_code="GAJ-BHR-01",
        price_per_piece=220.00,
        description="Heavy Gajji silk saree for intricate knotting",
        is_active=True
    )
    item1 = create_item(item1_in, admin_user=admin, db=db)
    assert item1.price_per_piece == 220.00
    print(f"[PASS] Item created: {item1.item_name} at initial price ₹{item1.price_per_piece}/pc")

    item2_in = ItemCreate(
        item_name="Red Bridal Bandhej Gharchola",
        item_code="GHR-BRD-05",
        price_per_piece=480.00,
        description="Traditional wedding Gharchola with zari grid",
        is_active=True
    )
    item2 = create_item(item2_in, admin_user=admin, db=db)

    # Search items typing 'R'
    matched_items = list_items(q="r", current_user=manager, db=db)
    item_names = [i.item_name for i in matched_items]
    print(f"Search items 'r' matched: {item_names}")
    assert any("Red Bridal" in name for name in item_names)
    assert any("Gajji Silk" in name for name in item_names)
    print("[PASS] Searchable item dropdown supports partial typing matches.")

    # -------------------------------------------------------------
    # TEST 4: Historical Price Protection
    # -------------------------------------------------------------
    print("\n--- TEST 4: Historical Price Protection ---")
    # Issue work batch to Kamlaben (w1) using item1 at ₹220/pc
    dist_in = WorkDistributionCreate(
        item_id=item1.id,
        knot_style="Bharti (Dense)",
        quantity_issued=40,
        due_date=date(2026, 12, 1),
        bonus=200.0,
        deductions=0.0,
        remarks="Urgent wedding order"
    )
    batch = issue_work_consignment(w1.id, dist_in, current_user=manager, db=db)
    assert batch.rate_per_piece == 220.00
    assert batch.quantity_issued == 40
    # Expected gross: 40 * 220 = 8800. Net: 8800 + 200 = 9000
    assert batch.total_gross_wage == 8800.00
    assert batch.net_payable == 9000.00
    print(f"[PASS] Consignment issued with snapshot rate: ₹{batch.rate_per_piece}/pc. Net payable: ₹{batch.net_payable}")

    # Now Admin increases Item 1 price from ₹220.00 to ₹275.00!
    print("Admin updating Item 1 price in catalogue to ₹275.00...")
    updated_item = update_item(item1.id, ItemUpdate(price_per_piece=275.00), admin_user=admin, db=db)
    assert updated_item.price_per_piece == 275.00

    # Verify that the PREVIOUS transaction permanently retained the historical rate of ₹220.00!
    reloaded_batch = db.query(WorkDistribution).filter(WorkDistribution.id == batch.id).first()
    assert reloaded_batch.rate_per_piece == 220.00, f"Violation! Historical rate changed to {reloaded_batch.rate_per_piece}"
    assert reloaded_batch.total_gross_wage == 8800.00
    assert reloaded_batch.net_payable == 9000.00
    print(f"[PASS] Historical Price Protection Confirmed: Batch {reloaded_batch.batch_code} still retains snapshot rate ₹{reloaded_batch.rate_per_piece} despite catalogue change to ₹275.00!")

    # Verify new consignment uses the new price
    new_batch = issue_work_consignment(
        w1.id,
        WorkDistributionCreate(item_id=item1.id, knot_style="Bharti", quantity_issued=10, due_date=date(2026, 12, 10)),
        current_user=manager,
        db=db
    )
    assert new_batch.rate_per_piece == 275.00
    assert new_batch.total_gross_wage == 2750.00
    print(f"[PASS] Subsequent consignment correctly adopts updated catalogue rate ₹{new_batch.rate_per_piece}/pc.")

    # -------------------------------------------------------------
    # TEST 5: Worker Profile Tabs Data Integrity
    # -------------------------------------------------------------
    print("\n--- TEST 5: Worker Profile Tabs Data Integrity ---")
    # Verify Worker counters
    w1_profile = get_worker_profile(w1.id, current_user=manager, db=db)
    # Total pieces: 40 + 10 = 50 pending
    assert w1_profile.pending_pieces == 50
    # Total payable: 9000 + 2750 = 11750
    assert float(w1_profile.payable_balance) == 11750.00
    print(f"[PASS] Worker profile prominently displays: Pending Pieces={w1_profile.pending_pieces}, Payable Balance=₹{w1_profile.payable_balance}")

    # Record Payment of ₹5000 to worker
    pay_in = PaymentRecordCreate(
        payment_type="Wage Payout",
        amount=5000.00,
        payment_mode="Cash",
        reference_no="CASH-REC-101",
        notes="Diwali advance wage disbursal"
    )
    pay = record_worker_payment(w1.id, pay_in, current_user=admin, db=db)
    assert pay.amount == 5000.00

    # Check updated balance: 11750 - 5000 = 6750
    db.refresh(w1_profile)
    assert float(w1_profile.payable_balance) == 6750.00
    print(f"[PASS] Payment recorded. Updated balance: ₹{w1_profile.payable_balance}")

    # Verify Material Ledger entries
    mat_entries = get_material_ledger(w1.id, current_user=manager, db=db)
    assert len(mat_entries) >= 2
    print(f"[PASS] Material Ledger has {len(mat_entries)} entries for worker.")

    # Verify Unified Timeline
    timeline = get_complete_timeline(w1.id, current_user=manager, db=db)
    assert len(timeline) >= 4  # 2 distributions + 1 payment + 2 material items
    categories = [t.category for t in timeline]
    print(f"[PASS] Unified Timeline has {len(timeline)} events. Categories: {set(categories)}")

    db.close()
    print("\n=================================================================")
    print("ALL 5 WORKER & ITEM MANAGEMENT TESTS PASSED (100% SUCCESS)")
    print("=================================================================")


if __name__ == "__main__":
    run_tests()
