from pydantic import BaseModel, Field
from typing import Dict, Any


class HealthResponse(BaseModel):
    status: str = Field(..., json_schema_extra={"example": "healthy"})
    project: str = Field(..., json_schema_extra={"example": "Bandhej Worker and Business Management API"})
    version: str = Field(..., json_schema_extra={"example": "1.0.0"})
    environment: str = Field(..., json_schema_extra={"example": "development"})
    timestamp_ist: str = Field(..., json_schema_extra={"example": "09/11/2026, 08:45:00 PM IST"})
    database: Dict[str, Any] = Field(
        ...,
        json_schema_extra={"example": {"connected": True, "dialect": "sqlite", "message": "Database connection verified successfully"}}
    )
    details: Dict[str, Any] = Field(default_factory=dict)
