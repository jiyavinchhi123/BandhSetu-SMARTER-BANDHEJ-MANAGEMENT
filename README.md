# Bandhej Worker and Business Management Web Application

Production-ready enterprise management web application designed for Indian Bandhej (Bandhani) textile manufacturing businesses managing 200–500 artisan women workers.

## Tech Stack
- **Frontend**: React (Vite) + TypeScript + Tailwind CSS + React Router + Lucide Icons
- **Backend**: Python FastAPI + Pydantic v2 + SQLAlchemy ORM + Alembic
- **Database & Auth**: Supabase PostgreSQL & Supabase Auth
- **Deployment**: Vercel (Frontend) + Render (Backend)

## Quick Start

### 1. Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate   # On Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)  
Health Check: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Application: [http://localhost:5173](http://localhost:5173)

---

## Documentation
- [System Architecture](docs/ARCHITECTURE.md)
- [Local Setup Guide](docs/SETUP.md)
- [Production Deployment](docs/DEPLOYMENT.md)
- [API Specification](docs/API_SPEC.md)

