from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Text, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base


class PaymentRecord(Base):
    __tablename__ = "payment_records"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True)
    distribution_id = Column(Integer, ForeignKey("work_distributions.id", ondelete="SET NULL"), nullable=True)

    payment_type = Column(String(50), nullable=False)  # "Wage Payout", "Advance Given", "Incentive Bonus", "Penalty Deduction"
    amount = Column(Numeric(12, 2), nullable=False)
    payment_mode = Column(String(50), default="Cash", nullable=False)  # "Cash", "Bank Transfer", "UPI"
    reference_no = Column(String(100), nullable=True)
    disbursed_by_name = Column(String(100), default="Admin", nullable=False)
    payment_date = Column(Date, default=date.today, nullable=False)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    worker = relationship("Worker", back_populates="payments")

