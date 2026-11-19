# BandhSetu — Cloud Deployment & Production Setup Guide

This guide provides step-by-step instructions for deploying **BandhSetu** to production:
1. **Database & Auth**: Supabase PostgreSQL Cloud
2. **Backend API**: Render Web Service (FastAPI)
3. **Frontend Application**: Vercel Cloud (React + Vite SPA)

```mermaid
flowchart LR
    ArtisanClient["Browser / Mobile Client (Vercel)"] -->|HTTPS REST API| RenderAPI["FastAPI Backend (Render)"]
    RenderAPI -->|Connection Pooler (SSL)| SupabaseDB[("PostgreSQL Database (Supabase)")]
    RenderAPI -->|Audit & RLS Rules| SupabaseDB
```

---

## 1. Supabase Production Database Setup

### Step 1.1: Create Project
1. Log in to [supabase.com](https://supabase.com) and click **New Project**.
2. **Name**: `BandhSetu-Production`
3. **Database Password**: Choose a strong generated password (store safely).
4. **Region**: `ap-south-1` (Mumbai / India) — lowest latency for Gujarat.
5. Click **Create new project**.

### Step 1.2: Apply Production DDL Schema
1. Open the **SQL Editor** in the left sidebar of the Supabase dashboard.
2. Open [`backend/scripts/supabase_setup.sql`](file:///c:/Users/jiyav/Desktop/Bandhani/backend/scripts/supabase_setup.sql) from this repository.
3. Paste the contents into the SQL Editor and click **Run**.
4. This script sets up:
   - All 9 core relational tables (`users`, `workers`, `items`, `work_distributions`, `work_returns`, `material_transactions`, `money_transactions`, `payment_records`, `audit_logs`).
   - Foreign key constraints, cascading deletes, and unique indexes.
   - Row Level Security (RLS) policies.
   - Initial Admin (`admin@bandhej.com`) and Manager (`manager@bandhej.com`) seed accounts.

### Step 1.3: Retrieve Connection Credentials
1. Go to **Project Settings** $\to$ **Database**.
2. Under **Connection string**, select **URI**.
3. Select **Mode: Transaction** (port `6543`) or **Mode: Session** (port `5432`).
4. Copy the URI. It will look like:
   ```
   postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```
5. Go to **Project Settings** $\to$ **API**:
   - Copy **Project URL** (`https://[YOUR-PROJECT-REF].supabase.co`).
   - Copy **anon / public key**.
   - Copy **service_role key** (Secret).

---

## 2. Backend Deployment to Render

Render hosts the Python FastAPI application with automatic HTTPS, zero-downtime deploys, health checks, and managed environment variables.

### Option A: Using Render Blueprint (Recommended)
1. Push your repository to GitHub.
2. In [render.com](https://render.com), go to **Blueprints** $\to$ **New Blueprint Instance**.
3. Select your repository `jiyavinchhi123/BandhSetu-SMARTER-BANDHEJ-MANAGEMENT`.
4. Render will detect [`render.yaml`](file:///c:/Users/jiyav/Desktop/Bandhani/render.yaml) automatically.
5. Enter the required secrets when prompted:
   - `DATABASE_URL`: Your Supabase PostgreSQL URI.
   - `CORS_ORIGINS`: `["https://bandhsetu.vercel.app"]` (or your Vercel production domain).
   - `SUPABASE_URL`: Your Supabase Project URL.
   - `SUPABASE_ANON_KEY`: Your Supabase Anon Key.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key.
6. Click **Apply**.

### Option B: Manual Web Service Setup
1. In Render Dashboard, click **New +** $\to$ **Web Service**.
2. Connect your GitHub repository.
3. Configure the following settings:
   - **Name**: `bandhsetu-api`
   - **Region**: `Singapore` (or closest to India)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install --upgrade pip && pip install -r requirements.txt && alembic upgrade head`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 2`
   - **Health Check Path**: `/api/v1/health`
4. Add **Environment Variables**:
   | Variable | Example Value | Description |
   |---|---|---|
   | `APP_ENV` | `production` | Enables production mode |
   | `DEBUG` | `false` | Disables debug logs |
   | `DATABASE_URL` | `postgresql://postgres...` | Supabase connection URI |
   | `CORS_ORIGINS` | `["https://bandhsetu.vercel.app"]` | Allowed frontend domains |
   | `JWT_SECRET_KEY` | *(Click 'Generate')* | 32-character encryption secret |
   | `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |
   | `ACCESS_TOKEN_EXPIRE_MINUTES` | `840` | 14 hours session duration |
   | `SUPABASE_URL` | `https://xxxx.supabase.co` | Supabase project URL |
   | `SUPABASE_ANON_KEY` | `eyJhbGci...` | Supabase anonymous key |
   | `TIMEZONE` | `Asia/Kolkata` | Operating timezone |
   | `DEFAULT_MANAGER_START_TIME` | `09:00` | Manager access start time |
   | `DEFAULT_MANAGER_END_TIME` | `20:00` | Manager access end time |
5. Click **Create Web Service**.
6. When deployment finishes, copy your live backend URL (e.g. `https://bandhsetu-api.onrender.com`).

---

## 3. Frontend Deployment to Vercel

Vercel hosts the React + Vite Single Page Application (SPA) on a global CDN with SSL, instant cache invalidation, and custom domain mapping.

### Step 3.1: Import Project into Vercel
1. Log in to [vercel.com](https://vercel.com) and click **Add New...** $\to$ **Project**.
2. Import the `BandhSetu-SMARTER-BANDHEJ-MANAGEMENT` repository.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend` (Click *Edit* and select `frontend`)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Step 3.2: Configure Environment Variables
Under **Environment Variables**, add:

| Key | Value | Target |
|---|---|---|
| `VITE_API_BASE_URL` | `https://bandhsetu-api.onrender.com/api/v1` | Production, Preview, Dev |
| `VITE_APP_ENV` | `production` | Production |

> **Security Rule**: Never add `SUPABASE_SERVICE_ROLE_KEY` or backend secrets to Vercel!

### Step 3.3: Deploy & Verify SPA Routing
1. Click **Deploy**.
2. Vercel automatically uses [`frontend/vercel.json`](file:///c:/Users/jiyav/Desktop/Bandhani/frontend/vercel.json) to configure SPA routing rewrites:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
3. This ensures that reloading any direct route (`/workers`, `/batches`, `/payments`, `/reports`, `/managers`) returns `index.html` without 404 errors.

---

## 4. Production Domain & CORS Alignment

After Vercel assigns your production URL (e.g., `https://bandhsetu.vercel.app`):

1. Go back to Render Dashboard $\to$ `bandhsetu-api` $\to$ **Environment**.
2. Update `CORS_ORIGINS`:
   ```json
   ["https://bandhsetu.vercel.app", "http://localhost:5173"]
   ```
3. Save changes. Render will automatically redeploy the backend with the new CORS origin policy.

---

## 5. Post-Deployment Verification Checklist

Verify the live deployment systematically:

- [ ] **Health Check**: Open `https://bandhsetu-api.onrender.com/api/v1/health` and verify `{"status": "healthy", "database": {"connected": true}}`.
- [ ] **Admin Login**: Log in at `https://bandhsetu.vercel.app` with `admin@bandhej.com` / `Admin@123`.
- [ ] **Manager Login**: Log in with `manager@bandhej.com` / `Manager@123`.
- [ ] **Manager Lock**: From Admin account, navigate to **Manager Access**, lock account, and confirm active Manager session is revoked immediately.
- [ ] **Worker Registration**: Register an artisan (e.g., *Premilaben Rathod*, Mandvi). Confirm sequential serial number (`WRK-xxxx`) is generated.
- [ ] **Work Distribution**: Issue 10 dupattas. Confirm snapshot rate is permanently locked.
- [ ] **Receive Returns**: Record 8 accepted pieces and 2 rejected pieces. Verify $\text{₹0}$ wage is generated for defects.
- [ ] **Financials**: Record an advance of $\text{₹200}$ and verify double-entry Money Ledger balance.
- [ ] **Reports**: Open **Reports & Analytics**, test *Worker-Wise* and *Daily Distribution* views, download CSV export, and check print view.
- [ ] **Mobile Experience**: Open on a mobile phone (360px / 390px) and verify bottom navigation bar and one-handed touch ergonomics.
