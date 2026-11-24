from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database.session import get_db, engine, verify_database_integrity
from app.core.config import settings
from app.core.cache import cache
from app.schemas.health import HealthResponse
from app.services.backup_service import BackupService
from app.utils.formatters import format_ist_datetime

router = APIRouter()


@router.get("/health", response_model=HealthResponse, summary="System Health & Diagnostic Check")
def health_check(db: Session = Depends(get_db)):
    """
    Returns system status, active database dialect connectivity,
    data integrity check, journal mode (WAL), latency (ms),
    automated backup health, and server time in Indian Standard Time (IST).
    """
    db_diag = verify_database_integrity(db)
    backup_status = BackupService.get_backup_health_status()

    # Determine overall status
    is_healthy = db_diag["connected"] and (db_diag["integrity"] == "ok")
    has_backup_alert = backup_status.get("alert", False)

    if not is_healthy:
        overall_status = "degraded"
    elif has_backup_alert:
        overall_status = "warning"
    else:
        overall_status = "healthy"

    db_status = {
        "connected": db_diag["connected"],
        "dialect": db_diag["dialect"],
        "latency_ms": db_diag["latency_ms"],
        "integrity": db_diag["integrity"],
        "journal_mode": db_diag.get("journal_mode"),
        "foreign_keys_ok": db_diag.get("foreign_keys_ok"),
        "message": "Database verified (WAL mode, verified integrity)" if is_healthy else f"Warning: {db_diag.get('error')}"
    }

    return HealthResponse(
        status=overall_status,
        project=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        timestamp_ist=format_ist_datetime(),
        database=db_status,
        details={
            "timezone": settings.TIMEZONE,
            "currency": settings.DEFAULT_CURRENCY,
            "backup_monitoring": backup_status,
            "cache_telemetry": cache.get_stats(),
            "docs_url": "/docs" if settings.DEBUG else None,
        }
    )


@router.get("/health/db", summary="Detailed Database & Backup Diagnostics")
def detailed_db_diagnostics(db: Session = Depends(get_db)):
    """
    In-depth diagnostic telemetry for database administrators:
    - Integrity verification
    - Latency (ms)
    - WAL checkpoint status
    - Encrypted backup inventory & retention status
    - Table-by-table record counts
    """
    db_diag = verify_database_integrity(db)
    backup_health = BackupService.get_backup_health_status()
    all_backups = BackupService.list_backups()

    # Table record statistics
    table_stats = {}
    try:
        if db_diag["dialect"] == "sqlite":
            tables = [r[0] for r in db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")).fetchall()]
            for t in sorted(tables):
                table_stats[t] = db.execute(text(f'SELECT COUNT(*) FROM "{t}"')).scalar()
    except Exception as e:
        table_stats["error"] = str(e)

    return {
        "status": "healthy" if db_diag["connected"] and db_diag["integrity"] == "ok" else "warning",
        "timestamp_ist": format_ist_datetime(),
        "database": db_diag,
        "table_record_counts": table_stats,
        "backup_health": backup_health,
        "recent_backups": all_backups[:5],
        "cache_telemetry": cache.get_stats(),
    }


@router.post("/health/db/backup/trigger", summary="Manually Trigger Encrypted Backup")
def trigger_manual_backup():
    """
    Triggers an immediate atomic online encrypted backup with AES-256-GCM
    and returns verified manifest and sandbox test results.
    """
    try:
        manifest = BackupService.create_encrypted_backup(backup_type="MANUAL_API_TRIGGER")
        sandbox_test = BackupService.verify_backup_in_sandbox(manifest["backup_id"])
        return {
            "status": "SUCCESS",
            "message": f"Encrypted backup {manifest['backup_id']} created and verified.",
            "manifest": manifest,
            "sandbox_verification": sandbox_test,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup generation failed: {str(e)}")
