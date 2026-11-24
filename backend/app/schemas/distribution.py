from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class WorkDistributionCreate(BaseModel):
    worker_id: int
    item_id: int
    quantity_issued: int = Field(..., gt=0, json_schema_extra={"example": 10})
    knot_style: Optional[str] = Field(default="Standard", json_schema_extra={"example": "Ekdali"})
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    deductions: Optional[float] = 0.0
    bonus: Optional[float] = 0.0
    remarks: Optional[str] = None


class WorkReturnCreate(BaseModel):
    distribution_id: int
    quantity_returned: int = Field(default=0, ge=0, json_schema_extra={"example": 5})  # Accepted pieces
    quantity_rejected: int = Field(default=0, ge=0, json_schema_extra={"example": 0})  # Defective / rejected pieces
    rejection_reason: Optional[str] = None  # e.g., "Broken Knots", "Fabric Torn", "Uneven Knots"
    rejection_remarks: Optional[str] = None
    return_date: Optional[date] = None
    remarks: Optional[str] = None


class WorkReturnResponse(BaseModel):
    id: int
    return_code: str
    distribution_id: int
    worker_id: int
    item_id: Optional[int] = None
    item_name_snapshot: str
    rate_per_piece_snapshot: float
    quantity_returned: int
    quantity_rejected: int
    rejection_reason: Optional[str] = None
    rejection_remarks: Optional[str] = None
    completed_work_value: float
    return_date: date
    recorded_by_name: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime

    worker_name: Optional[str] = None
    worker_serial: Optional[str] = None
    batch_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class WorkDistributionResponse(BaseModel):
    id: int
    batch_code: str
    worker_id: int
    item_id: Optional[int] = None
    item_name_snapshot: str
    item_code_snapshot: Optional[str] = None
    rate_per_piece: float
    knot_style: str
    quantity_issued: int
    quantity_returned: int
    quantity_rejected: int
    quantity_pending: int
    total_gross_wage: float
    deductions: float
    bonus: float
    net_payable: float
    issue_date: date
    due_date: date
    return_date: Optional[date] = None
    status: str
    qc_remarks: Optional[str] = None
    remarks: Optional[str] = None
    version: int = 1
    created_at: datetime

    # Additional joined worker fields for convenience in UI tables
    worker_name: Optional[str] = None
    worker_serial: Optional[str] = None
    returns: List[WorkReturnResponse] = []

    model_config = ConfigDict(from_attributes=True)


class MaterialTransactionResponse(BaseModel):
    id: int
    transaction_code: str
    worker_id: int
    distribution_id: Optional[int] = None
    return_id: Optional[int] = None
    item_name: str
    item_code: Optional[str] = None
    transaction_date: date
    transaction_type: str  # "DEBIT_GIVEN", "CREDIT_RECEIVED", "REJECTED_RETURNED", "LEDGER_CORRECTION"
    debit_qty: int
    credit_qty: int
    rejected_qty: int
    rate_per_piece: float
    total_value: float
    running_balance: int
    recorded_by_name: Optional[str] = None
    remarks: Optional[str] = None
    is_reversed: bool
    reversal_reason: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ItemWisePending(BaseModel):
    item_id: Optional[int] = None
    item_name: str
    item_code: Optional[str] = None
    total_given: int
    total_received: int
    total_rejected: int
    pending_quantity: int
    rate_per_piece: float
    estimated_pending_wage: float


class MaterialLedgerSummary(BaseModel):
    worker_id: int
    worker_name: str
    worker_serial: str
    total_given: int
    total_received: int
    total_rejected: int
    remaining_pending: int
    item_wise_pending: List[ItemWisePending]
    transactions: List[MaterialTransactionResponse]


class LedgerCorrectionRequest(BaseModel):
    reason: str = Field(..., min_length=3, json_schema_extra={"example": "Correcting accidental duplicate entry"})
    notes: Optional[str] = None

