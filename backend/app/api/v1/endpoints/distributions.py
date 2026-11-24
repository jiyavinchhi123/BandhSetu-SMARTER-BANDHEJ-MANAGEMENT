from typing import List, Optional, Annotated
from fastapi import APIRouter, Depends, Query, Path, status, Request, Response, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User
from app.api.deps import get_current_user, require_admin
from app.services.distribution_service import DistributionService
from app.core.idempotency import idempotency_engine
from app.schemas.distribution import (
    WorkDistributionCreate,
    WorkDistributionResponse,
    WorkReturnCreate,
    WorkReturnResponse,
    MaterialTransactionResponse,
    MaterialLedgerSummary,
    LedgerCorrectionRequest,
)

router = APIRouter()


@router.post(
    "/give-work",
    response_model=WorkDistributionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Issue Work / Material Distribution to an Artisan",
)
def give_work(
    data: WorkDistributionCreate,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Issues new work consignment to an artisan:
    - Snapshots unit price permanently from catalogue
    - Automatically calculates Total Work Value
    - Generates unique transaction ID (DIST-YYYYMMDD-XXXX)
    - Posts DEBIT entry to the Material Debit-Credit Ledger
    - Increments artisan pending pieces
    - Protected by Idempotency Engine against simultaneous double submissions
    """
    idem_key = request.headers.get("Idempotency-Key") or request.headers.get("X-Idempotency-Key")
    if not idem_key:
        raw_sig = f"give:{data.worker_id}:{data.item_id}:{data.quantity_issued}:{data.knot_style}"
        idem_key = f"idem:{current_user.id}:{raw_sig}"

    state, replay = idempotency_engine.check_and_acquire(idem_key)
    if state == "IN_PROGRESS":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A work consignment with these exact details is already currently processing. Please wait."
        )
    if state == "REPLAY":
        response.headers["X-Idempotent-Replay"] = "true"
        return replay[1]

    try:
        biz_id = current_user.business_id or 1
        result = DistributionService.give_work(
            db=db,
            data=data,
            user_id=current_user.id,
            user_name=current_user.full_name,
            business_id=biz_id,
        )
        idempotency_engine.record_success(idem_key, 201, result)
        return result
    except Exception:
        idempotency_engine.release_key(idem_key)
        raise


@router.post(
    "/receive-work",
    response_model=WorkReturnResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Receive Completed Work (Partial or Full Return) & Rejections",
)
def receive_work(
    data: WorkReturnCreate,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Receives returned work from an artisan:
    - Supports multiple partial returns against one distribution
    - Records accepted pieces (which generate wages) and rejected pieces (0 wages)
    - Prevents returning more than pending quantity or negative numbers
    - Posts CREDIT entry to the Material Debit-Credit Ledger
    - Decrements artisan pending pieces and credits payable balance
    - Protected by Idempotency Engine against double submissions
    """
    idem_key = request.headers.get("Idempotency-Key") or request.headers.get("X-Idempotency-Key")
    if not idem_key:
        raw_sig = f"ret:{data.distribution_id}:{data.quantity_returned}:{data.quantity_rejected}"
        idem_key = f"idem:{current_user.id}:{raw_sig}"

    state, replay = idempotency_engine.check_and_acquire(idem_key)
    if state == "IN_PROGRESS":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A return receipt with these exact details is already currently processing. Please wait."
        )
    if state == "REPLAY":
        response.headers["X-Idempotent-Replay"] = "true"
        return replay[1]

    try:
        biz_id = current_user.business_id or 1
        result = DistributionService.receive_work(
            db=db,
            data=data,
            user_id=current_user.id,
            user_name=current_user.full_name,
            business_id=biz_id,
        )
        idempotency_engine.record_success(idem_key, 201, result)
        return result
    except Exception:
        idempotency_engine.release_key(idem_key)
        raise


@router.get(
    "/pending",
    response_model=List[WorkDistributionResponse],
    summary="Get Consignments with Pending Quantities",
)
def get_pending_distributions(
    worker_id: Annotated[Optional[int], Query(description="Filter by Worker ID")] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns distributions with pending quantities (> 0).
    Used to populate the return work dropdown/table.
    """
    biz_id = current_user.business_id or 1
    return DistributionService.get_pending_distributions(db=db, worker_id=worker_id, business_id=biz_id)


@router.get(
    "/",
    response_model=List[WorkDistributionResponse],
    summary="List All Work Distributions / Batches",
)
def get_all_distributions(
    worker_id: Annotated[Optional[int], Query()] = None,
    status_filter: Annotated[Optional[str], Query(alias="status")] = None,
    q: Annotated[Optional[str], Query(description="Search by batch code, item name, or worker")] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists work distributions with optional worker, status, and text search.
    """
    biz_id = current_user.business_id or 1
    return DistributionService.get_all_distributions(
        db=db,
        worker_id=worker_id,
        status_filter=status_filter,
        search_query=q,
        business_id=biz_id,
    )


@router.get(
    "/ledger/{worker_id}",
    response_model=MaterialLedgerSummary,
    summary="Get Worker Double-Entry Material Debit-Credit Ledger",
)
def get_worker_material_ledger(
    worker_id: Annotated[int, Path(description="Worker ID")],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves full Material Debit-Credit Ledger for a specific worker:
    - Worker-account perspective: DEBIT = Given, CREDIT = Received
    - Summary of Total Given, Total Received, Total Rejected, Remaining Pending
    - Item-wise pending quantities breakdown
    - Complete chronological transaction list
    """
    from app.models.worker import Worker
    biz_id = current_user.business_id or 1
    worker = db.query(Worker).filter(Worker.id == worker_id, Worker.business_id == biz_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found in your company.")
    return DistributionService.get_material_ledger_summary(db=db, worker_id=worker_id)


@router.post(
    "/transactions/{txn_id}/reverse",
    response_model=MaterialTransactionResponse,
    summary="Reverse / Correct a Material Transaction (Admin Only)",
)
def reverse_transaction(
    txn_id: Annotated[int, Path(description="Material Transaction ID")],
    req: LedgerCorrectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Auditable reversal of an erroneous transaction.
    Never permanently deletes any record; marks original as reversed
    and posts an auditable compensating adjustment transaction.
    """
    return DistributionService.reverse_transaction(
        db=db,
        txn_id=txn_id,
        req=req,
        user_id=current_user.id,
        user_name=current_user.full_name,
    )

