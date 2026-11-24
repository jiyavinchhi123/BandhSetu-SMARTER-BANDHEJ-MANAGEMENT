from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.database.session import Base


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, default=1, nullable=False, index=True)
    item_name = Column(String(255), index=True, nullable=False)
    item_type = Column(String(100), nullable=True)  # suit, duppatta, saree, etc.
    is_sarkam = Column(Boolean, default=False, nullable=True)
    is_choot = Column(Boolean, default=False, nullable=True)
    item_code = Column(String(100), unique=True, index=True, nullable=True)
    price_per_piece = Column(Numeric(10, 2), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Concurrency control: Optimistic locking version
    version = Column(Integer, default=1, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    work_distributions = relationship("WorkDistribution", back_populates="item")

