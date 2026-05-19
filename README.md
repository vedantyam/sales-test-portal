# Sales Test Portal

Internal HR tool for assessing new sales employees after their first month.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS, TanStack Query, Zustand |
| Backend | Fastify (Node.js) |
| Database | Supabase (PostgreSQL) |
| Queue | BullMQ + Redis |
| Email | Nodemailer + Gmail SMTP |
| Auth | Custom JWT (15min access + 7d httpOnly refresh cookie) |
| Hosting | Vercel (frontend) + Railway (backend + Redis) |

## Setup

### 1. Database

Run `backend/src/db/migrations/001_core_tables.sql` in the Supabase SQL editor.

Create a Supabase Storage bucket named `resources` (public).

### 2. Environment variables

```sh
cp .env.example backend/.env
cp .env.example frontend/.env.local
```

Fill in all values. Generate strong random strings for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.

### 3. Seed admin account

```sh
cd backend
npm install
SEED_ADMIN_EMAIL=admin@company.com SEED_ADMIN_PASSWORD=yourpassword npm run seed
```

### 4. Run locally

```sh
# Backend
cd backend && npm run dev

# Frontend (separate terminal)
cd frontend && npm run dev
```

Frontend: http://localhost:3000  
Backend: http://localhost:3001

## Routes

| Path | Who |
|---|---|
| `/login` | Employee (access key) |
| `/dashboard` | Employee dashboard |
| `/exam/[assignmentId]` | Exam interface |
| `/admin/login` | Admin |
| `/admin/dashboard` | Admin stats |
| `/admin/employees` | Employee CRUD + key management |
| `/admin/tests` | Test list |
| `/admin/tests/new` | Create test |
| `/admin/tests/[id]` | Edit / view test + assign |
| `/admin/results` | Results review + HR decisions |
| `/admin/resources` | Resource management |

## Deployment

**Backend → Railway**
- Connect GitHub repo, set root to `backend/`
- Add Redis addon
- Set all env vars
- Build: `npm run build` → Start: `node dist/server.js`
- Set region: ap-south-1 (Mumbai)

**Frontend → Vercel**
- Connect GitHub repo, set root to `frontend/`
- Set `NEXT_PUBLIC_API_URL` to Railway backend URL

## Security notes

- Access keys stored as bcrypt hashes only — never logged or returned after creation
- Admin routes enforce `role === 'admin'` at middleware level
- Finalised results and HR decisions are immutable
- Timer authority is server-side — remaining time computed from `started_at` on every load
- Tab switch auto-submit at 3 violations
- Rate limiting: 100 req/min global, 5 login attempts/10min on employee login
