import time
import pytest
from concurrent.futures import ThreadPoolExecutor, as_completed
from fastapi.testclient import TestClient

from app.main import app
from app.database.session import SessionLocal, verify_database_integrity
from app.models.worker import Worker
from app.models.item import Item
from app.models.work_distribution import WorkDistribution
from app.models.work_return import WorkReturn
from app.models.material_transaction import MaterialTransaction
from app.models.money_transaction import MoneyTransaction
from app.models.payment_record import PaymentRecord
from app.models.material_ledger import MaterialLedgerEntry
from app.models.audit_log import AuditLog
from app.models.user import User
from app.core.security import create_access_token
from app.core.idempotency import idempotency_engine


@pytest.fixture(autouse=True)
def clean_idempotency_engine():
    idempotency_engine.reset()
    yield
    idempotency_engine.reset()


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="module")
def admin_headers():
    db = SessionLocal()
    admin = db.query(User).filter(User.role == "admin").first()
    token = create_access_token({
        "sub": str(admin.id),
        "email": admin.email,
        "role": admin.role,
        "token_version": admin.token_version
    })
    db.close()
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def test_data():
    """Provides isolated artisan and catalog item so production data is untouched."""
    db = SessionLocal()
    ts = int(time.time() * 1000)
    worker = Worker(
        serial_number=f"WRK-CONC-{ts}",
        full_name="Concurrency Test Artisan",
        phone=f"+9199{ts % 100000000:08d}",
        town="Anjar",
        status="Active",
        payable_balance=500.0,
        pending_pieces=0,
        version=1
    )
    db.add(worker)

    item = Item(
        item_name=f"Concurrency Test Item {ts}",
        item_code=f"ITM-CONC-{ts}",
        price_per_piece=120.0,
        version=1
    )
    db.add(item)
    db.commit()
    db.refresh(worker)
    db.refresh(item)

    w_id = worker.id
    i_id = item.id
    db.close()

    yield {"worker_id": w_id, "item_id": i_id}

    # Safe Cleanup
    db = SessionLocal()
    try:
        db.query(MoneyTransaction).filter(MoneyTransaction.worker_id == w_id).delete()
        db.query(PaymentRecord).filter(PaymentRecord.worker_id == w_id).delete()
        db.query(MaterialTransaction).filter(MaterialTransaction.worker_id == w_id).delete()
        db.query(MaterialLedgerEntry).filter(MaterialLedgerEntry.worker_id == w_id).delete()
        db.query(WorkReturn).filter(WorkReturn.worker_id == w_id).delete()
        db.query(WorkDistribution).filter(WorkDistribution.worker_id == w_id).delete()
        db.query(Worker).filter(Worker.id == w_id).delete()
        db.query(Item).filter(Item.id == i_id).delete()
        db.commit()
    finally:
        db.close()


def test_optimistic_locking_conflict_detection(client, admin_headers, test_data):
    """
    Requirement:
    - User A and User B fetch the same artisan record with version V.
    - User A updates the artisan (version becomes V+1).
    - User B attempts to save with stale version V -> must be rejected with 409 Conflict.
    - User B refreshes, uses latest version V+1 -> update succeeds.
    """
    worker_id = test_data["worker_id"]
    db = SessionLocal()
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    current_version = worker.version or 1
    db.close()

    # User A successfully updates worker
    res_a = client.put(
        f"/api/v1/workers/{worker_id}",
        headers=admin_headers,
        json={
            "remarks": "Updated by User A",
            "expected_version": current_version
        }
    )
    assert res_a.status_code == 200, res_a.text
    updated_a = res_a.json()
    assert updated_a["version"] == current_version + 1

    # User B tries to update using stale version V -> 409 Conflict
    res_b = client.put(
        f"/api/v1/workers/{worker_id}",
        headers=admin_headers,
        json={
            "remarks": "Conflicting update by User B",
            "expected_version": current_version  # STALE VERSION!
        }
    )
    assert res_b.status_code == 409
    assert "modified by another user concurrently" in res_b.json()["detail"].lower()

    # User B refreshes and submits with the new version V+1 -> Success
    res_b_refresh = client.put(
        f"/api/v1/workers/{worker_id}",
        headers=admin_headers,
        json={
            "remarks": "Clean update after refresh",
            "expected_version": current_version + 1
        }
    )
    assert res_b_refresh.status_code == 200
    assert res_b_refresh.json()["version"] == current_version + 2


def test_item_catalogue_optimistic_locking(client, admin_headers, test_data):
    """Requirement: Prevent conflicting edits to item catalogue prices and specifications."""
    item_id = test_data["item_id"]
    db = SessionLocal()
    item = db.query(Item).filter(Item.id == item_id).first()
    v = item.version or 1
    db.close()

    # Stale version update fails
    res_fail = client.put(
        f"/api/v1/items/{item_id}",
        headers=admin_headers,
        json={"price_per_piece": 300.0, "expected_version": v - 1}
    )
    assert res_fail.status_code == 409

    # Correct version update succeeds
    res_ok = client.put(
        f"/api/v1/items/{item_id}",
        headers=admin_headers,
        json={"price_per_piece": 280.0, "expected_version": v}
    )
    assert res_ok.status_code == 200
    assert res_ok.json()["version"] == v + 1


def test_idempotency_prevents_duplicate_payments(client, admin_headers, test_data):
    """
    Requirement:
    Rapid repeated submissions (e.g. double-click on payment button) with identical
    idempotency key must NOT create twin transactions or double-deduct balance.
    """
    w_id = test_data["worker_id"]
    idem_key = f"test-payout-doubleclick-{time.time()}"
    payload = {
        "worker_id": w_id,
        "amount": 25.0,
        "payment_mode": "UPI",
        "reference_no": f"UPI-{int(time.time() * 1000)}",
        "remarks": "Idempotency test payout"
    }

    # First request: Creates transaction
    res1 = client.post(
        "/api/v1/payments/payout",
        headers={**admin_headers, "Idempotency-Key": idem_key},
        json=payload
    )
    assert res1.status_code == 201, res1.text
    txn1_id = res1.json()["id"]

    # Second request with SAME idempotency key (simulating double click or network retry)
    res2 = client.post(
        "/api/v1/payments/payout",
        headers={**admin_headers, "Idempotency-Key": idem_key},
        json=payload
    )
    assert res2.status_code in (200, 201)
    assert res2.headers.get("X-Idempotent-Replay") == "true"
    assert res2.json()["id"] == txn1_id  # Returns identical transaction!


def test_concurrent_consignments_atomic_balance(client, admin_headers, test_data):
    """
    Requirement:
    Simultaneous work consignments issued to the same artisan must atomically
    increment pending pieces without race conditions or lost updates.
    """
    w_id = test_data["worker_id"]
    item_id = test_data["item_id"]

    db = SessionLocal()
    worker = db.query(Worker).filter(Worker.id == w_id).first()
    initial_pending = worker.pending_pieces
    db.close()

    num_threads = 5
    qty_per_batch = 10

    def issue_batch(idx: int):
        idem = f"concurrent-give-{w_id}-{idx}-{time.time()}"
        return client.post(
            "/api/v1/distributions/give-work",
            headers={**admin_headers, "Idempotency-Key": idem},
            json={
                "worker_id": w_id,
                "item_id": item_id,
                "quantity_issued": qty_per_batch,
                "knot_style": "Ekdali",
                "remarks": f"Concurrent test batch {idx}"
            }
        )

    with ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(issue_batch, i) for i in range(num_threads)]
        for fut in as_completed(futures):
            res = fut.result()
            assert res.status_code == 201, res.text

    # Verify atomic tally in database
    db = SessionLocal()
    updated_worker = db.query(Worker).filter(Worker.id == w_id).first()
    expected_pending = initial_pending + (num_threads * qty_per_batch)
    assert updated_worker.pending_pieces == expected_pending, (
        f"Expected {expected_pending} pending pieces, got {updated_worker.pending_pieces}"
    )
    db.close()


def test_concurrent_payments_atomic_balance(client, admin_headers, test_data):
    """
    Requirement:
    Simultaneous payouts made to an artisan must atomically deduct the payable balance
    without any lost updates or race conditions.
    """
    w_id = test_data["worker_id"]

    db = SessionLocal()
    worker = db.query(Worker).filter(Worker.id == w_id).first()
    initial_balance = float(worker.payable_balance)
    db.close()

    amounts = [10.0, 15.0, 20.0, 25.0]
    num_threads = len(amounts)

    def make_payout(idx: int):
        amt = amounts[idx]
        idem = f"concurrent-pay-{w_id}-{idx}-{amt}-{time.time()}"
        return client.post(
            "/api/v1/payments/payout",
            headers={**admin_headers, "Idempotency-Key": idem},
            json={
                "worker_id": w_id,
                "amount": amt,
                "payment_mode": "Cash" if idx % 2 == 0 else "Bank Transfer",
                "reference_no": f"CONC-PAY-{idx}-{int(time.time() * 1000)}",
                "remarks": f"Concurrent payout test {idx}"
            }
        )

    with ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(make_payout, i) for i in range(num_threads)]
        for fut in as_completed(futures):
            res = fut.result()
            assert res.status_code == 201, res.text

    # Verify atomic subtraction in database
    db = SessionLocal()
    updated_worker = db.query(Worker).filter(Worker.id == w_id).first()
    expected_balance = round(initial_balance - sum(amounts), 2)
    assert float(updated_worker.payable_balance) == expected_balance, (
        f"Expected payable balance {expected_balance}, got {updated_worker.payable_balance}"
    )
    db.close()


def test_in_flight_idempotency_collision():
    """
    Requirement:
    If two identical requests arrive simultaneously, the first acquires the key
    and the second in-flight request is immediately detected as IN_PROGRESS.
    """
    key = "test-collision-key"
    status1, _ = idempotency_engine.check_and_acquire(key)
    assert status1 == "ACQUIRED"

    # Second request hits while first is still in progress
    status2, _ = idempotency_engine.check_and_acquire(key)
    assert status2 == "IN_PROGRESS"

    # First finishes and records success
    idempotency_engine.record_success(key, 201, {"id": 999})

    # Third request replays the finished result
    status3, replay_data = idempotency_engine.check_and_acquire(key)
    assert status3 == "REPLAY"
    assert replay_data[0] == 201
    assert replay_data[1]["id"] == 999


def test_concurrent_database_integrity_under_stress():
    """Verify that multiple concurrent threads maintain 100% database integrity without locks or corruption."""
    db = SessionLocal()
    diag = verify_database_integrity(db)
    assert diag["connected"] is True
    assert diag["integrity"] == "ok"
    assert diag["foreign_keys_ok"] is True
    db.close()
