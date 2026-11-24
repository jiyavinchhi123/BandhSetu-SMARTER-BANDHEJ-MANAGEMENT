import logging
from typing import Dict, Any, List
from sqlalchemy import text, Engine
from sqlalchemy.orm import Query

logger = logging.getLogger("bandhsetu.database.indexes")

INDEX_DEFINITIONS = [
    # Workers: Composite filtering by status, name, and town
    "CREATE INDEX IF NOT EXISTS idx_workers_status_name ON workers(status, full_name);",
    "CREATE INDEX IF NOT EXISTS idx_workers_town_status ON workers(town, status);",
    "CREATE INDEX IF NOT EXISTS idx_workers_joining_date ON workers(joining_date);",

    # Work Distributions: Consignment tracking, custody checks, reports
    "CREATE INDEX IF NOT EXISTS idx_work_dist_worker_status ON work_distributions(worker_id, status);",
    "CREATE INDEX IF NOT EXISTS idx_work_dist_worker_date ON work_distributions(worker_id, issue_date);",
    "CREATE INDEX IF NOT EXISTS idx_work_dist_status_date ON work_distributions(status, issue_date);",
    "CREATE INDEX IF NOT EXISTS idx_work_dist_item_date ON work_distributions(item_id, issue_date);",
    "CREATE INDEX IF NOT EXISTS idx_work_dist_batch_code ON work_distributions(batch_code);",

    # Work Returns: Return and quality inspection lookups
    "CREATE INDEX IF NOT EXISTS idx_work_returns_worker_date ON work_returns(worker_id, return_date);",
    "CREATE INDEX IF NOT EXISTS idx_work_returns_dist_date ON work_returns(distribution_id, return_date);",

    # Material Transactions: Dual debit-credit khata ledger queries
    "CREATE INDEX IF NOT EXISTS idx_mat_txns_worker_date ON material_transactions(worker_id, transaction_date);",
    "CREATE INDEX IF NOT EXISTS idx_mat_txns_type_date ON material_transactions(transaction_type, transaction_date);",

    # Money Transactions: Financial debit-credit khata ledger queries
    "CREATE INDEX IF NOT EXISTS idx_money_txns_worker_date ON money_transactions(worker_id, transaction_date);",
    "CREATE INDEX IF NOT EXISTS idx_money_txns_type_date ON money_transactions(transaction_type, transaction_date);",

    # Payment Records: Wage payouts & advance auditing
    "CREATE INDEX IF NOT EXISTS idx_payments_worker_date ON payment_records(worker_id, payment_date);",

    # Audit Logs: Administrative tracking & security audit
    "CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date ON audit_logs(user_id, created_at);",
    "CREATE INDEX IF NOT EXISTS idx_audit_logs_action_date ON audit_logs(action, created_at);",

    # Users & Auth: Phone / Email login lookups
    "CREATE INDEX IF NOT EXISTS idx_users_email_phone ON users(email, phone);",

    # Password Reset OTP: Expiration & Verification lookup
    "CREATE INDEX IF NOT EXISTS idx_otp_email_created ON password_reset_otps(email, created_at);",
    "CREATE INDEX IF NOT EXISTS idx_otp_expires_used ON password_reset_otps(expires_at, is_used);",
]


def ensure_version_columns(engine: Engine) -> int:
    """
    Idempotently ensures the 'version' column exists on core entities
    for optimistic locking and concurrent conflict detection without data loss.
    """
    applied = 0
    with engine.connect() as conn:
        for tbl in ["workers", "work_distributions", "items"]:
            try:
                conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN version INTEGER NOT NULL DEFAULT 1;"))
                conn.commit()
                applied += 1
            except Exception:
                pass  # Column already exists or already migrated
    return applied


def ensure_database_indexes(engine: Engine) -> int:
    """
    Idempotently creates high-performance composite indexes across core tables.
    Safe to run repeatedly on SQLite and PostgreSQL.
    Returns the count of indexes processed.
    """
    # 1. Ensure optimistic locking version columns
    try:
        ensure_version_columns(engine)
    except Exception as e:
        logger.debug(f"Version column check notice: {e}")

    applied = 0
    with engine.connect() as conn:
        for idx_sql in INDEX_DEFINITIONS:
            try:
                conn.execute(text(idx_sql))
                conn.commit()
                applied += 1
            except Exception as e:
                # Log non-fatal error (e.g. index already exists with different casing)
                logger.debug(f"Index execution notice: {e}")

    logger.info(f"Verified {applied} database performance indexes successfully.")
    return applied


def paginate_query(
    query: Query,
    page: int = 1,
    page_size: int = 50,
    max_page_size: int = 500
) -> Dict[str, Any]:
    """
    Scalable pagination helper for handling tens of thousands or millions of records.
    Prevents memory exhaustion and runaway unbounded queries.
    """
    page = max(1, page)
    page_size = min(max(1, page_size), max_page_size)

    total_count = query.order_by(None).count()
    total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1

    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": items,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1,
    }
