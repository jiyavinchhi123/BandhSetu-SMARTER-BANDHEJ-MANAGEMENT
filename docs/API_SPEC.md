# FastAPI REST API Specification

## Base URL
- **Local Development**: `http://localhost:8000/api/v1`
- **Interactive Documentation (Swagger)**: `http://localhost:8000/docs`
- **Alternative Documentation (ReDoc)**: `http://localhost:8000/redoc`

---

## 1. System Health & Diagnostics

### `GET /api/v1/health`
Performs a comprehensive diagnostic of backend services, database connection ping, and system time in Indian Standard Time (IST).

#### Response (200 OK)
```json
{
  "status": "healthy",
  "project": "Bandhej Worker and Business Management API",
  "version": "1.0.0",
  "environment": "development",
  "timestamp_ist": "09/11/2026, 09:00:15 PM IST",
  "database": {
    "connected": true,
    "dialect": "sqlite",
    "message": "Database connection verified successfully"
  },
  "details": {
    "timezone": "Asia/Kolkata",
    "currency": "INR",
    "docs_url": "/docs"
  }
}
```

---

## 2. Business Services Module
The backend includes `app.services.calculation_service.BandhejCalculationService`:
- `calculate_worker_wage(piece_rate, quantity, deductions, bonus)`: High-precision Decimal calculation for piece rates and net payouts.
- `calculate_material_wastage(issued_weight_kg, returned_weight_kg, allowed_wastage_percent)`: Fabric weight loss auditing with threshold breach alerts.

