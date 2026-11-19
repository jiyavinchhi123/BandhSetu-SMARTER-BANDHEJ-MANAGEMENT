# BandhSetu — REST API Documentation

This document describes all API endpoints provided by the **BandhSetu FastAPI Backend** (`/api/v1`).

---

## 1. Authentication & Security Headers

### Bearer Token Header
All protected endpoints require an `Authorization` header containing the JWT bearer token received upon successful login:

```http
Authorization: Bearer <your-access-token>
```

### Server-Side Manager Access Control
On every protected endpoint request made by a Manager:
1. `token_version` is validated. If the manager was locked or password changed, returns `401 Unauthorized`.
2. Current server time in **Asia/Kolkata (IST)** is compared against the Manager's configured access window (`09:00` to `20:00` by default).
3. If outside operating hours or manually locked by Admin, returns `403 Forbidden` with:
   ```json
   {
     "code": "ACCESS_HOURS_EXPIRED",
     "message": "Manager access hours (09:00 AM – 08:00 PM IST) have ended. Current time: 08:05 PM IST.",
     "server_time_ist": "19/11/2026, 08:05:00 PM IST",
     "role": "manager"
   }
   ```

### Rate Limiting
- `POST /api/v1/auth/login`: 10 requests per minute per IP.
- `POST /api/v1/auth/reset-password`: 5 requests per minute per IP.
- Exceeding the threshold returns `429 Too Many Requests` with a `Retry-After: 60` header.

---

## 2. API Endpoints Reference

### 2.1 Health & Diagnostics
- `GET /api/v1/health`
  - **Access**: Public
  - **Summary**: Returns backend operational status, version, and database connectivity.
  - **Response (200)**:
    ```json
    {
      "status": "healthy",
      "project": "BandhSetu — Smarter Bandhej Management API",
      "version": "1.0.0",
      "environment": "production",
      "timestamp_ist": "19/11/2026, 09:25:00 PM IST",
      "database": {
        "connected": true,
        "dialect": "postgresql",
        "message": "Database ping successful"
      }
    }
    ```

---

### 2.2 Authentication & User Profiles (`/api/v1/auth`)
- `POST /api/v1/auth/login`
  - **Access**: Public (Rate limited)
  - **Body**: `{"identifier": "admin@bandhej.com", "password": "Admin@123"}`
  - **Supports**: Email or Indian mobile number (+919876543210).
  - **Response (200)**: `access_token`, `role`, `user_id`, `full_name`, `server_time_ist`.

- `GET /api/v1/auth/me`
  - **Access**: Authenticated (Admin / Manager)
  - **Response (200)**: Full user profile including permissions and access schedule.

- `POST /api/v1/auth/logout`
  - **Access**: Authenticated
  - **Action**: Logs logout event in audit trail.

- `POST /api/v1/auth/reset-password`
  - **Access**: Public (Rate limited)
  - **Body**: `{"identifier": "...", "new_password": "..."}`
  - **Action**: Updates password and increments `token_version` to invalidate all active sessions.

---

### 2.3 Manager Access Control (`/api/v1/managers`)
*All endpoints in this group require Admin / Owner privileges.*

- `GET /api/v1/managers/`
  - **Summary**: Lists all manager accounts with status, lock state, and operating hours.

- `POST /api/v1/managers/`
  - **Body**: `{"email": "...", "phone": "...", "full_name": "...", "password": "...", "access_start_time": "09:00", "access_end_time": "20:00"}`
  - **Action**: Creates a manager account (strictly manager role).

- `POST /api/v1/managers/{manager_id}/lock`
  - **Body**: `{"reason": "Emergency lock"}`
  - **Action**: Sets `is_locked = true` and revokes all active sessions immediately.

- `POST /api/v1/managers/{manager_id}/unlock`
  - **Action**: Clears lock state, allowing the manager to resume logins during scheduled hours.

- `PUT /api/v1/managers/{manager_id}/timing`
  - **Body**: `{"access_start_time": "08:00", "access_end_time": "21:00"}`
  - **Action**: Adjusts scheduled operating hours in IST.

- `POST /api/v1/managers/{manager_id}/extend-hours`
  - **Body**: `{"additional_minutes": 60, "reason": "Overtime batch return"}`
  - **Action**: Sets temporary overtime extension past 20:00 IST.

- `GET /api/v1/managers/audit-logs`
  - **Summary**: Returns audit log stream of security, auth, and lock actions.

---

### 2.4 Worker Management (`/api/v1/workers`)
- `GET /api/v1/workers/?q={query}&status={status}&village={village}`
  - **Summary**: Dynamic search with partial string matching (e.g. typing "R" matches *Rekhaben*, *Ranjanben*).
  - **Response**: Array of artisan profiles with cached pending piece and payable balance totals.

- `POST /api/v1/workers/`
  - **Body**: `{"full_name": "...", "phone": "...", "town": "...", "city": "...", "village": "...", "remarks": "..."}`
  - **Action**: Registers artisan, auto-generates sequential non-reusable serial number (`WRK-xxxx`).

- `GET /api/v1/workers/{worker_id}`
  - **Summary**: Returns worker master profile and summary totals.

- `PUT /api/v1/workers/{worker_id}`
  - **Summary**: Updates artisan personal contact and location details.

---

### 2.5 Item Catalogue & Prices (`/api/v1/items`)
- `GET /api/v1/items/?q={query}&active_only=true`
  - **Summary**: Lists fabric items with current piece rates. Used by searchable dropdown in Give Work form.

- `POST /api/v1/items/` *(Admin Only)*
  - **Body**: `{"item_name": "...", "item_code": "...", "price_per_piece": 220.0, "description": "..."}`
  - **Action**: Adds a new fabric item to the catalogue.

- `PUT /api/v1/items/{item_id}` *(Admin Only)*
  - **Body**: `{"price_per_piece": 275.0}`
  - **Action**: Updates item rate. Past work distributions retain their historical snapshot rates.

---

### 2.6 Work Distribution & Material Management (`/api/v1/distributions`)
- `POST /api/v1/distributions/give-work`
  - **Summary**: Issues fabric consignment to artisan.
  - **Body**:
    ```json
    {
      "worker_id": 1,
      "item_id": 2,
      "quantity_issued": 10,
      "knot_style": "Ekdali Classic",
      "issue_date": "2026-11-19",
      "due_date": "2026-12-03",
      "remarks": "Standard consignment"
    }
    ```
  - **Action**: Creates `WorkDistribution`, snapshots rate permanently, posts Material Ledger DEBIT.

- `POST /api/v1/distributions/receive-work`
  - **Summary**: Receives completed work with quality check inspection.
  - **Body**:
    ```json
    {
      "distribution_id": 1,
      "quantity_returned": 8,
      "quantity_rejected": 2,
      "rejection_reason": "Broken Knots",
      "return_date": "2026-11-19",
      "remarks": "Quality checked"
    }
    ```
  - **Action**: Deducts pending pieces, accrues wages for accepted pieces only ($\text{₹0}$ for rejected), posts Material Credit & Money Credit.

- `GET /api/v1/distributions/pending/{worker_id}`
  - **Summary**: Returns all active consignments with pending pieces for an artisan.

- `GET /api/v1/distributions/ledger/{worker_id}`
  - **Summary**: Returns worker's Material Debit-Credit Ledger summary.

---

### 2.7 Wages, Advances & Money Ledger (`/api/v1/payments`)
- `POST /api/v1/payments/advance`
  - **Summary**: Records cash or UPI advance taken by artisan.
  - **Body**: `{"worker_id": 1, "amount": 300.0, "payment_mode": "Cash", "remarks": "Festival advance"}`
  - **Action**: Posts Money Ledger DEBIT, reduces worker's payable balance.

- `POST /api/v1/payments/payout`
  - **Summary**: Records wage disbursement or settlement payout.
  - **Body**: `{"worker_id": 1, "amount": 1000.0, "payment_mode": "Bank Transfer", "reference_no": "NEFT123"}`
  - **Action**: Prevents duplicates, posts Money Ledger DEBIT, reduces payable balance.

- `GET /api/v1/payments/ledger/{worker_id}`
  - **Summary**: Returns worker's full chronological Money Debit-Credit Ledger.

- `GET /api/v1/payments/statement/{worker_id}/csv`
  - **Summary**: Downloads artisan's individual financial statement in CSV format.

---

### 2.8 Business Analytics & Reports (`/api/v1/analytics`)
- `GET /api/v1/analytics/dashboard`
  - **Summary**: Returns real-time aggregate totals for the 10 KPI cards, 7-day trends, and recent 10 activity events.

- `GET /api/v1/analytics/reports?report_type={type}&date_preset={preset}&search_query={q}`
  - **Supported `report_type` values**:
    1. `worker-wise`
    2. `item-wise`
    3. `daily-distribution`
    4. `daily-returns`
    5. `pending-work`
    6. `daily-wages`
    7. `advances`
    8. `payments`
    9. `outstanding-balances`
    10. `monthly-summary`
  - **Supported `date_preset` values**: `today`, `yesterday`, `this_week`, `this_month`, `custom`.

- `GET /api/v1/analytics/reports/csv?report_type={type}&date_preset={preset}`
  - **Summary**: Exports selected report as formatted CSV spreadsheet with Content-Disposition attachment header.
