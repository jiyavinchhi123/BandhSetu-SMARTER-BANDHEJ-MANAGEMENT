from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from app.database.session import Base


class Company(Base):
    """
    Multi-Tenant Business / Company Entity.
    Each company operates with complete operational and data isolation:
    separate artisans, items, consignments, returns, ledgers, managers, and admins.
    """
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. "COMP-0001"
    name = Column(String(255), unique=True, index=True, nullable=False)  # e.g. "Vinchhi Bandhej"
    legal_name = Column(String(255), nullable=True)
    owner_admin_id = Column(Integer, nullable=True)  # Primary Admin User ID

    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), default="Gujarat", nullable=True)
    phone = Column(String(30), nullable=True)
    email = Column(String(255), nullable=True)
    gst_number = Column(String(50), nullable=True)

    # Status & Suspension (blocks access while preserving 100% of data)
    status = Column(String(20), default="Active", nullable=False)  # "Active", "Suspended", "Deleted"
    suspension_reason = Column(Text, nullable=True)
    suspended_at = Column(DateTime, nullable=True)
    suspended_by_id = Column(Integer, nullable=True)

    # Operational rules and business hours (per company)
    operating_hours_start = Column(String(10), default="08:00", nullable=False)
    operating_hours_end = Column(String(10), default="20:00", nullable=False)
    operating_days = Column(String(100), default="Mon,Tue,Wed,Thu,Fri,Sat", nullable=False)
    allow_manager_weekend_access = Column(Boolean, default=False, nullable=False)
    timezone = Column(String(50), default="Asia/Kolkata", nullable=False)

    # Strong confirmation deletion audit
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by_id = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
