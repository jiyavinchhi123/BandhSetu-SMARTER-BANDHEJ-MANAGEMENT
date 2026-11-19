from datetime import date, datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from fastapi import HTTPException, status

from app.models.worker import Worker
from app.models.payment_record import PaymentRecord
from app.models.money_transaction import MoneyTransaction
from app.models.audit_log import AuditLog
from app.utils.formatters import format_ist_datetime
from app.schemas.payment import (
    AdvanceCreateRequest,
    PayoutCreateRequest,
    MoneyTransactionResponse,
    MoneyLedgerSummary,
    FinancialReversalRequest,
)


class PaymentService:

    @staticmethod
    def generate_money_txn_code(db: Session) -> str:
        """
        Generates a unique Financial Transaction ID: FIN-YYYYMMDD-XXXX
        """
        today_str = date.today().strftime("%Y%m%d")
        prefix = f"FIN-{today_str}-"
        count = db.query(MoneyTransaction).filter(
            MoneyTransaction.transaction_code.like(f"{prefix}%")
        ).count() + 1
        return f"{prefix}{count:04d}"

    @staticmethod
    def check_duplicate_payment(
        db: Session,
        worker_id: int,
        amount: float,
        payment_mode: str,
        reference_no: Optional[str] = None
    ) -> None:
        """
        Guards against duplicate payments:
        1. Checks uniqueness of non-empty reference number (e.g. UPI UTR / Bank Ref).
        2. Guards against rapid accidental double-submissions (same worker, amount, mode within 30s).
        """
        if reference_no and reference_no.strip():
            ref = reference_no.strip()
            existing_ref = db.query(PaymentRecord).filter(
                PaymentRecord.reference_no == ref
            ).first()
            if existing_ref:
                raise HTTPException(
                    status_code=400,
                    detail=f"Payment reference number '{ref}' has already been recorded in the system. Duplicate rejected."
                )

        # 30-second rapid repeat check
        recent_threshold = datetime.utcnow() - timedelta(seconds=30)
        recent_dup = db.query(PaymentRecord).filter(
            PaymentRecord.worker_id == worker_id,
            PaymentRecord.amount == amount,
            PaymentRecord.payment_mode == payment_mode,
            PaymentRecord.created_at >= recent_threshold
        ).first()
        if recent_dup:
            raise HTTPException(
                status_code=400,
                detail=f"Duplicate payment detected. A payment of ₹{amount:.2f} for this worker was already recorded moments ago."
            )

    @staticmethod
    def record_advance(
        db: Session,
        data: AdvanceCreateRequest,
        user_id: Optional[int] = None,
        user_name: Optional[str] = "Admin",
    ) -> MoneyTransaction:
        """
        Records cash or digital advance taken by worker.
        Worker-Account Perspective: DEBITS the worker's money account and reduces payable balance.
        """
        worker = db.query(Worker).filter(Worker.id == data.worker_id).first()
        if not worker:
            raise HTTPException(status_code=404, detail=f"Worker #{data.worker_id} not found.")

        if data.amount <= 0:
            raise HTTPException(status_code=400, detail="Advance amount must be greater than zero.")

        # Duplicate check
        PaymentService.check_duplicate_payment(
            db=db,
            worker_id=worker.id,
            amount=data.amount,
            payment_mode=data.payment_mode,
            reference_no=data.reference_no
        )

        pay_dt = data.payment_date or date.today()
        ref = data.reference_no.strip() if data.reference_no else None

        # 1. Create PaymentRecord
        payment = PaymentRecord(
            worker_id=worker.id,
            payment_type="Advance Given",
            amount=data.amount,
            payment_mode=data.payment_mode,
            reference_no=ref,
            disbursed_by_name=user_name,
            payment_date=pay_dt,
            notes=data.remarks,
        )
        db.add(payment)
        db.flush()

        # 2. Update Worker Payable Balance (Advance reduces balance)
        worker.payable_balance = round(float(worker.payable_balance) - data.amount, 2)

        # 3. Create MoneyTransaction (DEBIT: Worker takes cash/money)
        txn_code = PaymentService.generate_money_txn_code(db)
        desc_text = f"Advance Taken via {data.payment_mode}"
        if ref:
            desc_text += f" (Ref: {ref})"

        money_txn = MoneyTransaction(
            transaction_code=txn_code,
            worker_id=worker.id,
            payment_record_id=payment.id,
            transaction_date=pay_dt,
            transaction_type="ADVANCE_GIVEN",
            description=desc_text,
            credit_amount=0.00,
            debit_amount=data.amount,
            running_balance=worker.payable_balance,
            payment_mode=data.payment_mode,
            reference_no=ref,
            recorded_by_id=user_id,
            recorded_by_name=user_name,
            remarks=data.remarks,
        )
        db.add(money_txn)

        # 4. Audit Log
        audit = AuditLog(
            user_id=user_id,
            user_email=user_name,
            action="ADVANCE_GIVEN_RECORDED",
            ip_address="127.0.0.1",
            details=f"Recorded advance of ₹{data.amount:.2f} via {data.payment_mode} to {worker.full_name} ({worker.serial_number}). New balance: ₹{worker.payable_balance:.2f}",
            timestamp_ist=format_ist_datetime(),
        )
        db.add(audit)

        db.commit()
        db.refresh(money_txn)
        return money_txn

    @staticmethod
    def record_payout(
        db: Session,
        data: PayoutCreateRequest,
        user_id: Optional[int] = None,
        user_name: Optional[str] = "Admin",
    ) -> MoneyTransaction:
        """
        Records wage payout (partial payment or full settlement).
        Worker-Account Perspective: DEBITS the worker's money account and reduces payable balance.
        """
        worker = db.query(Worker).filter(Worker.id == data.worker_id).first()
        if not worker:
            raise HTTPException(status_code=404, detail=f"Worker #{data.worker_id} not found.")

        payout_amount = data.amount
        if data.is_full_settlement and payout_amount == 0:
            payout_amount = max(0.0, float(worker.payable_balance))

        if payout_amount <= 0:
            raise HTTPException(status_code=400, detail="Payout amount must be greater than zero.")

        # Duplicate check
        PaymentService.check_duplicate_payment(
            db=db,
            worker_id=worker.id,
            amount=payout_amount,
            payment_mode=data.payment_mode,
            reference_no=data.reference_no
        )

        pay_dt = data.payment_date or date.today()
        ref = data.reference_no.strip() if data.reference_no else None

        # 1. Create PaymentRecord
        payment = PaymentRecord(
            worker_id=worker.id,
            payment_type="Wage Payout",
            amount=payout_amount,
            payment_mode=data.payment_mode,
            reference_no=ref,
            disbursed_by_name=user_name,
            payment_date=pay_dt,
            notes=data.remarks,
        )
        db.add(payment)
        db.flush()

        # 2. Update Worker Payable Balance
        worker.payable_balance = round(float(worker.payable_balance) - payout_amount, 2)

        # 3. Create MoneyTransaction (DEBIT: Money paid to worker)
        txn_code = PaymentService.generate_money_txn_code(db)
        desc_text = f"Wage Payout via {data.payment_mode}"
        if data.is_full_settlement:
            desc_text += " (Full Settlement)"
        if ref:
            desc_text += f" (Ref: {ref})"

        money_txn = MoneyTransaction(
            transaction_code=txn_code,
            worker_id=worker.id,
            payment_record_id=payment.id,
            transaction_date=pay_dt,
            transaction_type="WAGE_PAYOUT",
            description=desc_text,
            credit_amount=0.00,
            debit_amount=payout_amount,
            running_balance=worker.payable_balance,
            payment_mode=data.payment_mode,
            reference_no=ref,
            recorded_by_id=user_id,
            recorded_by_name=user_name,
            remarks=data.remarks,
        )
        db.add(money_txn)

        # 4. Audit Log
        audit = AuditLog(
            user_id=user_id,
            user_email=user_name,
            action="WAGE_PAYOUT_RECORDED",
            ip_address="127.0.0.1",
            details=f"Disbursed wage payout of ₹{payout_amount:.2f} via {data.payment_mode} to {worker.full_name} ({worker.serial_number}). New balance: ₹{worker.payable_balance:.2f}",
            timestamp_ist=format_ist_datetime(),
        )
        db.add(audit)

        db.commit()
        db.refresh(money_txn)
        return money_txn

    @staticmethod
    def get_money_ledger_summary(
        db: Session,
        worker_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> MoneyLedgerSummary:
        """
        Calculates and returns the complete Money Debit-Credit Ledger for a worker:
        CREDIT = Work earnings & approved adjustments
        DEBIT = Advances taken & wage payments made
        Total Payable = Total Credits - Total Debits.
        """
        worker = db.query(Worker).filter(Worker.id == worker_id).first()
        if not worker:
            raise HTTPException(status_code=404, detail="Worker not found.")

        # Query all transactions (for accurate running totals)
        all_txns = db.query(MoneyTransaction).filter(
            MoneyTransaction.worker_id == worker.id,
            MoneyTransaction.is_reversed == False
        ).order_by(MoneyTransaction.transaction_date.asc(), MoneyTransaction.id.asc()).all()

        total_earned = 0.0
        total_advance_taken = 0.0
        total_payments_made = 0.0

        for t in all_txns:
            if t.transaction_type in ("WORK_EARNING", "BONUS_CREDIT"):
                total_earned += float(t.credit_amount)
            elif t.transaction_type == "ADVANCE_GIVEN":
                total_advance_taken += float(t.debit_amount)
            elif t.transaction_type == "WAGE_PAYOUT":
                total_payments_made += float(t.debit_amount)
            elif t.transaction_type == "CORRECTION_REVERSAL":
                # Adjustment entries already compensated
                pass

        total_earned = round(total_earned, 2)
        total_advance_taken = round(total_advance_taken, 2)
        total_payments_made = round(total_payments_made, 2)
        remaining_payable = round(total_earned - total_advance_taken - total_payments_made, 2)

        # Apply optional date filter to the returned transaction list
        query = db.query(MoneyTransaction).filter(MoneyTransaction.worker_id == worker.id)
        if start_date:
            query = query.filter(MoneyTransaction.transaction_date >= start_date)
        if end_date:
            query = query.filter(MoneyTransaction.transaction_date <= end_date)

        filtered_txns = query.order_by(
            desc(MoneyTransaction.transaction_date), desc(MoneyTransaction.id)
        ).all()

        txn_responses = [
            MoneyTransactionResponse.model_validate(t) for t in filtered_txns
        ]

        return MoneyLedgerSummary(
            worker_id=worker.id,
            worker_name=worker.full_name,
            worker_serial=worker.serial_number,
            total_earned=total_earned,
            total_advance_taken=total_advance_taken,
            total_payments_made=total_payments_made,
            remaining_payable=remaining_payable,
            transactions=txn_responses,
        )

    @staticmethod
    def reverse_money_transaction(
        db: Session,
        txn_id: int,
        req: FinancialReversalRequest,
        user_id: Optional[int] = None,
        user_name: Optional[str] = "Admin",
    ) -> MoneyTransaction:
        """
        Auditable Reversal of an erroneous financial transaction.
        Never permanently deletes any record; marks is_reversed=True and posts
        a compensating CORRECTION_REVERSAL entry.
        """
        txn = db.query(MoneyTransaction).filter(MoneyTransaction.id == txn_id).first()
        if not txn:
            raise HTTPException(status_code=404, detail="Financial transaction not found.")
        if txn.is_reversed:
            raise HTTPException(status_code=400, detail="Transaction is already reversed.")

        worker = db.query(Worker).filter(Worker.id == txn.worker_id).first()
        if not worker:
            raise HTTPException(status_code=404, detail="Worker associated with transaction not found.")

        # Mark original as reversed
        txn.is_reversed = True
        txn.reversal_reason = req.reason
        reversal_code = PaymentService.generate_money_txn_code(db)
        txn.reversal_ref_code = reversal_code

        # If reversing a DEBIT (Payout or Advance):
        # Money was deducted from worker; reversal restores her payable balance!
        if txn.debit_amount > 0:
            worker.payable_balance = round(float(worker.payable_balance) + float(txn.debit_amount), 2)
            comp_txn = MoneyTransaction(
                transaction_code=reversal_code,
                worker_id=worker.id,
                transaction_date=date.today(),
                transaction_type="CORRECTION_REVERSAL",
                description=f"[REVERSAL] Restored {txn.description}: {req.reason}",
                credit_amount=float(txn.debit_amount),
                debit_amount=0.00,
                running_balance=worker.payable_balance,
                payment_mode=txn.payment_mode,
                recorded_by_id=user_id,
                recorded_by_name=user_name,
                remarks=f"Reversal of {txn.transaction_code}: {req.reason}",
            )
            db.add(comp_txn)

        # If reversing a CREDIT (Work Earning):
        # Work earning was credited; reversal removes it from payable balance and total earned
        elif txn.credit_amount > 0:
            worker.payable_balance = round(float(worker.payable_balance) - float(txn.credit_amount), 2)
            worker.total_earned = max(0.0, round(float(worker.total_earned) - float(txn.credit_amount), 2))
            comp_txn = MoneyTransaction(
                transaction_code=reversal_code,
                worker_id=worker.id,
                transaction_date=date.today(),
                transaction_type="CORRECTION_REVERSAL",
                description=f"[REVERSAL] Deducted {txn.description}: {req.reason}",
                credit_amount=0.00,
                debit_amount=float(txn.credit_amount),
                running_balance=worker.payable_balance,
                recorded_by_id=user_id,
                recorded_by_name=user_name,
                remarks=f"Reversal of {txn.transaction_code}: {req.reason}",
            )
            db.add(comp_txn)

        audit = AuditLog(
            user_id=user_id,
            user_email=user_name,
            action="FINANCIAL_TRANSACTION_REVERSED",
            ip_address="127.0.0.1",
            details=f"Reversed transaction {txn.transaction_code} for worker {worker.full_name}. Reason: {req.reason}",
            timestamp_ist=format_ist_datetime(),
        )
        db.add(audit)

        db.commit()
        db.refresh(txn)
        return txn
