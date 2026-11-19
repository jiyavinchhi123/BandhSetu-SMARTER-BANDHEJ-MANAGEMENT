import sys
import os
from datetime import date, datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.session import SessionLocal
from app.models.user import User
from app.models.worker import Worker
from app.models.item import Item
from app.services.analytics_service import AnalyticsService
from app.services.distribution_service import DistributionService
from app.services.payment_service import PaymentService
from app.services.access_control_service import access_control_service
from app.schemas.distribution import WorkDistributionCreate, WorkReturnCreate
from app.schemas.payment import AdvanceCreateRequest, PayoutCreateRequest
from app.api.v1.endpoints.analytics import (
    get_dashboard_metrics,
    get_report_data,
    export_report_csv,
)


def run_all_analytics_tests():
    db = SessionLocal()
    print("=" * 70)
    print("STARTING STEP 6 — DASHBOARD, REPORTS & BUSINESS ANALYTICS TEST SUITE")
    print("=" * 70)

    try:
        # 1. Setup Admin & Manager test credentials
        admin = db.query(User).filter(User.email == "admin@bandhej.com").first()
        if not admin:
            admin = User(
                email="admin@bandhej.com",
                full_name="Bhaveshbhai Khatri (Admin)",
                role="admin",
                hashed_password="hash",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        # 2. Seed test artisan and items for verification
        test_item = Item(
            item_name="Kutch Silk Bandhej Saree 5-Meter",
            item_code=f"REP-ITM-{datetime.now().microsecond}",
            price_per_piece=35.00,
            is_active=True,
        )
        db.add(test_item)
        db.commit()
        db.refresh(test_item)

        test_worker = Worker(
            serial_number=f"WRK-REP-{datetime.now().microsecond}",
            full_name="Jashodaben Patel",
            phone="9876543210",
            town="Mandvi",
            city="Bhuj",
            village="Maska",
            joining_date=date.today(),
            status="Active",
            payable_balance=0.0,
        )
        db.add(test_worker)
        db.commit()
        db.refresh(test_worker)

        # 3. Create a work distribution: 20 pieces @ Rs. 35 = Rs. 700 potential value
        dist = DistributionService.give_work(
            db=db,
            data=WorkDistributionCreate(
                worker_id=test_worker.id,
                item_id=test_item.id,
                quantity_issued=20,
                issue_date=date.today(),
                remarks="Analytics test consignment",
            ),
            user_id=admin.id,
        )

        # 4. Receive 10 pieces accepted, 2 rejected
        # Accepted wage: 10 * 35 = Rs. 350.00
        ret = DistributionService.receive_work(
            db=db,
            data=WorkReturnCreate(
                distribution_id=dist.id,
                quantity_returned=10,
                quantity_rejected=2,
                return_date=date.today(),
                remarks="Partial return with quality check",
            ),
            user_id=admin.id,
        )

        # 5. Record an advance: Rs. 100 Cash
        adv = PaymentService.record_advance(
            db=db,
            data=AdvanceCreateRequest(
                worker_id=test_worker.id,
                amount=100.0,
                payment_mode="Cash",
                transaction_date=date.today(),
                remarks="Test advance for festival",
            ),
            user_id=admin.id,
        )

        # 6. Record a payout: Rs. 150 UPI
        pay = PaymentService.record_payout(
            db=db,
            data=PayoutCreateRequest(
                worker_id=test_worker.id,
                amount=150.0,
                payment_mode="UPI",
                reference_number="UPI/12345678",
                transaction_date=date.today(),
                remarks="Partial wage payout",
            ),
            user_id=admin.id,
        )

        print("[OK] Test seed data created successfully.")

        # =============================================================
        # TEST 1: Dashboard Metrics 10 Cards Verification
        # =============================================================
        print("\n--- TEST 1: Dashboard 10-Card Metrics Aggregation ---")
        dash = AnalyticsService.get_dashboard_metrics(db=db)

        assert dash.total_registered_women >= 1, f"Expected registered women >= 1, got {dash.total_registered_women}"
        assert dash.active_women >= 1, f"Expected active women >= 1, got {dash.active_women}"
        assert dash.total_pieces_given >= 20, f"Expected pieces given >= 20, got {dash.total_pieces_given}"
        assert dash.total_pieces_received >= 10, f"Expected pieces received >= 10, got {dash.total_pieces_received}"
        assert dash.total_pending_pieces >= 8, f"Expected pending pieces >= 8, got {dash.total_pending_pieces}"
        assert dash.total_accepted_work_value >= 350.0, f"Expected accepted value >= 350, got {dash.total_accepted_work_value}"
        assert dash.total_wages_earned >= 350.0, f"Expected wages earned >= 350, got {dash.total_wages_earned}"
        assert dash.total_advances >= 100.0, f"Expected advances >= 100, got {dash.total_advances}"
        assert dash.total_payments >= 150.0, f"Expected payments >= 150, got {dash.total_payments}"
        assert dash.total_outstanding_payable >= 100.0, f"Expected outstanding payable >= 100, got {dash.total_outstanding_payable}"

        print(f"  [1] Registered Women: {dash.total_registered_women}")
        print(f"  [2] Active Women: {dash.active_women}")
        print(f"  [3] Pieces Given: {dash.total_pieces_given}")
        print(f"  [4] Pieces Received: {dash.total_pieces_received}")
        print(f"  [5] Pending Pieces: {dash.total_pending_pieces}")
        print(f"  [6] Accepted Work Value: Rs. {dash.total_accepted_work_value:.2f}")
        print(f"  [7] Wages Earned: Rs. {dash.total_wages_earned:.2f}")
        print(f"  [8] Total Advances: Rs. {dash.total_advances:.2f}")
        print(f"  [9] Total Payments: Rs. {dash.total_payments:.2f}")
        print(f"  [10] Outstanding Payable: Rs. {dash.total_outstanding_payable:.2f}")
        print("[PASS] All 10 Dashboard cards verified.")

        # =============================================================
        # TEST 2: 7-Day Trend Chart & Recent Activity
        # =============================================================
        print("\n--- TEST 2: 7-Day Trends & Recent Activity Feed ---")
        assert len(dash.trends) == 7, f"Expected exactly 7 trend points, got {len(dash.trends)}"
        today_trend = dash.trends[-1]
        assert today_trend.pieces_given >= 20, f"Today's pieces given should be >= 20, got {today_trend.pieces_given}"
        assert today_trend.pieces_received >= 10, f"Today's pieces received should be >= 10, got {today_trend.pieces_received}"
        assert len(dash.recent_activity) > 0, "Expected non-empty recent activity feed"
        print(f"  Trends verified: 7 points from {dash.trends[0].date} to {dash.trends[-1].date}")
        print(f"  Recent activity count: {len(dash.recent_activity)} (top item: {dash.recent_activity[0].title})")
        print("[PASS] Trend chart and activity feed verified.")

        # =============================================================
        # TEST 3: Verification of All 10 Reports
        # =============================================================
        print("\n--- TEST 3: Verification of All 10 Specialized Reports ---")
        report_types = [
            "worker-wise",
            "item-wise",
            "daily-distribution",
            "daily-returns",
            "pending-work",
            "daily-wages",
            "advances",
            "payments",
            "outstanding-balances",
            "monthly-summary",
        ]

        for r_type in report_types:
            rep = AnalyticsService.get_report_data(
                db=db,
                report_type=r_type,
                date_preset="this_month",
            )
            assert rep.report_type == r_type, f"Mismatch report type {rep.report_type}"
            assert len(rep.columns) > 0, f"Report {r_type} has no columns defined"
            assert isinstance(rep.rows, list), f"Report {r_type} rows is not a list"
            assert rep.total_records >= 0, f"Report {r_type} invalid total_records"
            print(f"  [Report] {r_type:<22} -> '{rep.report_title}' ({len(rep.columns)} cols, {rep.total_records} rows)")

        print("[PASS] All 10 Reports generate valid data models and columns.")

        # =============================================================
        # TEST 4: Date Range Presets & Search Filters
        # =============================================================
        print("\n--- TEST 4: Date Presets & Dynamic Search Filters ---")
        # Today preset
        rep_today = AnalyticsService.get_report_data(
            db=db,
            report_type="daily-distribution",
            date_preset="today",
        )
        assert rep_today.total_records >= 1, "Expected at least 1 distribution today"

        # Search query by worker name "Jashodaben"
        rep_search = AnalyticsService.get_report_data(
            db=db,
            report_type="worker-wise",
            search_query="Jashodaben",
        )
        assert any("Jashodaben" in r["full_name"] for r in rep_search.rows), "Expected Jashodaben in filtered worker report"

        # Filter by specific worker_id
        rep_worker = AnalyticsService.get_report_data(
            db=db,
            report_type="pending-work",
            worker_id=test_worker.id,
        )
        assert rep_worker.total_records >= 1, "Expected pending work for test worker"
        assert rep_worker.rows[0]["quantity_pending"] == 8, f"Expected 8 pending, got {rep_worker.rows[0]['quantity_pending']}"

        print("  Today preset: OK")
        print("  Name search query: OK")
        print("  Worker ID filter: OK")
        print("[PASS] Date presets and dynamic search filters verified.")

        # =============================================================
        # TEST 5: CSV Export Format Verification
        # =============================================================
        print("\n--- TEST 5: CSV Export Engine Verification ---")
        csv_str = AnalyticsService.export_report_csv(rep_today)
        assert "BANDHSETU" in csv_str, "CSV should contain BandhSetu header"
        assert "SUMMARY METRICS" in csv_str, "CSV should include summary metrics section"
        assert "Transaction ID" in csv_str or "Date" in csv_str, "CSV should contain table column headers"
        print(f"  CSV preview (first 4 lines):\n" + "\n".join(csv_str.strip().split("\n")[:4]))
        print("[PASS] CSV export engine produces valid formatted tabular data.")

        # =============================================================
        # TEST 6: API Endpoints & Role Access Control Verification
        # =============================================================
        print("\n--- TEST 6: REST API Endpoint & Role Access Control ---")

        # 6a. Direct call to dashboard endpoint with Admin
        dash_res = get_dashboard_metrics(db=db, current_user=admin)
        assert dash_res.total_registered_women >= 1
        assert len(dash_res.trends) == 7

        # 6b. Direct call to report endpoint with Admin
        rep_res = get_report_data(
            report_type="worker-wise",
            date_preset="this_month",
            db=db,
            current_user=admin,
        )
        assert rep_res.report_type == "worker-wise"
        assert len(rep_res.columns) == 11
        assert len(rep_res.rows) >= 1

        # 6c. Direct call to CSV export endpoint with Admin
        csv_response = export_report_csv(
            report_type="worker-wise",
            date_preset="this_month",
            db=db,
            current_user=admin,
        )
        assert csv_response.status_code == 200
        assert csv_response.media_type == "text/csv"
        assert "Content-Disposition" in csv_response.headers
        assert "attachment; filename=" in csv_response.headers["Content-Disposition"]
        assert len(csv_response.body) > 0

        # 6d. Security: Locked Manager access enforcement
        locked_mgr = User(
            email="locked_mgr@bandhej.com",
            full_name="Locked Manager",
            role="manager",
            is_active=True,
            is_locked=True,
            lock_reason="Security test lock",
            access_start_time="09:00",
            access_end_time="20:00",
        )
        try:
            access_control_service.verify_manager_access_or_raise(locked_mgr)
            assert False, "Locked manager should have been rejected with 403"
        except Exception as e:
            assert getattr(e, "status_code", None) == 403, f"Expected 403, got {e}"

        print("  Admin get_dashboard_metrics: OK (200)")
        print("  Admin get_report_data: OK (200)")
        print("  Admin export_report_csv: OK (200, Content-Disposition attachment)")
        print("  Locked Manager 403 Forbidden enforcement: OK")
        print("[PASS] Analytics API endpoints and security restrictions verified.")

        print("\n" + "=" * 70)
        print("ALL 6 ANALYTICS & REPORTING TESTS PASSED!")
        print("=" * 70)

    finally:
        db.close()


if __name__ == "__main__":
    run_all_analytics_tests()
