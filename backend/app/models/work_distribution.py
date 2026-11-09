from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Text, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base


class WorkDistribution(Base):
    __tablename__ = "work_distributions"

    id = Column(Integer, primary_key=True, index=True)
    batch_code = Column(String(50), index=True, nullable=False)
    worker_id = Column(Integer, ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="SET NULL"), nullable=True, index=True)

    # Historical price and item name snapshot (immutable even if catalog item price changes)
    item_name_snapshot = Column(String(255), nullable=False)
    item_code_snapshot = Column(String(100), nullable=True)
    rate_per_piece = Column(Numeric(10, 2), nullable=False)  # Immutable snapshot rate

    knot_style = Column(String(100), nullable=False)  # e.g., "Ekdali", "Shikari", "Jaal", "Bharti"
    quantity_issued = Column(Integer, nullable=False)
    quantity_returned = Column(Integer, default=0, nullable=False)
    quantity_pending = Column(Integer, nullable=False)

    total_gross_wage = Column(Numeric(12, 2), nullable=False)  # rate_per_piece * quantity_issued
    deductions = Column(Numeric(10, 2), default=0.00, nullable=False)
    bonus = Column(Numeric(10, 2), default=0.00, nullable=False)
    net_payable = Column(Numeric(12, 2), nullable=False)

    issue_date = Column(Date, default=date.today, nullable=False)
    due_date = Column(Date, nullable=False)
    return_date = Column(Date, nullable=True)

    status = Column(String(50), default="Issued", nullable=False)  # "Issued", "In Progress", "Partially Returned", "Completed", "Cancelled"
    qc_remarks = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    worker = relationship("Worker", back_populates="work_distributions")
    item = relationship("Item", back_populates="work_distributions")

