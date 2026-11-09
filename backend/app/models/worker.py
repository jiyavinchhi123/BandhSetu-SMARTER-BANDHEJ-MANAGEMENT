from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Text, Numeric, Date, DateTime
from sqlalchemy.orm import relationship
from app.database.session import Base


class Worker(Base):
    __tablename__ = "workers"

    id = Column(Integer, primary_key=True, index=True)
    serial_number = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(255), index=True, nullable=False)
    phone = Column(String(30), index=True, nullable=False)
    town = Column(String(100), index=True, nullable=False)
    city = Column(String(100), index=True, nullable=False)
    village = Column(String(100), index=True, nullable=False)
    joining_date = Column(Date, default=date.today, nullable=False)
    status = Column(String(20), default="Active", nullable=False)  # "Active", "Inactive"
    remarks = Column(Text, nullable=True)

    # Cached financial & operational counters for instant dashboard queries
    pending_pieces = Column(Integer, default=0, nullable=False)
    payable_balance = Column(Numeric(12, 2), default=0.00, nullable=False)
    total_earned = Column(Numeric(12, 2), default=0.00, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    work_distributions = relationship("WorkDistribution", back_populates="worker", cascade="all, delete-orphan")
    material_ledger_entries = relationship("MaterialLedgerEntry", back_populates="worker", cascade="all, delete-orphan")
    payments = relationship("PaymentRecord", back_populates="worker", cascade="all, delete-orphan")

