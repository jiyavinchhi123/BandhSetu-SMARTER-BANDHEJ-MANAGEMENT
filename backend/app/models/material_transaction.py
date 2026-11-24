from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Text, Numeric, Date, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base


class MaterialTransaction(Base):
    __tablename__ = "material_transactions"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, default=1, nullable=False, index=True)
    transaction_code = Column(String(50), unique=True, index=True, nullable=False)  # MTXN-YYYYMMDD-XXXX
    worker_id = Column(Integer, ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True)
    distribution_id = Column(Integer, ForeignKey("work_distributions.id", ondelete="SET NULL"), nullable=True, index=True)
    return_id = Column(Integer, ForeignKey("work_returns.id", ondelete="SET NULL"), nullable=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="SET NULL"), nullable=True)

    item_name = Column(String(255), nullable=False)
    item_code = Column(String(100), nullable=True)

    transaction_date = Column(Date, default=date.today, nullable=False)
    transaction_type = Column(String(50), nullable=False)  # "DEBIT_GIVEN", "CREDIT_RECEIVED", "REJECTED_RETURNED", "LEDGER_CORRECTION"

    # Worker-Account Perspective:
    # DEBIT: Material Given to Worker = Debit quantity
    # CREDIT: Material Received from Worker = Credit quantity
    debit_qty = Column(Integer, default=0, nullable=False)
    credit_qty = Column(Integer, default=0, nullable=False)
    rejected_qty = Column(Integer, default=0, nullable=False)

    rate_per_piece = Column(Numeric(10, 2), default=0.00, nullable=False)
    total_value = Column(Numeric(12, 2), default=0.00, nullable=False)
    running_balance = Column(Integer, default=0, nullable=False)  # Worker's net pending pieces after this txn

    recorded_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    recorded_by_name = Column(String(100), nullable=True)
    remarks = Column(Text, nullable=True)

    # Reversal / Correction tracking (Never permanently delete)
    is_reversed = Column(Boolean, default=False, nullable=False)
    reversal_reason = Column(Text, nullable=True)
    reversal_ref_code = Column(String(50), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    worker = relationship("Worker", back_populates="material_transactions")

