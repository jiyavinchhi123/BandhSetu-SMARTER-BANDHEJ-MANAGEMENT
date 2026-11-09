from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Text, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base


class MaterialLedgerEntry(Base):
    __tablename__ = "material_ledger_entries"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True)
    lot_number = Column(String(50), nullable=True, index=True)
    material_type = Column(String(100), nullable=False)  # e.g., "Gajji Silk Saree Fabric", "White Cotton Voile", "Nylon Tying Thread"
    issued_qty = Column(Numeric(10, 2), nullable=False)
    returned_qty = Column(Numeric(10, 2), default=0.00, nullable=False)
    unit = Column(String(20), default="pieces", nullable=False)  # "pieces", "kg", "meters", "cones"

    issue_date = Column(Date, default=date.today, nullable=False)
    return_date = Column(Date, nullable=True)
    status = Column(String(50), default="With Worker", nullable=False)  # "With Worker", "Returned", "Reconciled"
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    worker = relationship("Worker", back_populates="material_ledger_entries")

