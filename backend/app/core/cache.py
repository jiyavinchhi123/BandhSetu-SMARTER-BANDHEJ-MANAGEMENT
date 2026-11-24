import time
import threading
import logging
from typing import Any, Optional, Dict, List, Set, Callable
from functools import wraps

logger = logging.getLogger("bandhsetu.cache")


class MemoryCacheEntry:
    """Represents a cached item with absolute expiration and associated invalidation tags."""
    __slots__ = ("value", "expires_at", "tags", "created_at")

    def __init__(self, value: Any, ttl_seconds: int, tags: Optional[List[str]] = None):
        self.value = value
        now = time.monotonic()
        self.created_at = now
        self.expires_at = now + ttl_seconds if ttl_seconds > 0 else float("inf")
        self.tags: Set[str] = set(tags) if tags else set()

    def is_expired(self) -> bool:
        return time.monotonic() > self.expires_at


class InMemoryCache:
    """
    High-performance thread-safe in-memory cache with TTL, tag-based invalidation,
    LRU-style cleanup, and comprehensive observability metrics.
    Designed to accelerate frequent read-heavy API responses (Dashboard KPIs, Item Catalogues, Worker Stats).
    """

    def __init__(self, max_entries: int = 2000, default_ttl_seconds: int = 60):
        self._max_entries = max_entries
        self._default_ttl = default_ttl_seconds
        self._store: Dict[str, MemoryCacheEntry] = {}
        self._tag_index: Dict[str, Set[str]] = {}
        self._lock = threading.RLock()
        self._hits = 0
        self._misses = 0
        self._evictions = 0

    def get(self, key: str) -> Optional[Any]:
        """Retrieve a value from the cache if not expired."""
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                self._misses += 1
                return None

            if entry.is_expired():
                self._delete_key(key)
                self._misses += 1
                self._evictions += 1
                return None

            self._hits += 1
            return entry.value

    def set(
        self,
        key: str,
        value: Any,
        ttl_seconds: Optional[int] = None,
        tags: Optional[List[str]] = None
    ) -> None:
        """Store a value with an optional custom TTL and cache tags."""
        ttl = ttl_seconds if ttl_seconds is not None else self._default_ttl
        with self._lock:
            # Enforce max entries limit by pruning expired entries or oldest
            if len(self._store) >= self._max_entries and key not in self._store:
                self._prune_expired()
                if len(self._store) >= self._max_entries:
                    self._evict_oldest()

            # Remove previous key mappings if overwriting
            if key in self._store:
                self._delete_key(key)

            entry = MemoryCacheEntry(value, ttl, tags)
            self._store[key] = entry

            if tags:
                for tag in tags:
                    if tag not in self._tag_index:
                        self._tag_index[tag] = set()
                    self._tag_index[tag].add(key)

    def invalidate_by_tag(self, tag: str) -> int:
        """Invalidate all cache entries associated with a specific tag (e.g. 'dashboard', 'workers')."""
        with self._lock:
            keys = self._tag_index.pop(tag, set())
            count = len(keys)
            for key in keys:
                self._delete_key(key)
            if count > 0:
                logger.debug(f"Invalidated {count} cache keys for tag '{tag}'")
            return count

    def invalidate_by_tags(self, *tags: str) -> int:
        """Invalidate all cache entries associated with any of the provided tags."""
        total = 0
        for tag in tags:
            total += self.invalidate_by_tag(tag)
        return total

    def invalidate_by_prefix(self, prefix: str) -> int:
        """Invalidate all keys matching the prefix."""
        with self._lock:
            keys_to_delete = [k for k in self._store.keys() if k.startswith(prefix)]
            for k in keys_to_delete:
                self._delete_key(k)
            return len(keys_to_delete)

    def invalidate_all(self) -> int:
        """Flush the entire cache store."""
        with self._lock:
            count = len(self._store)
            self._store.clear()
            self._tag_index.clear()
            return count

    def get_stats(self) -> Dict[str, Any]:
        """Telemetry metrics for health diagnostics."""
        with self._lock:
            total_lookups = self._hits + self._misses
            hit_ratio = round((self._hits / total_lookups) * 100, 1) if total_lookups > 0 else 0.0
            return {
                "active_entries": len(self._store),
                "max_entries": self._max_entries,
                "hits": self._hits,
                "misses": self._misses,
                "evictions": self._evictions,
                "hit_ratio_percent": hit_ratio,
                "active_tags": list(self._tag_index.keys()),
            }

    def _delete_key(self, key: str) -> None:
        """Internal helper to clean store and tags without separate lock."""
        entry = self._store.pop(key, None)
        if entry and entry.tags:
            for tag in entry.tags:
                tag_set = self._tag_index.get(tag)
                if tag_set:
                    tag_set.discard(key)
                    if not tag_set:
                        self._tag_index.pop(tag, None)

    def _prune_expired(self) -> int:
        """Evict all currently expired keys."""
        expired = [k for k, v in self._store.items() if v.is_expired()]
        for k in expired:
            self._delete_key(k)
            self._evictions += 1
        return len(expired)

    def _evict_oldest(self) -> None:
        """Evict the earliest created item when store is full."""
        if not self._store:
            return
        oldest_key = min(self._store.keys(), key=lambda k: self._store[k].created_at)
        self._delete_key(oldest_key)
        self._evictions += 1


# Global application cache instance
cache = InMemoryCache(max_entries=2000, default_ttl_seconds=60)


def cached(
    key_prefix: str,
    ttl_seconds: int = 60,
    tags: Optional[List[str]] = None
):
    """
    Decorator for caching functions or API methods based on arguments.
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Build cache key from function arguments
            args_repr = [repr(a) for a in args if not hasattr(a, "execute")]  # Skip DB sessions
            kwargs_repr = [f"{k}={repr(v)}" for k, v in sorted(kwargs.items()) if k != "db"]
            cache_key = f"{key_prefix}:{':'.join(args_repr)}:{':'.join(kwargs_repr)}"

            cached_val = cache.get(cache_key)
            if cached_val is not None:
                return cached_val

            result = func(*args, **kwargs)
            if result is not None:
                cache.set(cache_key, result, ttl_seconds=ttl_seconds, tags=tags)
            return result
        return wrapper
    return decorator
