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
