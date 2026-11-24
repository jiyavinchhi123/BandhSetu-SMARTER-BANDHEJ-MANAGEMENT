from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Text, Numeric, Date, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base


class MoneyTransaction(Base):
    __tablename__ = "money_transactions"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, default=1, nullable=False, index=True)
    transaction_code = Column(String(50), unique=True, index=True, nullable=False)  # FIN-YYYYMMDD-XXXX
    worker_id = Column(Integer, ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True)
    distribution_id = Column(Integer, ForeignKey("work_distributions.id", ondelete="SET NULL"), nullable=True)
    return_id = Column(Integer, ForeignKey("work_returns.id", ondelete="SET NULL"), nullable=True)
    payment_record_id = Column(Integer, ForeignKey("payment_records.id", ondelete="SET NULL"), nullable=True)

    transaction_date = Column(Date, default=date.today, nullable=False)
    transaction_type = Column(String(50), nullable=False)  # "WORK_EARNING", "ADVANCE_GIVEN", "WAGE_PAYOUT", "BONUS_CREDIT", "CORRECTION_REVERSAL"
    description = Column(String(255), nullable=False)

    # Worker-Account Perspective:
    # CREDIT = Work earned, approved wage adjustments (+ to worker's balance)
    # DEBIT = Advances taken, wage payments made (- from worker's balance)
    credit_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    debit_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    running_balance = Column(Numeric(12, 2), default=0.00, nullable=False)

    payment_mode = Column(String(50), nullable=True)  # "Cash", "UPI", "Bank Transfer", "Other"
    reference_no = Column(String(100), nullable=True)

    recorded_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    recorded_by_name = Column(String(100), default="Admin", nullable=False)
    remarks = Column(Text, nullable=True)

    # Reversal / Correction tracking (Never permanently delete)
    is_reversed = Column(Boolean, default=False, nullable=False)
    reversal_reason = Column(Text, nullable=True)
    reversal_ref_code = Column(String(50), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    worker = relationship("Worker", back_populates="money_transactions")
