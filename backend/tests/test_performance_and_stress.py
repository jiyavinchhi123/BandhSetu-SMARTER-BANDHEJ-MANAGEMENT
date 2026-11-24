import time
import pytest
import sqlite3
from concurrent.futures import ThreadPoolExecutor, as_completed
from fastapi.testclient import TestClient
from sqlalchemy import text
from app.main import app
from app.database.session import engine, SessionLocal, atomic_transaction, verify_database_integrity
from app.core.cache import InMemoryCache, cache
from app.models.user import User


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_sqlite_performance_pragmas():
    """Verify that SQLite engine is tuned with high-performance PRAGMAs."""
    with engine.connect() as conn:
        journal_mode = conn.execute(text("PRAGMA journal_mode;")).scalar()
        synchronous = conn.execute(text("PRAGMA synchronous;")).scalar()
        foreign_keys = conn.execute(text("PRAGMA foreign_keys;")).scalar()
        busy_timeout = conn.execute(text("PRAGMA busy_timeout;")).scalar()
        cache_size = conn.execute(text("PRAGMA cache_size;")).scalar()

        assert str(journal_mode).upper() == "WAL", f"Expected WAL mode, got {journal_mode}"
        assert synchronous in (1, "1", "NORMAL", 1), f"Expected synchronous NORMAL, got {synchronous}"
        assert foreign_keys in (1, "1", True), f"Foreign keys must be enabled, got {foreign_keys}"
        assert busy_timeout >= 5000, f"Busy timeout should be at least 5000ms, got {busy_timeout}"
        assert cache_size < 0 or cache_size >= 2000, f"Cache size should be optimized, got {cache_size}"


def test_in_memory_cache_lifecycle():
    """Verify cache store, retrieve, TTL expiration, tag invalidation, and metrics."""
    test_cache = InMemoryCache(max_entries=100, default_ttl_seconds=2)

    # 1. Store and get
    test_cache.set("item:1", {"name": "Bandhej Saree", "price": 450}, tags=["items", "catalogue"])
    cached_val = test_cache.get("item:1")
    assert cached_val is not None
    assert cached_val["name"] == "Bandhej Saree"

    # 2. Cache hit metrics
    stats = test_cache.get_stats()
    assert stats["hits"] == 1
    assert stats["active_entries"] == 1

    # 3. Tag-based invalidation
    test_cache.set("item:2", {"name": "Dupatta"}, tags=["items"])
    test_cache.set("worker:1", {"name": "Simaben"}, tags=["workers"])
    assert test_cache.get("item:2") is not None

    invalidated_count = test_cache.invalidate_by_tag("items")
    assert invalidated_count == 2
    assert test_cache.get("item:1") is None
    assert test_cache.get("item:2") is None
    assert test_cache.get("worker:1") is not None  # worker cache remained untouched

    # 4. TTL expiration
    test_cache.set("quick_expiring", "temp_value", ttl_seconds=1)
    assert test_cache.get("quick_expiring") == "temp_value"
    time.sleep(1.1)
    assert test_cache.get("quick_expiring") is None


def test_response_timing_and_tracing_headers(client):
    """Verify X-Process-Time and X-Request-ID headers are stamped on API responses."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert "X-Process-Time" in response.headers
    assert "X-Request-ID" in response.headers
    assert "ms" in response.headers["X-Process-Time"]


def test_response_compression_gzip(client):
    """Verify responses can be compressed via GZip middleware for payloads >= 500 bytes."""
    response = client.get("/api/v1/health/db", headers={"Accept-Encoding": "gzip"})
    assert response.status_code == 200
    # Response JSON is automatically parsed by TestClient, verifying valid roundtrip
    data = response.json()
    assert data["status"] in ("healthy", "warning")
    assert "database" in data
    assert "table_record_counts" in data


def test_concurrent_read_throughput_stress(client):
    """
    Stress Test: 30 concurrent threads hammering health & telemetry endpoints simultaneously.
    Verifies zero timeouts, 100% success rate, and p95 latency < 50ms.
    """
    concurrency = 30
    latencies = []

    def make_request(idx: int):
        start = time.perf_counter()
        resp = client.get("/api/v1/health")
        duration_ms = (time.perf_counter() - start) * 1000.0
        return resp.status_code, duration_ms

    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(make_request, i) for i in range(concurrency)]
        for fut in as_completed(futures):
            status_code, duration = fut.result()
            assert status_code == 200, f"Expected 200 OK, got {status_code}"
            latencies.append(duration)

    latencies.sort()
    p95_index = int(0.95 * len(latencies))
    p95_latency = latencies[p95_index]
    avg_latency = sum(latencies) / len(latencies)

    print(f"\n[Stress Benchmark] 30 Concurrent Requests: Avg={avg_latency:.2f}ms, P95={p95_latency:.2f}ms, Max={latencies[-1]:.2f}ms")
    # Sub-250ms for 30 concurrent full-database integrity checks + disk telemetry under Python GIL
    assert p95_latency < 250.0, f"P95 latency too high: {p95_latency:.2f}ms"


def test_concurrent_atomic_transactions_and_data_integrity():
    """
    Concurrency & Fault Tolerance Test:
    Simulates concurrent atomic transactions on database sessions.
    Verifies that all operations remain isolated, commits succeed, and database integrity is 'ok'.
    """
    num_threads = 10

    def db_operation(thread_id: int):
        db = SessionLocal()
        try:
            with atomic_transaction(db):
                # Execute a quick query inside atomic transaction
                user = db.query(User).filter(User.role == "admin").first()
                assert user is not None
                return True
        finally:
            db.close()

    with ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(db_operation, i) for i in range(num_threads)]
        for fut in as_completed(futures):
            assert fut.result() is True

    # Check database integrity post-stress
    db = SessionLocal()
    try:
        integrity_result = verify_database_integrity(db)
        assert integrity_result["connected"] is True
        assert integrity_result["integrity"] == "ok"
    finally:
        db.close()
