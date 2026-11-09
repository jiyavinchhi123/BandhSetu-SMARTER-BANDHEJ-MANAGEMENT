from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database.session import get_db, engine
from app.core.config import settings
from app.schemas.health import HealthResponse
from app.utils.formatters import format_ist_datetime

router = APIRouter()


@router.get("/health", response_model=HealthResponse, summary="System Health & Diagnostic Check")
def health_check(db: Session = Depends(get_db)):
    """
    Returns system status, active database dialect connectivity,
    server time in Indian Standard Time (IST), and active environment.
    """
    db_status = {
        "connected": False,
        "dialect": engine.dialect.name,
        "message": "Unchecked"
    }

    try:
        # Perform lightweight DB ping
        db.execute(text("SELECT 1"))
        db_status["connected"] = True
        db_status["message"] = "Database connection verified successfully"
    except Exception as exc:
        db_status["connected"] = False
        db_status["message"] = f"Database check warning: {str(exc)}"

    return HealthResponse(
        status="healthy" if db_status["connected"] else "degraded",
        project=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        timestamp_ist=format_ist_datetime(),
        database=db_status,
        details={
            "timezone": settings.TIMEZONE,
            "currency": settings.DEFAULT_CURRENCY,
            "docs_url": "/docs" if settings.DEBUG else None,
        }
    )

