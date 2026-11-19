import time
from typing import Dict, List
from fastapi import Request, HTTPException, status


class SlidingWindowRateLimiter:
    """
    In-memory Sliding Window Rate Limiter for sensitive endpoints.
    Protects against brute force and automated spam without external dependencies.
    """

    def __init__(self):
        # key -> list of request timestamps (epoch seconds)
        self._requests: Dict[str, List[float]] = {}

    def is_rate_limited(
        self,
        key: str,
        max_requests: int = 10,
        window_seconds: int = 60
    ) -> bool:
        now = time.time()
        window_start = now - window_seconds

        # Retrieve existing timestamps or initialize
        timestamps = self._requests.get(key, [])

        # Filter out timestamps outside the sliding window
        valid_timestamps = [t for t in timestamps if t > window_start]

        if len(valid_timestamps) >= max_requests:
            self._requests[key] = valid_timestamps
            return True

        # Append current request timestamp
        valid_timestamps.append(now)
        self._requests[key] = valid_timestamps
        return False

    def reset(self, key: str = None):
        """Resets rate limit counter for a specific key or all keys (useful in tests)."""
        if key:
            self._requests.pop(key, None)
        else:
            self._requests.clear()


# Global rate limiter instance
limiter = SlidingWindowRateLimiter()


def rate_limit(max_requests: int = 10, window_seconds: int = 60):
    """
    FastAPI dependency for endpoint-level rate limiting.
    Identifies client by IP address or X-Forwarded-For header.
    """
    def dependency(request: Request):
        # Determine client identifier
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        elif request.client:
            client_ip = request.client.host
        else:
            client_ip = "127.0.0.1"

        endpoint_key = f"{client_ip}:{request.url.path}"

        if limiter.is_rate_limited(endpoint_key, max_requests=max_requests, window_seconds=window_seconds):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Rate limit of {max_requests} requests per {window_seconds}s exceeded. Please try again later.",
                headers={"Retry-After": str(window_seconds)},
            )
        return True

    return dependency
