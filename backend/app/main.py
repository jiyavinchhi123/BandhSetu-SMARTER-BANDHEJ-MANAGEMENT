import logging
import time
import uuid
from datetime import date
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from starlette.responses import JSONResponse, RedirectResponse
from sqlalchemy import or_
from app.core.config import settings
from app.api.v1.api import api_router
from app.database.session import engine, SessionLocal, Base
from app.models.user import User
from app.models.worker import Worker
from app.models.item import Item
from app.models.work_distribution import WorkDistribution
from app.core.security import hash_password

# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("bandhej_api")


def init_db_and_seed():
    """Ensure database schema exists and seed default Admin, Manager, Items, and Workers if empty."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Primary Admin account (+91 9426927175 / admin@123)
        admin1 = db.query(User).filter(
            or_(User.phone == "+919426927175", User.email == "admin@bandhej.com")
        ).first()
        if not admin1:
            logger.info("Seeding initial Admin account...")
            admin1 = User(
                email="admin@bandhej.com",
                phone="+919426927175",
                full_name="Bhavna Mehta (Admin)",
                hashed_password=hash_password("admin@123"),
                role="admin",
                is_active=True,
                is_locked=False,
                access_start_time="00:00",
                access_end_time="23:59",
                token_version=1
            )
            db.add(admin1)

        # 2. Additional Admin account: Hetal Vinchhi (+91 9537335737 / admin@123)
        admin2 = db.query(User).filter(
            or_(User.phone == "+919537335737", User.email == "hetal@bandhej.com")
        ).first()
        if not admin2:
            logger.info("Seeding Admin account for Hetal Vinchhi...")
            admin2 = User(
                email="hetal@bandhej.com",
                phone="+919537335737",
                full_name="Hetal Vinchhi",
                hashed_password=hash_password("admin@123"),
                role="admin",
                is_active=True,
                is_locked=False,
                access_start_time="00:00",
                access_end_time="23:59",
                token_version=1
            )
            db.add(admin2)
        else:
            admin2.role = "admin"
            admin2.full_name = "Hetal Vinchhi"
            admin2.phone = "+919537335737"
            admin2.hashed_password = hash_password("admin@123")
            admin2.is_active = True
            admin2.is_locked = False

        # 3. Clean up sample manager Rajesh Patel if present
        legacy_mgr = db.query(User).filter(User.email == "manager@bandhej.com").first()
        if legacy_mgr:
            db.delete(legacy_mgr)

        # 4. Registered Manager account: Jiya Vinchhi (jiya.vinchhi2412@gmail.com / +919426927907)
        manager = db.query(User).filter(
            or_(
                User.email == "jiya.vinchhi2412@gmail.com",
                User.phone == "+919426927907",
                User.full_name == "Jiya Vinchhi"
            )
        ).first()
        if not manager:
            logger.info("Restoring registered Manager account for Jiya Vinchhi...")
            manager = User(
                email="jiya.vinchhi2412@gmail.com",
                phone="+919426927907",
                full_name="Jiya Vinchhi",
                hashed_password=hash_password("admin@123"),
                role="manager",
                is_active=True,
                is_locked=False,
                access_start_time=settings.DEFAULT_MANAGER_START_TIME,
                access_end_time=settings.DEFAULT_MANAGER_END_TIME,
                token_version=1
            )
            db.add(manager)
        else:
            manager.role = "manager"
            manager.full_name = "Jiya Vinchhi"
            manager.email = "jiya.vinchhi2412@gmail.com"
            manager.phone = "+919426927907"
            manager.is_active = True
            manager.is_locked = False
            manager.lock_reason = None

        db.commit()
    except Exception as e:
        logger.error(f"Error seeding initial accounts: {e}")
        db.rollback()
    finally:
        db.close()


from app.database.indexes import ensure_database_indexes
from app.services.backup_scheduler import start_backup_scheduler, stop_backup_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("==================================================")
    logger.info(f"Starting {settings.PROJECT_NAME} (v{settings.VERSION})")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info("Initializing database tables and seed records...")
    init_db_and_seed()
    
    # 1. Apply high-performance composite indexes
    try:
        applied_indexes = ensure_database_indexes(engine)
        logger.info(f"Verified {applied_indexes} performance database indexes.")
    except Exception as ie:
        logger.warning(f"Index initialization notice: {ie}")

    # 2. Launch automated encrypted backup scheduler
    try:
        start_backup_scheduler()
        logger.info("Automated daily encrypted backup scheduler active.")
    except Exception as be:
        logger.warning(f"Backup scheduler notice: {be}")

    logger.info("Database initialized successfully.")
    logger.info(f"Docs: /docs | Health: {settings.API_V1_STR}/health")
    logger.info("==================================================")
    yield
    stop_backup_scheduler()




app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-ready FastAPI backend for Indian Bandhej Worker & Business Management with Worker Profiles, Item Catalogue & Historical Price Protection.",
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.DEBUG else None,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)

# GZip Compression Middleware (Compresses responses >= 500 bytes by up to 80%)
app.add_middleware(GZipMiddleware, minimum_size=500)

# CORS Middleware
origins = [str(origin).rstrip("/") for origin in settings.BACKEND_CORS_ORIGINS]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def performance_and_fault_tolerance_middleware(request: Request, call_next):
    """
    Measures sub-millisecond execution latency, stamps distributed tracing Request-IDs,
    and catches unhandled server exceptions to prevent container crashes and memory leaks.
    """
    request_id = str(uuid.uuid4())[:8]
    start_time = time.perf_counter()
    try:
        response = await call_next(request)
        process_time_ms = (time.perf_counter() - start_time) * 1000.0
        response.headers["X-Process-Time"] = f"{process_time_ms:.2f}ms"
        response.headers["X-Request-ID"] = request_id
        return response
    except Exception as exc:
        process_time_ms = (time.perf_counter() - start_time) * 1000.0
        logger.error(
            f"[Req {request_id}] Unhandled error on {request.method} {request.url.path}: {exc}",
            exc_info=True
        )
        return JSONResponse(
            status_code=500,
            content={
                "detail": "An internal server error occurred. Automatic recovery logged this event.",
                "request_id": request_id,
            },
            headers={
                "X-Process-Time": f"{process_time_ms:.2f}ms",
                "X-Request-ID": request_id,
            }
        )

# Include API v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", include_in_schema=False)
def root():
    """Redirect root to OpenAPI docs if in debug mode, or health check."""
    if settings.DEBUG:
        return RedirectResponse(url="/docs")
    return {"status": "online", "project": settings.PROJECT_NAME}
