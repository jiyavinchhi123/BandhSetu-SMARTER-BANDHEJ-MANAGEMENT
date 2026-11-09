import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from app.core.config import settings
from app.api.v1.api import api_router
from app.database.session import engine, SessionLocal, Base
from app.models.user import User
from app.core.security import hash_password

# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("bandhej_api")


def init_db_and_seed():
    """Ensure database schema exists and seed default Admin & Manager if empty."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check if Admin exists
        admin = db.query(User).filter(User.role == "admin").first()
        if not admin:
            logger.info("Seeding initial Admin / Owner account...")
            admin = User(
                email="admin@bandhej.com",
                phone="+919876543210",
                full_name="Bhavna Mehta (Owner)",
                hashed_password=hash_password("Admin@123"),
                role="admin",
                is_active=True,
                is_locked=False,
                access_start_time="00:00",
                access_end_time="23:59",
                token_version=1
            )
            db.add(admin)

        # Check if Manager exists
        manager = db.query(User).filter(User.role == "manager").first()
        if not manager:
            logger.info("Seeding initial Manager account...")
            manager = User(
                email="manager@bandhej.com",
                phone="+919876543211",
                full_name="Rajesh Patel (Manager)",
                hashed_password=hash_password("Manager@123"),
                role="manager",
                is_active=True,
                is_locked=False,
                access_start_time=settings.DEFAULT_MANAGER_START_TIME,
                access_end_time=settings.DEFAULT_MANAGER_END_TIME,
                token_version=1
            )
            db.add(manager)

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
    logger.info("Initializing database tables and seed accounts...")
    init_db_and_seed()
    logger.info("Database initialized successfully.")
    logger.info(f"Docs: /docs | Health: {settings.API_V1_STR}/health")
    logger.info("==================================================")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-ready FastAPI backend for Indian Bandhej Worker & Business Management with Role-Based Access Control and IST Time Enforcement.",
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
