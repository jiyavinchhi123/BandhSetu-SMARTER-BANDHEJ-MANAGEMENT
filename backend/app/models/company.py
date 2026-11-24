from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
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
    status = Column(String(20), default="Active", nullable=False)  # "Active", "Suspended"

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
