import sys
import os
from datetime import date, datetime, timedelta
import zoneinfo

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.session import Base
from app.models.user import User
from app.models.worker import Worker
from app.models.item import Item
from app.models.work_distribution import WorkDistribution
from app.models.work_return import WorkReturn
from app.models.material_transaction import MaterialTransaction
from app.models.money_transaction import MoneyTransaction
from app.models.payment_record import PaymentRecord
from app.services.worker_service import worker_service
from app.services.distribution_service import DistributionService
from app.services.payment_service import PaymentService
from app.services.access_control_service import access_control_service
from app.services.analytics_service import AnalyticsService
from app.core.rate_limiter import limiter
from app.api.v1.endpoints.managers import lock_manager, unlock_manager
from app.schemas.auth import ManagerLockRequest
from app.schemas.worker import WorkerCreate
from starlette.requests import Request
from app.schemas.distribution import WorkDistributionCreate, WorkReturnCreate
from app.schemas.payment import AdvanceCreateRequest, PayoutCreateRequest

IST = zoneinfo.ZoneInfo("Asia/Kolkata")


def run_master_verification():
    test_db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_isolated_master.db"))
    test_engine = create_engine(f"sqlite:///{test_db_path}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=test_engine)
    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    db = TestSession()
    print("=" * 75)
    print("BANDHSETU — STEP 7 MASTER E2E & SECURITY INTEGRITY VERIFICATION SUITE")
    print("=" * 75)

    try:
        # -------------------------------------------------------------
        # 1. SETUP ACTORS: Admin and Manager
        # -------------------------------------------------------------
        admin = db.query(User).filter(User.email == "admin_master@bandhej.com").first()
        if not admin:
            admin = User(
                email="admin_master@bandhej.com",
                full_name="Bhaveshbhai Khatri (Owner)",
                role="admin",
                hashed_password="hashed_pw_admin",
                is_active=True,
                is_locked=False,
                access_start_time="00:00",
                access_end_time="23:59",
                token_version=1,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        manager = db.query(User).filter(User.email == "manager_master@bandhej.com").first()
        if not manager:
            manager = User(
                email="manager_master@bandhej.com",
                full_name="Rajeshbhai Patel (Manager)",
                role="manager",
                hashed_password="hashed_pw_manager",
                is_active=True,
                is_locked=False,
                access_start_time="09:00",
                access_end_time="20:00",
                token_version=1,
            )
            db.add(manager)
            db.commit()
            db.refresh(manager)

        print("[OK] Test actors (Admin & Manager) verified.")

        # =============================================================
        # TEST 1: Worker Registration (Sequential Non-Reusable Serial)
        # =============================================================
        print("\n--- TEST 1: Worker Registration & Non-Reusable Serial Numbers ---")
        w_created = worker_service.create_worker(
            db=db,
            data=WorkerCreate(
                full_name="Valiben Maheshwari",
                phone="9876500001",
                town="Bhuj",
                city="Bhuj",
                village="Dhamadka",
                joining_date=date.today(),
                status="Active",
                remarks="Master artisan in Kutch Ajrakh Bandhani",
            ),
        )
        assert w_created.id is not None
        assert w_created.serial_number.startswith("WRK-")
        assert w_created.payable_balance == 0.0
        assert w_created.pending_pieces == 0
        print(f"  [PASS] Registered: {w_created.full_name} with serial: {w_created.serial_number}")

        # Verify next serial is sequential and distinct
        w2_created = worker_service.create_worker(
            db=db,
            data=WorkerCreate(
                full_name="Pushpaben Chawda",
                phone="9876500002",
                town="Anjar",
                city="Gandhidham",
                village="Varsamedi",
                joining_date=date.today(),
                status="Active",
            ),
        )
        assert w2_created.serial_number != w_created.serial_number
        print(f"  [PASS] Next sequential serial issued: {w2_created.serial_number}")

        # =============================================================
        # TEST 2: Dynamic Worker Search (Partial Matches)
        # =============================================================
        print("\n--- TEST 2: Worker Search by Name, Serial, Village ---")
        # Search by partial name "Vali"
        res_name, _ = worker_service.search_workers(db=db, q="Vali")
        assert any(w.id == w_created.id for w in res_name), "Partial name match failed"

        # Search by village "Dhamadka"
        res_vill, _ = worker_service.search_workers(db=db, q="Dhamadka")
        assert any(w.id == w_created.id for w in res_vill), "Village search match failed"

        # Search by serial number
        res_serial, _ = worker_service.search_workers(db=db, q=w_created.serial_number)
        assert any(w.id == w_created.id for w in res_serial), "Serial search match failed"

        print(f"  [PASS] Dynamic partial search verified across name, village, and serial number.")

        # =============================================================
        # TEST 3 & 4: Item Price Selection & Historical Price Protection
        # =============================================================
        print("\n--- TEST 3 & 4: Item Price Selection & Historical Price Protection ---")
        test_item = Item(
            item_name="Fine Modal Silk Dupatta - Shikari Elephant",
            item_code=f"ITM-MST-{datetime.now().microsecond}",
            price_per_piece=240.00,
            is_active=True,
            description="Traditional 2.5m Modal Silk",
        )
        db.add(test_item)
        db.commit()
        db.refresh(test_item)

        # Issue work: 10 pieces at rate ₹240.00 = Potential ₹2,400.00
        dist_1 = DistributionService.give_work(
            db=db,
            data=WorkDistributionCreate(
                worker_id=w_created.id,
                item_id=test_item.id,
                quantity_issued=10,
                knot_style="Shikari (Hunting Motifs)",
                issue_date=date.today(),
                remarks="First batch consignment",
            ),
            user_id=admin.id,
            user_name="Bhaveshbhai Khatri",
        )
        assert dist_1.rate_per_piece == 240.00
        assert dist_1.quantity_pending == 10
        print(f"  Consignment {dist_1.batch_code} issued at snapshot rate: ₹{dist_1.rate_per_piece:.2f}")

        # ADMIN NOW UPDATES ITEM PRICE TO ₹320.00 in the Catalogue!
        test_item.price_per_piece = 320.00
        db.commit()
        db.refresh(test_item)
        print(f"  Catalogue price updated to: ₹{test_item.price_per_piece:.2f}")

        # CRITICAL ASSERTION: The previous distribution MUST retain ₹240.00 snapshot!
        db.refresh(dist_1)
        assert float(dist_1.rate_per_piece) == 240.00, f"Historical price was corrupted! Got: {dist_1.rate_per_piece}"
        print(f"  [PASS] Historical Price Protection Verified: Consignment {dist_1.batch_code} still locked at ₹240.00!")

        # Subsequent consignment should adopt the new catalogue price of ₹320.00
        dist_2 = DistributionService.give_work(
            db=db,
            data=WorkDistributionCreate(
                worker_id=w_created.id,
                item_id=test_item.id,
                quantity_issued=5,
                knot_style="Ekdali Classic",
                issue_date=date.today(),
            ),
            user_id=admin.id,
        )
        assert float(dist_2.rate_per_piece) == 320.00
        print(f"  [PASS] Subsequent consignment correctly issued at updated price: ₹{dist_2.rate_per_piece:.2f}")

        # =============================================================
        # TEST 5: Work Distribution & Material Debit-Credit Ledger
        # =============================================================
        print("\n--- TEST 5: Material Debit-Credit Ledger (Worker-Account Perspective) ---")
        db.refresh(w_created)
        # Total pieces given: 10 + 5 = 15 pieces in artisan custody
        assert w_created.pending_pieces == 15, f"Expected 15 pending, got {w_created.pending_pieces}"
        # Wages earned must still be 0 (giving work does NOT create wages)
        assert float(w_created.payable_balance) == 0.0, f"Wages must be 0 before returns, got {w_created.payable_balance}"
        print(f"  [PASS] Material Debit of 15 pieces recorded. Worker pending: {w_created.pending_pieces}, Payable: ₹0.00")

        # =============================================================
        # TEST 6 & 7: Partial Returns, Rejected Pieces & Wage Calculation
        # =============================================================
        print("\n--- TEST 6 & 7: Partial Returns, QC Rejections & Wage Calculation ---")
        # Return 1 against dist_1 (10 pieces):
        # 6 Accepted pieces, 2 Rejected pieces (due to broken knots), 2 remain pending
        ret_1 = DistributionService.receive_work(
            db=db,
            data=WorkReturnCreate(
                distribution_id=dist_1.id,
                quantity_returned=6,  # Accepted
                quantity_rejected=2,  # Defect
                rejection_reason="Broken Knots / Missing Knots",
                rejection_remarks="2 pieces had uneven knotting and fiber breakage",
                return_date=date.today(),
            ),
            user_id=admin.id,
        )

        db.refresh(dist_1)
        db.refresh(w_created)
        # Check batch remaining: 10 - 6 - 2 = 2 pending
        assert dist_1.quantity_pending == 2, f"Expected 2 pending for batch, got {dist_1.quantity_pending}"
        assert dist_1.quantity_returned == 6
        assert dist_1.quantity_rejected == 2

        # Check wages: ONLY accepted pieces create wages!
        # 6 accepted * ₹240.00 snapshot rate = ₹1,440.00 (Rejected pieces earn ₹0.00)
        expected_earned_1 = 6 * 240.00
        assert float(ret_1.completed_work_value) == expected_earned_1
        assert float(w_created.payable_balance) == expected_earned_1, f"Expected ₹{expected_earned_1}, got {w_created.payable_balance}"
        print(f"  Partial Return 1: 6 accepted (₹1,440.00 earned), 2 rejected (₹0.00). Batch pending: {dist_1.quantity_pending}")

        # Return 2 (final 2 pieces for dist_1):
        # 2 Accepted pieces, 0 Rejected pieces
        ret_2 = DistributionService.receive_work(
            db=db,
            data=WorkReturnCreate(
                distribution_id=dist_1.id,
                quantity_returned=2,
                quantity_rejected=0,
                return_date=date.today(),
            ),
            user_id=admin.id,
        )
        db.refresh(dist_1)
        db.refresh(w_created)
        assert dist_1.quantity_pending == 0
        assert dist_1.status == "Completed"

        # Total wages for dist_1: (6 + 2) * ₹240.00 = 8 * ₹240.00 = ₹1,920.00
        expected_earned_total = 8 * 240.00
        assert float(w_created.payable_balance) == expected_earned_total
        print(f"  Partial Return 2: Batch completed! Total earned: ₹{w_created.payable_balance:.2f}")
        print(f"  [PASS] Quality rejections earned ₹0.00 and accepted pieces accurately calculated wages.")

        # =============================================================
        # TEST 8, 9 & 10: Multiple Advances, Partial Payments & Outstanding Balance
        # =============================================================
        print("\n--- TEST 8, 9 & 10: Multiple Advances, Partial Payouts & Balance ---")
        # Worker has ₹1,920.00 earned.
        # Advance 1: ₹300.00 Cash
        adv_1 = PaymentService.record_advance(
            db=db,
            data=AdvanceCreateRequest(
                worker_id=w_created.id,
                amount=300.00,
                payment_mode="Cash",
                transaction_date=date.today(),
                remarks="Diwali festival advance",
            ),
            user_id=admin.id,
        )
        db.refresh(w_created)
        # Balance: 1920 - 300 = ₹1,620.00
        assert float(w_created.payable_balance) == 1620.00
        print(f"  Advance 1 (Cash ₹300.00): New Balance = ₹{w_created.payable_balance:.2f}")

        # Advance 2: ₹200.00 UPI
        adv_2 = PaymentService.record_advance(
            db=db,
            data=AdvanceCreateRequest(
                worker_id=w_created.id,
                amount=200.00,
                payment_mode="UPI",
                reference_number="UPI/ADV/98765432",
                transaction_date=date.today(),
                remarks="Emergency medical advance",
            ),
            user_id=admin.id,
        )
        db.refresh(w_created)
        # Balance: 1620 - 200 = ₹1,420.00
        assert float(w_created.payable_balance) == 1420.00
        print(f"  Advance 2 (UPI ₹200.00): New Balance = ₹{w_created.payable_balance:.2f}")

        # Partial Wage Payout: ₹1,000.00 Bank Transfer
        pay_1 = PaymentService.record_payout(
            db=db,
            data=PayoutCreateRequest(
                worker_id=w_created.id,
                amount=1000.00,
                payment_mode="Bank Transfer",
                reference_number="NEFT-KUTCH-00129",
                transaction_date=date.today(),
                remarks="Fortnightly wage settlement",
            ),
            user_id=admin.id,
        )
        db.refresh(w_created)
        # Balance: 1420 - 1000 = ₹420.00
        assert float(w_created.payable_balance) == 420.00
        print(f"  Partial Payout (Bank ₹1000.00): New Balance = ₹{w_created.payable_balance:.2f}")

        # Verify Double-Entry Formula:
        # Total Payable = Opening + Total Credits - Total Debits
        # Credits = 1920.00, Debits = 300 + 200 + 1000 = 1500.00. Balance = 420.00.
        summary = PaymentService.get_money_ledger_summary(db=db, worker_id=w_created.id)
        assert float(summary.total_earned) == 1920.00
        assert float(summary.total_advance_taken) == 500.00
        assert float(summary.total_payments_made) == 1000.00
        assert float(summary.remaining_payable) == 420.00
        print(f"  [PASS] Double-entry money ledger balances: Earned=₹1,920.00, Adv=₹500.00, Paid=₹1,000.00, Outstanding=₹420.00")

        # =============================================================
        # TEST 11: Manager Time Restrictions (IST Enforcement)
        # =============================================================
        print("\n--- TEST 11: Manager Operating Window (09:00 - 20:00 IST) ---")
        # 11a. Test Manager inside working window
        manager.access_start_time = "00:00"
        manager.access_end_time = "23:59"
        db.commit()
        db.refresh(manager)
        is_ok, reason = access_control_service.is_within_operating_hours(manager)
        assert is_ok is True, f"Expected access permitted, got reason: {reason}"

        # 11b. Test Manager outside working window
        manager.access_start_time = "02:00"
        manager.access_end_time = "03:00"
        manager.temporary_extension_until = None
        db.commit()
        db.refresh(manager)
        try:
            access_control_service.verify_manager_access_or_raise(manager)
            assert False, "Manager outside operating hours should have raised HTTPException 403"
        except HTTPException as e:
            assert e.status_code == 403
            assert "ACCESS_HOURS_EXPIRED" in str(e.detail)
            print(f"  [PASS] Manager rejected outside operating window: '{e.detail}'")

        # Restore normal operating hours
        manager.access_start_time = "09:00"
        manager.access_end_time = "20:00"
        db.commit()

        # =============================================================
        # TEST 12: Manual Manager Locking & Immediate Session Revocation
        # =============================================================
        print("\n--- TEST 12: Manual Manager Locking & Token Invalidation ---")
        prev_token_version = manager.token_version
        fake_req = Request({'type': 'http', 'client': ('127.0.0.1', 50000), 'headers': []})
        locked_mgr = lock_manager(
            manager_id=manager.id,
            req=ManagerLockRequest(reason="Security review: unauthorized after-hours login attempt"),
            request=fake_req,
            admin_user=admin,
            db=db,
        )
        assert locked_mgr.is_locked is True
        assert locked_mgr.token_version == prev_token_version + 1
        print(f"  Manager locked. token_version incremented from {prev_token_version} -> {locked_mgr.token_version}")

        # Attempt to access with locked manager
        try:
            access_control_service.verify_manager_access_or_raise(locked_mgr)
            assert False, "Locked manager should have been rejected"
        except HTTPException as e:
            assert e.status_code == 403
            assert "ACCOUNT_LOCKED" in str(e.detail)
            print(f"  [PASS] Locked manager access blocked with 403: '{e.detail}'")

        # Unlock manager
        unlocked_mgr = unlock_manager(
            manager_id=manager.id,
            request=fake_req,
            admin_user=admin,
            db=db,
        )
        assert unlocked_mgr.is_locked is False
        print(f"  [PASS] Manager successfully unlocked by Admin.")

        # =============================================================
        # TEST 13: Unauthorized API Requests & Role Restrictions
        # =============================================================
        print("\n--- TEST 13: Role-Based Authorization Enforcement ---")
        # Attempt admin action with Manager user
        from app.api.deps import require_admin
        try:
            require_admin(current_user=unlocked_mgr)
            assert False, "Manager should be rejected on admin-only route"
        except HTTPException as e:
            assert e.status_code == 403
            assert "Admin / Owner privileges required" in e.detail
            print(f"  [PASS] Non-admin user blocked with 403: '{e.detail}'")

        # Admin user succeeds
        admin_pass = require_admin(current_user=admin)
        assert admin_pass.id == admin.id
        print(f"  [PASS] Admin passed admin authorization.")

        # =============================================================
        # TEST 14: Rate Limiter Protection on Sensitive Endpoints
        # =============================================================
        print("\n--- TEST 14: Sensitive Endpoint Rate Limiter ---")
        test_ip = "192.168.1.99"
        limiter.reset(f"{test_ip}:/api/v1/auth/login")

        # Simulate 10 rapid attempts
        for i in range(10):
            limited = limiter.is_rate_limited(f"{test_ip}:/api/v1/auth/login", max_requests=10, window_seconds=60)
            assert limited is False, f"Request {i+1} should not be rate limited"

        # 11th request must be rate limited!
        exceeded = limiter.is_rate_limited(f"{test_ip}:/api/v1/auth/login", max_requests=10, window_seconds=60)
        assert exceeded is True, "11th rapid attempt should be rate limited!"
        print(f"  [PASS] Brute-force protection triggered on 11th request (HTTP 429).")
        limiter.reset()

        print("\n" + "=" * 75)
        print("ALL 14 STEP 7 MASTER E2E & SECURITY INTEGRITY TESTS PASSED (100% SUCCESS)")
        print("=" * 75)

    finally:
        db.close()
        test_engine.dispose()
        try:
            if os.path.exists(test_db_path):
                os.remove(test_db_path)
        except Exception:
            pass


if __name__ == "__main__":
    run_master_verification()
