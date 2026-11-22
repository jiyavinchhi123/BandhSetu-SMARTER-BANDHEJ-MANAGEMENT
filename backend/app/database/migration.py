import sys
import time
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path
from sqlalchemy import create_engine, text, MetaData
from sqlalchemy.orm import sessionmaker

from app.database.session import Base
from app.core.config import settings

logger = logging.getLogger("bandhsetu.database.migration")

# Strict dependency order for topological table insertion without foreign key violations
MIGRATION_TABLE_ORDER = [
    "users",
    "workers",
    "items",
    "work_distributions",
    "work_returns",
    "material_transactions",
    "money_transactions",
    "payment_records",
    "material_ledger_entries",
    "audit_logs",
]


class DatabaseMigrationManager:
    """
    Production-grade migration utility to transfer BandhSetu data from SQLite
    to PostgreSQL (Self-hosted or Supabase) with zero loss of committed business records.
    """

    def __init__(self, sqlite_url: str, postgres_url: str):
        self.sqlite_url = sqlite_url
        self.postgres_url = postgres_url.replace("postgres://", "postgresql://", 1)

        self.sqlite_engine = create_engine(self.sqlite_url, connect_args={"check_same_thread": False})
        self.postgres_engine = create_engine(
            self.postgres_url,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 15}
        )

    def test_connections(self) -> Dict[str, bool]:
        """Validates that both source and destination databases are reachable."""
        status = {"sqlite": False, "postgres": False}
        with self.sqlite_engine.connect() as conn:
            conn.execute(text("SELECT 1;"))
            status["sqlite"] = True

        with self.postgres_engine.connect() as conn:
            conn.execute(text("SELECT 1;"))
            status["postgres"] = True

        return status

    def setup_target_schema(self) -> int:
        """Creates target PostgreSQL tables and base constraints if not existing."""
        logger.info("Initializing target PostgreSQL schema from SQLAlchemy metadata...")
        Base.metadata.create_all(bind=self.postgres_engine)

        # Apply indexes
        from app.database.indexes import ensure_database_indexes
        applied_indexes = ensure_database_indexes(self.postgres_engine)
        return applied_indexes

    def migrate_all_tables(self, batch_size: int = 500, dry_run: bool = False) -> Dict[str, Any]:
        """
        Transfers all records in dependency order, preserving IDs, timestamps,
        and foreign key integrity. Updates PostgreSQL sequences post-migration.
        """
        start_time = time.perf_counter()
        report: Dict[str, Any] = {
            "started_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "dry_run": dry_run,
            "tables": {},
            "total_rows_migrated": 0,
            "success": False,
            "errors": [],
        }

        # 1. Setup target schema first
        if not dry_run:
            self.setup_target_schema()

        with self.sqlite_engine.connect() as src_conn, self.postgres_engine.connect() as dst_conn:
            for table_name in MIGRATION_TABLE_ORDER:
                table_start = time.perf_counter()
                logger.info(f"[*] Migrating table: {table_name}...")

                # Fetch column names from SQLite
                columns_res = src_conn.execute(text(f'PRAGMA table_info("{table_name}");')).fetchall()
                if not columns_res:
                    logger.warning(f"Table {table_name} does not exist in source. Skipping.")
                    continue

                col_names = [col[1] for col in columns_res]
                cols_str = ", ".join(f'"{c}"' for c in col_names)
                placeholders = ", ".join(f":{c}" for c in col_names)

                # Fetch source count and rows
                src_count = src_conn.execute(text(f'SELECT COUNT(*) FROM "{table_name}";')).scalar() or 0

                if dry_run:
                    report["tables"][table_name] = {
                        "source_rows": src_count,
                        "target_rows": 0,
                        "status": "DRY_RUN_READY",
                    }
                    continue

                # Read from SQLite in batches
                offset = 0
                rows_migrated = 0

                # Disable FK checks temporarily during data load on PostgreSQL if superuser, or insert in topological order
                while offset < src_count:
                    rows = src_conn.execute(
                        text(f'SELECT {cols_str} FROM "{table_name}" ORDER BY id ASC LIMIT {batch_size} OFFSET {offset};')
                    ).fetchall()

                    if not rows:
                        break

                    # Convert to list of dicts
                    row_dicts = [dict(zip(col_names, row)) for row in rows]

                    # UPSERT into PostgreSQL using ON CONFLICT (id) DO NOTHING to remain idempotent
                    upsert_sql = f"""
                    INSERT INTO "{table_name}" ({cols_str})
                    VALUES ({placeholders})
                    ON CONFLICT (id) DO NOTHING;
                    """

                    dst_conn.execute(text(upsert_sql), row_dicts)
                    dst_conn.commit()

                    rows_migrated += len(row_dicts)
                    offset += batch_size

                # Advance PostgreSQL sequence to match MAX(id)
                try:
                    seq_reset_sql = f"""
                    SELECT setval(
                        pg_get_serial_sequence('"{table_name}"', 'id'),
                        COALESCE((SELECT MAX(id) FROM "{table_name}"), 1)
                    );
                    """
                    dst_conn.execute(text(seq_reset_sql))
                    dst_conn.commit()
                except Exception as seq_err:
                    logger.debug(f"Sequence reset notice for {table_name}: {seq_err}")

                # Verify target count
                dst_count = dst_conn.execute(text(f'SELECT COUNT(*) FROM "{table_name}";')).scalar() or 0

                duration = round(time.perf_counter() - table_start, 3)
                report["tables"][table_name] = {
                    "source_rows": src_count,
                    "target_rows": dst_count,
                    "status": "PASSED" if dst_count >= src_count else "COUNT_MISMATCH",
                    "duration_sec": duration,
                }
                report["total_rows_migrated"] += rows_migrated

            # Final verification
            all_match = all(
                t.get("source_rows", 0) <= t.get("target_rows", 0)
                for t in report["tables"].values()
            )
            report["success"] = all_match
            report["duration_sec"] = round(time.perf_counter() - start_time, 2)

        return report
