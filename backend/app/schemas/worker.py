from typing import Optional, List, Any
from datetime import date, datetime
from pydantic import BaseModel, Field, ConfigDict


class WorkerBase(BaseModel):
    full_name: str = Field(..., min_length=2, description="Worker's Full Name", json_schema_extra={"example": "Kamlaben Vaghela"})
    phone: str = Field(..., min_length=10, description="Mobile Number", json_schema_extra={"example": "+91 98250 12345"})
    town: str = Field(..., min_length=2, json_schema_extra={"example": "Anjar"})
    city: str = Field(..., min_length=2, json_schema_extra={"example": "Bhuj"})
    village: str = Field(..., min_length=2, json_schema_extra={"example": "Khavda"})
    joining_date: Optional[date] = Field(default_factory=date.today)
    status: str = Field(default="Active", json_schema_extra={"example": "Active"})
    remarks: Optional[str] = Field(default=None, json_schema_extra={"example": "Specializes in fine Shikari motifs"})


class WorkerCreate(WorkerBase):
    pass


class WorkerUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    town: Optional[str] = None
    city: Optional[str] = None
    village: Optional[str] = None
    status: Optional[str] = None
    remarks: Optional[str] = None


class WorkerResponse(WorkerBase):
    id: int
    serial_number: str
    pending_pieces: int = 0
    payable_balance: float = 0.0
    total_earned: float = 0.0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MaterialLedgerResponse(BaseModel):
    id: int
    worker_id: int
    lot_number: Optional[str] = None
    material_type: str
    issued_qty: float
    returned_qty: float
    unit: str
    issue_date: date
    return_date: Optional[date] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkDistributionCreate(BaseModel):
    item_id: int
    knot_style: str = Field(..., json_schema_extra={"example": "Ekdali"})
    quantity_issued: int = Field(..., gt=0, json_schema_extra={"example": 40})
    due_date: date
    deductions: Optional[float] = 0.0
    bonus: Optional[float] = 0.0
    remarks: Optional[str] = None


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
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaymentRecordCreate(BaseModel):
    payment_type: str = Field(..., json_schema_extra={"example": "Wage Payout"})  # Wage Payout, Advance Given, Bonus
    amount: float = Field(..., gt=0, json_schema_extra={"example": 4500.0})
    payment_mode: str = Field(default="Cash", json_schema_extra={"example": "Cash"})
    reference_no: Optional[str] = None
    notes: Optional[str] = None


class PaymentRecordResponse(BaseModel):
    id: int
    worker_id: int
    distribution_id: Optional[int] = None
    payment_type: str
    amount: float
    payment_mode: str
    reference_no: Optional[str] = None
    disbursed_by_name: str
    payment_date: date
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TimelineTransactionItem(BaseModel):
    id: str
    category: str  # "WORK_ISSUED", "WORK_RETURNED", "PAYMENT_DISBURSED", "ADVANCE_GIVEN", "MATERIAL_ISSUED"
    title: str
    description: str
    amount: Optional[float] = None
    quantity: Optional[int] = None
    date: date
    status_badge: str

