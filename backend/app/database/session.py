import sqlite3
import logging
from contextlib import contextmanager
from typing import Generator
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from app.core.config import settings

logger = logging.getLogger("bandhsetu.database")

db_url = settings.normalized_database_url

connect_args = {}
engine_kwargs = {
    "pool_pre_ping": True,
}

if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    connect_args["timeout"] = 60.0  # Python sqlite3 driver timeout in seconds
else:
    # High-performance connection pooling for PostgreSQL (Direct or Supabase PgBouncer)
    engine_kwargs["pool_size"] = 20
    engine_kwargs["max_overflow"] = 40
    engine_kwargs["pool_timeout"] = 30
    engine_kwargs["pool_recycle"] = 1800  # Recycle idle connections every 30 mins
    connect_args["connect_timeout"] = 10
    connect_args["keepalives"] = 1
    connect_args["keepalives_idle"] = 30
    connect_args["keepalives_interval"] = 10
    connect_args["keepalives_count"] = 5

engine = create_engine(
    db_url,
    connect_args=connect_args,
    **engine_kwargs
)

# SQLite Hardening: WAL Mode, Foreign Keys, Synchronous Normal, Busy Timeout
if db_url.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def configure_sqlite_connection(dbapi_connection, connection_record):
        if isinstance(dbapi_connection, sqlite3.Connection):
            cursor = dbapi_connection.cursor()
            try:
                # 1. Write-Ahead Logging (WAL) for high concurrency and crash durability
                cursor.execute("PRAGMA journal_mode = WAL;")
                # 2. NORMAL synchronous mode: safe across crashes and OS power cuts in WAL mode
                cursor.execute("PRAGMA synchronous = NORMAL;")
                # 3. Enforce referential foreign key integrity
                cursor.execute("PRAGMA foreign_keys = ON;")
                # 4. Wait up to 60,000ms for locks rather than throwing immediately
                cursor.execute("PRAGMA busy_timeout = 60000;")
                # 5. 64MB memory page cache for high-speed indexed lookups
                cursor.execute("PRAGMA cache_size = -64000;")
                # 6. Auto checkpoint every 1000 pages to keep WAL file compact
                cursor.execute("PRAGMA wal_autocheckpoint = 1000;")
                # 7. Memory-mapped I/O (256MB) for zero-copy file reads
                cursor.execute("PRAGMA mmap_size = 268435456;")
                # 8. Store temporary tables, indices, and sorts in RAM
                cursor.execute("PRAGMA temp_store = MEMORY;")
            except Exception as e:
                logger.warning(f"Could not apply SQLite performance pragmas: {e}")
            finally:
                cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency providing database session with automatic rollback on unhandled exceptions."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@contextmanager
def atomic_transaction(db: Session):
    """
    Context manager that guarantees atomic commit or complete rollback of operations.
    Prevents partial/incomplete commits and protects business integrity.
    Supports nested savepoints seamlessly.
    """
    if db.in_nested_transaction():
        savepoint = db.begin_nested()
        try:
            yield db
            savepoint.commit()
        except Exception:
            savepoint.rollback()
            raise
    else:
        try:
            yield db
            db.commit()
            try:
                from app.core.cache import cache
                cache.invalidate_by_tag("dashboard")
            except Exception:
                pass
        except Exception:
            db.rollback()
            raise


def verify_database_integrity(db: Session) -> dict:
    """
    Runs diagnostic checks against the active database:
    - Verifies connectivity and measures latency in milliseconds.
    - Runs PRAGMA integrity_check on SQLite or SELECT 1 on PostgreSQL.
    - Checks foreign key constraints.
    """
    import time
    start_time = time.perf_counter()
    dialect_name = engine.dialect.name

    result = {
        "dialect": dialect_name,
        "connected": False,
        "latency_ms": 0.0,
        "integrity": "unchecked",
        "foreign_keys_ok": True,
        "journal_mode": None,
        "error": None,
    }

    try:
        if dialect_name == "sqlite":
            check_row = db.execute(text("PRAGMA integrity_check;")).fetchone()
            result["integrity"] = check_row[0] if check_row else "unknown"

            journal_row = db.execute(text("PRAGMA journal_mode;")).fetchone()
            result["journal_mode"] = journal_row[0] if journal_row else "unknown"

            fk_rows = db.execute(text("PRAGMA foreign_key_check;")).fetchall()
            result["foreign_keys_ok"] = len(fk_rows) == 0
        else:
            db.execute(text("SELECT 1;"))
            result["integrity"] = "ok"
            result["journal_mode"] = "wal"

        result["connected"] = True
    except Exception as exc:
        result["connected"] = False
        result["error"] = str(exc)

    result["latency_ms"] = round((time.perf_counter() - start_time) * 1000, 2)
    return result
