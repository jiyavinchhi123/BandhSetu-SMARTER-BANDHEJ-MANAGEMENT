# Bandhej Worker and Business Management Web Application
## System Architecture & Specification (Step 1)

### 1. Executive Summary
This application is purpose-built for an Indian Bandhej (Bandhani) textile business managing approximately 200–500 women home-based artisan workers across clusters in Gujarat (Jamnagar, Bhuj, Anjar, Mandvi). The system delivers a mobile-first, high-touch management experience designed for workshop owners, supervisors, and field managers.

### 2. Technology Stack

| Layer | Technology | Key Capabilities |
| :--- | :--- | :--- |
| **Frontend UI** | React 18, Vite, TypeScript | Ultra-fast SPA, strict typing, modular components |
| **Styling** | Tailwind CSS | Mobile-first responsive utilities, custom Indian textile color palette |
| **Icons** | Lucide React | Lightweight, accessible iconography |
| **Routing** | React Router v6 | Nested layouts, mobile navigation drawer / bottom-bar |
| **Backend API** | Python 3.12+ / FastAPI | High throughput, asynchronous endpoints, auto OpenAPI docs |
| **Validation** | Pydantic v2 | Robust request/response schema modeling |
| **Database ORM** | SQLAlchemy 2.0 | Explicit relational modeling, pool pre-ping |
| **Migrations** | Alembic | Tracked schema versioning and deployment automation |
| **Data & Auth** | Supabase PostgreSQL & Auth | Row-Level Security (RLS), JWT tokens, cloud Postgres |
| **Deployment** | Vercel (Frontend), Render (Backend) | Global edge CDN, automated zero-downtime CI/CD |

---

### 3. Folder Structure

```
Bandhani/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/         # Header, Sidebar, MobileNav, HealthBanner
│   │   │   └── ui/             # Button, Card, Badge, Input, ConfirmDialog, EmptyState
│   │   ├── context/            # ToastContext, AuthContext
│   │   ├── hooks/              # useToast, custom utilities
│   │   ├── layouts/            # AppLayout (Responsive Shell)
│   │   ├── pages/              # Dashboard, Workers, Batches, Payments, Inventory
│   │   ├── services/           # api.ts (FastAPI client), supabase.ts
│   │   ├── utils/              # formatters.ts (INR ₹, IST Dates), constants.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── .env.example
│   ├── .env
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── vercel.json
├── backend/
│   ├── alembic/                # Migration scripts and environment
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/  # health.py, workers.py, etc.
│   │   │       └── api.py      # Router aggregation
│   │   ├── core/               # config.py (Pydantic Settings), security.py
│   │   ├── database/           # session.py, base.py
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic validation schemas
│   │   ├── services/           # calculation_service.py (Business Logic)
│   │   ├── utils/              # formatters.py (INR & IST helpers)
│   │   └── main.py             # FastAPI entrypoint & middleware
│   ├── .env.example
│   ├── .env
│   ├── alembic.ini
│   ├── Dockerfile
│   ├── Procfile
│   ├── render.yaml
│   └── requirements.txt
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SETUP.md
│   ├── DEPLOYMENT.md
│   └── API_SPEC.md
├── .gitignore
└── README.md
```

---

### 4. Localization & Regional Specifications
- **Currency**: Indian Rupees (`₹`) with Indian numbering format (e.g. `₹ 1,50,000.00`).
- **Date & Time**: `DD/MM/YYYY` formatted in Indian Standard Time (`Asia/Kolkata` / `UTC+05:30`).
- **Mobile Ergonomics**: Minimum 44px tap targets for buttons and form inputs, bottom bar navigation for single-thumb smartphone operation.
- **Critical Action Safety**: Mandatory confirmation dialogs before wage disbursements or ledger alterations.

