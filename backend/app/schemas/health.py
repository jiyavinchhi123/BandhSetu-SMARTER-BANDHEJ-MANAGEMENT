from pydantic import BaseModel, Field
from typing import Dict, Any


class HealthResponse(BaseModel):
    status: str = Field(..., example="healthy")
    project: str = Field(..., example="Bandhej Worker and Business Management API")
    version: str = Field(..., example="1.0.0")
    environment: str = Field(..., example="development")
    timestamp_ist: str = Field(..., example="09/11/2026, 08:45:00 PM IST")
    database: Dict[str, Any] = Field(
        ...,
        example={"connected": True, "dialect": "sqlite", "message": "Database query successful"}
    )
    details: Dict[str, Any] = Field(default_factory=dict)

