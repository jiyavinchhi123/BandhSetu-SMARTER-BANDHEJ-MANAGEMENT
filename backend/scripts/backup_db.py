import os
import sys
import shutil
import sqlite3
import subprocess
from datetime import datetime
from pathlib import Path

# Base paths
BACKEND_DIR = Path(__file__).resolve().parent.parent
BACKUP_DIR = BACKEND_DIR / "backups"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

# Retention: Keep last 30 backups
MAX_BACKUP_RETENTION = 30


def backup_sqlite():
    """Performs an atomic online backup of SQLite database without blocking connections."""
    db_file = BACKEND_DIR / "bandhej_dev.db"
    if not db_file.exists():
        print(f"[ERROR] Database file not found at: {db_file}")
        return False

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"bandhsetu_backup_{timestamp}.db"
    backup_path = BACKUP_DIR / backup_filename

    print(f"[*] Starting SQLite online backup to: {backup_path.name}")
    try:
        # Use SQLite Online Backup API
        src_conn = sqlite3.connect(str(db_file))
        dst_conn = sqlite3.connect(str(backup_path))
        with dst_conn:
            src_conn.backup(dst_conn, pages=100)
        src_conn.close()
        dst_conn.close()

        # Integrity verification
        verify_conn = sqlite3.connect(str(backup_path))
        cursor = verify_conn.cursor()
        cursor.execute("PRAGMA integrity_check;")
        result = cursor.fetchone()
        verify_conn.close()

        if result and result[0] == "ok":
            file_size_kb = backup_path.stat().st_size / 1024
            print(f"[OK] Backup created successfully: {backup_path.name} ({file_size_kb:.1f} KB)")
            print("[OK] Database integrity check: PASSED (ok)")
            rotate_backups()
            return True
        else:
            print(f"[FAIL] Database integrity check failed: {result}")
            return False

    except Exception as e:
        print(f"[ERROR] Backup failed: {e}")
        return False


def rotate_backups():
    """Maintains retention policy: keeps only the last N backups."""
    backups = sorted(
        BACKUP_DIR.glob("bandhsetu_backup_*.db"),
        key=lambda p: p.stat().st_mtime,
        reverse=True
    )
    if len(backups) > MAX_BACKUP_RETENTION:
        print(f"[*] Cleaning up backups exceeding retention of {MAX_BACKUP_RETENTION}...")
        for old_backup in backups[MAX_BACKUP_RETENTION:]:
            try:
                old_backup.unlink()
                print(f"    - Removed old backup: {old_backup.name}")
            except Exception as e:
                print(f"    - Error removing {old_backup.name}: {e}")


def run_backup():
    print("=" * 60)
    print("BANDHSETU — AUTOMATED DATABASE BACKUP UTILITY")
    print("=" * 60)
    success = backup_sqlite()
    print("=" * 60)
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(run_backup())
