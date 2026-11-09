import logging
from datetime import date
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
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
        # 1. Admin
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

        # 2. Manager
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

        # 3. Item Catalogue
        item_count = db.query(Item).count()
        if item_count == 0:
            logger.info("Seeding Item Catalogue...")
            sample_items = [
                Item(item_name="Pure Gajji Silk Saree - Bharti Knot", item_code="GAJ-BHR-01", price_per_piece=220.0, description="Heavy Gajji silk, dense traditional Bharti knotting", is_active=True),
                Item(item_name="Pure Georgette Saree - Ekdali Knot", item_code="GEO-EKD-01", price_per_piece=160.0, description="Lightweight 60g Georgette with fine single-dot knotting", is_active=True),
                Item(item_name="Modal Silk Dupatta - Shikari Work", item_code="MOD-SHK-02", price_per_piece=280.0, description="2.5m Modal silk with elephant & peacock Shikari motifs", is_active=True),
                Item(item_name="Cotton Bandhani Dress Material", item_code="COT-BDH-03", price_per_piece=130.0, description="Fine Mulmul cotton 3-piece suit fabric", is_active=True),
                Item(item_name="Chiffon Saree - Jaal All-Over", item_code="CHF-JAL-04", price_per_piece=350.0, description="Intricate all-over diamond jaal grid work", is_active=True),
                Item(item_name="Red Bridal Bandhej Gharchola", item_code="GHR-BRD-05", price_per_piece=480.0, description="Traditional auspicious wedding Gharchola with zari checks", is_active=True),
            ]
            db.add_all(sample_items)

        # 4. Workers
        worker_count = db.query(Worker).count()
        if worker_count == 0:
            logger.info("Seeding initial Artisan Workers...")
            sample_workers = [
                Worker(serial_number="WRK-0001", full_name="Kamlaben Vaghela", phone="+91 98250 12345", town="Anjar", city="Bhuj", village="Khavda", joining_date=date(2025, 4, 15), status="Active", remarks="Master artisan; expert in fine Shikari and Gharchola work", pending_pieces=45, payable_balance=9900.0, total_earned=48500.0),
                Worker(serial_number="WRK-0002", full_name="Santoshben Parmar", phone="+91 94280 67890", town="Mandvi", city="Bhuj", village="Madhapar", joining_date=date(2025, 6, 1), status="Active", remarks="Fast tyer; handles high volume Georgette Ekdali", pending_pieces=30, payable_balance=4800.0, total_earned=32000.0),
                Worker(serial_number="WRK-0003", full_name="Meenaben Solanki", phone="+91 99790 54321", town="Jamnagar Rural", city="Jamnagar", village="Dhamadka", joining_date=date(2025, 2, 10), status="Active", remarks="Specialist in intricate all-over Jaal work", pending_pieces=15, payable_balance=5250.0, total_earned=56000.0),
                Worker(serial_number="WRK-0004", full_name="Rekhaben Rathod", phone="+91 97120 98765", town="Mundra", city="Bhuj", village="Mundra", joining_date=date(2025, 8, 20), status="Active", remarks="Gajji silk specialist", pending_pieces=20, payable_balance=4400.0, total_earned=19800.0),
                Worker(serial_number="WRK-0005", full_name="Ranjanben Jadeja", phone="+91 98980 11223", town="Bhuj", city="Bhuj", village="Khavda", joining_date=date(2025, 9, 5), status="Active", remarks="Consistent tying tension and clean dot work", pending_pieces=25, payable_balance=5500.0, total_earned=22400.0),
                Worker(serial_number="WRK-0006", full_name="Rupalben Chauhan", phone="+91 94090 33445", town="Anjar", city="Gandhidham", village="Varsamedi", joining_date=date(2025, 11, 1), status="Active", remarks="New artisan in Varsamedi cluster", pending_pieces=10, payable_balance=1600.0, total_earned=6800.0),
            ]
            db.add_all(sample_workers)

        db.commit()
    except Exception as e:
        logger.error(f"Error seeding initial accounts and catalog: {e}")
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
