from fastapi import APIRouter
from app.api.v1.endpoints import health, auth, managers

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health & Diagnostics"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & Session"])
api_router.include_router(managers.router, prefix="/managers", tags=["Manager Access Control & Security"])
