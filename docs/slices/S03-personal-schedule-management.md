# S03 — Personal Schedule Management

**Status:** Ready for implementation after dependencies | **Provisional owner:** Member 2 | **Reviewer:** Member 3 (confirm with team) | **Priority:** P1 | **Estimate:** 1–2 focused development days (provisional)

## 1. Goal and traceability
Deliver a complete authenticated Student workflow to create, list, view, and update **their own** personal daily schedule. This slice belongs to the **Schedules & Responsibilities** module.

- **FR-01:** Create/view/update personal schedules.
- **FR-03 (integration only):** Persist schedule times and expose an approved service interface for S02/S05's 30-minute pre-activity notification scheduling; do not reimplement notification delivery here.
- **NFR-01 / BR-04:** Strict self-only schedule access.
- **NFR-02:** Schedule updates target <=2 seconds under standard operation; measure rather than assume.
- **Architecture:** Next.js + TypeScript, REST Route Handlers, Zod, Prisma/PostgreSQL, centralized JWT/RBAC, 3-tier separation.

## 2. Prerequisites and dependencies
- **S00:** Project scaffold, database configuration, lint/test tooling, shared API response conventions.
- **S01:** Working sign-in, session validation, Student role guard, authenticated user identity.
- **S02:** Agree on notification service interface/event contract for future schedule reminders. Schedule CRUD may proceed before S02 delivery if this contract is recorded and reminder behavior is explicitly deferred.
- Database migrations and seeded Student users available in development.

## 3. Scope
**In scope:** Student schedule entry form; daily list; schedule detail/edit; ownership-safe CRUD subset (create, read, update); validation; persistence; time/date handling; error/loading/empty states; tests; interface contract for downstream reminders.

**Out of scope:** Roommate visibility; Warden access to private schedules; shared duties (S04); responsibility reminders (S05); a separate notification store; schedule deletion (not required by FR-01); calendar sync; recurrence expansion beyond a documented, agreed interpretation.

## 4. Data and API contract
Use the approved `personal_schedules` table: `id`, `user_id`, `title`, optional `description`, `start_at`, `end_at`, optional `recurrence_rule`, `created_at`, `updated_at`.

**Proposed endpoints (confirm with S00 API naming convention):**
- `GET /api/schedules?date=YYYY-MM-DD` — return current user's entries for selected day, ordered by start time.
- `POST /api/schedules` — create entry for current user; never accept `user_id` from request body.
- `GET /api/schedules/:id` — current user's entry only.
- `PATCH /api/schedules/:id` — edit current user's entry only.

Validate nonempty trimmed title, valid timestamps, `end_at > start_at`, and valid optional description/recurrence representation. Derive ownership from authenticated session; query by **both** record ID and current user ID. Use standard errors (`400` invalid input, `401` unauthenticated, `403` wrong role, `404` missing/not-owned, `500` unexpected); avoid leaking whether another student's record exists. Treat timezone consistently in UI/API/DB; record the chosen hostel-local timezone and UTC conversion before implementing date filters. Recurrence behavior is **not approved yet**; either store a documented limited value without claiming recurrence execution or defer recurrence UI until team approval.

## 5. User flow
1. Student signs in and opens **My Schedule**.
2. Student selects a day and sees only entries they own (or a clear empty state).
3. Student creates an activity with title, start/end times, and optional description.
4. Server validates and persists the activity with authenticated `user_id`.
5. UI confirms creation and refreshes the selected day's list.
6. Student opens their activity, edits fields, and sees persisted updates.
7. Unauthorized, invalid, or missing-record requests show safe errors and do not change data.

## 6. Implementation checklist
- [ ] Review S00/S01 conventions and document timezone/date-filter interpretation.
- [ ] Add Prisma model/migration matching the approved `personal_schedules` schema; index `user_id` and `start_at` as needed.
- [ ] Implement repository methods scoped to authenticated `user_id`.
- [ ] Implement service-layer create/list/get/update with Zod validation and consistent errors.
- [ ] Implement Student-only Route Handlers; never trust client-provided ownership.
- [ ] Build responsive **My Schedule**, add/edit form, empty/loading/error states.
- [ ] Establish schedule-created/updated event or service contract for the shared Notification Service; if S02 isn't ready, document deferred integration explicitly.
- [ ] Add tests and collect evidence; update README/API docs if endpoints or run commands change.

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

## 8. Test plan and evidence
**Automated:** validation unit tests; repository/service ownership tests; API integration tests for Student A/B, unauthorized/wrong-role requests, invalid time windows, date filtering, update persistence.

**Manual end-to-end:** log in as Student A; create two activities; filter day; edit one; refresh; log in as Student B and verify isolation; attempt A's ID through B's session; capture failure response. Check local timezone boundaries and performance sample.

**Evidence to log:** commit/PR link, AI prompts and human review/corrections, test commands and outputs, UI screenshots (no secrets), migration, API examples, measured update latency, open issues. Update `docs/WORKFLOW_EVIDENCE_LOG.md` and contribution log through PR.

## 9. Risks and decisions requiring confirmation
- Hostel-local timezone and daylight/date filtering convention.
- Meaning and supported format of `recurrence_rule`; no invented recurrence behavior.
- Whether overlapping personal activities are allowed (PRD does not prohibit them).
- Exact API path conventions and notification contract with S02.

**Definition of done:** all applicable acceptance criteria pass, migration and tests run, ownership verified, reviewer approves PR, evidence recorded, slice register status updated. Any deferred reminder integration is explicitly tracked and does not count as completed notification behavior.
