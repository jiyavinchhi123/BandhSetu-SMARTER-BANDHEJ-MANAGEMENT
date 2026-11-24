import hashlib
import secrets
from datetime import datetime, timedelta
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.database.session import Base


class PasswordResetOTP(Base):
    """
    Tracks mobile OTP requests and reset tokens for password recovery.
    Enforces expiry (default 5 minutes), max attempts (5), and single-use reset tokens.
    """
    __tablename__ = "password_reset_otps"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(30), index=True, nullable=True)
    email = Column(String(255), index=True, nullable=True)
    channel = Column(String(20), default="email", nullable=False)  # "email" or "sms"
    user_id = Column(Integer, nullable=True, index=True)
    otp_hash = Column(String(128), nullable=False)
    reset_token = Column(String(128), unique=True, index=True, nullable=True)
    attempts = Column(Integer, default=0, nullable=False)
    max_attempts = Column(Integer, default=5, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    @staticmethod
    def hash_otp(identifier: str, otp: str) -> str:
        """Computes SHA-256 hash of OTP salted with the identifier (email or phone)."""
        clean_id = identifier.strip().lower()
        salt = f"bandhsetu_otp_{clean_id}"
        return hashlib.sha256(f"{salt}_{otp}".encode("utf-8")).hexdigest()

    def is_expired(self) -> bool:
        """Returns True if the OTP has exceeded its lifespan."""
        return datetime.utcnow() > self.expires_at

    def can_attempt(self) -> bool:
        """Returns True if remaining attempts exist and not expired."""
        return not self.is_expired() and self.attempts < self.max_attempts and not self.is_used
