from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Text, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base


class WorkReturn(Base):
    __tablename__ = "work_returns"

    id = Column(Integer, primary_key=True, index=True)
    return_code = Column(String(50), unique=True, index=True, nullable=False)  # RET-YYYYMMDD-XXXX
    distribution_id = Column(Integer, ForeignKey("work_distributions.id", ondelete="CASCADE"), nullable=False, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="SET NULL"), nullable=True)

    # Snapshots
    item_name_snapshot = Column(String(255), nullable=False)
    rate_per_piece_snapshot = Column(Numeric(10, 2), nullable=False)

    quantity_returned = Column(Integer, default=0, nullable=False)  # Accepted pieces
    quantity_rejected = Column(Integer, default=0, nullable=False)  # Defective / rejected pieces
    rejection_reason = Column(String(100), nullable=True)  # e.g., "Broken Knots", "Fabric Torn", "Uneven Knots"
    rejection_remarks = Column(Text, nullable=True)

    completed_work_value = Column(Numeric(12, 2), default=0.00, nullable=False)  # quantity_returned * rate_per_piece_snapshot
    return_date = Column(Date, default=date.today, nullable=False)

    recorded_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    recorded_by_name = Column(String(100), nullable=True)
    remarks = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    distribution = relationship("WorkDistribution", back_populates="returns")
    worker = relationship("Worker", back_populates="work_returns")

