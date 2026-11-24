# S06–S07 Combined Demo Guide — Complaint Submission, Student Tracking and Warden Management

**Status:** Draft demonstration guide. This guide does not claim that a database-backed or browser end-to-end demonstration has been performed. Automated local verification results are recorded separately in `docs/WORKFLOW_EVIDENCE_LOG.md`.

## 1. Project and slice overview

The Hostel Management System uses a three-tier design:

- **Presentation:** Next.js pages and components under `src/app/` and `src/components/`.
- **Business logic:** services and contracts under `src/business/modules/`.
- **Data:** Prisma repositories and a single relational schema under `src/data/` and `prisma/`.

Authentication is centralized. The middleware verifies the JWT and active account status, then supplies verified identity through `x-auth-user-id` and `x-auth-role` headers. API routes and services must use those verified headers, not client-supplied identity fields.

This guide covers two slices:

| Slice | Requirement area | Actor | Main outcome |
|---|---|---|---|
| S06 | FR-07, FR-09 | Student | Submit an identified complaint and track only their own complaint status/outcome. |
| S07 | FR-08, FR-09 support | Warden | Review complaints, filter queue, view detail, start and resolve complaints, and correct urgency with an auditable reason. |

S08 (escalation, linked complaints, Manager routing) is not part of this demonstration.

## 2. What S06 does from the student's perspective

A signed-in Student opens `/complaints` and sees a form plus their own complaint list.

The form requires:

- **Category:** Water, Hygiene, Pests, Electricity or Facilities.
- **Room number:** required text, trimmed, 1–30 characters, letters/numbers/spaces/hyphens only. The system does not verify actual room assignment.
- **Description:** non-empty text.
- **Urgency flag:** explicitly on or off.

On valid submission, the server:

1. derives `submitted_by` from the verified session;
2. sets `submitted_at` and `status = Pending` on the server;
3. writes the complaint and its initial `Pending` status-history row in one transaction;
4. returns the complaint UUID as the tracking reference.

The student tracking list shows only complaints owned by that student. It includes status, room, description, urgency and outcome when present. Updates from S07 become visible after refresh/revisit; there is no WebSocket.

Relevant source:

- UI: `src/components/complaints/complaint-submission.tsx`, `src/components/complaints/complaint-view.ts`
- Page: `src/app/complaints/page.tsx`
- API: `src/app/api/complaints/route.ts`, `src/app/api/complaints/[id]/route.ts`
- Service: `src/business/modules/complaints/complaint-service.ts`
- Repository: `src/data/repositories/complaints/complaint-repository.ts`

## 3. What S07 does from the Warden's perspective

A signed-in Warden opens `/warden/complaints` and sees:

- a complaint queue;
- status and urgency filters;
- load-more pagination using opaque cursors;
- a detail panel when a complaint is selected.

The Warden can:

1. **Start** a `Pending` complaint, moving it to `In Progress`.
2. **Correct urgency** on an active complaint, providing a non-empty reason. The UI offers a target urgency value opposite the current one by default.
3. **Resolve** an `In Progress` complaint with a non-empty outcome, moving it to `Resolved`.

Resolved and Escalated complaints are immutable in the service, repository and UI. The Warden cannot force `Escalated`, assign a Manager, or reopen a resolved complaint.

Relevant source:

- UI: `src/components/complaints/warden-complaint-queue.tsx`, `src/components/complaints/warden-complaint-view.ts`
- Page: `src/app/warden/complaints/page.tsx`
- API: `src/app/api/warden/complaints/**`
- Service: `src/business/modules/complaints/warden-complaint-service.ts`
- Contract: `src/business/modules/complaints/warden-complaint-contract.ts`

## 4. Step-by-step demonstration sequence

The steps below describe what to do and what should happen. They are not a record of a completed live demonstration.

### Step 0 — Prepare roles and sign in

**Do:**

1. Confirm a provisioned active **Student** account and a provisioned active **Warden** account exist. Use credentials supplied through the team's private process; no credentials are included in this guide.
2. If using the API directly, sign in through `POST /api/auth/login` with JSON `{ "email": "<student-or-warden-email>", "password": "<password>" }`.
3. Confirm the response sets the `auth_token` HttpOnly cookie. There is no dedicated login page in this implementation.

**Expected result:**

- The browser session or API client has an authenticated cookie.
- Subsequent requests pass middleware and receive verified identity headers.
- Unauthenticated requests are rejected with `401`.

### Step 1 — Open the student complaint page

**Do:** Sign in as the Student and open `/complaints`.

**Expected result:**

- The page shows the **Submit a Complaint** form and **My Complaints**.
- The list loads from `GET /api/complaints`.
- If the student has no complaints, the UI shows “You have no complaints.”
- If the list request fails validation or network handling, the UI shows an error state.

### Step 2 — Submit a valid complaint

**Do:** Enter:

- category: one of the five approved categories;
- room number: a team-approved valid test value;
- description: a non-empty description;
- urgency flag: on or off.

Click **Submit complaint**.

**Expected result:**

- `POST /api/complaints` is called with only the four permitted fields.
- A confirmation message shows the tracking reference, which is the complaint UUID.
- The complaint appears in **My Complaints** with `Status: Pending`.
- If urgency was selected, the list entry shows “Marked urgent.”

### Step 3 — Verify student tracking persistence

**Do:** Refresh or revisit `/complaints`.

**Expected result:**

- The complaint remains visible with the same tracking reference and status.
- The student sees only their own complaints.

### Step 4 — Demonstrate student owner isolation

**Do:**

1. Sign out and sign in as a second Student.
2. Open `/complaints`; confirm the first Student's complaint is absent.
3. Request `GET /api/complaints/<first-student-complaint-uuid>` using the second Student's session.

**Expected result:**

- The second Student's list does not contain the first Student's complaint.
- The direct detail request returns a generic `404`.

### Step 5 — Open the Warden queue

**Do:** Sign out, sign in as the Warden, and open `/warden/complaints`.

**Expected result:**

- The queue loads from `GET /api/warden/complaints`.
- The submitted complaint appears with category, status, room number and urgency.
- The status and urgency filter controls are visible.

### Step 6 — Filter the queue

**Do:**

1. Set **Status** to `Pending`.
2. Set **Urgency** to `Urgent` or `Not urgent`.

**Expected result:**

- The queue reloads with the corresponding query parameters.
- Only complaints matching both filters are shown.
- Choosing “All statuses” or “All urgency values” removes that filter.

### Step 7 — View complaint details

**Do:** Click **View details** on the submitted complaint.

**Expected result:**

- `GET /api/warden/complaints/:id` is called.
- The detail panel shows tracking reference, status, room, description, urgency and submission time.
- For a `Pending` complaint, **Start complaint** and urgency correction controls are visible; **Resolve complaint** is not.

### Step 8 — Correct urgency

**Do:** In the urgency section, select the corrected urgency value, enter a non-empty reason, and click **Correct urgency**.

**Expected result:**

- `PATCH /api/warden/complaints/:id/urgency` is called with `{ "urgencyFlag": <target>, "reason": "<reason>" }`.
- The UI shows “Urgency corrected.”
- The displayed urgency updates.
- The queue is refreshed.
- A same-state history row is written with structured JSON containing before/after values and the note. The UI does not display the audit row.

### Step 9 — Start the complaint

**Do:** Click **Start complaint**.

**Expected result:**

- `POST /api/warden/complaints/:id/start` is called.
- Status changes from `Pending` to `In Progress`.
- The UI shows “Complaint started.”
- The detail and queue refresh.
- **Start complaint** disappears and **Resolve complaint** appears.

### Step 10 — Attempt invalid resolution input

**Do:** With an `In Progress` complaint selected, clear the resolution outcome and click **Resolve complaint** (or submit only whitespace).

**Expected result:**

- The UI blocks the request and shows “Enter a resolution outcome.”
- Status remains `In Progress`.

### Step 11 — Resolve with an outcome

**Do:** Enter a non-empty outcome and click **Resolve complaint**.

**Expected result:**

- `POST /api/warden/complaints/:id/resolve` is called with `{ "outcome": "<outcome>" }`.
- Status changes to `Resolved`.
- The UI shows “Complaint resolved.”
- The outcome appears in the detail panel.
- Mutation controls disappear because the complaint is terminal.

### Step 12 — Verify student visibility of the outcome

**Do:** Sign out, sign in again as the original Student, refresh `/complaints`, and locate the tracking reference.

**Expected result:**

- Status shows `Resolved`.
- The outcome written by S07 is displayed.
- This is the key S06/S07 integration point. It remains unverified in a live database/browser run.

## 5. Relevant UI routes and API endpoints

### UI routes

| Route | Role | Purpose |
|---|---|---|
| `/complaints` | Student | Submit complaint and track own complaints. |
| `/warden/complaints` | Warden | Queue, filters, detail and management actions. |

There is no shared navigation link to these pages in the current UI. Open the URL directly.

### Authentication endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/auth/login` | Validate credentials and set the `auth_token` HttpOnly cookie. |
| `POST` | `/api/auth/logout` | Clear the authentication cookie. |

### S06 student complaint endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/complaints` | Create a complaint using verified Student identity. |
| `GET` | `/api/complaints` | List only the current Student's complaints. Supports `limit` and `cursor`. |
| `GET` | `/api/complaints/:id` | Get the current Student's complaint detail; `404` for foreign IDs. |

### S07 Warden complaint endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/warden/complaints` | Warden queue. Supports `status`, `urgencyFlag`, `limit` and `cursor`. |
| `GET` | `/api/warden/complaints/:id` | Warden complaint detail. |
| `POST` | `/api/warden/complaints/:id/start` | Move `Pending` to `In Progress`. |
| `POST` | `/api/warden/complaints/:id/resolve` | Move `In Progress` to `Resolved` with an outcome. |
| `PATCH` | `/api/warden/complaints/:id/urgency` | Correct urgency with an auditable reason. |

Responses use the shared envelope:

- success: `{ "data": ... }`
- failure: `{ "error": { "code": "...", "message": "...", "details?": [] } }`

## 6. Required roles, authentication and setup prerequisites

### Roles

- **Student:** submit and view only their own complaints.
- **Warden:** view the queue, view detail, start/resolve and correct urgency.
- Other roles must not access these student/Warden complaint routes.

There is no public registration workflow. Accounts must be provisioned through the team's approved process.

### Authentication

- JWT is stored in an `auth_token` HttpOnly cookie.
- Middleware protects `/api/:path*`, verifies the JWT and active account status, and overwrites identity headers.
- State-changing requests require a same-origin `Origin` header. Browsers normally supply this for same-origin fetch requests.
- Do not place user IDs or roles in request bodies/query strings as proof of identity.

### Local setup prerequisites

1. Dependencies installed and local app runnable (`npm run dev`).
2. `JWT_SECRET` configured privately; never commit it.
3. A development database configuration is available.
4. The database baseline/migration strategy is approved and applied. This remains unresolved.
5. Required tables exist: at minimum `users`, `complaints` and `complaint_status_history`.
6. Provisioned active Student and Warden accounts exist.
7. Prisma Client matches the current schema.

Items 4–6 are prerequisites for a live demonstration, not evidence that one has occurred.

## 7. How to demonstrate validation and access-control behaviour

### Student-side validation

Show that the following fail with a standardized validation error and create no complaint:

- missing or invalid category;
- empty room number;
- room number with unsupported characters;
- room number longer than 30 characters;
- empty description;
- missing urgency flag.

The strict schema also rejects client-supplied `submitted_by`, `status` or other unexpected fields.

### Warden-side validation

Show:

- blank resolution outcome → client-side error;
- blank urgency reason → client-side error;
- invalid status filter such as `Closed` → `400`;
- invalid complaint UUID → `400`.

### Access control

Show:

- unauthenticated `/api/complaints` or `/api/warden/complaints` → `401`;
- Student calling Warden routes → `403`;
- Warden/Kitchen Staff/Manager calling Student complaint routes → `403`;
- second Student requesting first Student's complaint ID → `404`;
- cross-origin or missing-Origin POST/PATCH → `403`;
- forged `submitted_by`, `changed_by`, role or status fields are not trusted.

### Lifecycle and immutability

Show:

- starting a non-`Pending` complaint fails;
- resolving a non-`In Progress` complaint fails;
- resolved complaints show no mutation controls;
- direct `POST start`, `POST resolve` or `PATCH urgency` on a resolved complaint returns an error;
- no generic status PATCH endpoint exists;
- Warden cannot force `Escalated`.

## 8. Relationship between S06 and S07

S06 and S07 share the same `complaints` and `complaint_status_history` records.

- S06 creates the complaint with `status = Pending` and a `Pending` history entry.
- S07 reads that complaint in the Warden queue and writes transitions and audit history.
- S07 writes resolution outcome into `reason` of the `Resolved` history event.
- S06 reads the latest `Resolved` history row with a non-null `reason` and exposes it as `outcome`.
- Student tracking updates by refresh/revisit; no real-time socket is used.

A useful explanation is: **S06 creates and observes the complaint; S07 changes its lifecycle and records why.**

## 9. Automated evidence versus live demonstration

### Automated evidence already recorded

- Focused contract tests: 5/5.
- Complaint repository tests: 16/16.
- Warden service tests: 11/11.
- Warden API route tests: 7/7.
- Warden UI view tests: 7/7.
- Full suite: `npm.cmd test` — 149 passed, 0 failed.
- `npm.cmd run typecheck` — passed.
- `npm.cmd run lint` — passed with no findings.
- `npm.cmd run build` — passed; 14/14 static pages generated; all S06/S07 routes included.

These are local automated results only.

### Not yet demonstrated

- Real PostgreSQL/Supabase state changes.
- Real database rollback and concurrent transitions.
- Browser E2E with real cookies and real navigation.
- Live Warden-to-Student outcome visibility.
- NFR-02 response-time measurement.
- NFR-03 usability trial.
- Formal reviewer/coordinator acceptance.

Do not describe any of these as completed.

## 10. Known limitations and work not yet verified

- Migration/baseline and users-table creation strategy remain unresolved.
- No live database or browser E2E demonstration has been performed.
- Warden jurisdiction is open; current code allows any authenticated Warden to view/act on all complaints.
- The `Pending → In Progress → Resolved` policy is implemented as the spec default but still needs explicit team confirmation.
- Urgency audit JSON encoding in `reason` needs approval.
- Warden action timestamps are derived from history rather than a `last_warden_action_at` column; future S08 use needs approval.
- S08 escalation, linked complaints, Manager routing, worker jobs and notifications are out of scope.
- UI detail errors map some API errors to a generic network message.
- No shared navigation links exist for `/complaints` or `/warden/complaints`.
- S06 NFR evidence and S07 NFR evidence remain pending.
- S06 and S07 remain `Testing`, not Complete.

## 11. Short presentation script

“These two slices cover the complaint journey from both sides. First, as a Student, I open `/complaints`, choose a category, enter a room number, description and urgency flag, then submit. The server validates everything, derives my identity from the authenticated session, creates the complaint as `Pending`, and gives me the complaint UUID as the tracking reference. I can refresh the page and still see only my own complaint.

Next, I switch to the Warden account and open `/warden/complaints`. The queue comes from the Warden API. I can filter by status and urgency, then select a complaint to view its details. For a `Pending` complaint the Warden can correct urgency with a reason and start the complaint. Starting moves it to `In Progress`. Once it is `In Progress`, the Warden can enter a resolution outcome and resolve it.

The connection between the two slices is the shared complaint history. S07 writes the resolution outcome into the `Resolved` history event, and S06 reads that reason when the Student refreshes their tracking page. The Warden cannot escalate or reopen the complaint; escalation and linked complaints belong to S08.

Automated tests and local lint/type/build checks pass. A live database and browser demonstration is still pending, so I will present this as implementation evidence rather than claim end-to-end verification.”
