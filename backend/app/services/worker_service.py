import re
from datetime import date, datetime
from typing import List, Optional, Tuple, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func
from fastapi import HTTPException, status
from app.models.worker import Worker
from app.models.item import Item
from app.models.work_distribution import WorkDistribution
from app.models.work_return import WorkReturn
from app.models.material_ledger import MaterialLedgerEntry
from app.models.payment_record import PaymentRecord
from app.schemas.worker import (
    WorkerCreate,
    WorkerUpdate,
    WorkDistributionCreate,
    PaymentRecordCreate,
    TimelineTransactionItem,
)


class WorkerService:
    @staticmethod
    def compute_company_prefix(company_name: str) -> str:
        """
        Computes uppercase company initials for worker ID prefix.
        e.g. 'Paradise Bandhani' -> 'PB' (Worker IDs: PB-1, PB-2, etc.)
        e.g. 'Vinchhi Bandhej' -> 'VB' (Worker IDs: VB-1, VB-2, etc.)
        e.g. 'Shree Radhe Bandhej' -> 'SRB' (Worker IDs: SRB-1, etc.)
        e.g. 'Bandhani' -> 'BA'
        """
        if not company_name:
            return "WRK"
        words = [w for w in re.split(r"[^A-Za-z0-9]+", company_name.strip()) if w]
        if not words:
            return "WRK"
        if len(words) >= 2:
            return "".join(w[0].upper() for w in words)
        if len(words[0]) >= 2:
            return words[0][:2].upper()
        return words[0].upper()

    @classmethod
    def get_company_prefix(cls, db: Session, business_id: int = 1) -> str:
        from app.models.company import Company
        company = db.query(Company).filter(Company.id == business_id).first()
        if not company or not company.name:
            return "WRK"
        return cls.compute_company_prefix(company.name)

    @classmethod
    def generate_next_serial_number(cls, db: Session, business_id: int = 1) -> str:
        """
        Generates the next sequential unique serial number in format company initials + '-' + number.
        e.g. For 'Paradise Bandhani' -> PB-1, PB-2, PB-3...
        e.g. For 'Vinchhi Bandhej' -> VB-1, VB-2, VB-3...
        Guaranteed to never reuse past serial numbers.
        """
        prefix = cls.get_company_prefix(db, business_id)
        workers = db.query(Worker.serial_number).filter(Worker.business_id == business_id).all()
        max_num = 0

        for (sn,) in workers:
            if sn:
                # Match numerical digits at the end of serial_number
                matches = re.findall(r"\d+", sn)
                if matches:
                    num = int(matches[-1])
                    if num > max_num:
                        max_num = num

        next_num = max_num + 1
        return f"{prefix}-{next_num}"

    @staticmethod
    def search_workers(
        db: Session,
        q: Optional[str] = None,
        status_filter: Optional[Any] = None,
        city_filter: Optional[Any] = None,
        village_filter: Optional[Any] = None,
        limit: int = 100,
        offset: int = 0,
        business_id: Optional[int] = None
    ) -> Tuple[List[Worker], int]:
        """
        Dynamic search with partial matching on Serial Number, Full Name,
        Mobile Number, Town, City, and Village.
        Specifically supports searching by bare numbers like 1, 2, 3 to match PB-1, VB-1, etc.
        Scoped strictly by business_id.
        """
        query = db.query(Worker)
        if business_id is not None:
            query = query.filter(Worker.business_id == business_id)

        if q and isinstance(q, str) and q.strip():
            raw_q = q.strip()
            term = f"%{raw_q.lower()}%"
            conditions = [
                func.lower(Worker.serial_number).like(term),
                func.lower(Worker.full_name).like(term),
                Worker.phone.like(term),
                func.lower(Worker.town).like(term),
                func.lower(Worker.address).like(term),
                func.lower(Worker.city).like(term),
                func.lower(Worker.village).like(term),
            ]

            # Allow direct numeric ID searching: typing "1", "2", "3" matches "PB-1", "VB-1", "WRK-0001", etc.
            if raw_q.isdigit():
                num = int(raw_q)
                conditions.extend([
                    Worker.serial_number.ilike(f"%-{num}"),
                    Worker.serial_number.ilike(f"%-{num:04d}"),
                    Worker.serial_number == raw_q,
                ])
            else:
                # Also support typing without hyphen (e.g. "pb1" matches "PB-1")
                clean_term = raw_q.replace("-", "").replace(" ", "").lower()
                if clean_term:
                    conditions.append(
                        func.replace(func.replace(func.lower(Worker.serial_number), "-", ""), " ", "").like(f"%{clean_term}%")
                    )

            query = query.filter(or_(*conditions))

        # Handle string or FastAPI Query object gracefully
        status_val = status_filter if isinstance(status_filter, str) else getattr(status_filter, "default", None)
        if status_val and isinstance(status_val, str) and status_val.lower() != "all":
            query = query.filter(Worker.status.ilike(status_val.strip()))

        city_val = city_filter if isinstance(city_filter, str) else getattr(city_filter, "default", None)
        if city_val and isinstance(city_val, str) and city_val.lower() != "all":
            query = query.filter(Worker.city.ilike(city_val.strip()))

        village_val = village_filter if isinstance(village_filter, str) else getattr(village_filter, "default", None)
        if village_val and isinstance(village_val, str) and village_val.lower() != "all":
            query = query.filter(Worker.village.ilike(village_val.strip()))

        total = query.count()
        workers = query.order_by(Worker.id.asc()).offset(offset).limit(limit).all()
        return workers, total

    @classmethod
    def create_worker(cls, db: Session, data: WorkerCreate, business_id: int = 1) -> Worker:
        """Registers a new woman artisan with a guaranteed unique serial number for the business."""
        serial_num = cls.generate_next_serial_number(db, business_id=business_id)

        worker = Worker(
            business_id=business_id,
            serial_number=serial_num,
            full_name=data.full_name.strip(),
            phone=data.phone.strip(),
            town=data.town.strip(),
            address=data.address.strip() if data.address else None,
            city=(data.city or "").strip(),
            village=(data.village or "").strip(),
            joining_date=data.joining_date or date.today(),
            status=data.status or "Active",
            remarks=data.remarks,
            pending_pieces=0,
            payable_balance=0.00,
            total_earned=0.00
        )
        db.add(worker)
        db.commit()
        db.refresh(worker)
        return worker

    @staticmethod
    def distribute_work(
        db: Session,
        worker_id: int,
        data: WorkDistributionCreate
    ) -> WorkDistribution:
        """
        Issues new work consignment to worker with HISTORICAL PRICE SNAPSHOT.
        The price applicable at this exact moment is permanently stored.
        Future price changes in the Item catalogue will NEVER alter this transaction.
        """
        worker = db.query(Worker).filter(Worker.id == worker_id).first()
        if not worker:
            raise HTTPException(status_code=404, detail="Worker not found.")

        item = db.query(Item).filter(Item.id == data.item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Item catalogue entry not found.")

        # Snapshot unit price from Item catalogue
        snapshot_rate = float(item.price_per_piece)
        gross_wage = round(snapshot_rate * data.quantity_issued, 2)
        net_wage = round(gross_wage + (data.bonus or 0.0) - (data.deductions or 0.0), 2)

        # Generate unique Batch Code
        batch_count = db.query(WorkDistribution).count() + 1
        batch_code = f"BAT-{date.today().year}-{batch_count:04d}"

        distribution = WorkDistribution(
            business_id=worker.business_id or 1,
            batch_code=batch_code,
            worker_id=worker.id,
            item_id=item.id,
            item_name_snapshot=item.item_name,
            item_code_snapshot=item.item_code,
            rate_per_piece=snapshot_rate,  # Permanent Historical Snapshot Rate
            knot_style=data.knot_style,
            quantity_issued=data.quantity_issued,
            quantity_returned=0,
            quantity_pending=data.quantity_issued,
            total_gross_wage=gross_wage,
            deductions=data.deductions or 0.0,
            bonus=data.bonus or 0.0,
            net_payable=net_wage,
            issue_date=date.today(),
            due_date=data.due_date,
            status="Issued",
            remarks=data.remarks
        )
        db.add(distribution)

        # Also create initial Material Ledger entry for the raw fabric pieces
        mat_entry = MaterialLedgerEntry(
            business_id=worker.business_id or 1,
            worker_id=worker.id,
            lot_number=batch_code,
            material_type=f"{item.item_name} (Raw Fabric)",
            issued_qty=float(data.quantity_issued),
            returned_qty=0.0,
            unit="pieces",
            issue_date=date.today(),
            status="With Worker",
            notes=f"Issued for {data.knot_style} knotting"
        )
        db.add(mat_entry)

        # Update worker counters
        worker.pending_pieces += data.quantity_issued
        worker.payable_balance = float(worker.payable_balance) + net_wage
        worker.total_earned = float(worker.total_earned) + net_wage

        db.commit()
        db.refresh(distribution)
        return distribution

    @staticmethod
    def record_payment(
        db: Session,
        worker_id: int,
        data: PaymentRecordCreate,
        disbursed_by_name: str = "Admin"
    ) -> PaymentRecord:
        """Records a wage disbursement, advance, bonus or deduction for a worker."""
        worker = db.query(Worker).filter(Worker.id == worker_id).first()
        if not worker:
            raise HTTPException(status_code=404, detail="Worker not found.")

        payment = PaymentRecord(
            business_id=worker.business_id or 1,
            worker_id=worker.id,
            payment_type=data.payment_type,
            amount=data.amount,
            payment_mode=data.payment_mode,
            reference_no=data.reference_no,
            disbursed_by_name=disbursed_by_name,
            payment_date=date.today(),
            notes=data.notes
        )
        db.add(payment)

        # Update worker payable balance
        current_bal = float(worker.payable_balance)
        if data.payment_type in ("Wage Payout", "Advance Given"):
            worker.payable_balance = round(current_bal - data.amount, 2)
        elif data.payment_type == "Bonus":
            worker.payable_balance = current_bal + data.amount
            worker.total_earned = float(worker.total_earned) + data.amount

        db.commit()
        db.refresh(payment)
        return payment

    @staticmethod
    def get_timeline(db: Session, worker_id: int) -> List[TimelineTransactionItem]:
        """Assembles a unified chronological timeline of all activities for a worker."""
        timeline: List[TimelineTransactionItem] = []

        # 1. Work distributions (Issued on Date)
        distributions = db.query(WorkDistribution).filter(WorkDistribution.worker_id == worker_id).all()
        for d in distributions:
            timeline.append(
                TimelineTransactionItem(
                    id=f"dist-{d.id}",
                    category="WORK_ISSUED",
                    title=f"Issued on Date: {d.quantity_issued} pcs ({d.batch_code})",
                    description=f"{d.quantity_issued} pieces of {d.item_name_snapshot} issued on {d.issue_date.strftime('%d/%m/%Y')} (Total value: ₹{d.net_payable:.2f})",
                    amount=float(d.net_payable),
                    quantity=d.quantity_issued,
                    remaining_quantity=d.quantity_issued,
                    batch_code=d.batch_code,
                    item_name=d.item_name_snapshot,
                    date=d.issue_date,
                    status_badge=f"Issued ({d.quantity_issued} pcs)"
                )
            )

        # 2. Work returns (Received on Date & Remaining Received on Date)
        returns = db.query(WorkReturn).filter(WorkReturn.worker_id == worker_id).all()
        for r in returns:
            dist = r.distribution
            pending_left = dist.quantity_pending if dist else 0
            is_final = pending_left == 0

            if is_final:
                title = f"Remaining Received: {r.quantity_returned} pcs ({dist.batch_code if dist else r.return_code})"
                status_badge = "Remaining Received (All Done)"
            else:
                title = f"Received on Date: {r.quantity_returned} pcs ({dist.batch_code if dist else r.return_code})"
                status_badge = f"{r.quantity_returned} Recv ({pending_left} Remaining)"

            desc = f"{r.quantity_returned} pieces of {r.item_name_snapshot} received on {r.return_date.strftime('%d/%m/%Y')} • Earned: ₹{float(r.completed_work_value):.2f} • Remaining pending: {pending_left} pcs"
            if r.quantity_rejected > 0:
                desc += f" • {r.quantity_rejected} defective pieces rejected ({r.rejection_reason or 'QC defect'})"
            if r.recorded_by_name:
                desc += f" • Received by {r.recorded_by_name}"

            timeline.append(
                TimelineTransactionItem(
                    id=f"ret-{r.id}",
                    category="WORK_RETURNED",
                    title=title,
                    description=desc,
                    amount=float(r.completed_work_value),
                    quantity=r.quantity_returned,
                    remaining_quantity=pending_left,
                    batch_code=dist.batch_code if dist else None,
                    item_name=r.item_name_snapshot,
                    date=r.return_date,
                    status_badge=status_badge
                )
            )

        # 3. Payments and Advances
        payments = db.query(PaymentRecord).filter(PaymentRecord.worker_id == worker_id).all()
        for p in payments:
            timeline.append(
                TimelineTransactionItem(
                    id=f"pay-{p.id}",
                    category="PAYMENT_DISBURSED" if p.payment_type == "Wage Payout" else "ADVANCE_GIVEN",
                    title=f"{p.payment_type} via {p.payment_mode}",
                    description=p.notes or f"Disbursed by {p.disbursed_by_name}",
                    amount=float(p.amount),
                    quantity=None,
                    remaining_quantity=None,
                    batch_code=None,
                    item_name=None,
                    date=p.payment_date,
                    status_badge="Settled"
                )
            )

        # 4. Material Ledger entries
        materials = db.query(MaterialLedgerEntry).filter(MaterialLedgerEntry.worker_id == worker_id).all()
        for m in materials:
            timeline.append(
                TimelineTransactionItem(
                    id=f"mat-{m.id}",
                    category="MATERIAL_ISSUED",
                    title=f"Material Issued: {m.material_type}",
                    description=f"{m.issued_qty} {m.unit} issued (Lot: {m.lot_number or 'Standard'})",
                    amount=None,
                    quantity=int(m.issued_qty) if m.unit == "pieces" else None,
                    remaining_quantity=None,
                    batch_code=None,
                    item_name=m.material_type,
                    date=m.issue_date,
                    status_badge=m.status
                )
            )

        # Sort newest date first
        timeline.sort(key=lambda x: x.date, reverse=True)
        return timeline


worker_service = WorkerService()
