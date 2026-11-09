import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from app.core.config import settings
from app.api.v1.api import api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("bandhej_api")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-ready FastAPI backend for Indian Bandhej Worker & Business Management.",
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.DEBUG else None,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
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


@app.on_event("startup")
async def startup_event():
    logger.info("==================================================")
    logger.info(f"Starting {settings.PROJECT_NAME} (v{settings.VERSION})")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Docs available at: /docs")
    logger.info(f"Health check endpoint: {settings.API_V1_STR}/health")
    logger.info("==================================================")

