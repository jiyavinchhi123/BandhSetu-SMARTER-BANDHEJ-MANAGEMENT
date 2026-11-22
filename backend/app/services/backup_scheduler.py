import asyncio
import logging
from datetime import datetime
from app.services.backup_service import BackupService

logger = logging.getLogger("bandhsetu.database.scheduler")

# Background scheduler task handle
_scheduler_task: asyncio.Task = None
_is_running: bool = False


async def _run_backup_cycle():
    """Runs periodic database backup cycles."""
    global _is_running
    _is_running = True
    logger.info("[+] BandhSetu automated backup scheduler started.")

    # 1. Immediate startup check: create backup if none exists or older than 24h
    try:
        health = BackupService.get_backup_health_status()
        if health.get("alert") or health.get("total_backups", 0) == 0:
            logger.info("[*] Initial automated backup triggered on service startup...")
            manifest = BackupService.create_encrypted_backup(backup_type="DAILY_AUTOMATED")
            logger.info(f"[OK] Startup automated backup completed: {manifest['backup_id']}")
    except Exception as e:
        logger.error(f"[!] Initial automated backup failed: {e}")

    # 2. Main loop: check every hour; trigger backup if > 24h since last
    while _is_running:
        try:
            # Sleep 1 hour between checks (3600 seconds)
            await asyncio.sleep(3600)

            health = BackupService.get_backup_health_status()
            hours_elapsed = health.get("hours_since_last_backup", 0)

            if hours_elapsed is None or hours_elapsed >= 24.0:
                logger.info("[*] 24-hour interval reached. Triggering daily encrypted backup...")
                manifest = BackupService.create_encrypted_backup(backup_type="DAILY_AUTOMATED")
                logger.info(f"[OK] Daily backup finished: {manifest['backup_id']} ({manifest['encrypted_size_bytes'] / 1024:.1f} KB)")

                # Verify in sandbox
                verify_res = BackupService.verify_backup_in_sandbox(manifest["backup_id"])
                if verify_res["verified"]:
                    logger.info(f"[OK] Automated sandbox restoration check: PASSED for {manifest['backup_id']}")
                else:
                    logger.error(f"[!] Sandboxed verification FAILED for {manifest['backup_id']}")

        except asyncio.CancelledError:
            logger.info("[-] Backup scheduler cancelled cleanly.")
            break
        except Exception as exc:
            logger.error(f"[!] Error in backup scheduler loop: {exc}")
            # Brief backoff before resuming
            await asyncio.sleep(60)

    _is_running = False


def start_backup_scheduler():
    """Starts the background daily backup task in the active asyncio event loop."""
    import sys, os
    if "pytest" in sys.modules or os.getenv("TESTING") == "1":
        logger.debug("Test environment detected. Skipping background backup daemon.")
        return
    global _scheduler_task
    try:
        loop = asyncio.get_running_loop()
        if _scheduler_task is None or _scheduler_task.done():
            _scheduler_task = loop.create_task(_run_backup_cycle())
    except RuntimeError:
        logger.warning("No running asyncio event loop. Scheduler will start on FastAPI startup event.")


def stop_backup_scheduler():
    """Cancels the backup scheduler task during application shutdown."""
    global _scheduler_task, _is_running
    _is_running = False
    if _scheduler_task and not _scheduler_task.done():
        _scheduler_task.cancel()
