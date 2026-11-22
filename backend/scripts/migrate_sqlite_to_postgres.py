#!/usr/bin/env python3
"""
BandhSetu — Safe SQLite to PostgreSQL Database Migration Script
Transfers all historical artisan records, custody items, transactions,
and ledger history to PostgreSQL / Supabase with zero data loss.
"""
import sys
import os
import argparse
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.database.migration import DatabaseMigrationManager
from app.services.backup_service import BackupService
from app.core.config import settings


def main():
    parser = argparse.ArgumentParser(description="Migrate BandhSetu SQLite database to PostgreSQL / Supabase safely.")
    parser.add_argument(
        "--target-url",
        type=str,
        default=os.getenv("TARGET_DATABASE_URL") or os.getenv("SUPABASE_DB_URL"),
        help="PostgreSQL connection string (e.g. postgresql://postgres:password@db.supabase.co:5432/postgres)"
    )
    parser.add_argument(
        "--source-sqlite",
        type=str,
        default=None,
        help="Path to source SQLite database file (defaults to configured settings.DATABASE_URL)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate migration and check connections without inserting records"
    )
    parser.add_argument(
        "--no-backup",
        action="store_true",
        help="Skip automatic encrypted backup before migration (not recommended)"
    )

    args = parser.parse_args()

    print("=" * 70)
    print(" BANDHSETU — SAFE DATABASE MIGRATION ENGINE")
    print("=" * 70)

    # 1. Determine Source SQLite URL
    sqlite_url = settings.normalized_database_url
    if args.source_sqlite:
        sqlite_url = f"sqlite:///{Path(args.source_sqlite).resolve().as_posix()}"

    print(f"[*] Source Database : {sqlite_url}")

    # 2. Determine Target PostgreSQL URL
    target_url = args.target_url
    if not target_url:
        print("\n[!] Error: Target PostgreSQL URL is required.")
        print("    Pass via --target-url or set TARGET_DATABASE_URL environment variable.")
        print("    Example: python migrate_sqlite_to_postgres.py --target-url \"postgresql://postgres:password@localhost:5432/bandhsetu\"")
        sys.exit(1)

    # Mask password for display
    display_target = target_url
    if "@" in display_target and ":" in display_target.split("@")[0]:
        user_part = display_target.split("@")[0]
        prefix = user_part.split(":")[0]
        display_target = f"{prefix}:****@{display_target.split('@')[1]}"
    print(f"[*] Target Database : {display_target}")
    print(f"[*] Dry Run Mode    : {'ENABLED' if args.dry_run else 'DISABLED'}")

    # 3. Create pre-migration encrypted backup
    if not args.no_backup and not args.dry_run:
        print("\n[*] Creating pre-migration encrypted backup...")
        try:
            bkp = BackupService.create_encrypted_backup(backup_type="PRE_MIGRATION")
            print(f"[OK] Pre-migration backup verified: {bkp['backup_id']} ({bkp['original_size_bytes'] / 1024:.1f} KB)")
        except Exception as e:
            print(f"[!] Warning: Pre-migration backup failed: {e}")
            choice = input("    Continue migration without pre-backup? (y/N): ")
            if choice.lower() != "y":
                print("Aborting migration.")
                sys.exit(1)

    # 4. Initialize Manager
    manager = DatabaseMigrationManager(sqlite_url=sqlite_url, postgres_url=target_url)

    # Test connectivity
    print("\n[*] Testing database connections...")
    try:
        conn_status = manager.test_connections()
        print(f"    - SQLite source reachable    : {'[OK]' if conn_status['sqlite'] else '[FAIL]'}")
        print(f"    - PostgreSQL target reachable: {'[OK]' if conn_status['postgres'] else '[FAIL]'}")
    except Exception as ce:
        print(f"[FAIL] Connection test failed: {ce}")
        sys.exit(1)

    # 5. Execute Migration
    print("\n[*] Migrating tables in dependency order...")
    try:
        report = manager.migrate_all_tables(batch_size=500, dry_run=args.dry_run)
        print("\n" + "=" * 70)
        print(" MIGRATION REPORT SUMMARY")
        print("=" * 70)
        for tbl, stats in report["tables"].items():
            print(f"  {tbl:28} | Source: {stats['source_rows']:4} | Target: {stats['target_rows']:4} | {stats['status']}")

        print("-" * 70)
        print(f"Total Rows Migrated: {report['total_rows_migrated']}")
        print(f"Total Elapsed Time : {report['duration_sec']} seconds")
        print(f"Migration Status   : {'SUCCESS (100% Data Preserved)' if report['success'] else 'PARTIAL / WARNING'}")
        print("=" * 70)

        return 0 if report["success"] else 1
    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
