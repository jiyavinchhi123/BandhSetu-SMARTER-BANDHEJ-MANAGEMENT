from fastapi import APIRouter
from app.api.v1.endpoints import health, auth, managers, workers, items, distributions, payments, analytics, company

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health & Diagnostics"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & Session"])
api_router.include_router(company.router, prefix="/company", tags=["Company Settings & Admin Authorization"])
api_router.include_router(managers.router, prefix="/managers", tags=["Manager Access Control & Security"])
api_router.include_router(workers.router, prefix="/workers", tags=["Worker & Artisan Management"])
api_router.include_router(items.router, prefix="/items", tags=["Item Catalogue & Price Management"])
api_router.include_router(distributions.router, prefix="/distributions", tags=["Work Distribution & Material Management"])
api_router.include_router(payments.router, prefix="/payments", tags=["Wages, Advances & Money Ledger"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Dashboard Analytics & Reports"])
