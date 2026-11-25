# S03 — Personal Schedule Management

**25 November checkpoint:** The Schedules service supplies activity reminders to the dedicated worker, which dispatches through S02 and persists attempts. The earlier checklist describes the pre-integration state. Live delivery, restart behavior, browser testing and NFR-02 measurement still need verification.

**Status:** Testing (local verification complete; integration and acceptance pending) | **Provisional owner:** Member 2 | **Reviewer:** Member 3 (confirm with team) | **Priority:** P1 | **Estimate:** 1–2 focused development days (provisional)

## 1. Goal and traceability
Deliver a complete authenticated Student workflow to create, list, view, and update **their own** personal daily schedule. This slice belongs to the **Schedules & Responsibilities** module.

- **FR-01:** Create/view/update personal schedules.
- **FR-03 (integration only):** Persist schedule times and expose an approved service interface for S02/S05's 30-minute pre-activity notification scheduling; do not reimplement notification delivery here.
- **NFR-01 / BR-04:** Strict self-only schedule access.
- **NFR-02:** Schedule updates target <=2 seconds under standard operation; database-backed measurement remains pending.
- **Architecture:** Next.js + TypeScript, REST Route Handlers, Zod, Prisma/PostgreSQL, centralized JWT/RBAC, 3-tier separation.

## 2. Prerequisites and dependencies
- **S00:** Project scaffold, database configuration, lint/test tooling, shared API response conventions.
- **S01:** Working sign-in, session validation, Student role guard, authenticated user identity.
- **S02/S05:** Reminder delivery is outside S03. The exact schedule-service query/worker integration agreement remains pending; this does not block schedule CRUD but does block AC-S03-08 integration completion.
- The schedule migration is created but has not been applied because no development PostgreSQL/Supabase database is configured.

## 3. Scope
**In scope:** Student schedule entry form; daily list; schedule detail/edit; ownership-safe CRUD subset (create, read, update); validation; persistence; `Asia/Karachi` time/date handling; error/loading/empty states; tests. Overlapping personal activities are allowed.

**Out of scope:** Roommate visibility; Warden access to private schedules; shared duties (S04); reminder delivery and worker behavior (S05); a separate notification store; schedule deletion (not required by FR-01); calendar sync; recurrence UI or execution. The nullable `recurrence_rule` database field is retained, but schedule APIs reject recurrence input and do not interpret it.

## 4. Data and API contract
Use the approved `personal_schedules` table: `id`, `user_id`, `title`, optional `description`, `start_at`, `end_at`, optional `recurrence_rule`, `created_at`, `updated_at`. The migration has not been applied to a database.

**Implemented endpoints:**
- `GET /api/schedules?date=YYYY-MM-DD` — return current user's entries for selected day, ordered by start time.
- `POST /api/schedules` — create entry for current user; never accept `user_id` from request body.
- `GET /api/schedules/:id` — current user's entry only.
- `PATCH /api/schedules/:id` — edit current user's entry only.

Create/update bodies accept `title`, optional `description`, and ISO `startAt`/`endAt`; `userId`, recurrence fields, and other unexpected properties are rejected. Creation and updates enforce `endAt > startAt`; PATCH validates the resulting interval using existing values plus supplied values. Ownership is derived from authenticated identity, and record queries scope by both schedule ID and current user ID. Missing and non-owned records return the same generic 404.

The UI interprets date/time input in `Asia/Karachi`; API timestamps are converted to UTC instants. Day listing uses the half-open interval overlap condition `startAt < dayEnd AND endAt > dayStart`, so an activity crossing midnight appears on each intersecting day. Karachi day boundaries use IANA timezone data and handle the reviewed historical 23/25-hour days. No reminder dispatch is performed by S03.

## 5. User flow
1. Student signs in and opens **My Schedule**.
2. Student selects a day and sees only entries they own (or a clear empty state).
3. Student creates an activity with title, start/end times, and optional description.
4. Server validates and persists the activity with authenticated `user_id`.
5. UI confirms creation and refreshes the selected day's list.
6. Student opens their activity, edits fields, and sees persisted updates.
7. Unauthorized, invalid, or missing-record requests show safe errors and do not change data.

## 6. Implementation checklist
- [x] Review S00/S01 conventions and implement `Asia/Karachi` date filtering.
- [x] Add Prisma model/migration matching the approved `personal_schedules` schema; index `user_id` and `start_at`. Migration application remains pending.
- [x] Implement repository methods scoped to authenticated `user_id`.
- [x] Implement service-layer create/list/get/update with validation and consistent errors.
- [x] Implement Student-only Route Handlers; never trust client-provided ownership.
- [x] Build **My Schedule**, add/edit form, and empty/loading/error states.
- [ ] Agree and record the schedule-service/worker interface for S02/S05; reminder delivery remains outside S03.
- [x] Add automated tests and record local verification results below.

## 7. Acceptance criteria
- **AC-S03-01:** Signed-in Student creates a valid schedule activity; it survives refresh and appears on the correct selected day.
- **AC-S03-02:** Student lists and views only their own entries; results are ordered by start time.
- **AC-S03-03:** Student edits an owned entry; saved values persist and appear in UI.
- **AC-S03-04:** Invalid/missing title, malformed date, and end-before/equal-start are rejected without writes.
- **AC-S03-05:** Student A cannot read or modify Student B's schedule via direct API request or manipulated IDs; no existence leak.
- **AC-S03-06:** Unauthenticated calls fail; non-Student role cannot access Student schedule APIs unless separately approved by the PRD.
- **AC-S03-07:** UI handles empty, loading, network error, and validation error states clearly.
- **AC-S03-08:** 30-minute activity notification ownership/interface is documented; delivery is verified in S02/S05 integration rather than falsely claimed in this slice.
- **AC-S03-09:** Schedule update response time is measured against NFR-02 under documented standard test conditions, with results and limitations recorded.

### Acceptance evidence checkpoint — 21 Nov 2026

| Criterion | Current evidence/status |
|---|---|
| AC-S03-01 | Create flow and handler tests pass; persistence across refresh awaits PostgreSQL and browser end-to-end verification. |
| AC-S03-02 | Owner-scoped list/view behavior and ordering are covered with handler/repository doubles; database verification remains pending. |
| AC-S03-03 | Update service/handler behavior is covered locally; persisted UI update verification remains pending. |
| AC-S03-04 | Validation tests cover blank title, malformed/invalid dates, and equal/reversed intervals; passed locally. |
| AC-S03-05 | Owner filters and generic missing/non-owned responses are covered with mocks; PostgreSQL integration remains pending. |
| AC-S03-06 | Unauthenticated and non-Student handler checks pass locally; full browser/authenticated integration remains pending. |
| AC-S03-07 | Loading, empty, validation-error, and network-error view rendering tests pass; interactive browser verification remains pending. |
| AC-S03-08 | Pending S02/S05 agreement on the schedule-service/worker interface. S03 does not deliver reminders. |
| AC-S03-09 | Pending database-backed NFR-02 response-time measurement. |

Local verification: `npm.cmd test` passed (86/86); `npm.cmd run typecheck`, `npm.cmd run lint`, and `npm.cmd run build` passed; `npx.cmd prisma validate --schema prisma/schema.prisma` passed with a placeholder URL; and `git diff --check` passed. No live database was connected and no migration was applied. One typecheck attempt ran concurrently with `next build` and failed while `.next/types` was being regenerated; a sequential rerun passed.

## 8. Test plan and evidence
**Automated (run locally):** validation, service, mocked repository, route-handler privacy/role, Karachi boundary, and rendered-view tests. The full test suite passed 86/86. The repository and route tests use injected doubles; they are not PostgreSQL integration tests.

**Pending manual end-to-end:** after PostgreSQL is configured, log in as Student A; create two activities; filter day; edit one; refresh; log in as Student B and verify isolation; attempt A's ID through B's session; capture failure response. Check browser timezone behavior and measure NFR-02 under documented database-backed conditions.

**Evidence logged:** HTL decisions, approved fixes, read-only review outcome, and actual local command results are recorded in `docs/WORKFLOW_EVIDENCE_LOG.md`. Pending evidence includes migration/database integration, browser screenshots/end-to-end results, measured update latency, S02/S05 interface agreement, and assigned reviewer/coordinator acceptance. No commit or PR is recorded.

## 9. Risks and decisions requiring confirmation
- S02/S05 schedule-service/worker integration contract remains pending; do not invent it in S03.
- The `recurrence_rule` field is retained as nullable storage only; recurrence behavior remains deferred.
- Database-backed migration, CRUD/privacy integration, browser end-to-end, NFR-02 measurement, and assigned reviewer/coordinator acceptance remain pending.

**Definition of done:** not yet met. Local checks pass, but database/browser integration, AC-S03-08 agreement, AC-S03-09 measurement, and reviewer/coordinator acceptance remain pending. Deferred reminder delivery is not claimed as completed behavior.
