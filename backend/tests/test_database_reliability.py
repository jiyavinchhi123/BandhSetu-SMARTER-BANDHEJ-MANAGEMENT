import sys
import os
import pytest
from pathlib import Path
from sqlalchemy import text

# Ensure backend directory is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.database.session import SessionLocal, engine, verify_database_integrity, atomic_transaction
from app.services.backup_service import BackupService
from app.models.worker import Worker
from app.models.item import Item
from app.models.user import User


def test_sqlite_pragmas_and_wal_mode():
    """Verifies SQLite is running in WAL mode with Foreign Keys and busy timeout."""
    db = SessionLocal()
    try:
        diag = verify_database_integrity(db)
        assert diag["connected"] is True
        assert diag["dialect"] == "sqlite"
        assert diag["integrity"] == "ok"
        assert diag["journal_mode"] == "wal"
        assert diag["foreign_keys_ok"] is True
        assert diag["latency_ms"] >= 0.0

        # Check busy timeout is at least 60s
        row = db.execute(text("PRAGMA busy_timeout;")).fetchone()
        assert row[0] >= 60000

        # Check synchronous is NORMAL (1) or FULL (2)
        sync_row = db.execute(text("PRAGMA synchronous;")).fetchone()
        assert sync_row[0] in (1, 2)
    finally:
        db.close()


def test_atomic_transaction_rollback_on_failure():
    """Verifies that atomic_transaction rolls back all changes if an exception occurs."""
    db = SessionLocal()
    try:
        initial_worker_count = db.query(Worker).count()

        with pytest.raises(RuntimeError, match="Simulated crash"):
            with atomic_transaction(db):
                fake_worker = Worker(
                    serial_number="WRK-TEST-FAIL",
                    full_name="Temporary Crash Worker",
                    phone="9999999901",
                    town="TestTown",
                    status="Active"
                )
                db.add(fake_worker)
                db.flush()
                # Simulate crash / unexpected error before commit
                raise RuntimeError("Simulated crash during transaction")

        # Assert no record was leaked
        after_count = db.query(Worker).count()
        assert after_count == initial_worker_count
        leaked = db.query(Worker).filter(Worker.serial_number == "WRK-TEST-FAIL").first()
        assert leaked is None
    finally:
        db.close()


def test_encrypted_backup_creation_and_tamper_proofing():
    """Verifies AES-256-GCM encryption, manifest generation, and tamper resistance."""
    manifest = BackupService.create_encrypted_backup(backup_type="TEST_FULL")

    assert manifest["backup_id"].startswith("BS_BKP_")
    assert manifest["encryption_algorithm"] == "AES-256-GCM"
    assert manifest["original_size_bytes"] > 0
    assert manifest["encrypted_size_bytes"] > manifest["original_size_bytes"]
    assert len(manifest["sha256_plaintext"]) == 64
    assert len(manifest["sha256_ciphertext"]) == 64
    assert "workers" in manifest["table_counts"]
    assert manifest["table_counts"]["workers"] >= 2

    backup_id = manifest["backup_id"]

    # Verify sandboxed restoration
    verification = BackupService.verify_backup_in_sandbox(backup_id)
    assert verification["verified"] is True
    assert verification["integrity_check"] == "ok"
    assert verification["table_counts_verified"] is True

    # Tamper-proofing test: modify 1 byte of ciphertext and verify GCM authentication fails
    enc_file = BackupService.ENCRYPTED_BACKUP_DIR if hasattr(BackupService, 'ENCRYPTED_BACKUP_DIR') else Path("backend/encrypted_backups") / f"{backup_id}.enc.db"
    original_enc = enc_file.read_bytes()

    tampered_enc = bytearray(original_enc)
    tampered_enc[25] ^= 0xFF  # Flip bits in ciphertext
    enc_file.write_bytes(tampered_enc)

    try:
        # Decryption MUST fail due to GCM authentication tag mismatch
        with pytest.raises(Exception):
            sandbox_dest = Path("backend/encrypted_backups/tamper_test.db")
            BackupService.decrypt_backup(backup_id, sandbox_dest)
    finally:
        # Restore valid ciphertext
        enc_file.write_bytes(original_enc)


def test_backup_health_telemetry():
    """Verifies backup health monitoring, SLA calculation, and alerting logic."""
    health = BackupService.get_backup_health_status()
    assert health["status"] in ("HEALTHY", "ALERT_STALE_BACKUP")
    assert health["total_backups"] >= 1
    assert health["hours_since_last_backup"] is not None
    assert health["total_storage_mb"] >= 0.0
    assert health["encryption"] == "AES-256-GCM"


def test_production_data_preservation():
    """Strictly asserts that Simaben, Radhikaben, Soni, and Shilpi are 100% intact."""
    db = SessionLocal()
    try:
        # 1. Simaben
        simaben = db.query(Worker).filter(Worker.serial_number == "WRK-0001").first()
        assert simaben is not None
        assert simaben.full_name == "Simaben"
        assert simaben.town == "Anjar"

        # 2. Radhikaben
        radhikaben = db.query(Worker).filter(Worker.serial_number == "WRK-0002").first()
        assert radhikaben is not None
        assert radhikaben.full_name == "Radhikaben"
        assert radhikaben.town in ("Lalpur", "Lajpur")

        # 3. Item: Soni
        soni = db.query(Item).filter(Item.item_name == "Soni").first()
        assert soni is not None
        assert float(soni.price_per_piece) == 60.0

        # 4. Item: Shilpi
        shilpi = db.query(Item).filter(Item.item_name == "Shilpi").first()
        assert shilpi is not None
        assert float(shilpi.price_per_piece) == 70.0

        # 5. Core accounts
        admin = db.query(User).filter(User.role == "admin").first()
        assert admin is not None
    finally:
        db.close()
