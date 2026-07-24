# PulseDesk

A lightweight Lead Management CRM for small sales teams — built with React 19, Node.js, Express, and PostgreSQL.

---

## Project Structure

```
PulseDesk/
├── client/           # React 19 + Vite + TypeScript frontend
├── server/           # Node.js + Express + TypeScript backend
├── shared/           # Shared TypeScript types (client + server)
├── setup.bat         # First-time setup script
├── start-dev.bat     # Start both dev servers
└── docker-compose.yml
```

---

## Features

- **Authentication** — JWT login/register with refresh token rotation and per-token `jti` uniqueness
- **Lead Management** — Create, assign, and track leads through the sales pipeline
- **Status Pipeline** — New → Contacted → Qualified → Proposal Sent → Won / Lost
- **Lead Source Tracking** — Website, Referral, Cold Outreach, Event, Other
- **Lead Assignment** — Assign leads to any team member with a dropdown selector
- **Follow-up Scheduling** — Set follow-up dates with overdue warnings in list and detail views
- **Last Contacted** — Auto-stamped on every note save; manually settable via "Mark as contacted now"
- **Lead Notes** — Freeform notes per lead, visible in the activity timeline
- **Activity Tracking** — Every meaningful action writes a `LeadActivity` record in the service layer
- **GitHub-style Timeline** — Notes and activity events merged into one timeline, newest first, with colour-coded icons per event type
- **Dashboard** — 6-stat pipeline row, new leads feed, upcoming follow-ups panel with overdue highlights
- **Team Management** — Admin can view team and change member roles
- **Multi-role System** — Admin and Member roles enforced at the route and service layers

---

## Roles

| Role   | Capabilities |
|--------|-------------|
| Admin  | Full access — manage team, delete leads, view and update everything |
| Member | Create leads, add notes, update any lead in the organisation |

---

## Pipeline Statuses

| Status        | Meaning |
|---------------|---------|
| New           | Just entered the pipeline |
| Contacted     | First outreach made |
| Qualified     | Confirmed fit and budget |
| Proposal Sent | Formal proposal delivered |
| Won           | Deal closed successfully |
| Lost          | Opportunity did not convert |

Transitioning to **Won** or **Lost** auto-stamps `closedAt`. Moving back to any active status clears it.

---

## Activity Events

Every action in the service layer creates a `LeadActivity` record. Nothing is logged from controllers.

| Event                    | Triggered when |
|--------------------------|----------------|
| `LEAD_CREATED`           | A new lead is saved |
| `STATUS_CHANGED`         | `status` field changes — stores old and new value |
| `ASSIGNED_MEMBER_CHANGED`| `assignedToId` changes — stores old and new member name |
| `FOLLOW_UP_DATE_CHANGED` | `followUpDate` is set, changed, or cleared |
| `NOTE_ADDED`             | A note is saved — stores the first 120 chars as a preview |
| `LEAD_UPDATED`           | Any other field (name, company, email, phone, source, value) changes |
| `LEAD_DELETED`           | A lead is deleted by an Admin |

---

## Tech Stack

| Layer    | Technology                               |
|----------|------------------------------------------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS |
| State    | TanStack Query, React Hook Form, Zod     |
| Routing  | React Router v6                          |
| Backend  | Node.js, Express, TypeScript             |
| Database | PostgreSQL (Neon), Prisma ORM            |
| Auth     | JWT (access + refresh + jti), bcrypt     |
| Testing  | Jest, Supertest (26 integration tests)   |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- PostgreSQL 15+ — local via Docker or a hosted provider (e.g. Neon)

### Quick Start (Windows)

```bat
# 1. First-time setup — installs deps, runs migrations, seeds data
setup.bat

# 2. Start development servers every time after that
start-dev.bat
```

`setup.bat` handles: Docker Postgres, npm install for both workspaces, `.env` creation, Prisma migration, and seeding.

### Manual Setup

```bash
# Server
cd server
npm install
cp .env.example .env      # fill in DB credentials and JWT secrets
npx prisma migrate dev
npm run db:seed
npm run dev               # http://localhost:4000

# Client (separate terminal)
cd client
npm install
npm run dev               # http://localhost:5173
```

---

## Environment Variables

Copy `server/.env.example` to `server/.env`:

```env
NODE_ENV=development
PORT=4000

DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

JWT_ACCESS_SECRET=<random string, min 32 chars>
JWT_REFRESH_SECRET=<different random string, min 32 chars>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

CLIENT_URL=http://localhost:5173
```

> Always replace the JWT secrets before deploying. The defaults in `.env.example` are placeholders.

---

## Database

### Migrations

```bash
cd server

npx prisma migrate dev --name <description>   # create and apply
npx prisma migrate deploy                      # apply to production DB
npx prisma generate                            # regenerate Prisma client
npm run db:studio                              # open Prisma Studio
```

### Seed Data

```bash
cd server && npm run db:seed
```

Creates one organisation, two users, six sample leads with realistic history across the full pipeline — notes, status progressions, assignments, follow-up dates, and 44 activity records.

| Role   | Email                  | Password     |
|--------|------------------------|--------------|
| Admin  | admin@pulsedesk.dev    | Password123! |
| Member | member@pulsedesk.dev   | Password123! |

**Sample leads in the seed:**

| Lead             | Status        | Notes | Activities |
|------------------|---------------|------:|----------:|
| Priya Sharma     | Won           | 6     | 12        |
| Elena Vasquez    | Proposal Sent | 4     | 9         |
| James Okafor     | Lost          | 3     | 7         |
| Marcus Chen      | Qualified     | 2     | 7         |
| Sarah Johnson    | Contacted     | 2     | 6         |
| Tom Bradley      | New           | 1     | 3         |

The seed is **not** idempotent — run `wipe` first if you need a fresh dataset:

```bash
# Wipe all data and re-seed
cd server
npx tsx src/database/wipe.ts   # optional helper (delete after use)
npm run db:seed
```

---

## API Overview

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me

POST   /api/leads/capture              PUBLIC — no auth required (lead capture form)

GET    /api/leads              ?page, pageSize, status, source, assignedToId, search
POST   /api/leads
GET    /api/leads/:id          includes notes[] and activities[] (newest first)
PATCH  /api/leads/:id
DELETE /api/leads/:id          Admin only
POST   /api/leads/:id/notes

GET    /api/users
GET    /api/users/:id
PATCH  /api/users/:id/role     Admin only

GET    /health
```

All responses use the same envelope:

```json
{ "success": true,  "data": { ... }, "error": null }
{ "success": false, "data": null,    "error": "message" }
```

### Lead Fields

| Field             | Type       | Description |
|-------------------|------------|-------------|
| `name`            | string     | Contact full name |
| `company`         | string?    | Company name |
| `email`           | string?    | Contact email |
| `phone`           | string?    | Contact phone |
| `status`          | enum       | Pipeline stage |
| `source`          | enum       | How the lead was acquired |
| `value`           | decimal?   | Estimated deal value in USD |
| `assignedToId`    | string?    | Team member responsible |
| `followUpDate`    | datetime?  | Scheduled follow-up — shown with overdue warning if past |
| `lastContactedAt` | datetime?  | Auto-set on note save; manually settable |
| `closedAt`        | datetime?  | Auto-set when status → WON or LOST |
| `activities`      | array      | Returned on `GET /leads/:id` — newest first |
| `notes`           | array      | Returned on `GET /leads/:id` — oldest first |

### Activity Fields

| Field      | Type     | Description |
|------------|----------|-------------|
| `action`   | enum     | One of the 7 `LeadActivityType` values |
| `metadata` | json?    | `{ field?, oldValue?, newValue? }` — present for change events |
| `user`     | object   | The user who triggered the action |
| `createdAt`| datetime | When the event occurred |

---

## Running Tests

```bash
cd server && npm test
```

26 integration tests across two suites. Tests run against the real database and clean up after themselves.

| Suite           | Tests | Covers |
|-----------------|------:|--------|
| `auth.test.ts`  | 6     | register, login, token refresh, `/me` endpoint |
| `leads.test.ts` | 20    | CRUD, notes, all 5 activity types, DELETE (admin-only), response shape |

---

## Project Scripts

### Server (`cd server`)

| Script               | Description                           |
|----------------------|---------------------------------------|
| `npm run dev`        | Start API with hot reload (tsx watch) |
| `npm run build`      | Compile TypeScript to `dist/`         |
| `npm start`          | Run compiled production build         |
| `npm test`           | Run Jest integration tests            |
| `npm run db:migrate` | Run `prisma migrate dev`              |
| `npm run db:generate`| Regenerate Prisma client              |
| `npm run db:studio`  | Open Prisma Studio (DB browser)       |
| `npm run db:seed`    | Seed database with sample data        |

### Client (`cd client`)

| Script             | Description                     |
|--------------------|---------------------------------|
| `npm run dev`      | Start Vite dev server           |
| `npm run build`    | Production build to `dist/`     |
| `npm run preview`  | Preview production build        |
