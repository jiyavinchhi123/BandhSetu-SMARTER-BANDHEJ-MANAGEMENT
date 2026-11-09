# Local Developer Setup Guide

This guide outlines instructions to set up and run both the Frontend and Backend services locally.

---

## Prerequisites
- **Node.js**: v18.x or v20+ (Verified on Node v24)
- **Python**: v3.10+ (Verified on Python 3.14)
- **Git**

---

## 1. Backend Setup (FastAPI)

### Step 1.1: Navigate and create virtual environment
```powershell
cd backend
python -m venv venv
```

### Step 1.2: Activate virtual environment
- **Windows (PowerShell)**:
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
- **Windows (CMD)**:
  ```cmd
  venv\Scripts\activate.bat
  ```
- **macOS / Linux**:
  ```bash
  source venv/bin/activate
  ```

### Step 1.3: Install Python dependencies
```powershell
pip install -r requirements.txt
```

### Step 1.4: Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```
*(Default values work immediately with local SQLite fallback for diagnostics)*.

### Step 1.5: Start FastAPI Backend Server
```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- **Health check URL**: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)
- **Interactive OpenAPI Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 2. Frontend Setup (React + Vite + TypeScript)

### Step 2.1: Open a second terminal and navigate to frontend
```powershell
cd frontend
```

### Step 2.2: Install NPM packages
```powershell
npm install
```

### Step 2.3: Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```
Ensure `VITE_API_BASE_URL` points to `http://localhost:8000/api/v1`.

### Step 2.4: Start Vite Development Server
```powershell
npm run dev
```

- **Frontend URL**: [http://localhost:5173](http://localhost:5173)

---

## 3. Database Migrations (Alembic)
Once your Supabase PostgreSQL connection string is set in `backend/.env`:
```powershell
cd backend
alembic upgrade head
```

