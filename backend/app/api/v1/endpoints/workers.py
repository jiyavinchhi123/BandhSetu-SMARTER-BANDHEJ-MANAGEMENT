from typing import List, Optional, Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.models.worker import Worker
from app.models.work_distribution import WorkDistribution
from app.models.material_ledger import MaterialLedgerEntry
from app.models.payment_record import PaymentRecord
from app.schemas.worker import (
    WorkerCreate,
    WorkerUpdate,
    WorkerResponse,
    MaterialLedgerResponse,
    WorkDistributionCreate,
    WorkDistributionResponse,
    PaymentRecordCreate,
    PaymentRecordResponse,
    TimelineTransactionItem,
)
from app.api.deps import get_current_user, require_manager_or_admin
from app.services.worker_service import worker_service

router = APIRouter()


@router.get("/", response_model=List[WorkerResponse], summary="Search and list artisans with dynamic partial matching")
def get_workers(
    q: Annotated[Optional[str], Query(description="Search term for serial number, full name, phone, town, city, or village (e.g. 'R')")] = None,
    status: Annotated[Optional[str], Query(description="Filter by status (Active, Inactive, All)")] = "Active",
    city: Annotated[Optional[str], Query(description="Filter by City")] = None,
    village: Annotated[Optional[str], Query(description="Filter by Village")] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db)
):
    """
    Search 200–500 women artisans dynamically.
    Typing 'R' partially matches 'Rekha', 'Ranjan', 'Rupal', etc.
    """
    workers, total = worker_service.search_workers(
        db=db,
        q=q,
        status_filter=status,
        city_filter=city,
        village_filter=village,
        limit=limit,
        offset=offset
    )
    return workers


@router.post("/", response_model=WorkerResponse, status_code=status.HTTP_201_CREATED, summary="Register a new artisan worker")
def register_worker(
    worker_in: WorkerCreate,
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db)
):
    """
    Admin and authorized Manager can register women artisans.
    Automatically assigns a guaranteed unique, non-reusable Serial Number (e.g. WRK-0001).
    Does NOT create login accounts for workers.
    """
    return worker_service.create_worker(db, worker_in)


@router.get("/{worker_id}", response_model=WorkerResponse, summary="Get full worker profile")
def get_worker_profile(
    worker_id: int,
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db)
):
    """Retrieves worker profile with pending quantities and payable balance."""
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found.")
    return worker


@router.put("/{worker_id}", response_model=WorkerResponse, summary="Update worker personal details")
def update_worker_profile(
    worker_id: int,
    data: WorkerUpdate,
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db)
):
    """Updates contact, location, status, or remarks."""
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found.")

    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if value is not None:
            setattr(worker, key, value.strip() if isinstance(value, str) else value)

    db.commit()
    db.refresh(worker)
    return worker


# --- Profile Tab 2: Material Ledger ---
@router.get("/{worker_id}/material-ledger", response_model=List[MaterialLedgerResponse], summary="Worker Material Ledger")
def get_material_ledger(
    worker_id: int,
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db)
):
    """Returns fabric lots and yarn issued vs. returned."""
    return db.query(MaterialLedgerEntry).filter(
        MaterialLedgerEntry.worker_id == worker_id
    ).order_by(MaterialLedgerEntry.id.desc()).all()


# --- Profile Tab 3: Work Distribution ---
@router.get("/{worker_id}/work-distribution", response_model=List[WorkDistributionResponse], summary="Worker Work Distribution Batches")
def get_work_distribution(
    worker_id: int,
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db)
):
    """Returns active and past consignments with historical snapshot prices."""
    return db.query(WorkDistribution).filter(
        WorkDistribution.worker_id == worker_id
    ).order_by(WorkDistribution.id.desc()).all()


@router.post("/{worker_id}/distribute", response_model=WorkDistributionResponse, status_code=status.HTTP_201_CREATED, summary="Issue New Work Consignment")
def issue_work_consignment(
    worker_id: int,
    data: WorkDistributionCreate,
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db)
):
    """
    Issues work to the worker. Automatically captures and permanently stores
    the current catalogue price as an immutable snapshot rate.
    """
    return worker_service.distribute_work(db, worker_id, data)


# --- Profile Tab 4: Work Returns ---
@router.get("/{worker_id}/returns", response_model=List[WorkDistributionResponse], summary="Worker Work Returns History")
def get_work_returns(
    worker_id: int,
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db)
):
    """Returns completed or partially returned batches."""
    return db.query(WorkDistribution).filter(
        WorkDistribution.worker_id == worker_id,
        WorkDistribution.quantity_returned > 0
    ).order_by(WorkDistribution.id.desc()).all()


# --- Profile Tab 5: Earnings and Money Ledger ---
@router.get("/{worker_id}/earnings", response_model=List[WorkDistributionResponse], summary="Worker Earnings Ledger")
def get_earnings_ledger(
    worker_id: int,
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db)
):
    """Returns piece-rate earnings calculations per consignment."""
    return db.query(WorkDistribution).filter(
        WorkDistribution.worker_id == worker_id
    ).order_by(WorkDistribution.id.desc()).all()


# --- Profile Tab 6: Advances and Payments ---
@router.get("/{worker_id}/payments", response_model=List[PaymentRecordResponse], summary="Worker Advances and Payment History")
def get_payment_records(
    worker_id: int,
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db)
):
    """Returns wage disbursements and cash/UPI advances."""
    return db.query(PaymentRecord).filter(
        PaymentRecord.worker_id == worker_id
    ).order_by(PaymentRecord.id.desc()).all()


@router.post("/{worker_id}/payment", response_model=PaymentRecordResponse, status_code=status.HTTP_201_CREATED, summary="Record Wage Payout or Advance")
def record_worker_payment(
    worker_id: int,
    data: PaymentRecordCreate,
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db)
):
    """Disburses wage payout or records cash advance, adjusting payable balance."""
    return worker_service.record_payment(db, worker_id, data, disbursed_by_name=current_user.full_name)


# --- Profile Tab 7: Complete Transaction History ---
@router.get("/{worker_id}/transactions", response_model=List[TimelineTransactionItem], summary="Unified Complete Transaction Timeline")
def get_complete_timeline(
    worker_id: int,
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db)
):
    """Returns unified chronological transaction log of work, returns, and payments."""
    return worker_service.get_timeline(db, worker_id)
