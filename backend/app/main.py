import logging
from datetime import date
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("==================================================")
    logger.info(f"Starting {settings.PROJECT_NAME} (v{settings.VERSION})")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info("Initializing database tables and seed records...")
    init_db_and_seed()
    logger.info("Database initialized successfully.")
    logger.info(f"Docs: /docs | Health: {settings.API_V1_STR}/health")
    logger.info("==================================================")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-ready FastAPI backend for Indian Bandhej Worker & Business Management with Worker Profiles, Item Catalogue & Historical Price Protection.",
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.DEBUG else None,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)

# CORS Middleware
origins = [str(origin).rstrip("/") for origin in settings.BACKEND_CORS_ORIGINS]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", include_in_schema=False)
def root():
    """Redirect root to OpenAPI docs if in debug mode, or health check."""
    if settings.DEBUG:
        return RedirectResponse(url="/docs")
    return {"status": "online", "project": settings.PROJECT_NAME}
