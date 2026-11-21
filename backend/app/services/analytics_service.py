from datetime import date, datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from io import StringIO
import csv
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_

from app.models.worker import Worker
from app.models.item import Item
from app.models.work_distribution import WorkDistribution
from app.models.work_return import WorkReturn
from app.models.material_transaction import MaterialTransaction
from app.models.money_transaction import MoneyTransaction
from app.models.payment_record import PaymentRecord
from app.schemas.analytics import (
    DashboardMetricsResponse,
    TrendDataPoint,
    RecentActivityItem,
    ReportColumn,
    ReportResponse,
    PendingWorkDistributionItem,
    ArtisanPendingGroup,
    PendingWorkSummary,
    PendingWorkReportResponse,
)


class AnalyticsService:

    @staticmethod
    def resolve_date_range(
        date_preset: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Tuple[Optional[date], Optional[date]]:
        """
        Resolves Date Filters: Today, Yesterday, This Week, This Month, Custom Date Range.
        """
        today = date.today()
        if date_preset == "today":
            return today, today
        elif date_preset == "yesterday":
            y = today - timedelta(days=1)
            return y, y
        elif date_preset == "this_week":
            return today - timedelta(days=7), today
        elif date_preset == "this_month":
            first_day = today.replace(day=1)
            return first_day, today
        elif date_preset == "custom":
            return start_date, end_date
        return start_date, end_date

    @staticmethod
    def get_dashboard_metrics(db: Session) -> DashboardMetricsResponse:
        """
        Computes the 10 Core Business Dashboard Metrics:
        1. Total Registered Women
        2. Active Women
        3. Total Pieces Given
        4. Total Pieces Received
        5. Total Pending Pieces
        6. Total Accepted Work Value
        7. Total Wages Earned
        8. Total Advances
        9. Total Payments
        10. Total Outstanding Payable
        Plus 7-day trend charts and recent activity log.
        """
        # 1 & 2. Artisan Worker counts
        total_registered = db.query(Worker).count()
        active_women = db.query(Worker).filter(Worker.status == "Active").count()

        # 3, 4 & 5. Pieces metrics from WorkDistribution
        pieces_given = db.query(func.coalesce(func.sum(WorkDistribution.quantity_issued), 0)).scalar()
        pieces_received = db.query(func.coalesce(func.sum(WorkDistribution.quantity_returned), 0)).scalar()
        pieces_pending = db.query(func.coalesce(func.sum(WorkDistribution.quantity_pending), 0)).scalar()

        # 6. Total Accepted Work Value from WorkReturn
        accepted_value = db.query(func.coalesce(func.sum(WorkReturn.completed_work_value), 0.0)).scalar()

        # 7. Total Wages Earned from MoneyTransaction (Credits)
        wages_earned = db.query(func.coalesce(func.sum(MoneyTransaction.credit_amount), 0.0)).filter(
            MoneyTransaction.is_reversed == False,
            MoneyTransaction.transaction_type.in_(["WORK_EARNING", "BONUS_CREDIT"])
        ).scalar()

        # 8. Total Advances from MoneyTransaction
        total_advances = db.query(func.coalesce(func.sum(MoneyTransaction.debit_amount), 0.0)).filter(
            MoneyTransaction.is_reversed == False,
            MoneyTransaction.transaction_type == "ADVANCE_GIVEN"
        ).scalar()

        # 9. Total Payments from MoneyTransaction
        total_payments = db.query(func.coalesce(func.sum(MoneyTransaction.debit_amount), 0.0)).filter(
            MoneyTransaction.is_reversed == False,
            MoneyTransaction.transaction_type == "WAGE_PAYOUT"
        ).scalar()

        # 10. Total Outstanding Payable from Worker balances
        total_outstanding = db.query(func.coalesce(func.sum(Worker.payable_balance), 0.0)).scalar()

        # --- 7-Day Trend Analytics ---
        today = date.today()
        trends: List[TrendDataPoint] = []
        for i in range(6, -1, -1):
            cur_date = today - timedelta(days=i)
            cur_str = cur_date.strftime("%d %b")

            day_given = db.query(func.coalesce(func.sum(WorkDistribution.quantity_issued), 0)).filter(
                WorkDistribution.issue_date == cur_date
            ).scalar()

            day_received = db.query(func.coalesce(func.sum(WorkReturn.quantity_returned), 0)).filter(
                WorkReturn.return_date == cur_date
            ).scalar()

            day_wages = db.query(func.coalesce(func.sum(MoneyTransaction.credit_amount), 0.0)).filter(
                MoneyTransaction.is_reversed == False,
                MoneyTransaction.transaction_type == "WORK_EARNING",
                MoneyTransaction.transaction_date == cur_date
            ).scalar()

            day_payouts = db.query(func.coalesce(func.sum(MoneyTransaction.debit_amount), 0.0)).filter(
                MoneyTransaction.is_reversed == False,
                MoneyTransaction.transaction_type.in_(["WAGE_PAYOUT", "ADVANCE_GIVEN"]),
                MoneyTransaction.transaction_date == cur_date
            ).scalar()

            trends.append(
                TrendDataPoint(
                    date=cur_str,
                    pieces_given=int(day_given),
                    pieces_received=int(day_received),
                    wages_earned=round(float(day_wages), 2),
                    payouts_made=round(float(day_payouts), 2),
                )
            )

        # --- Recent Activity Feed (Top 8 events) ---
        recent_activity: List[RecentActivityItem] = []

        # Latest returns
        latest_returns = db.query(WorkReturn).order_by(desc(WorkReturn.created_at)).limit(4).all()
        for r in latest_returns:
            w_name = r.worker.full_name if r.worker else "Artisan"
            recent_activity.append(
                RecentActivityItem(
                    id=f"ret-{r.id}",
                    category="RETURN",
                    title=f"Work Return: {r.return_code}",
                    description=f"{w_name} returned {r.quantity_returned} pcs accepted, {r.quantity_rejected} rejected",
                    amount=float(r.completed_work_value),
                    pieces=r.quantity_returned,
                    date=r.return_date.strftime("%d/%m/%Y"),
                    timestamp_ist=r.created_at.strftime("%I:%M %p"),
                )
            )

        # Latest distributions
        latest_dists = db.query(WorkDistribution).order_by(desc(WorkDistribution.created_at)).limit(4).all()
        for d in latest_dists:
            w_name = d.worker.full_name if d.worker else "Artisan"
            recent_activity.append(
                RecentActivityItem(
                    id=f"dist-{d.id}",
                    category="DISTRIBUTION",
                    title=f"Given Work: {d.batch_code}",
                    description=f"Issued {d.quantity_issued} pcs of {d.item_name_snapshot} to {w_name}",
                    amount=float(d.total_gross_wage),
                    pieces=d.quantity_issued,
                    date=d.issue_date.strftime("%d/%m/%Y"),
                    timestamp_ist=d.created_at.strftime("%I:%M %p"),
                )
            )

        # Latest financial transactions
        latest_money = db.query(MoneyTransaction).filter(
            MoneyTransaction.transaction_type.in_(["ADVANCE_GIVEN", "WAGE_PAYOUT"])
        ).order_by(desc(MoneyTransaction.created_at)).limit(4).all()
        for m in latest_money:
            w_name = m.worker.full_name if m.worker else "Artisan"
            cat = "ADVANCE" if m.transaction_type == "ADVANCE_GIVEN" else "PAYOUT"
            recent_activity.append(
                RecentActivityItem(
                    id=f"fin-{m.id}",
                    category=cat,
                    title=f"{'Advance Given' if cat == 'ADVANCE' else 'Wage Payout'}: {m.transaction_code}",
                    description=f"{w_name} received via {m.payment_mode or 'Cash'}",
                    amount=float(m.debit_amount),
                    pieces=None,
                    date=m.transaction_date.strftime("%d/%m/%Y"),
                    timestamp_ist=m.created_at.strftime("%I:%M %p"),
                )
            )

        # Sort recent activity by date descending
        recent_activity.sort(key=lambda x: x.date, reverse=True)
        recent_activity = recent_activity[:10]

        return DashboardMetricsResponse(
            total_registered_women=total_registered,
            active_women=active_women,
            total_pieces_given=int(pieces_given),
            total_pieces_received=int(pieces_received),
            total_pending_pieces=int(pieces_pending),
            total_accepted_work_value=round(float(accepted_value), 2),
            total_wages_earned=round(float(wages_earned), 2),
            total_advances=round(float(total_advances), 2),
            total_payments=round(float(total_payments), 2),
            total_outstanding_payable=round(float(total_outstanding), 2),
            trends=trends,
            recent_activity=recent_activity,
        )

    @staticmethod
    def get_report_data(
        db: Session,
        report_type: str,
        date_preset: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        worker_id: Optional[int] = None,
        item_id: Optional[int] = None,
        search_query: Optional[str] = None,
    ) -> ReportResponse:
        """
        Generates structured data for all 10 reports required by Step 6:
        1. worker-wise
        2. item-wise
        3. daily-distribution
        4. daily-returns
        5. pending-work
        6. daily-wages
        7. advances
        8. payments
        9. outstanding-balances
        10. monthly-summary
        """
        s_date, e_date = AnalyticsService.resolve_date_range(date_preset, start_date, end_date)

        # -------------------------------------------------------------
        # 1. WORKER-WISE REPORT
        # -------------------------------------------------------------
        if report_type == "worker-wise":
            query = db.query(Worker)
            if search_query:
                q = f"%{search_query.strip().lower()}%"
                query = query.filter(
                    or_(
                        func.lower(Worker.full_name).like(q),
                        func.lower(Worker.serial_number).like(q),
                        func.lower(Worker.town).like(q),
                        func.lower(Worker.address).like(q),
                        func.lower(Worker.village).like(q),
                    )
                )
            workers = query.order_by(Worker.full_name.asc()).all()

            columns = [
                ReportColumn(key="serial_number", label="Serial No", align="left"),
                ReportColumn(key="full_name", label="Artisan Name", align="left"),
                ReportColumn(key="village", label="Town / Location", align="left"),
                ReportColumn(key="status", label="Status", align="center", format="badge"),
                ReportColumn(key="pieces_given", label="Given (Debit)", align="right", format="number"),
                ReportColumn(key="pieces_received", label="Received (Credit)", align="right", format="number"),
                ReportColumn(key="pending_pieces", label="Pending Pieces", align="right", format="number"),
                ReportColumn(key="total_earned", label="Total Earned", align="right", format="currency"),
                ReportColumn(key="total_advances", label="Advances Taken", align="right", format="currency"),
                ReportColumn(key="total_paid", label="Wages Paid", align="right", format="currency"),
                ReportColumn(key="payable_balance", label="Outstanding Balance", align="right", format="currency"),
            ]

            rows = []
            sum_given, sum_received, sum_pending = 0, 0, 0
            sum_earned, sum_adv, sum_paid, sum_bal = 0.0, 0.0, 0.0, 0.0

            for w in workers:
                # Calculate given & received
                given = db.query(func.coalesce(func.sum(WorkDistribution.quantity_issued), 0)).filter(
                    WorkDistribution.worker_id == w.id
                ).scalar()
                received = db.query(func.coalesce(func.sum(WorkDistribution.quantity_returned), 0)).filter(
                    WorkDistribution.worker_id == w.id
                ).scalar()

                advances = db.query(func.coalesce(func.sum(MoneyTransaction.debit_amount), 0.0)).filter(
                    MoneyTransaction.worker_id == w.id,
                    MoneyTransaction.transaction_type == "ADVANCE_GIVEN",
                    MoneyTransaction.is_reversed == False,
                ).scalar()

                paid = db.query(func.coalesce(func.sum(MoneyTransaction.debit_amount), 0.0)).filter(
                    MoneyTransaction.worker_id == w.id,
                    MoneyTransaction.transaction_type == "WAGE_PAYOUT",
                    MoneyTransaction.is_reversed == False,
                ).scalar()

                rows.append({
                    "id": w.id,
                    "serial_number": w.serial_number,
                    "full_name": w.full_name,
                    "village": w.town or w.village or "Gujarat",
                    "status": w.status,
                    "pieces_given": int(given),
                    "pieces_received": int(received),
                    "pending_pieces": int(w.pending_pieces),
                    "total_earned": float(w.total_earned),
                    "total_advances": float(advances),
                    "total_paid": float(paid),
                    "payable_balance": float(w.payable_balance),
                })

                sum_given += int(given)
                sum_received += int(received)
                sum_pending += int(w.pending_pieces)
                sum_earned += float(w.total_earned)
                sum_adv += float(advances)
                sum_paid += float(paid)
                sum_bal += float(w.payable_balance)

            return ReportResponse(
                report_type="worker-wise",
                report_title="Worker-Wise Comprehensive Business Report",
                date_preset=date_preset,
                start_date=s_date.isoformat() if s_date else None,
                end_date=e_date.isoformat() if e_date else None,
                total_records=len(rows),
                summary_metrics={
                    "total_artisans": len(rows),
                    "total_given_pieces": sum_given,
                    "total_received_pieces": sum_received,
                    "total_pending_pieces": sum_pending,
                    "total_wages_earned": round(sum_earned, 2),
                    "total_advances": round(sum_adv, 2),
                    "total_wages_paid": round(sum_paid, 2),
                    "total_outstanding_balance": round(sum_bal, 2),
                },
                columns=columns,
                rows=rows,
            )

        # -------------------------------------------------------------
        # 2. ITEM-WISE REPORT
        # -------------------------------------------------------------
        elif report_type == "item-wise":
            items = db.query(Item).order_by(Item.item_name.asc()).all()
            columns = [
                ReportColumn(key="item_code", label="Design Code", align="left"),
                ReportColumn(key="item_name", label="Design / Item Name", align="left"),
                ReportColumn(key="price_per_piece", label="Current Piece Rate", align="right", format="currency"),
                ReportColumn(key="total_given", label="Pieces Given", align="right", format="number"),
                ReportColumn(key="total_received", label="Pieces Received", align="right", format="number"),
                ReportColumn(key="total_rejected", label="Defects / Rejected", align="right", format="number"),
                ReportColumn(key="total_pending", label="Remaining Pending", align="right", format="number"),
                ReportColumn(key="gross_work_value", label="Total Consignment Value", align="right", format="currency"),
            ]

            rows = []
            sum_given, sum_rec, sum_rej, sum_pen = 0, 0, 0, 0
            sum_val = 0.0

            for item in items:
                given = db.query(func.coalesce(func.sum(WorkDistribution.quantity_issued), 0)).filter(
                    WorkDistribution.item_id == item.id
                ).scalar()
                received = db.query(func.coalesce(func.sum(WorkDistribution.quantity_returned), 0)).filter(
                    WorkDistribution.item_id == item.id
                ).scalar()
                rejected = db.query(func.coalesce(func.sum(WorkDistribution.quantity_rejected), 0)).filter(
                    WorkDistribution.item_id == item.id
                ).scalar()
                pending = db.query(func.coalesce(func.sum(WorkDistribution.quantity_pending), 0)).filter(
                    WorkDistribution.item_id == item.id
                ).scalar()
                gross_val = db.query(func.coalesce(func.sum(WorkDistribution.total_gross_wage), 0.0)).filter(
                    WorkDistribution.item_id == item.id
                ).scalar()

                rows.append({
                    "id": item.id,
                    "item_code": item.item_code or "—",
                    "item_name": item.item_name,
                    "price_per_piece": float(item.price_per_piece),
                    "total_given": int(given),
                    "total_received": int(received),
                    "total_rejected": int(rejected),
                    "total_pending": int(pending),
                    "gross_work_value": float(gross_val),
                })
                sum_given += int(given)
                sum_rec += int(received)
                sum_rej += int(rejected)
                sum_pen += int(pending)
                sum_val += float(gross_val)

            return ReportResponse(
                report_type="item-wise",
                report_title="Item & Fabric Design Performance Report",
                date_preset=date_preset,
                start_date=s_date.isoformat() if s_date else None,
                end_date=e_date.isoformat() if e_date else None,
                total_records=len(rows),
                summary_metrics={
                    "total_designs": len(rows),
                    "total_given": sum_given,
                    "total_received": sum_rec,
                    "total_rejected": sum_rej,
                    "total_pending": sum_pen,
                    "total_gross_value": round(sum_val, 2),
                },
                columns=columns,
                rows=rows,
            )

        # -------------------------------------------------------------
        # 3. DAILY WORK DISTRIBUTION
        # -------------------------------------------------------------
        elif report_type == "daily-distribution":
            query = db.query(
                WorkDistribution.issue_date,
                func.count(WorkDistribution.id).label("consignments_count"),
                func.count(func.distinct(WorkDistribution.worker_id)).label("artisans_count"),
                func.sum(WorkDistribution.quantity_issued).label("total_pieces"),
                func.sum(WorkDistribution.total_gross_wage).label("total_value"),
            )
            if s_date:
                query = query.filter(WorkDistribution.issue_date >= s_date)
            if e_date:
                query = query.filter(WorkDistribution.issue_date <= e_date)

            results = query.group_by(WorkDistribution.issue_date).order_by(
                desc(WorkDistribution.issue_date)
            ).all()

            columns = [
                ReportColumn(key="date", label="Date (IST)", align="left", format="date"),
                ReportColumn(key="consignments_count", label="Consignments Dispatched", align="center", format="number"),
                ReportColumn(key="artisans_count", label="Artisans Served", align="center", format="number"),
                ReportColumn(key="total_pieces", label="Total Pieces Given", align="right", format="number"),
                ReportColumn(key="total_value", label="Total Work Value", align="right", format="currency"),
            ]

            rows = [
                {
                    "date": r.issue_date.isoformat(),
                    "consignments_count": r.consignments_count,
                    "artisans_count": r.artisans_count,
                    "total_pieces": int(r.total_pieces or 0),
                    "total_value": float(r.total_value or 0.0),
                }
                for r in results
            ]

            sum_pieces = sum(r["total_pieces"] for r in rows)
            sum_val = sum(r["total_value"] for r in rows)

            return ReportResponse(
                report_type="daily-distribution",
                report_title="Daily Work Distribution Report",
                date_preset=date_preset,
                start_date=s_date.isoformat() if s_date else None,
                end_date=e_date.isoformat() if e_date else None,
                total_records=len(rows),
                summary_metrics={
                    "total_days": len(rows),
                    "total_pieces_distributed": sum_pieces,
                    "total_consignment_value": round(sum_val, 2),
                },
                columns=columns,
                rows=rows,
            )

        # -------------------------------------------------------------
        # 4. DAILY RETURNS & QUALITY REPORT
        # -------------------------------------------------------------
        elif report_type == "daily-returns":
            query = db.query(
                WorkReturn.return_date,
                func.count(WorkReturn.id).label("returns_count"),
                func.sum(WorkReturn.quantity_returned).label("accepted_pieces"),
                func.sum(WorkReturn.quantity_rejected).label("rejected_pieces"),
                func.sum(WorkReturn.completed_work_value).label("earned_wages"),
            )
            if s_date:
                query = query.filter(WorkReturn.return_date >= s_date)
            if e_date:
                query = query.filter(WorkReturn.return_date <= e_date)

            results = query.group_by(WorkReturn.return_date).order_by(
                desc(WorkReturn.return_date)
            ).all()

            columns = [
                ReportColumn(key="date", label="Return Date (IST)", align="left", format="date"),
                ReportColumn(key="returns_count", label="Return Transactions", align="center", format="number"),
                ReportColumn(key="accepted_pieces", label="Accepted Pieces", align="right", format="number"),
                ReportColumn(key="rejected_pieces", label="Rejected Pieces", align="right", format="number"),
                ReportColumn(key="earned_wages", label="Wages Earned", align="right", format="currency"),
            ]

            rows = [
                {
                    "date": r.return_date.isoformat(),
                    "returns_count": r.returns_count,
                    "accepted_pieces": int(r.accepted_pieces or 0),
                    "rejected_pieces": int(r.rejected_pieces or 0),
                    "earned_wages": float(r.earned_wages or 0.0),
                }
                for r in results
            ]

            sum_acc = sum(r["accepted_pieces"] for r in rows)
            sum_rej = sum(r["rejected_pieces"] for r in rows)
            sum_wage = sum(r["earned_wages"] for r in rows)

            return ReportResponse(
                report_type="daily-returns",
                report_title="Daily Work Returns & Quality QC Report",
                date_preset=date_preset,
                start_date=s_date.isoformat() if s_date else None,
                end_date=e_date.isoformat() if e_date else None,
                total_records=len(rows),
                summary_metrics={
                    "total_days": len(rows),
                    "total_accepted_pieces": sum_acc,
                    "total_rejected_pieces": sum_rej,
                    "total_wages_earned": round(sum_wage, 2),
                },
                columns=columns,
                rows=rows,
            )

        # -------------------------------------------------------------
        # 5. PENDING WORK REPORT
        # -------------------------------------------------------------
        elif report_type == "pending-work":
            query = db.query(WorkDistribution).filter(WorkDistribution.quantity_pending > 0)
            if worker_id:
                query = query.filter(WorkDistribution.worker_id == worker_id)
            if search_query:
                q = f"%{search_query.strip().lower()}%"
                query = query.join(Worker).filter(
                    or_(
                        func.lower(WorkDistribution.batch_code).like(q),
                        func.lower(Worker.full_name).like(q),
                        func.lower(Worker.serial_number).like(q),
                    )
                )

            dists = query.order_by(WorkDistribution.due_date.asc()).all()

            columns = [
                ReportColumn(key="batch_code", label="Batch ID", align="left"),
                ReportColumn(key="worker_name", label="Artisan", align="left"),
                ReportColumn(key="item_name", label="Item Design", align="left"),
                ReportColumn(key="issue_date", label="Issue Date", align="left", format="date"),
                ReportColumn(key="due_date", label="Due Date", align="left", format="date"),
                ReportColumn(key="quantity_issued", label="Given", align="center", format="number"),
                ReportColumn(key="quantity_returned", label="Returned", align="center", format="number"),
                ReportColumn(key="quantity_pending", label="Pending", align="right", format="number"),
                ReportColumn(key="rate_per_piece", label="Snapshot Rate", align="right", format="currency"),
                ReportColumn(key="pending_value", label="Pending Wage", align="right", format="currency"),
                ReportColumn(key="is_overdue", label="Overdue Status", align="center", format="badge"),
            ]

            rows = []
            sum_pending = 0
            sum_pending_val = 0.0
            today = date.today()

            for d in dists:
                w_name = d.worker.full_name if d.worker else f"Worker #{d.worker_id}"
                pen_val = round(d.quantity_pending * float(d.rate_per_piece), 2)
                is_overdue = d.due_date < today

                rows.append({
                    "id": d.id,
                    "batch_code": d.batch_code,
                    "worker_name": w_name,
                    "item_name": d.item_name_snapshot,
                    "issue_date": d.issue_date.isoformat(),
                    "due_date": d.due_date.isoformat(),
                    "quantity_issued": d.quantity_issued,
                    "quantity_returned": d.quantity_returned,
                    "quantity_pending": d.quantity_pending,
                    "rate_per_piece": float(d.rate_per_piece),
                    "pending_value": pen_val,
                    "is_overdue": "Overdue" if is_overdue else "On Track",
                })
                sum_pending += d.quantity_pending
                sum_pending_val += pen_val

            return ReportResponse(
                report_type="pending-work",
                report_title="Active Pending Work Consignments Report",
                date_preset=date_preset,
                start_date=s_date.isoformat() if s_date else None,
                end_date=e_date.isoformat() if e_date else None,
                total_records=len(rows),
                summary_metrics={
                    "total_active_batches": len(rows),
                    "total_pending_pieces": sum_pending,
                    "total_pending_wages": round(sum_pending_val, 2),
                },
                columns=columns,
                rows=rows,
            )

        # -------------------------------------------------------------
        # 6. DAILY WAGES REPORT
        # -------------------------------------------------------------
        elif report_type == "daily-wages":
            query = db.query(
                MoneyTransaction.transaction_date,
                func.count(MoneyTransaction.id).label("credits_count"),
                func.sum(MoneyTransaction.credit_amount).label("total_wages"),
            ).filter(
                MoneyTransaction.is_reversed == False,
                MoneyTransaction.transaction_type.in_(["WORK_EARNING", "BONUS_CREDIT"])
            )
            if s_date:
                query = query.filter(MoneyTransaction.transaction_date >= s_date)
            if e_date:
                query = query.filter(MoneyTransaction.transaction_date <= e_date)

            results = query.group_by(MoneyTransaction.transaction_date).order_by(
                desc(MoneyTransaction.transaction_date)
            ).all()

            columns = [
                ReportColumn(key="date", label="Date (IST)", align="left", format="date"),
                ReportColumn(key="credits_count", label="Wage Transactions", align="center", format="number"),
                ReportColumn(key="total_wages", label="Total Wages Earned", align="right", format="currency"),
            ]

            rows = [
                {
                    "date": r.transaction_date.isoformat(),
                    "credits_count": r.credits_count,
                    "total_wages": float(r.total_wages or 0.0),
                }
                for r in results
            ]

            sum_wages = sum(r["total_wages"] for r in rows)

            return ReportResponse(
                report_type="daily-wages",
                report_title="Daily Wages Earned Report",
                date_preset=date_preset,
                start_date=s_date.isoformat() if s_date else None,
                end_date=e_date.isoformat() if e_date else None,
                total_records=len(rows),
                summary_metrics={
                    "total_days": len(rows),
                    "total_wages": round(sum_wages, 2),
                },
                columns=columns,
                rows=rows,
            )

        # -------------------------------------------------------------
        # 7. ADVANCES AND WITHDRAWALS
        # -------------------------------------------------------------
        elif report_type == "advances":
            query = db.query(MoneyTransaction).filter(
                MoneyTransaction.transaction_type == "ADVANCE_GIVEN",
                MoneyTransaction.is_reversed == False
            )
            if s_date:
                query = query.filter(MoneyTransaction.transaction_date >= s_date)
            if e_date:
                query = query.filter(MoneyTransaction.transaction_date <= e_date)

            txns = query.order_by(desc(MoneyTransaction.transaction_date), desc(MoneyTransaction.id)).all()

            columns = [
                ReportColumn(key="transaction_date", label="Date", align="left", format="date"),
                ReportColumn(key="transaction_code", label="Txn Code", align="left"),
                ReportColumn(key="worker_name", label="Artisan", align="left"),
                ReportColumn(key="amount", label="Advance Amount", align="right", format="currency"),
                ReportColumn(key="payment_mode", label="Disbursal Mode", align="center"),
                ReportColumn(key="reference_no", label="Reference No", align="left"),
                ReportColumn(key="recorded_by", label="Authorized By", align="left"),
                ReportColumn(key="remarks", label="Remarks", align="left"),
            ]

            rows = [
                {
                    "id": t.id,
                    "transaction_date": t.transaction_date.isoformat(),
                    "transaction_code": t.transaction_code,
                    "worker_name": t.worker.full_name if t.worker else "Artisan",
                    "amount": float(t.debit_amount),
                    "payment_mode": t.payment_mode or "Cash",
                    "reference_no": t.reference_no or "—",
                    "recorded_by": t.recorded_by_name,
                    "remarks": t.remarks or "—",
                }
                for t in txns
            ]

            sum_adv = sum(r["amount"] for r in rows)

            return ReportResponse(
                report_type="advances",
                report_title="Advances & Cash Withdrawals Register",
                date_preset=date_preset,
                start_date=s_date.isoformat() if s_date else None,
                end_date=e_date.isoformat() if e_date else None,
                total_records=len(rows),
                summary_metrics={
                    "total_advance_count": len(rows),
                    "total_amount_advanced": round(sum_adv, 2),
                },
                columns=columns,
                rows=rows,
            )

        # -------------------------------------------------------------
        # 8. PAYMENTS & SETTLEMENTS
        # -------------------------------------------------------------
        elif report_type == "payments":
            query = db.query(MoneyTransaction).filter(
                MoneyTransaction.transaction_type == "WAGE_PAYOUT",
                MoneyTransaction.is_reversed == False
            )
            if s_date:
                query = query.filter(MoneyTransaction.transaction_date >= s_date)
            if e_date:
                query = query.filter(MoneyTransaction.transaction_date <= e_date)

            txns = query.order_by(desc(MoneyTransaction.transaction_date), desc(MoneyTransaction.id)).all()

            columns = [
                ReportColumn(key="transaction_date", label="Date", align="left", format="date"),
                ReportColumn(key="transaction_code", label="Txn Code", align="left"),
                ReportColumn(key="worker_name", label="Artisan", align="left"),
                ReportColumn(key="amount", label="Payout Amount", align="right", format="currency"),
                ReportColumn(key="payment_mode", label="Disbursal Mode", align="center"),
                ReportColumn(key="reference_no", label="Bank Ref / UTR", align="left"),
                ReportColumn(key="recorded_by", label="Authorized By", align="left"),
                ReportColumn(key="remarks", label="Remarks", align="left"),
            ]

            rows = [
                {
                    "id": t.id,
                    "transaction_date": t.transaction_date.isoformat(),
                    "transaction_code": t.transaction_code,
                    "worker_name": t.worker.full_name if t.worker else "Artisan",
                    "amount": float(t.debit_amount),
                    "payment_mode": t.payment_mode or "Cash",
                    "reference_no": t.reference_no or "—",
                    "recorded_by": t.recorded_by_name,
                    "remarks": t.remarks or "—",
                }
                for t in txns
            ]

            sum_paid = sum(r["amount"] for r in rows)

            return ReportResponse(
                report_type="payments",
                report_title="Wage Payouts & Disbursements Register",
                date_preset=date_preset,
                start_date=s_date.isoformat() if s_date else None,
                end_date=e_date.isoformat() if e_date else None,
                total_records=len(rows),
                summary_metrics={
                    "total_payment_count": len(rows),
                    "total_amount_paid": round(sum_paid, 2),
                },
                columns=columns,
                rows=rows,
            )

        # -------------------------------------------------------------
        # 9. OUTSTANDING WORKER BALANCES
        # -------------------------------------------------------------
        elif report_type == "outstanding-balances":
            workers = db.query(Worker).filter(Worker.payable_balance > 0).order_by(
                desc(Worker.payable_balance)
            ).all()

            columns = [
                ReportColumn(key="serial_number", label="Serial No", align="left"),
                ReportColumn(key="full_name", label="Artisan Name", align="left"),
                ReportColumn(key="phone", label="Phone", align="left"),
                ReportColumn(key="village", label="Town / Location", align="left"),
                ReportColumn(key="pending_pieces", label="Active Pieces", align="center", format="number"),
                ReportColumn(key="payable_balance", label="Payable Balance Due", align="right", format="currency"),
            ]

            rows = [
                {
                    "id": w.id,
                    "serial_number": w.serial_number,
                    "full_name": w.full_name,
                    "phone": w.phone,
                    "village": w.town or w.village or "Gujarat",
                    "pending_pieces": w.pending_pieces,
                    "payable_balance": float(w.payable_balance),
                }
                for w in workers
            ]

            sum_bal = sum(r["payable_balance"] for r in rows)

            return ReportResponse(
                report_type="outstanding-balances",
                report_title="Artisans with Outstanding Payable Balances",
                date_preset=date_preset,
                start_date=s_date.isoformat() if s_date else None,
                end_date=e_date.isoformat() if e_date else None,
                total_records=len(rows),
                summary_metrics={
                    "total_artisans_due": len(rows),
                    "total_outstanding_amount": round(sum_bal, 2),
                },
                columns=columns,
                rows=rows,
            )

        # -------------------------------------------------------------
        # 10. MONTHLY BUSINESS SUMMARY
        # -------------------------------------------------------------
        else:
            # Monthly grouping from WorkDistribution and MoneyTransaction
            columns = [
                ReportColumn(key="month", label="Month / Year", align="left"),
                ReportColumn(key="pieces_given", label="Pieces Given", align="right", format="number"),
                ReportColumn(key="pieces_returned", label="Pieces Returned", align="right", format="number"),
                ReportColumn(key="wages_earned", label="Wages Earned (Credits)", align="right", format="currency"),
                ReportColumn(key="advances", label="Advances Taken", align="right", format="currency"),
                ReportColumn(key="payouts", label="Payouts Disbursed", align="right", format="currency"),
                ReportColumn(key="net_payable_change", label="Net Balance Change", align="right", format="currency"),
            ]

            # Generate last 6 months summary
            rows = []
            today = date.today()
            for m in range(5, -1, -1):
                # calculate month offset
                month_date = today.replace(day=1) - timedelta(days=m * 28)
                m_start = month_date.replace(day=1)
                # Next month start
                if m_start.month == 12:
                    m_end = m_start.replace(year=m_start.year + 1, month=1, day=1) - timedelta(days=1)
                else:
                    m_end = m_start.replace(month=m_start.month + 1, day=1) - timedelta(days=1)

                m_label = m_start.strftime("%B %Y")

                m_given = db.query(func.coalesce(func.sum(WorkDistribution.quantity_issued), 0)).filter(
                    WorkDistribution.issue_date >= m_start,
                    WorkDistribution.issue_date <= m_end
                ).scalar()

                m_returned = db.query(func.coalesce(func.sum(WorkReturn.quantity_returned), 0)).filter(
                    WorkReturn.return_date >= m_start,
                    WorkReturn.return_date <= m_end
                ).scalar()

                m_wages = db.query(func.coalesce(func.sum(MoneyTransaction.credit_amount), 0.0)).filter(
                    MoneyTransaction.transaction_date >= m_start,
                    MoneyTransaction.transaction_date <= m_end,
                    MoneyTransaction.is_reversed == False,
                    MoneyTransaction.transaction_type == "WORK_EARNING"
                ).scalar()

                m_adv = db.query(func.coalesce(func.sum(MoneyTransaction.debit_amount), 0.0)).filter(
                    MoneyTransaction.transaction_date >= m_start,
                    MoneyTransaction.transaction_date <= m_end,
                    MoneyTransaction.is_reversed == False,
                    MoneyTransaction.transaction_type == "ADVANCE_GIVEN"
                ).scalar()

                m_pay = db.query(func.coalesce(func.sum(MoneyTransaction.debit_amount), 0.0)).filter(
                    MoneyTransaction.transaction_date >= m_start,
                    MoneyTransaction.transaction_date <= m_end,
                    MoneyTransaction.is_reversed == False,
                    MoneyTransaction.transaction_type == "WAGE_PAYOUT"
                ).scalar()

                net_change = round(float(m_wages) - float(m_adv) - float(m_pay), 2)

                rows.append({
                    "month": m_label,
                    "pieces_given": int(m_given),
                    "pieces_returned": int(m_returned),
                    "wages_earned": float(m_wages),
                    "advances": float(m_adv),
                    "payouts": float(m_pay),
                    "net_payable_change": net_change,
                })

            return ReportResponse(
                report_type="monthly-summary",
                report_title="Monthly High-Level Business Summary",
                date_preset=date_preset,
                start_date=s_date.isoformat() if s_date else None,
                end_date=e_date.isoformat() if e_date else None,
                total_records=len(rows),
                summary_metrics={
                    "total_months": len(rows),
                    "total_pieces_given": sum(r["pieces_given"] for r in rows),
                    "total_pieces_returned": sum(r["pieces_returned"] for r in rows),
                    "total_wages_earned": round(sum(r["wages_earned"] for r in rows), 2),
                    "total_disbursed": round(sum(r["advances"] + r["payouts"] for r in rows), 2),
                },
                columns=columns,
                rows=rows,
            )

    @staticmethod
    def export_report_csv(report_data: ReportResponse) -> str:
        """
        Renders the ReportResponse into CSV string format for Excel/CSV download.
        """
        output = StringIO()
        writer = csv.writer(output)

        writer.writerow([f"BANDHSETU — {report_data.report_title.upper()}"])
        writer.writerow(["Generated At", datetime.now().strftime("%d/%m/%Y %I:%M %p")])
        if report_data.start_date or report_data.end_date:
            writer.writerow(["Date Range", f"{report_data.start_date or 'Start'} to {report_data.end_date or 'Present'}"])
        writer.writerow([])

        # Summary Metrics
        writer.writerow(["SUMMARY METRICS"])
        for k, v in report_data.summary_metrics.items():
            label = k.replace("_", " ").title()
            val_str = f"INR {v:.2f}" if isinstance(v, float) else str(v)
            writer.writerow([label, val_str])
        writer.writerow([])

        # Header Columns
        headers = [c.label for c in report_data.columns]
        writer.writerow(headers)

        # Rows
        for row in report_data.rows:
            row_vals = []
            for c in report_data.columns:
                val = row.get(c.key, "")
                if c.format == "currency" and isinstance(val, (int, float)):
                    row_vals.append(f"{val:.2f}")
                else:
                    row_vals.append(str(val))
            writer.writerow(row_vals)

        return output.getvalue()

    @staticmethod
    def get_pending_work_report(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        date_preset: Optional[str] = "this_month",
        q: Optional[str] = None,
        town: Optional[str] = None,
        item_name: Optional[str] = None,
    ) -> PendingWorkReportResponse:
        """
        Artisan Pending Work & Non-Submission Report.
        Identifies artisans with unreturned / partially returned pieces
        based on the ORIGINAL material distribution date (issued_on).
        """
        today = date.today()

        # 1. Resolve date range based on date_preset or custom dates
        if date_preset == "this_month":
            resolved_start = today.replace(day=1)
            resolved_end = today
        elif date_preset == "prev_month":
            curr_first = today.replace(day=1)
            resolved_end = curr_first - timedelta(days=1)
            resolved_start = resolved_end.replace(day=1)
        elif date_preset == "last_30_days":
            resolved_start = today - timedelta(days=30)
            resolved_end = today
        elif date_preset == "all_time":
            resolved_start = date(2020, 1, 1)
            resolved_end = today
        elif date_preset == "custom":
            resolved_start = start_date or today.replace(day=1)
            resolved_end = end_date or today
        else:
            resolved_start = start_date or today.replace(day=1)
            resolved_end = end_date or today

        # 2. Query WorkDistributions issued within [resolved_start, resolved_end]
        query = db.query(WorkDistribution).join(Worker, WorkDistribution.worker_id == Worker.id)
        query = query.filter(
            WorkDistribution.issue_date >= resolved_start,
            WorkDistribution.issue_date <= resolved_end
        )

        if town and town.strip():
            query = query.filter(Worker.town == town.strip())

        if item_name and item_name.strip():
            query = query.filter(WorkDistribution.item_name_snapshot == item_name.strip())

        if q and q.strip():
            term = f"%{q.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(Worker.full_name).like(term),
                    func.lower(Worker.serial_number).like(term),
                    func.lower(WorkDistribution.batch_code).like(term),
                    func.lower(WorkDistribution.item_name_snapshot).like(term),
                )
            )

        # Oldest issue date first
        distributions_db = query.order_by(WorkDistribution.issue_date.asc(), WorkDistribution.id.asc()).all()

        # 3. Dynamic Return and Pending Pieces Calculation
        pending_items: List[PendingWorkDistributionItem] = []
        artisan_map: Dict[int, List[PendingWorkDistributionItem]] = {}
        worker_info_map: Dict[int, Worker] = {}

        for dist in distributions_db:
            worker = dist.worker
            worker_info_map[worker.id] = worker

            # Sum actual returns for this distribution
            returns = db.query(WorkReturn).filter(WorkReturn.distribution_id == dist.id).all()
            received_pcs = sum(r.quantity_returned for r in returns)
            rejected_pcs = sum(r.quantity_rejected for r in returns)
            remaining_pcs = dist.quantity_issued - received_pcs - rejected_pcs

            # Exclude fully returned distributions (Remaining Pieces <= 0)
            if remaining_pcs <= 0:
                continue

            days_pending = max(0, (today - dist.issue_date).days)
            is_zero_return = (received_pcs == 0)

            item_dto = PendingWorkDistributionItem(
                distribution_id=dist.id,
                batch_code=dist.batch_code,
                worker_id=worker.id,
                artisan_name=worker.full_name,
                serial_number=worker.serial_number,
                town=worker.town or "Anjar",
                phone=worker.phone or "",
                issue_date=dist.issue_date.strftime("%Y-%m-%d"),
                item_name=dist.item_name_snapshot,
                knot_style=dist.knot_style or "Standard",
                rate_per_piece=float(dist.rate_per_piece),
                given_pcs=dist.quantity_issued,
                received_pcs=received_pcs,
                rejected_pcs=rejected_pcs,
                remaining_pcs=remaining_pcs,
                days_pending=days_pending,
                is_zero_return=is_zero_return,
            )
            pending_items.append(item_dto)

            if worker.id not in artisan_map:
                artisan_map[worker.id] = []
            artisan_map[worker.id].append(item_dto)

        # 4. Group by Artisan
        artisan_groups: List[ArtisanPendingGroup] = []
        artisans_zero_submissions_count = 0

        for worker_id, items in artisan_map.items():
            worker = worker_info_map[worker_id]
            total_given = sum(i.given_pcs for i in items)
            total_received = sum(i.received_pcs for i in items)
            total_rejected = sum(i.rejected_pcs for i in items)
            total_pending = sum(i.remaining_pcs for i in items)
            is_zero_sub = any(i.is_zero_return for i in items)
            if is_zero_sub:
                artisans_zero_submissions_count += 1

            artisan_groups.append(
                ArtisanPendingGroup(
                    worker_id=worker.id,
                    artisan_name=worker.full_name,
                    serial_number=worker.serial_number,
                    town=worker.town or "Anjar",
                    phone=worker.phone or "",
                    total_given=total_given,
                    total_received=total_received,
                    total_rejected=total_rejected,
                    total_pending=total_pending,
                    is_zero_submission=is_zero_sub,
                    distributions=items,
                )
            )

        # Sort artisan groups by total pending descending
        artisan_groups.sort(key=lambda g: (-g.total_pending, g.artisan_name))

        # 5. Summary Metrics
        summary = PendingWorkSummary(
            total_artisans_with_pending=len(artisan_groups),
            total_pieces_given=sum(i.given_pcs for i in pending_items),
            total_pieces_received=sum(i.received_pcs for i in pending_items),
            total_pieces_pending=sum(i.remaining_pcs for i in pending_items),
            artisans_zero_submissions=artisans_zero_submissions_count,
        )

        # 6. Available dropdown filter values
        all_towns = [r[0] for r in db.query(Worker.town).distinct().all() if r[0]]
        all_designs = [r[0] for r in db.query(Item.item_name).distinct().all() if r[0]]

        return PendingWorkReportResponse(
            start_date=resolved_start.strftime("%Y-%m-%d"),
            end_date=resolved_end.strftime("%Y-%m-%d"),
            date_preset=date_preset,
            summary=summary,
            distributions=pending_items,
            artisan_groups=artisan_groups,
            available_towns=sorted(all_towns),
            available_designs=sorted(all_designs),
        )

    @staticmethod
    def export_pending_work_csv(
        report_data: PendingWorkReportResponse
    ) -> str:
        output = StringIO()
        writer = csv.writer(output)

        # ONLY Table Header
        writer.writerow([
            "Date",
            "Serial No.",
            "Artisan Name",
            "Town",
            "Remaining Pcs",
            "Name of Design",
        ])

        for item in report_data.distributions:
            # Format date as DD/MM/YYYY
            try:
                dt = datetime.strptime(item.issue_date, "%Y-%m-%d")
                formatted_date = dt.strftime("%d/%m/%Y")
            except Exception:
                formatted_date = item.issue_date

            writer.writerow([
                formatted_date,
                item.serial_number,
                item.artisan_name,
                item.town,
                item.remaining_pcs,
                item.item_name,
            ])

        return output.getvalue()
