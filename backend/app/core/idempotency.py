import time
import hashlib
import threading
import logging
from typing import Dict, Any, Optional, Tuple
from fastapi import Request, HTTPException, status
from starlette.responses import JSONResponse

logger = logging.getLogger("bandhsetu.idempotency")


class IdempotencyRecord:
    __slots__ = ("status_code", "data", "expires_at", "in_flight")

    def __init__(self, in_flight: bool = True, ttl_seconds: int = 60):
        self.in_flight = in_flight
        self.status_code: Optional[int] = None
        self.data: Any = None
        self.expires_at = time.monotonic() + ttl_seconds


class IdempotencyEngine:
    """
    Thread-safe idempotency and request deduplication engine.
    Guarantees:
    1. Simultaneous double-submissions (e.g. rapid double-clicking 'Submit Payout' or 'Issue Batch')
       are safely blocked with HTTP 409 Conflict.
    2. Retries of previously completed requests within the TTL window (e.g. network drops after submission)
       replay the exact previously created transaction instead of creating duplicate charges.
    """

    def __init__(self, default_ttl_seconds: int = 60):
        self._default_ttl = default_ttl_seconds
        self._records: Dict[str, IdempotencyRecord] = {}
        self._lock = threading.RLock()

    def check_and_acquire(self, key: str, ttl_seconds: Optional[int] = None) -> Tuple[str, Optional[Tuple[int, Any]]]:
        """
        Atomically inspects and registers an idempotency key.
        Returns:
            - ("ACQUIRED", None): Caller may execute operation.
            - ("IN_PROGRESS", None): Another thread/worker is executing this exact operation now.
            - ("REPLAY", (status_code, data)): Operation was already completed; replay result.
        """
        ttl = ttl_seconds or self._default_ttl
        now = time.monotonic()

        with self._lock:
            # Clean expired records periodically
            self._prune_expired(now)

            record = self._records.get(key)
            if record is not None:
                if record.in_flight:
                    return "IN_PROGRESS", None
                return "REPLAY", (record.status_code, record.data)

            # Register as in-flight
            self._records[key] = IdempotencyRecord(in_flight=True, ttl_seconds=ttl)
            return "ACQUIRED", None

    def record_success(self, key: str, status_code: int, data: Any) -> None:
        """Stores the response data and marks the key as completed."""
        with self._lock:
            record = self._records.get(key)
            if record:
                record.in_flight = False
                record.status_code = status_code
                record.data = data

    def release_key(self, key: str) -> None:
        """Releases the key if an operation aborted or failed before completion."""
        with self._lock:
            self._records.pop(key, None)

    def _prune_expired(self, now: float) -> None:
        expired_keys = [k for k, v in self._records.items() if now > v.expires_at]
        for k in expired_keys:
            del self._records[k]

    def reset(self) -> None:
        """Flushes all idempotency records (useful for testing)."""
        with self._lock:
            self._records.clear()


# Global application idempotency engine
idempotency_engine = IdempotencyEngine(default_ttl_seconds=60)


def compute_request_fingerprint(user_id: Any, method: str, path: str, body_bytes: bytes) -> str:
    """Computes a deterministic SHA-256 fingerprint from user identity and request payload."""
    payload_hash = hashlib.sha256(body_bytes).hexdigest()
    return f"idem:{user_id}:{method}:{path}:{payload_hash}"
