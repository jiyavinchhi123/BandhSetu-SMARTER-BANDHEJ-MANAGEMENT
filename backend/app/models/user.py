from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.database.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(30), unique=True, index=True, nullable=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="manager")  # "admin" or "manager"

    # Account status controls (Admin managed)
    is_active = Column(Boolean, default=True, nullable=False)
    is_locked = Column(Boolean, default=False, nullable=False)
    lock_reason = Column(String(255), nullable=True)
    locked_at = Column(DateTime, nullable=True)

    # Manager operational timings in IST (24-hour HH:MM format)
    access_start_time = Column(String(10), default="09:00", nullable=False)
    access_end_time = Column(String(10), default="20:00", nullable=False)
    temporary_extension_until = Column(DateTime, nullable=True)

    # Invalidation & session tracking
    token_version = Column(Integer, default=1, nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    last_login_ip = Column(String(60), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def is_admin(self) -> bool:
        return self.role == "admin"

    def is_manager(self) -> bool:
        return self.role == "manager"
