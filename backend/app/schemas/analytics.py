from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class TrendDataPoint(BaseModel):
    date: str
    pieces_given: int
    pieces_received: int
    wages_earned: float
    payouts_made: float


class RecentActivityItem(BaseModel):
    id: str
    category: str  # "DISTRIBUTION", "RETURN", "ADVANCE", "PAYOUT"
    title: str
    description: str
    amount: Optional[float] = None
    pieces: Optional[int] = None
    date: str
    timestamp_ist: str


class DashboardMetricsResponse(BaseModel):
    # 10 Core Cards Required by Step 6
    total_registered_women: int
    active_women: int
    total_pieces_given: int
    total_pieces_received: int
    total_pending_pieces: int
    total_accepted_work_value: float
    total_wages_earned: float
    total_advances: float
    total_payments: float
    total_outstanding_payable: float

    # Trend Analytics & Charts
    trends: List[TrendDataPoint]
    recent_activity: List[RecentActivityItem]

    model_config = ConfigDict(from_attributes=True)


class ReportColumn(BaseModel):
    key: str
    label: str
    align: str = "left"  # left, center, right
    format: Optional[str] = None  # currency, date, number, badge


class ReportResponse(BaseModel):
    report_type: str
    report_title: str
    date_preset: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    total_records: int
    summary_metrics: Dict[str, Any]
    columns: List[ReportColumn]
    rows: List[Dict[str, Any]]


# --- Artisan Pending Work & Non-Submission Report Schemas ---

class PendingWorkDistributionItem(BaseModel):
    distribution_id: int
    batch_code: str
    worker_id: int
    artisan_name: str
    serial_number: str
    town: str
    phone: str
    issue_date: str
    item_name: str
    knot_style: Optional[str] = None
    rate_per_piece: float
    given_pcs: int
    received_pcs: int
    rejected_pcs: int
    remaining_pcs: int
    days_pending: int
    is_zero_return: bool


class ArtisanPendingGroup(BaseModel):
    worker_id: int
    artisan_name: str
    serial_number: str
    town: str
    phone: str
    total_given: int
    total_received: int
    total_rejected: int
    total_pending: int
    is_zero_submission: bool
    distributions: List[PendingWorkDistributionItem]


class PendingWorkSummary(BaseModel):
    total_artisans_with_pending: int
    total_pieces_given: int
    total_pieces_received: int
    total_pieces_pending: int
    artisans_zero_submissions: int


class PendingWorkReportResponse(BaseModel):
    start_date: str
    end_date: str
    date_preset: Optional[str] = None
    summary: PendingWorkSummary
    distributions: List[PendingWorkDistributionItem]
    artisan_groups: List[ArtisanPendingGroup]
    available_towns: List[str]
    available_designs: List[str]
