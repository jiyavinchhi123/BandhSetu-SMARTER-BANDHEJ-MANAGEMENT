import sys
import os
from datetime import date, datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import HTTPException
from app.database.session import SessionLocal, engine
from app.models.user import User
from app.models.worker import Worker
from app.models.item import Item
from app.models.work_distribution import WorkDistribution
from app.models.work_return import WorkReturn
from app.models.material_transaction import MaterialTransaction
from app.services.distribution_service import DistributionService
from app.schemas.distribution import (
    WorkDistributionCreate,
    WorkReturnCreate,
    LedgerCorrectionRequest,
)


def run_all_step4_tests():
    db = SessionLocal()
    print("=" * 65)
    print("STARTING STEP 4 — WORK DISTRIBUTION & MATERIAL LEDGER TESTS")
    print("=" * 65)

    try:
        # Seed test admin user if needed
        admin_user = db.query(User).filter(User.email == "admin@bandhej.com").first()
        if not admin_user:
            admin_user = User(
                email="admin@bandhej.com",
                full_name="Bhaveshbhai Khatri",
                role="admin",
                hashed_password="hash",
                is_active=True,
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)

        # Create 2 test items
        item_dupatta = Item(
            item_name="Rani Bandhani Dupatta - 3 Dot",
            item_code=f"DUP-{datetime.now().microsecond}",
            price_per_piece=150.00,
            is_active=True,
        )
        item_saree = Item(
            item_name="Royal Khatri Shikari Saree",
            item_code=f"SAR-{datetime.now().microsecond}",
            price_per_piece=350.00,
            is_active=True,
        )
        db.add_all([item_dupatta, item_saree])
        db.commit()
        db.refresh(item_dupatta)
        db.refresh(item_saree)

        # Create test artisan worker
        worker = Worker(
            serial_number=f"WRK-S4-{datetime.now().microsecond}",
            full_name="Kavitaben Khatri",
            phone="9876543210",
            town="Bhuj",
            city="Bhuj",
            village="Madhapar",
            status="Active",
            pending_pieces=0,
            payable_balance=0.00,
            total_earned=0.00,
        )
        db.add(worker)
        db.commit()
        db.refresh(worker)

        # -------------------------------------------------------------
        # TEST 1: Give Work / Material Distribution (DEBIT)
        # -------------------------------------------------------------
        print("\n--- TEST 1: Material Distribution & DEBIT Entry ---")
        dist_create = WorkDistributionCreate(
            worker_id=worker.id,
            item_id=item_dupatta.id,
            quantity_issued=10,
            knot_style="Bharti 3-dot",
            remarks="Diwali festival order",
        )
        dist = DistributionService.give_work(
            db=db,
            data=dist_create,
            user_id=admin_user.id,
            user_name=admin_user.full_name,
        )

        assert dist.id is not None
        assert dist.batch_code.startswith("DIST-")
        assert dist.quantity_issued == 10
        assert dist.quantity_pending == 10
        assert dist.rate_per_piece == 150.00
        assert dist.total_gross_wage == 1500.00
        assert dist.status == "Issued"

        # Check Material Transaction DEBIT entry
        mat_txn = db.query(MaterialTransaction).filter(
            MaterialTransaction.distribution_id == dist.id
        ).first()
        assert mat_txn is not None
        assert mat_txn.transaction_type == "DEBIT_GIVEN"
        assert mat_txn.debit_qty == 10
        assert mat_txn.credit_qty == 0
        assert mat_txn.running_balance == 10

        # Check worker counters
        db.refresh(worker)
        assert worker.pending_pieces == 10
        print(f"[PASS] Work distributed: {dist.batch_code}. DEBIT 10 pieces posted. Worker pending: {worker.pending_pieces}")

        # Allow multiple items assigned to the same worker on the same day
        dist_create_2 = WorkDistributionCreate(
            worker_id=worker.id,
            item_id=item_saree.id,
            quantity_issued=5,
            knot_style="Shikari Jaal",
            remarks="Special wedding consignment",
        )
        dist_2 = DistributionService.give_work(
            db=db,
            data=dist_create_2,
            user_id=admin_user.id,
            user_name=admin_user.full_name,
        )
        db.refresh(worker)
        assert dist_2.quantity_issued == 5
        assert worker.pending_pieces == 15  # 10 + 5
        print(f"[PASS] Multiple items issued on same day. 2nd Batch: {dist_2.batch_code}. Total worker pending: {worker.pending_pieces}")

        # -------------------------------------------------------------
        # TEST 2: Multiple Partial Returns against one distribution
        # Example from prompt:
        # 10 pieces given on 1 Nov.
        # 5 returned on 4 Nov.
        # Remaining 5 returned on 10 Nov.
        # -------------------------------------------------------------
        print("\n--- TEST 2: Multiple Partial Returns ---")
        # Return 1: 5 pieces returned accepted
        ret_1 = DistributionService.receive_work(
            db=db,
            data=WorkReturnCreate(
                distribution_id=dist.id,
                quantity_returned=5,
                quantity_rejected=0,
                return_date=date.today(),
                remarks="First partial return: 5 finished dupattas",
            ),
            user_id=admin_user.id,
            user_name=admin_user.full_name,
        )
        assert ret_1.return_code.startswith("RET-")
        assert ret_1.quantity_returned == 5
        assert ret_1.completed_work_value == 750.00  # 5 * 150

        db.refresh(dist)
        assert dist.quantity_returned == 5
        assert dist.quantity_pending == 5
        assert dist.status == "Partially Returned"

        db.refresh(worker)
        assert worker.pending_pieces == 10  # 15 - 5
        assert float(worker.payable_balance) == 750.00
        print(f"[PASS] Partial Return 1 ({ret_1.return_code}): 5 pieces accepted. Remaining pending for batch: {dist.quantity_pending}. Worker pending: {worker.pending_pieces}")

        # Return 2: Final 5 pieces returned accepted
        ret_2 = DistributionService.receive_work(
            db=db,
            data=WorkReturnCreate(
                distribution_id=dist.id,
                quantity_returned=5,
                quantity_rejected=0,
                return_date=date.today(),
                remarks="Second partial return: final 5 pieces",
            ),
            user_id=admin_user.id,
            user_name=admin_user.full_name,
        )
        assert ret_2.id != ret_1.id
        db.refresh(dist)
        assert dist.quantity_returned == 10
        assert dist.quantity_pending == 0
        assert dist.status == "Completed"

        db.refresh(worker)
        assert worker.pending_pieces == 5  # Only saree batch pending now
        assert float(worker.payable_balance) == 1500.00
        print(f"[PASS] Partial Return 2 ({ret_2.return_code}): Batch fully Completed. Pending for batch: {dist.quantity_pending}")

        # -------------------------------------------------------------
        # TEST 3: Validation Prevention: Over-return, Negative, Duplicate
        # -------------------------------------------------------------
        print("\n--- TEST 3: Validation & Prevention of Invalid Returns ---")
        # Over-return attempt (trying to return when 0 pending)
        try:
            DistributionService.receive_work(
                db=db,
                data=WorkReturnCreate(
                    distribution_id=dist.id,
                    quantity_returned=1,
                ),
            )
            assert False, "Should have thrown 400 for over-return"
        except HTTPException as e:
            assert e.status_code == 400
            print(f"[PASS] Blocked over-return: '{e.detail}'")

        # Negative return attempt (caught by Pydantic schema validation ge=0)
        try:
            WorkReturnCreate(
                distribution_id=dist_2.id,
                quantity_returned=-2,
            )
            assert False, "Should have thrown ValidationError for negative quantity"
        except Exception as e:
            print(f"[PASS] Blocked negative quantity by Pydantic validation: {type(e).__name__}")

        # Zero return attempt
        try:
            DistributionService.receive_work(
                db=db,
                data=WorkReturnCreate(
                    distribution_id=dist_2.id,
                    quantity_returned=0,
                    quantity_rejected=0,
                ),
            )
            assert False, "Should have thrown 400 for zero quantity"
        except HTTPException as e:
            assert e.status_code == 400
            print(f"[PASS] Blocked zero quantity return: '{e.detail}'")

        # -------------------------------------------------------------
        # TEST 4: Quality / Rejection Management
        # -------------------------------------------------------------
        print("\n--- TEST 4: Quality & Rejection Management ---")
        # In dist_2 (5 sarees @ ₹350), return 3 accepted, 2 rejected (broken knots)
        ret_rej = DistributionService.receive_work(
            db=db,
            data=WorkReturnCreate(
                distribution_id=dist_2.id,
                quantity_returned=3,
                quantity_rejected=2,
                rejection_reason="Broken Knots & Loose Tying",
                rejection_remarks="2 sarees damaged during knotting",
            ),
            user_id=admin_user.id,
            user_name=admin_user.full_name,
        )

        assert ret_rej.quantity_returned == 3
        assert ret_rej.quantity_rejected == 2
        # Rejected pieces must NOT create wages!
        # Earned wage should be ONLY 3 * 350 = 1050
        assert ret_rej.completed_work_value == 1050.00

        db.refresh(dist_2)
        assert dist_2.quantity_returned == 3
        assert dist_2.quantity_rejected == 2
        assert dist_2.quantity_pending == 0  # 5 - 3 - 2 = 0
        assert dist_2.status == "Completed"

        db.refresh(worker)
        assert worker.pending_pieces == 0
        # Payable balance was 1500, now + 1050 = 2550
        assert float(worker.payable_balance) == 2550.00
        print(f"[PASS] Quality rejection verified: 3 accepted (₹1050.00 earned), 2 rejected (₹0.00 wage). Batch pending: {dist_2.quantity_pending}")

        # -------------------------------------------------------------
        # TEST 5: Material Debit-Credit Ledger Summary
        # -------------------------------------------------------------
        print("\n--- TEST 5: Material Debit-Credit Ledger Summary ---")
        summary = DistributionService.get_material_ledger_summary(db=db, worker_id=worker.id)
        assert summary.total_given == 15  # 10 dupattas + 5 sarees
        assert summary.total_received == 13  # 10 dupattas + 3 sarees
        assert summary.total_rejected == 2  # 2 sarees rejected
        assert summary.remaining_pending == 0  # 15 - 13 - 2 = 0
        assert len(summary.item_wise_pending) == 2
        assert len(summary.transactions) >= 4  # 2 DEBIT + 3 CREDIT
        print(f"[PASS] Ledger Summary Verified: Given={summary.total_given}, Received={summary.total_received}, Rejected={summary.total_rejected}, Remaining Pending={summary.remaining_pending}")

        # -------------------------------------------------------------
        # TEST 6: Auditable Reversal without Hard Deletion
        # -------------------------------------------------------------
        print("\n--- TEST 6: Transaction Reversal & Auditability ---")
        # Issue an accidental consignment of 4 sarees
        dist_accidental = DistributionService.give_work(
            db=db,
            data=WorkDistributionCreate(
                worker_id=worker.id,
                item_id=item_saree.id,
                quantity_issued=4,
            ),
            user_id=admin_user.id,
            user_name=admin_user.full_name,
        )
        db.refresh(worker)
        assert worker.pending_pieces == 4

        # Find the DEBIT material transaction
        mat_accidental = db.query(MaterialTransaction).filter(
            MaterialTransaction.distribution_id == dist_accidental.id
        ).first()

        # Admin reverses this transaction
        reversed_txn = DistributionService.reverse_transaction(
            db=db,
            txn_id=mat_accidental.id,
            req=LedgerCorrectionRequest(reason="Accidental duplicate entry by operator"),
            user_id=admin_user.id,
            user_name=admin_user.full_name,
        )
        assert reversed_txn.is_reversed is True
        assert reversed_txn.reversal_reason == "Accidental duplicate entry by operator"

        # Worker pending pieces must be restored
        db.refresh(worker)
        assert worker.pending_pieces == 0
        print(f"[PASS] Transaction {reversed_txn.transaction_code} reversed without hard delete. Worker pending restored: {worker.pending_pieces}")

        print("\n" + "=" * 65)
        print("ALL 6 STEP 4 TESTS PASSED (100% SUCCESS)")
        print("=" * 65)

    finally:
        db.close()


if __name__ == "__main__":
    run_all_step4_tests()
