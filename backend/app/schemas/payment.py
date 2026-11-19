from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class AdvanceCreateRequest(BaseModel):
    worker_id: int
    amount: float = Field(..., gt=0, json_schema_extra={"example": 500.0})
    payment_mode: str = Field(default="Cash", json_schema_extra={"example": "Cash"})  # Cash, UPI, Bank Transfer, Other
    reference_no: Optional[str] = Field(default=None, json_schema_extra={"example": "UPI-123456789"})
    payment_date: Optional[date] = None
    remarks: Optional[str] = None


class PayoutCreateRequest(BaseModel):
    worker_id: int
    amount: float = Field(..., gt=0, json_schema_extra={"example": 1500.0})
    payment_mode: str = Field(default="Cash", json_schema_extra={"example": "UPI"})  # Cash, UPI, Bank Transfer, Other
    reference_no: Optional[str] = Field(default=None, json_schema_extra={"example": "UTR-987654321"})
    payment_date: Optional[date] = None
    is_full_settlement: Optional[bool] = False
    remarks: Optional[str] = None


class MoneyTransactionResponse(BaseModel):
    id: int
    transaction_code: str
    worker_id: int
    distribution_id: Optional[int] = None
    return_id: Optional[int] = None
    payment_record_id: Optional[int] = None
    transaction_date: date
    transaction_type: str  # "WORK_EARNING", "ADVANCE_GIVEN", "WAGE_PAYOUT", "BONUS_CREDIT", "CORRECTION_REVERSAL"
    description: str
    credit_amount: float
    debit_amount: float
    running_balance: float
    payment_mode: Optional[str] = None
    reference_no: Optional[str] = None
    recorded_by_name: str
    remarks: Optional[str] = None
    is_reversed: bool
    reversal_reason: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MoneyLedgerSummary(BaseModel):
    worker_id: int
    worker_name: str
    worker_serial: str
    total_earned: float
    total_advance_taken: float
    total_payments_made: float
    remaining_payable: float
    transactions: List[MoneyTransactionResponse]


class FinancialReversalRequest(BaseModel):
    reason: str = Field(..., min_length=4, json_schema_extra={"example": "Reversing incorrect bank transfer entry"})
    notes: Optional[str] = None
