# Hostel Management System

The project uses the approved three-tier architecture:

- Presentation: Next.js application and components under `src/app/` and `src/components/`.
- Business Logic: six domain-module locations under `src/business/modules/`, plus the shared notification and worker locations.
- Data: Prisma/database access, module repositories, and storage boundaries under `src/data/`.

S00 establishes structure and shared conventions only. Authentication, authorization, domain workflows, notifications, and domain worker jobs are implemented by their owning slices.

## Prerequisites

- Node.js 22.18 or later
- npm 10 or later
- PostgreSQL/Supabase credentials only when database-backed slices are introduced

The exact package versions are pinned in `package.json`; installation creates the lockfile used for reproducible builds.

## Local setup

1. Copy `.env.example` to `.env`.
2. Populate `DATABASE_URL` only with credentials obtained through the team’s private process. Never commit `.env`.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Generate the Prisma client once a valid database configuration is available:

   ```bash
   npx prisma generate
   ```

## Run locally

Start the web application:

```bash
npm run dev
```

Start the worker independently in another terminal:

```bash
npm run worker
```

The worker schedules a five-minute polling foundation only. It intentionally performs no domain actions and does not write domain tables; later slices must register jobs through owning module services.

## Validation commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The validation test verifies the common Zod request-validation helper. Endpoint paths and domain request/response schemas are deliberately left to the owning slices. Shared API responses currently follow `{ "data": ... }` for success and `{ "error": { "code", "message", "details?" } }` for failures; this is a proposed cross-cutting convention pending team review.

## Environment and secrets

`.env.example` contains placeholders only. Do not commit `.env`, real connection strings, JWTs, passwords, or tokens. S01 owns final JWT configuration variable names and secret-management integration.
