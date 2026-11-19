# BandhSetu — Local Development Setup Guide

This guide details how to set up, run, test, and develop the **BandhSetu** application locally on Windows, macOS, or Linux using either local SQLite (default zero-config) or a Supabase/PostgreSQL development database.

---

## 1. Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **Python**: v3.11, v3.12, v3.13, or v3.14 ([Download Python](https://python.org/))
- **Git**: Latest version ([Download Git](https://git-scm.com/))
- **PowerShell** (Windows) or **Bash** (macOS/Linux)

---

## 2. Repository Setup

Clone the repository and navigate into the workspace:

```bash
git clone https://github.com/jiyavinchhi123/BandhSetu-SMARTER-BANDHEJ-MANAGEMENT.git
cd BandhSetu-SMARTER-BANDHEJ-MANAGEMENT
```

---

## 3. Backend Setup (FastAPI & Python)

### Step 3.1: Create & Activate Virtual Environment

**On Windows (PowerShell):**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
```

**On macOS / Linux:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

### Step 3.2: Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 3.3: Configure Environment Variables

Copy the example environment file:

**On Windows:**
```powershell
Copy-Item .env.example .env
```

**On macOS / Linux:**
```bash
cp .env.example .env
```

For local development with zero-config SQLite, the default `.env` is pre-configured:
```env
APP_ENV=development
DEBUG=True
DATABASE_URL=sqlite:///./bandhej_dev.db
TIMEZONE=Asia/Kolkata
DEFAULT_MANAGER_START_TIME=09:00
DEFAULT_MANAGER_END_TIME=20:00
```

### Step 3.4: Run Database Migrations

Run Alembic migrations to create tables and schema:
```bash
alembic upgrade head
```

### Step 3.5: Start the FastAPI Server

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- **Interactive API Docs (Swagger)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Alternative Docs (ReDoc)**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Health Check**: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)

---

## 4. Frontend Setup (React, Vite & Tailwind CSS)

Open a **new terminal tab or window**:

### Step 4.1: Install Node Dependencies

```bash
cd frontend
npm install
```

### Step 4.2: Configure Environment Variables

Copy the frontend environment template:

**On Windows:**
```powershell
Copy-Item .env.example .env
```

**On macOS / Linux:**
```bash
cp .env.example .env
```

Ensure `frontend/.env` points to your local backend:
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_APP_ENV=development
```

### Step 4.3: Start Vite Dev Server

```bash
npm run dev
```

- **Web Application URL**: [http://localhost:5173](http://localhost:5173)

---

## 5. Default Demonstration Credentials

When first launched, the database automatically seeds with default test credentials:

| Account Type | Email | Mobile Number | Password | Operating Window |
|---|---|---|---|---|
| **Admin / Owner** | `admin@bandhej.com` | `+919876543210` | `Admin@123` | **24/7 Unrestricted** |
| **Workshop Manager** | `manager@bandhej.com` | `+919876543211` | `Manager@123` | **09:00 AM – 08:00 PM IST** |

> **Important**: Women artisans who tie Bandhej **do not have logins**. Their profiles, consignments, and wage debits/credits are managed by Admin and Managers.

---

## 6. Connecting Localhost to a Supabase Development Database

If you wish to test with Supabase PostgreSQL locally instead of SQLite:

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **Project Settings** $\to$ **Database** $\to$ **Connection string** (URI).
3. Copy the URI (use Session or Transaction mode pooler on port 6543 or direct port 5432).
4. Update `backend/.env`:
   ```env
   DATABASE_URL=postgresql://postgres.[project-ref]:[db-password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   SUPABASE_URL=https://[project-ref].supabase.co
   SUPABASE_ANON_KEY=[your-anon-key]
   SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
   ```
5. Apply database migrations to Supabase:
   ```bash
   alembic upgrade head
   ```
   Or execute `backend/scripts/supabase_setup.sql` in the Supabase **SQL Editor**.

---

## 7. Running Verification Test Suites

To verify end-to-end business integrity locally, run the automated test suites from the repository root:

```bash
# Run Step 7 Master Verification (14 tests: auth, pricing, QC, ledgers, rate limiting)
$env:PYTHONPATH="backend"; .\backend\venv\Scripts\python.exe -u backend\tests\test_master_e2e_verification.py

# Run Analytics & Reporting Tests (Dashboard 10 KPI cards + 10 reports)
$env:PYTHONPATH="backend"; .\backend\venv\Scripts\python.exe -u backend\tests\test_analytics_and_reports.py

# Run Authentication & Manager Operating Hours Tests (10 tests)
$env:PYTHONPATH="backend"; .\backend\venv\Scripts\python.exe -u backend\tests\run_security_tests.py

# Run Frontend TypeScript & Production Build Verification
cd frontend
npm run build
```

---

## 8. Database Backup Verification

To take a local database snapshot and verify integrity:

```bash
python backend/scripts/backup_db.py
```
Snapshots are saved to `backend/backups/bandhsetu_backup_YYYYMMDD_HHMMSS.db`.
