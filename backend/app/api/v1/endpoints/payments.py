from typing import Optional, Annotated
from datetime import date
from io import StringIO
import csv
from fastapi import APIRouter, Depends, Query, Path, status, Response, Request, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User
from app.api.deps import get_current_user, require_admin
from app.services.payment_service import PaymentService
from app.core.idempotency import idempotency_engine
from app.schemas.payment import (
    AdvanceCreateRequest,
    PayoutCreateRequest,
    MoneyTransactionResponse,
    MoneyLedgerSummary,
    FinancialReversalRequest,
)

router = APIRouter()


@router.post(
    "/advance",
    response_model=MoneyTransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record Cash or Digital Advance Taken by Artisan",
)
def record_advance(
    data: AdvanceCreateRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Records an advance / withdrawal taken by an artisan:
    - Worker-Account Perspective: DEBITs the worker's money ledger
    - Decrements the worker's payable balance
    - Prevents duplicate payments and duplicate reference numbers via Idempotency Engine
    """
    idem_key = request.headers.get("Idempotency-Key") or request.headers.get("X-Idempotency-Key")
    if not idem_key:
        ref_part = (data.reference_no or "").strip()
        raw_sig = f"adv:{data.worker_id}:{data.amount}:{data.payment_mode}:{ref_part}"
        idem_key = f"idem:{current_user.id}:{raw_sig}"

    state, replay = idempotency_engine.check_and_acquire(idem_key)
    if state == "IN_PROGRESS":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A payment request with these exact details is already currently processing. Please wait."
        )
    if state == "REPLAY":
        response.headers["X-Idempotent-Replay"] = "true"
        return replay[1]

    try:
        result = PaymentService.record_advance(
            db=db,
            data=data,
            user_id=current_user.id,
            user_name=current_user.full_name,
        )
        idempotency_engine.record_success(idem_key, 201, result)
        return result
    except Exception:
        idempotency_engine.release_key(idem_key)
        raise


@router.post(
    "/payout",
    response_model=MoneyTransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record Wage Payout (Partial Payment or Full Settlement)",
)
def record_payout(
    data: PayoutCreateRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Records a wage payout (Cash, UPI, Bank Transfer) to an artisan:
    - Worker-Account Perspective: DEBITs the worker's money ledger
    - Decrements the worker's payable balance
    - Supports full settlement flag
    - Prevents duplicate payments via Idempotency Engine
    """
    idem_key = request.headers.get("Idempotency-Key") or request.headers.get("X-Idempotency-Key")
    if not idem_key:
        ref_part = (data.reference_no or "").strip()
        raw_sig = f"pay:{data.worker_id}:{data.amount}:{data.payment_mode}:{data.is_full_settlement}:{ref_part}"
        idem_key = f"idem:{current_user.id}:{raw_sig}"

    state, replay = idempotency_engine.check_and_acquire(idem_key)
    if state == "IN_PROGRESS":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A payout request with these exact details is already currently processing. Please wait."
        )
    if state == "REPLAY":
        response.headers["X-Idempotent-Replay"] = "true"
        return replay[1]

    try:
        result = PaymentService.record_payout(
            db=db,
            data=data,
            user_id=current_user.id,
            user_name=current_user.full_name,
        )
        idempotency_engine.record_success(idem_key, 201, result)
        return result
    except Exception:
        idempotency_engine.release_key(idem_key)
        raise


@router.get(
    "/ledger/{worker_id}",
    response_model=MoneyLedgerSummary,
    summary="Get Worker Money Debit-Credit Ledger Summary",
)
def get_money_ledger(
    worker_id: Annotated[int, Path(description="Worker ID")],
    start_date: Annotated[Optional[date], Query(description="Filter by start date")] = None,
    end_date: Annotated[Optional[date], Query(description="Filter by end date")] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves the complete Money Debit-Credit Ledger:
    - CREDIT = Accepted work earnings & approved adjustments
    - DEBIT = Advances taken & wage payments made
    - Total Payable = Total Credits - Total Debits
    - Chronological transaction history with running balances
    """
    return PaymentService.get_money_ledger_summary(
        db=db,
        worker_id=worker_id,
        start_date=start_date,
        end_date=end_date,
    )


@router.post(
    "/transactions/{txn_id}/reverse",
    response_model=MoneyTransactionResponse,
    summary="Auditable Reversal of Financial Transaction (Admin Only)",
)
def reverse_money_transaction(
    txn_id: Annotated[int, Path(description="Transaction ID")],
    req: FinancialReversalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Admin-only auditable reversal of an erroneous financial transaction.
    Never permanently deletes any record; marks as reversed and
    posts a compensating adjustment entry.
    """
    return PaymentService.reverse_money_transaction(
        db=db,
        txn_id=txn_id,
        req=req,
        user_id=current_user.id,
        user_name=current_user.full_name,
    )


@router.get(
    "/statement/{worker_id}/csv",
    summary="Download Worker Account Statement as CSV",
)
def download_statement_csv(
    worker_id: Annotated[int, Path(description="Worker ID")],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generates a downloadable CSV statement of the artisan's Money Ledger.
    """
    summary = PaymentService.get_money_ledger_summary(db=db, worker_id=worker_id)

    output = StringIO()
    writer = csv.writer(output)

    # Header section
    writer.writerow(["BANDHSETU ARTISAN FINANCIAL STATEMENT"])
    writer.writerow(["Worker Name", summary.worker_name])
    writer.writerow(["Serial Number", summary.worker_serial])
    writer.writerow(["Statement Date", date.today().strftime("%d/%m/%Y")])
    writer.writerow([])

    # Financial Summary
    writer.writerow(["Total Earned (Credits)", f"INR {summary.total_earned:.2f}"])
    writer.writerow(["Total Advance Taken", f"INR {summary.total_advance_taken:.2f}"])
    writer.writerow(["Total Payments Made", f"INR {summary.total_payments_made:.2f}"])
    writer.writerow(["Remaining Payable Balance", f"INR {summary.remaining_payable:.2f}"])
    writer.writerow([])

    # Transactions Table
    writer.writerow([
        "Transaction Date",
        "Transaction Code",
        "Description",
        "Type",
        "Debit (INR)",
        "Credit (INR)",
        "Running Balance (INR)",
        "Payment Mode",
        "Reference No",
        "Recorded By",
        "Remarks",
    ])

    for t in summary.transactions:
        writer.writerow([
            t.transaction_date.strftime("%d/%m/%Y"),
            t.transaction_code,
            t.description,
            t.transaction_type,
            f"{t.debit_amount:.2f}" if t.debit_amount > 0 else "0.00",
            f"{t.credit_amount:.2f}" if t.credit_amount > 0 else "0.00",
            f"{t.running_balance:.2f}",
            t.payment_mode or "-",
            t.reference_no or "-",
            t.recorded_by_name,
            f"[REVERSED] {t.remarks or ''}" if t.is_reversed else (t.remarks or ""),
        ])

    csv_data = output.getvalue()
    filename = f"Statement_{summary.worker_serial}_{date.today().strftime('%Y%m%d')}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
