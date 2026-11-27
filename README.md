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
2. Set `DATABASE_URL` and a private random `JWT_SECRET` of at least 32 UTF-8 bytes. Never commit `.env`.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Generate the Prisma client and apply the checked-in migrations to an empty development database:

   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

   For a database with existing tables, reconcile its schema and migration history first. In particular,
   the users migration precedes the notification and schedule migrations.

5. Use the team's controlled account provisioning process to prepare active test accounts with bcrypt
   password hashes. Open `/login` to sign in. A Manager can provision houses, rooms, Warden assignments,
   and student room memberships at `/room-management`. Set `COMPLAINT_INTAKE_WARDEN_ID` to the
   UUID of the active Warden who handles unassigned complaints. Use **Unassigned intake** in the
   Warden complaint queue for cases without a verified submission house, including older rows
   without a recorded submission house. An assigned Warden verifies the initial
   memberships there; a Manager can correct a placement by transferring the student.

6. Open **Shared Responsibilities** after signing in. Students with a verified room can propose
   duties. Wardens distribute duties to verified residents. Students accept their own assignments
   and may request Warden assistance. The Warden Assistance page is a read-only queue.

## Run locally

Start the web application:

```bash
npm run dev
```

Start the worker independently in another terminal:

```bash
npm run worker
```

The worker polls every five minutes and calls the Schedules service to deliver private activity
reminders at the first poll in the 30-minute window before an activity starts. The current
implementation skips an activity that has already started and treats a changed start time as a new
reminder event. The same worker delivers responsibility reminders at the approved 24-hour and 1-hour
thresholds. Students can report non-completion after a delivered reminder. The worker also checks
accepted assignments one hour after the deadline, requires a delivered reminder for the current
version, and shares the one-alert-per-duty rule with student reports. Worker attempts are persisted.

For complaint escalation, set `COMPLAINT_ESCALATION_MANAGER_ID` to the UUID of the existing
active Manager designated for S08. Run the worker alongside the app. The Manager can view
assigned cases under **Escalated complaints**. See the [S08 verification steps](docs/slices/S08-complaint-escalation-and-linked-complaints.md#manual-verification).

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
