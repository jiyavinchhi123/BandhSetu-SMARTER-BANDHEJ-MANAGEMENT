from datetime import date, datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from fastapi import HTTPException, status

from app.models.worker import Worker
from app.models.item import Item
from app.models.work_distribution import WorkDistribution
from app.models.work_return import WorkReturn
from app.models.material_transaction import MaterialTransaction
from app.models.money_transaction import MoneyTransaction
from app.models.material_ledger import MaterialLedgerEntry
from app.models.audit_log import AuditLog
from app.utils.formatters import format_ist_datetime
from app.schemas.distribution import (
    WorkDistributionCreate,
    WorkDistributionResponse,
    WorkReturnCreate,
    WorkReturnResponse,
    MaterialTransactionResponse,
    ItemWisePending,
    MaterialLedgerSummary,
    LedgerCorrectionRequest,
)


class DistributionService:

    @staticmethod
    def generate_distribution_code(db: Session) -> str:
        """
        Generates a unique Distribution Transaction ID: DIST-YYYYMMDD-XXXX
        """
        today_str = date.today().strftime("%Y%m%d")
        prefix = f"DIST-{today_str}-"
        count = db.query(WorkDistribution).filter(
            WorkDistribution.batch_code.like(f"{prefix}%")
        ).count() + 1
        return f"{prefix}{count:04d}"

    @staticmethod
    def generate_return_code(db: Session) -> str:
        """
        Generates a unique Return Transaction ID: RET-YYYYMMDD-XXXX
        """
        today_str = date.today().strftime("%Y%m%d")
        prefix = f"RET-{today_str}-"
        count = db.query(WorkReturn).filter(
            WorkReturn.return_code.like(f"{prefix}%")
        ).count() + 1
        return f"{prefix}{count:04d}"

    @staticmethod
    def generate_material_txn_code(db: Session) -> str:
        """
        Generates a unique Material Transaction ID: MTXN-YYYYMMDD-XXXX
        """
        today_str = date.today().strftime("%Y%m%d")
        prefix = f"MTXN-{today_str}-"
        count = db.query(MaterialTransaction).filter(
            MaterialTransaction.transaction_code.like(f"{prefix}%")
        ).count() + 1
        return f"{prefix}{count:04d}"

    @staticmethod
    def give_work(
        db: Session,
        data: WorkDistributionCreate,
        user_id: Optional[int] = None,
        user_name: Optional[str] = "Admin",
    ) -> WorkDistribution:
        """
        Gives work consignment to worker with HISTORICAL PRICE SNAPSHOT.
        Posts a DEBIT entry to the Material Debit-Credit Ledger (worker-account perspective).
        """
        worker = db.query(Worker).filter(Worker.id == data.worker_id).first()
        if not worker:
            raise HTTPException(status_code=404, detail=f"Worker #{data.worker_id} not found.")

        item = db.query(Item).filter(Item.id == data.item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail=f"Item #{data.item_id} not found in catalogue.")

        if data.quantity_issued <= 0:
            raise HTTPException(status_code=400, detail="Quantity given must be greater than 0.")

        snapshot_rate = float(item.price_per_piece)
        gross_wage = round(snapshot_rate * data.quantity_issued, 2)
        net_wage = round(gross_wage + (data.bonus or 0.0) - (data.deductions or 0.0), 2)

        batch_code = DistributionService.generate_distribution_code(db)
        issue_dt = data.issue_date or date.today()
        due_dt = data.due_date or (issue_dt + timedelta(days=14))

        # 1. Create Work Distribution record
        distribution = WorkDistribution(
            batch_code=batch_code,
            worker_id=worker.id,
            item_id=item.id,
            item_name_snapshot=item.item_name,
            item_code_snapshot=item.item_code,
            rate_per_piece=snapshot_rate,  # Permanent Snapshot Rate
            knot_style=data.knot_style or "Standard",
            quantity_issued=data.quantity_issued,
            quantity_returned=0,
            quantity_rejected=0,
            quantity_pending=data.quantity_issued,
            total_gross_wage=gross_wage,
            deductions=data.deductions or 0.0,
            bonus=data.bonus or 0.0,
            net_payable=net_wage,
            issue_date=issue_dt,
            due_date=due_dt,
            status="Issued",
            remarks=data.remarks,
        )
        db.add(distribution)
        db.flush()  # assign distribution.id

        # 2. Worker Account Perspective: DEBIT entry (Material Given to Worker = Debit quantity)
        new_running_balance = int(worker.pending_pieces) + data.quantity_issued
        mtxn_code = DistributionService.generate_material_txn_code(db)
        mat_txn = MaterialTransaction(
            transaction_code=mtxn_code,
            worker_id=worker.id,
            distribution_id=distribution.id,
            item_id=item.id,
            item_name=item.item_name,
            item_code=item.item_code,
            transaction_date=issue_dt,
            transaction_type="DEBIT_GIVEN",
            debit_qty=data.quantity_issued,
            credit_qty=0,
            rejected_qty=0,
            rate_per_piece=snapshot_rate,
            total_value=gross_wage,
            running_balance=new_running_balance,
            recorded_by_id=user_id,
            recorded_by_name=user_name,
            remarks=data.remarks or f"Material Given: {data.quantity_issued} pcs of {item.item_name}",
        )
        db.add(mat_txn)

        # 3. Backward-compatible raw fabric ledger entry
        mat_entry = MaterialLedgerEntry(
            worker_id=worker.id,
            lot_number=batch_code,
            material_type=f"{item.item_name} (Pieces)",
            issued_qty=float(data.quantity_issued),
            returned_qty=0.0,
            unit="pieces",
            issue_date=issue_dt,
            status="With Worker",
            notes=f"Consignment {batch_code} ({data.knot_style or 'Standard'})",
        )
        db.add(mat_entry)

        # 4. Update Worker live counters
        worker.pending_pieces = new_running_balance

        # 5. Audit Log
        audit = AuditLog(
            user_id=user_id,
            user_email=user_name,
            action="WORK_DISTRIBUTION_GIVEN",
            ip_address="127.0.0.1",
            details=f"Issued {data.quantity_issued} pcs of {item.item_name} to {worker.full_name} ({worker.serial_number}) at ₹{snapshot_rate:.2f}/pc. Batch: {batch_code}",
            timestamp_ist=format_ist_datetime(),
        )
        db.add(audit)

        db.commit()
        db.refresh(distribution)
        return distribution

    @staticmethod
    def receive_work(
        db: Session,
        data: WorkReturnCreate,
        user_id: Optional[int] = None,
        user_name: Optional[str] = "Admin",
    ) -> WorkReturn:
        """
        Receives partial or full completed work against an existing distribution.
        Supports accepted pieces and rejected pieces.
        Enforces validation preventing over-returns, negative quantities, or incorrect wages.
        Posts a CREDIT entry to the Material Debit-Credit Ledger (worker-account perspective).
        """
        distribution = db.query(WorkDistribution).filter(
            WorkDistribution.id == data.distribution_id
        ).first()
        if not distribution:
            raise HTTPException(status_code=404, detail="Work distribution record not found.")

        worker = db.query(Worker).filter(Worker.id == distribution.worker_id).first()
        if not worker:
            raise HTTPException(status_code=404, detail="Worker associated with distribution not found.")

        qty_accepted = data.quantity_returned or 0
        qty_rejected = data.quantity_rejected or 0

        if qty_accepted < 0 or qty_rejected < 0:
            raise HTTPException(status_code=400, detail="Return quantities cannot be negative.")

        total_returning = qty_accepted + qty_rejected
        if total_returning <= 0:
            raise HTTPException(
                status_code=400,
                detail="Must return at least 1 piece (accepted or rejected)."
            )

        if total_returning > distribution.quantity_pending:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot return {total_returning} pieces. Only {distribution.quantity_pending} pieces remain pending for batch {distribution.batch_code}."
            )

        # Wage calculation: ONLY accepted pieces generate earned wage!
        # Rejected pieces do NOT create wages.
        rate_snapshot = float(distribution.rate_per_piece)
        earned_wage = round(qty_accepted * rate_snapshot, 2)

        return_code = DistributionService.generate_return_code(db)
        ret_date = data.return_date or date.today()

        # 1. Create WorkReturn record
        work_return = WorkReturn(
            return_code=return_code,
            distribution_id=distribution.id,
            worker_id=worker.id,
            item_id=distribution.item_id,
            item_name_snapshot=distribution.item_name_snapshot,
            rate_per_piece_snapshot=rate_snapshot,
            quantity_returned=qty_accepted,
            quantity_rejected=qty_rejected,
            rejection_reason=data.rejection_reason if qty_rejected > 0 else None,
            rejection_remarks=data.rejection_remarks if qty_rejected > 0 else None,
            completed_work_value=earned_wage,
            return_date=ret_date,
            recorded_by_id=user_id,
            recorded_by_name=user_name,
            remarks=data.remarks,
        )
        db.add(work_return)
        db.flush()

        # 2. Update WorkDistribution pending & returned quantities
        distribution.quantity_returned += qty_accepted
        distribution.quantity_rejected += qty_rejected
        distribution.quantity_pending = (
            distribution.quantity_issued
            - distribution.quantity_returned
            - distribution.quantity_rejected
        )
        if distribution.quantity_pending == 0:
            distribution.status = "Completed"
        else:
            distribution.status = "Partially Returned"
        distribution.return_date = ret_date

        # 3. Update Worker counters
        worker.pending_pieces = max(0, int(worker.pending_pieces) - total_returning)
        worker.payable_balance = float(worker.payable_balance) + earned_wage
        worker.total_earned = float(worker.total_earned) + earned_wage

        # 4. Worker Account Perspective: CREDIT entry (Material Received from Worker = Credit quantity)
        mtxn_code = DistributionService.generate_material_txn_code(db)
        txn_type = "CREDIT_RECEIVED" if qty_accepted > 0 else "REJECTED_RETURNED"
        mat_txn = MaterialTransaction(
            transaction_code=mtxn_code,
            worker_id=worker.id,
            distribution_id=distribution.id,
            return_id=work_return.id,
            item_id=distribution.item_id,
            item_name=distribution.item_name_snapshot,
            item_code=distribution.item_code_snapshot,
            transaction_date=ret_date,
            transaction_type=txn_type,
            debit_qty=0,
            credit_qty=qty_accepted,
            rejected_qty=qty_rejected,
            rate_per_piece=rate_snapshot,
            total_value=earned_wage,
            running_balance=worker.pending_pieces,
            recorded_by_id=user_id,
            recorded_by_name=user_name,
            remarks=data.remarks or f"Work Return: {qty_accepted} accepted, {qty_rejected} rejected (Batch {distribution.batch_code})",
        )
        db.add(mat_txn)

        # 5. Worker-Account Perspective: CREDIT entry in Money Ledger (Work Earned = Credit wage)
        if earned_wage > 0:
            fin_code = f"FIN-{ret_date.strftime('%Y%m%d')}-{db.query(MoneyTransaction).count() + 1:04d}"
            money_txn = MoneyTransaction(
                transaction_code=fin_code,
                worker_id=worker.id,
                distribution_id=distribution.id,
                return_id=work_return.id,
                transaction_date=ret_date,
                transaction_type="WORK_EARNING",
                description=f"Work Earned: {qty_accepted} pcs of {distribution.item_name_snapshot} ({distribution.batch_code})",
                credit_amount=earned_wage,
                debit_amount=0.00,
                running_balance=worker.payable_balance,
                recorded_by_id=user_id,
                recorded_by_name=user_name,
                remarks=data.remarks or f"Accepted {qty_accepted} pcs at snapshot ₹{rate_snapshot:.2f}/pc",
            )
            db.add(money_txn)

        # 6. Audit Log
        audit = AuditLog(
            user_id=user_id,
            user_email=user_name,
            action="WORK_RETURN_RECORDED",
            ip_address="127.0.0.1",
            details=f"Recorded return for {worker.full_name}: {qty_accepted} accepted (₹{earned_wage:.2f}), {qty_rejected} rejected. Remaining pending: {distribution.quantity_pending}",
            timestamp_ist=format_ist_datetime(),
        )
        db.add(audit)

        db.commit()
        db.refresh(work_return)
        return work_return

    @staticmethod
    def get_material_ledger_summary(
        db: Session,
        worker_id: int
    ) -> MaterialLedgerSummary:
        """
        Retrieves complete Double-Entry Material Debit-Credit Ledger for a worker.
        Calculates Total Given (Debit), Total Received (Credit), Total Rejected,
        Net Remaining Pending, and Item-Wise breakdown.
        """
        worker = db.query(Worker).filter(Worker.id == worker_id).first()
        if not worker:
            raise HTTPException(status_code=404, detail="Worker not found.")

        # Query all active (unreversed) material transactions
        txns = db.query(MaterialTransaction).filter(
            MaterialTransaction.worker_id == worker.id
        ).order_by(desc(MaterialTransaction.transaction_date), desc(MaterialTransaction.id)).all()

        total_given = 0
        total_received = 0
        total_rejected = 0

        # Item-wise aggregation map
        item_map: Dict[str, Dict[str, Any]] = {}

        for t in txns:
            if not t.is_reversed:
                total_given += t.debit_qty
                total_received += t.credit_qty
                total_rejected += t.rejected_qty

                # Item grouping
                item_key = t.item_name
                if item_key not in item_map:
                    item_map[item_key] = {
                        "item_id": t.item_id,
                        "item_name": t.item_name,
                        "item_code": t.item_code,
                        "total_given": 0,
                        "total_received": 0,
                        "total_rejected": 0,
                        "rate_per_piece": float(t.rate_per_piece),
                    }
                item_map[item_key]["total_given"] += t.debit_qty
                item_map[item_key]["total_received"] += t.credit_qty
                item_map[item_key]["total_rejected"] += t.rejected_qty

        remaining_pending = total_given - total_received - total_rejected

        # Build ItemWisePending list
        item_wise_list: List[ItemWisePending] = []
        for key, val in item_map.items():
            pending = val["total_given"] - val["total_received"] - val["total_rejected"]
            rate = val["rate_per_piece"]
            item_wise_list.append(
                ItemWisePending(
                    item_id=val["item_id"],
                    item_name=val["item_name"],
                    item_code=val["item_code"],
                    total_given=val["total_given"],
                    total_received=val["total_received"],
                    total_rejected=val["total_rejected"],
                    pending_quantity=pending,
                    rate_per_piece=rate,
                    estimated_pending_wage=round(pending * rate, 2),
                )
            )

        txn_responses = [
            MaterialTransactionResponse.model_validate(t) for t in txns
        ]

        return MaterialLedgerSummary(
            worker_id=worker.id,
            worker_name=worker.full_name,
            worker_serial=worker.serial_number,
            total_given=total_given,
            total_received=total_received,
            total_rejected=total_rejected,
            remaining_pending=remaining_pending,
            item_wise_pending=item_wise_list,
            transactions=txn_responses,
        )

    @staticmethod
    def get_pending_distributions(
        db: Session,
        worker_id: Optional[int] = None
    ) -> List[WorkDistributionResponse]:
        """
        Returns all distributions that have pending pieces (quantity_pending > 0).
        """
        query = db.query(WorkDistribution).filter(WorkDistribution.quantity_pending > 0)
        if worker_id:
            query = query.filter(WorkDistribution.worker_id == worker_id)

        distributions = query.order_by(desc(WorkDistribution.issue_date), desc(WorkDistribution.id)).all()

        results = []
        for d in distributions:
            res = WorkDistributionResponse.model_validate(d)
            if d.worker:
                res.worker_name = d.worker.full_name
                res.worker_serial = d.worker.serial_number
            results.append(res)
        return results

    @staticmethod
    def get_all_distributions(
        db: Session,
        worker_id: Optional[int] = None,
        status_filter: Optional[str] = None,
        search_query: Optional[str] = None
    ) -> List[WorkDistributionResponse]:
        """
        Returns all distributions with optional worker, status, and search filters.
        """
        query = db.query(WorkDistribution)
        if worker_id:
            query = query.filter(WorkDistribution.worker_id == worker_id)
        if status_filter and status_filter != "All":
            query = query.filter(WorkDistribution.status == status_filter)
        if search_query:
            q = f"%{search_query.strip().lower()}%"
            query = query.join(Worker).filter(
                (func.lower(WorkDistribution.batch_code).like(q))
                | (func.lower(WorkDistribution.item_name_snapshot).like(q))
                | (func.lower(Worker.full_name).like(q))
                | (func.lower(Worker.serial_number).like(q))
            )

        distributions = query.order_by(desc(WorkDistribution.id)).all()
        results = []
        for d in distributions:
            res = WorkDistributionResponse.model_validate(d)
            if d.worker:
                res.worker_name = d.worker.full_name
                res.worker_serial = d.worker.serial_number
            results.append(res)
        return results

    @staticmethod
    def reverse_transaction(
        db: Session,
        txn_id: int,
        req: LedgerCorrectionRequest,
        user_id: Optional[int] = None,
        user_name: Optional[str] = "Admin",
    ) -> MaterialTransaction:
        """
        Auditable Reversal of an erroneous transaction.
        Never permanently deletes any record; marks is_reversed and posts compensation.
        """
        txn = db.query(MaterialTransaction).filter(MaterialTransaction.id == txn_id).first()
        if not txn:
            raise HTTPException(status_code=404, detail="Transaction not found.")
        if txn.is_reversed:
            raise HTTPException(status_code=400, detail="Transaction is already reversed.")

        worker = db.query(Worker).filter(Worker.id == txn.worker_id).first()
        if not worker:
            raise HTTPException(status_code=404, detail="Worker not found.")

        # Mark original transaction as reversed
        txn.is_reversed = True
        txn.reversal_reason = req.reason

        reversal_code = DistributionService.generate_material_txn_code(db)
        txn.reversal_ref_code = reversal_code

        # If we are reversing a DEBIT_GIVEN:
        # Worker was given material that is now being cancelled -> reduce worker pending pieces
        if txn.debit_qty > 0:
            worker.pending_pieces = max(0, worker.pending_pieces - txn.debit_qty)
            comp_txn = MaterialTransaction(
                transaction_code=reversal_code,
                worker_id=worker.id,
                distribution_id=txn.distribution_id,
                item_id=txn.item_id,
                item_name=f"[REVERSAL] {txn.item_name}",
                item_code=txn.item_code,
                transaction_date=date.today(),
                transaction_type="LEDGER_CORRECTION",
                debit_qty=0,
                credit_qty=0,
                rejected_qty=0,
                rate_per_piece=txn.rate_per_piece,
                total_value=0.0,
                running_balance=worker.pending_pieces,
                recorded_by_id=user_id,
                recorded_by_name=user_name,
                remarks=f"Reversal of {txn.transaction_code}: {req.reason}",
            )
            db.add(comp_txn)

        # If we are reversing a CREDIT_RECEIVED (Return):
        # Return is cancelled -> restore pending pieces to worker, deduct erroneously added wage
        elif txn.credit_qty > 0 or txn.rejected_qty > 0:
            total_pieces = txn.credit_qty + txn.rejected_qty
            worker.pending_pieces += total_pieces
            worker.payable_balance = max(0.0, float(worker.payable_balance) - float(txn.total_value))
            worker.total_earned = max(0.0, float(worker.total_earned) - float(txn.total_value))

            comp_txn = MaterialTransaction(
                transaction_code=reversal_code,
                worker_id=worker.id,
                distribution_id=txn.distribution_id,
                item_id=txn.item_id,
                item_name=f"[REVERSAL] {txn.item_name}",
                item_code=txn.item_code,
                transaction_date=date.today(),
                transaction_type="LEDGER_CORRECTION",
                debit_qty=0,
                credit_qty=0,
                rejected_qty=0,
                rate_per_piece=txn.rate_per_piece,
                total_value=0.0,
                running_balance=worker.pending_pieces,
                recorded_by_id=user_id,
                recorded_by_name=user_name,
                remarks=f"Reversal of {txn.transaction_code}: {req.reason}",
            )
            db.add(comp_txn)

        audit = AuditLog(
            user_id=user_id,
            user_email=user_name,
            action="TRANSACTION_REVERSED",
            ip_address="127.0.0.1",
            details=f"Reversed transaction {txn.transaction_code} for worker {worker.full_name}. Reason: {req.reason}",
            timestamp_ist=format_ist_datetime(),
        )
        db.add(audit)

        db.commit()
        db.refresh(txn)
        return txn
