# Production Deployment Guide

This document describes how to deploy the Bandhej Worker and Business Management application to **Vercel** (Frontend) and **Render** (Backend), backed by **Supabase PostgreSQL**.

---

## 1. Backend Deployment (Render)

### Option A: Using Render Blueprint (`render.yaml`)
1. Push this repository to GitHub / GitLab.
2. In the Render Dashboard, click **New +** -> **Blueprint**.
3. Connect your repository. Render will automatically detect `backend/render.yaml`.
4. Populate the following Environment Variables in the Render dashboard:
   - `ENVIRONMENT`: `production`
   - `DEBUG`: `false`
   - `DATABASE_URL`: Your Supabase connection string (`postgresql+psycopg://postgres:[PASSWORD]@[HOST]:5432/postgres`)
   - `SUPABASE_URL`: Your Supabase project URL (`https://xyz.supabase.co`)
   - `SUPABASE_KEY`: Supabase service role or anon key
   - `SUPABASE_JWT_SECRET`: Supabase JWT secret
   - `BACKEND_CORS_ORIGINS`: `["https://your-frontend.vercel.app"]`

### Option B: Manual Web Service
- **Root Directory**: `backend`
- **Environment**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

---

## 2. Frontend Deployment (Vercel)

1. Connect your repository to Vercel.
2. Configure project settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variables in Vercel:
   - `VITE_API_BASE_URL`: `https://your-backend.onrender.com/api/v1`
   - `VITE_SUPABASE_URL`: `https://xyz.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `[YOUR_SUPABASE_ANON_KEY]`
   - `VITE_APP_ENV`: `production`
4. Click **Deploy**. Vercel will utilize `frontend/vercel.json` for proper single-page routing and security headers.

