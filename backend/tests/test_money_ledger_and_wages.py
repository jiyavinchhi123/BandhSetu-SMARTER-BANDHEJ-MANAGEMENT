import sys
import os
from datetime import date, datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import HTTPException
from app.database.session import SessionLocal
from app.models.user import User
from app.models.worker import Worker
from app.models.item import Item
from app.models.money_transaction import MoneyTransaction
from app.services.distribution_service import DistributionService
from app.services.payment_service import PaymentService
from app.schemas.distribution import WorkDistributionCreate, WorkReturnCreate
from app.schemas.payment import (
    AdvanceCreateRequest,
    PayoutCreateRequest,
    FinancialReversalRequest,
)


def run_all_step5_tests():
    db = SessionLocal()
    print("=" * 65)
    print("STARTING STEP 5 — WAGES, PAYMENTS & MONEY LEDGER TEST SUITE")
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

        # Create test item @ ₹25.00/pc
        item_dupatta = Item(
            item_name="Traditional Bandhani Bandhej Dupatta",
            item_code=f"BDH-S5-{datetime.now().microsecond}",
            price_per_piece=25.00,
            is_active=True,
        )
        db.add(item_dupatta)
        db.commit()
        db.refresh(item_dupatta)

        # Create test artisan worker
        worker = Worker(
            serial_number=f"WRK-FIN-{datetime.now().microsecond}",
            full_name="Radhaben Vaghela",
            phone="9825123456",
            town="Bhuj",
            city="Bhuj",
            village="Dhamadka",
            status="Active",
            pending_pieces=0,
            payable_balance=0.00,
            total_earned=0.00,
        )
        db.add(worker)
        db.commit()
        db.refresh(worker)

        # -------------------------------------------------------------
        # TEST 1: Automatic Wage Calculation from Accepted Returns Only
        # Formula: Earned Wages = Accepted Quantity × Historical Price
        # Example from prompt:
        # 10 pieces given on 1 Nov.
        # 5 returned on 4 Nov (5 accepted * 25 = ₹125)
        # 5 returned on 10 Nov (3 accepted, 2 rejected = ₹75)
        # -------------------------------------------------------------
        print("\n--- TEST 1: Automatic Wage Calculation on Accepted Returns ---")
        dist = DistributionService.give_work(
            db=db,
            data=WorkDistributionCreate(
                worker_id=worker.id,
                item_id=item_dupatta.id,
                quantity_issued=10,
                knot_style="Ekdali",
                remarks="Consignment of 10 dupattas @ ₹25",
            ),
            user_id=admin_user.id,
            user_name=admin_user.full_name,
        )

        db.refresh(worker)
        # Financial rule: Never calculate wages merely from items given!
        assert float(worker.payable_balance) == 0.00
        print(f"[PASS] Items given: {dist.quantity_issued}. Payable balance remains ₹0.00 (No wages earned yet).")

        # Return 1: 5 pieces accepted
        ret_1 = DistributionService.receive_work(
            db=db,
            data=WorkReturnCreate(
                distribution_id=dist.id,
                quantity_returned=5,
                quantity_rejected=0,
                remarks="First batch of 5 accepted dupattas",
            ),
            user_id=admin_user.id,
            user_name=admin_user.full_name,
        )

        db.refresh(worker)
        # 5 * 25 = 125 earned
        assert ret_1.completed_work_value == 125.00
        assert float(worker.payable_balance) == 125.00
        assert float(worker.total_earned) == 125.00

        # Verify Money Ledger has CREDIT entry of ₹125
        credit_entry_1 = db.query(MoneyTransaction).filter(
            MoneyTransaction.return_id == ret_1.id
        ).first()
        assert credit_entry_1 is not None
        assert credit_entry_1.transaction_type == "WORK_EARNING"
        assert float(credit_entry_1.credit_amount) == 125.00
        assert float(credit_entry_1.debit_amount) == 0.00
        print(f"[PASS] Return 1: 5 pieces accepted @ ₹25 = ₹125.00 CREDIT posted to Money Ledger.")

        # Return 2: 3 pieces accepted, 2 pieces rejected (broken knots)
        ret_2 = DistributionService.receive_work(
            db=db,
            data=WorkReturnCreate(
                distribution_id=dist.id,
                quantity_returned=3,
                quantity_rejected=2,
                rejection_reason="Broken Knots",
                rejection_remarks="2 pieces torn during knotting",
            ),
            user_id=admin_user.id,
            user_name=admin_user.full_name,
        )

        db.refresh(worker)
        # 3 * 25 = 75 earned. 2 rejected = 0.
        assert ret_2.completed_work_value == 75.00
        assert float(worker.payable_balance) == 200.00  # 125 + 75
        assert float(worker.total_earned) == 200.00
        print(f"[PASS] Return 2: 3 accepted (₹75.00 earned), 2 rejected (₹0.00). Total earned: ₹{worker.total_earned:.2f}")

        # -------------------------------------------------------------
        # TEST 2: Advance Taken Entry (DEBIT)
        # Worker takes cash advance of ₹100.
        # Remaining payable balance: ₹200 - ₹100 = ₹100.
        # -------------------------------------------------------------
        print("\n--- TEST 2: Advance Taken Entry (DEBIT) ---")
        unique_adv_ref = f"CASH-ADV-{datetime.now().microsecond}"
        adv_txn = PaymentService.record_advance(
            db=db,
            data=AdvanceCreateRequest(
                worker_id=worker.id,
                amount=100.00,
                payment_mode="Cash",
                reference_no=unique_adv_ref,
                remarks="Mid-month festival advance",
            ),
            user_id=admin_user.id,
            user_name=admin_user.full_name,
        )

        assert adv_txn.transaction_type == "ADVANCE_GIVEN"
        assert float(adv_txn.debit_amount) == 100.00
        assert float(adv_txn.credit_amount) == 0.00
        assert float(adv_txn.running_balance) == 100.00

        db.refresh(worker)
        assert float(worker.payable_balance) == 100.00  # 200 - 100 = 100
        print(f"[PASS] Advance of ₹100.00 DEBIT posted ({adv_txn.transaction_code}). New payable balance: ₹{worker.payable_balance:.2f}")

        # -------------------------------------------------------------
        # TEST 3: Wage Payout Entry (DEBIT)
        # Worker paid ₹50 via UPI.
        # Remaining payable balance: ₹100 - ₹50 = ₹50.
        # -------------------------------------------------------------
        print("\n--- TEST 3: Wage Payout Entry (DEBIT) ---")
        unique_payout_ref = f"UPI-UTR-{datetime.now().microsecond}"
        payout_txn = PaymentService.record_payout(
            db=db,
            data=PayoutCreateRequest(
                worker_id=worker.id,
                amount=50.00,
                payment_mode="UPI",
                reference_no=unique_payout_ref,
                remarks="Partial wage payout",
            ),
            user_id=admin_user.id,
            user_name=admin_user.full_name,
        )

        assert payout_txn.transaction_type == "WAGE_PAYOUT"
        assert float(payout_txn.debit_amount) == 50.00
        assert float(payout_txn.running_balance) == 50.00

        db.refresh(worker)
        assert float(worker.payable_balance) == 50.00  # 100 - 50 = 50
        print(f"[PASS] Payout of ₹50.00 DEBIT posted ({payout_txn.transaction_code}). Remaining payable: ₹{worker.payable_balance:.2f}")

        # -------------------------------------------------------------
        # TEST 4: Duplicate Payment & Reference Number Prevention
        # -------------------------------------------------------------
        print("\n--- TEST 4: Duplicate Payment Prevention ---")
        # Attempt duplicate reference number
        try:
            PaymentService.record_payout(
                db=db,
                data=PayoutCreateRequest(
                    worker_id=worker.id,
                    amount=25.00,
                    payment_mode="UPI",
                    reference_no=unique_payout_ref,  # Duplicate ref
                ),
            )
            assert False, "Should have thrown 400 for duplicate reference number"
        except HTTPException as e:
            assert e.status_code == 400
            print(f"[PASS] Blocked duplicate reference number: '{e.detail}'")

        # Attempt rapid duplicate submission
        try:
            PaymentService.record_advance(
                db=db,
                data=AdvanceCreateRequest(
                    worker_id=worker.id,
                    amount=100.00,
                    payment_mode="Cash",  # Duplicate of advance in test 2
                ),
            )
            assert False, "Should have thrown 400 for rapid duplicate payment"
        except HTTPException as e:
            assert e.status_code == 400
            print(f"[PASS] Blocked rapid duplicate submission: '{e.detail}'")

        # -------------------------------------------------------------
        # TEST 5: Money Debit-Credit Ledger Summary Verification
        # Total Earned = ₹200.00
        # Total Advances = ₹100.00
        # Total Payments = ₹50.00
        # Remaining Payable = ₹50.00
        # Formula: Total Payable = Credits - Debits = 200 - 150 = 50.00
        # -------------------------------------------------------------
        print("\n--- TEST 5: Money Ledger Summary & Formula Verification ---")
        summary = PaymentService.get_money_ledger_summary(db=db, worker_id=worker.id)
        assert summary.total_earned == 200.00
        assert summary.total_advance_taken == 100.00
        assert summary.total_payments_made == 50.00
        assert summary.remaining_payable == 50.00
        assert len(summary.transactions) >= 4  # 2 WORK_EARNING + 1 ADVANCE + 1 PAYOUT
        print(f"[PASS] Money Ledger Summary: Total Earned=₹{summary.total_earned:.2f}, Advances=₹{summary.total_advance_taken:.2f}, Paid=₹{summary.total_payments_made:.2f}, Remaining=₹{summary.remaining_payable:.2f}")

        # -------------------------------------------------------------
        # TEST 6: Financial Reversal Without Hard Delete
        # Reversing the ₹50 payout restores payable balance to ₹100.
        # -------------------------------------------------------------
        print("\n--- TEST 6: Auditable Financial Reversal ---")
        rev_txn = PaymentService.reverse_money_transaction(
            db=db,
            txn_id=payout_txn.id,
            req=FinancialReversalRequest(reason="UPI failed at bank end, reversing debit"),
            user_id=admin_user.id,
            user_name=admin_user.full_name,
        )

        assert rev_txn.is_reversed is True
        assert rev_txn.reversal_reason == "UPI failed at bank end, reversing debit"

        db.refresh(worker)
        # Payable balance was ₹50, reversed payout restores it to ₹100!
        assert float(worker.payable_balance) == 100.00
        print(f"[PASS] Transaction {rev_txn.transaction_code} reversed. Worker payable balance restored: ₹{worker.payable_balance:.2f}")

        print("\n" + "=" * 65)
        print("ALL 6 STEP 5 FINANCIAL TESTS PASSED (100% SUCCESS)")
        print("=" * 65)

    finally:
        db.close()


if __name__ == "__main__":
    run_all_step5_tests()
