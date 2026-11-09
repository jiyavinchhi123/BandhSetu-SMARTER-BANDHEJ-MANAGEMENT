from fastapi import APIRouter
from app.api.v1.endpoints import health, auth, managers, workers, items

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health & Diagnostics"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & Session"])
api_router.include_router(managers.router, prefix="/managers", tags=["Manager Access Control & Security"])
api_router.include_router(workers.router, prefix="/workers", tags=["Worker & Artisan Management"])
api_router.include_router(items.router, prefix="/items", tags=["Item Catalogue & Price Management"])
