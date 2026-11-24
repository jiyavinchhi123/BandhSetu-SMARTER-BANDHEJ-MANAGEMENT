from datetime import date
from typing import Optional, Annotated
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User
from app.api.deps import require_admin, require_manager_or_admin
from app.services.analytics_service import AnalyticsService
from app.schemas.analytics import (
    DashboardMetricsResponse,
    ReportResponse,
    PendingWorkReportResponse,
)

router = APIRouter()


@router.get(
    "/dashboard",
    response_model=DashboardMetricsResponse,
    summary="Get 10 core business KPI metrics, 7-day trend chart, and recent activity log",
)
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
) -> DashboardMetricsResponse:
    """
    Returns the real-time aggregated metrics for the 10 KPI cards:
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
    """
    biz_id = current_user.business_id or 1
    return AnalyticsService.get_dashboard_metrics(db=db, business_id=biz_id)


@router.get(
    "/reports",
    response_model=ReportResponse,
    summary="Generate comprehensive operational & financial reports with filters",
)
def get_report_data(
    report_type: Annotated[
        str,
        Query(
            description="Report type identifier: worker-wise, item-wise, daily-distribution, daily-returns, pending-work, daily-wages, advances, payments, outstanding-balances, monthly-summary"
        ),
    ] = "worker-wise",
    date_preset: Annotated[
        Optional[str],
        Query(description="Quick date preset: today, yesterday, this_week, this_month, custom"),
    ] = None,
    start_date: Annotated[Optional[date], Query(description="Start date for custom range filter")] = None,
    end_date: Annotated[Optional[date], Query(description="End date for custom range filter")] = None,
    worker_id: Annotated[Optional[int], Query(description="Filter by specific worker ID")] = None,
    item_id: Annotated[Optional[int], Query(description="Filter by specific item ID")] = None,
    search_query: Annotated[
        Optional[str],
        Query(description="Filter by artisan name, serial number, or item name"),
    ] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> ReportResponse:
    biz_id = current_user.business_id or 1
    return AnalyticsService.get_report_data(
        db=db,
        report_type=report_type,
        date_preset=date_preset,
        start_date=start_date,
        end_date=end_date,
        worker_id=worker_id,
        item_id=item_id,
        search_query=search_query,
        business_id=biz_id,
    )


@router.get(
    "/reports/csv",
    summary="Export report data as CSV file",
)
def export_report_csv(
    report_type: Annotated[str, Query(description="Report type identifier")] = "worker-wise",
    date_preset: Annotated[Optional[str], Query(description="Quick date preset")] = None,
    start_date: Annotated[Optional[date], Query(description="Start date")] = None,
    end_date: Annotated[Optional[date], Query(description="End date")] = None,
    worker_id: Annotated[Optional[int], Query(description="Worker ID")] = None,
    item_id: Annotated[Optional[int], Query(description="Item ID")] = None,
    search_query: Annotated[Optional[str], Query(description="Search query")] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    biz_id = current_user.business_id or 1
    report_data = AnalyticsService.get_report_data(
        db=db,
        report_type=report_type,
        date_preset=date_preset,
        start_date=start_date,
        end_date=end_date,
        worker_id=worker_id,
        item_id=item_id,
        search_query=search_query,
        business_id=biz_id,
    )
    csv_content = AnalyticsService.export_report_csv(report_data)
    today_str = date.today().strftime("%Y%m%d")
    filename = f"bandhsetu_{report_type}_{today_str}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )


@router.get(
    "/pending-work-report",
    response_model=PendingWorkReportResponse,
    summary="Artisan Pending Work & Non-Submission Report",
)
def get_pending_work_report(
    date_preset: Annotated[Optional[str], Query(description="this_month, prev_month, last_30_days, all_time, custom")] = "this_month",
    start_date: Annotated[Optional[date], Query(description="Start issue date")] = None,
    end_date: Annotated[Optional[date], Query(description="End issue date")] = None,
    q: Annotated[Optional[str], Query(description="Artisan name, serial no., batch code")] = None,
    town: Annotated[Optional[str], Query(description="Filter by town")] = None,
    item_name: Annotated[Optional[str], Query(description="Filter by design name")] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> PendingWorkReportResponse:
    biz_id = current_user.business_id or 1
    return AnalyticsService.get_pending_work_report(
        db=db,
        start_date=start_date,
        end_date=end_date,
        date_preset=date_preset,
        q=q,
        town=town,
        item_name=item_name,
        business_id=biz_id,
    )


@router.get(
    "/pending-work-report/csv",
    summary="Export Artisan Pending Work Report as CSV",
)
def export_pending_work_csv(
    date_preset: Annotated[Optional[str], Query()] = "this_month",
    start_date: Annotated[Optional[date], Query()] = None,
    end_date: Annotated[Optional[date], Query()] = None,
    q: Annotated[Optional[str], Query()] = None,
    town: Annotated[Optional[str], Query()] = None,
    item_name: Annotated[Optional[str], Query()] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    biz_id = current_user.business_id or 1
    report_data = AnalyticsService.get_pending_work_report(
        db=db,
        start_date=start_date,
        end_date=end_date,
        date_preset=date_preset,
        q=q,
        town=town,
        item_name=item_name,
        business_id=biz_id,
    )
    csv_content = AnalyticsService.export_pending_work_csv(report_data)
    today_str = date.today().strftime("%Y%m%d")
    filename = f"bandhsetu_pending_work_{today_str}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )
