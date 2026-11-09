from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ItemBase(BaseModel):
    item_name: str = Field(..., min_length=2, description="Item Name", json_schema_extra={"example": "Pure Gajji Silk Saree - Bharti Knot"})
    item_code: Optional[str] = Field(default=None, description="Item Code", json_schema_extra={"example": "GAJ-BHR-01"})
    price_per_piece: float = Field(..., gt=0, description="Standard Price per piece in INR", json_schema_extra={"example": 220.0})
    description: Optional[str] = Field(default=None, description="Specifications & design details")
    is_active: bool = Field(default=True)


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    item_name: Optional[str] = None
    item_code: Optional[str] = None
    price_per_piece: Optional[float] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ItemResponse(ItemBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
