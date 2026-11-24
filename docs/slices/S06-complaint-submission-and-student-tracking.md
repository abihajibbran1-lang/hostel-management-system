# S06 — Complaint Submission and Student Tracking

**Status:** Testing; implementation and local verification recorded; integration, NFR evidence and acceptance pending | **Owner:** Member 3 (provisional) | **Reviewer:** Member 4 (confirm) | **Priority:** P0 | **Estimate:** 1.5–2 focused days (provisional)

## Goal and traceability
Implement **FR-07** identified complaint creation and **FR-09** student-only live status/outcome tracking; **BR-01** prohibits anonymous complaints, **BR-04/NFR-01** require single-owner privacy, and **NFR-02** targets complaint tracking response within 2.0 seconds under standard operation. **NFR-03** targets at least 90% first-time valid complaint completion within 3 minutes (requires usability evidence, not assertion).

## Dependencies and boundaries
S00 scaffold/API/Prisma and S01 Student authentication and ownership checks. Approved S06 decision: no S04 dependency; room number is required text validated on the server and does not verify the student's actual room assignment. No need to block S06 on S07/S08 or S02. Warden review, escalation, status changes, and linked follow-ups are S07/S08, not S06.

## User workflow
1. Signed-in Student opens **Submit Complaint**.
2. Form requires category **Water / Hygiene / Pests / Electricity / Facilities**, room number, nonempty description and explicit urgency flag.
3. Server validates all fields including the approved room-number format, obtains submitter ID from verified session, creates identified complaint with `Pending` status and server-generated `submitted_at`, and records the initial history entry in one transaction.
4. Student sees success with the complaint UUID as tracking reference and can view only their own complaints, latest status, submitted details and authorized resolution outcome when available.
5. Student refreshes/revisits the tracking page to see Warden updates persisted by S07; never sees other students' complaints.

## Data / implemented endpoints
- `complaints`: `id`, `submitted_by`, `category`, `room_number`, `description`, `urgency_flag`, `status`, `submitted_at`, `created_at`, `updated_at`. S06 omits `title`, `Closed`, and S08-specific fields.
- `complaint_status_history`: complaint FK, `old_status`, `new_status`, `changed_by` nullable, `reason` optional, `changed_at`. Initial event is `Pending` with null `old_status`, null `changed_by` and null `reason`.
- Resolution outcome is stored by S07 in `reason` of the `Resolved` history event; S06 reads the latest `Resolved` history entry with a non-null reason for display.
- `POST /api/complaints`: validated payload with four required fields; `submitted_by`, `submitted_at` and `status` supplied by the server, not client.
- `GET /api/complaints`: authenticated Student's own complaints, S02-style opaque cursor pagination, newest first.
- `GET /api/complaints/:id`: Student owner-only detail and permitted status/outcome; return `404` for foreign IDs.
- Read-only student view in S06. No student route can mutate lifecycle status. Page refresh/revisit is the agreed tracking update mechanism; no real-time socket is required.

## Implementation checklist
- [x] Validate category, room number, description and urgency server-side with Zod; consistent error shape.
- [x] Ensure complaint creation requires authenticated Student and uses verified identity.
- [x] Declare `Complaint` and `ComplaintStatusHistory` Prisma models on `feature/S06-complaint-submission`; write initial status history transactionally. No migration is created pending the approved baseline strategy.
- [x] Add complaint form with clear validation and confirmation state.
- [x] Implement indexed, owner-scoped list/detail queries; include current status and authorized outcome from resolved history reason.
- [x] Add unit, route and repository tests with injected fakes for validation, ownership, initial state, enum mapping, outcome mapping and rollback. Real database integration tests remain pending.
- [ ] Measure complaint list/detail latency under documented standard conditions; run first-time usability trial for NFR-03 and report actual results. Evidence is pending.

## Acceptance criteria
- **AC06-01:** Valid authenticated Student submission persists a complaint with the four mandatory fields, verified student ID, `Pending` status and initial audit history.
- **AC06-02:** Missing/invalid category, room number, description or urgency fails with field-level validation and creates no complaint.
- **AC06-03:** Anonymous and non-Student complaint creation are denied.
- **AC06-04:** Student A can list/detail only A's complaints; Student B cannot access A's ID, status, description or outcome; no cross-student count leakage.
- **AC06-05:** Tracking reflects persisted status/outcome updates from S07 after reload; S06 cannot mutate lifecycle status through student API.
- **AC06-06:** Complaint creation/history transaction rolls back together on failure.
- **AC06-07:** NFR-02 and NFR-03 results are measured and documented (pass/fail/limitations); do not infer compliance from functional tests.

## Approved decisions / blockers
1. Room number validation: required text, trimmed, 1–30 characters, letters/numbers/spaces/hyphens only; no verification of actual room assignment and no S04 dependency.
2. Optional `title` is omitted per approved decision; the architecture's `title` field is not used by S06.
3. Tracking refresh uses ordinary page refresh/revisit; no WebSockets.
4. Outcome storage uses `ComplaintStatusHistory.reason` on the `Resolved` event; S07 must write a non-empty reason when resolving.
5. Complaint lifecycle uses only `Pending`, `In Progress`, `Resolved` and `Escalated`; no `Closed` status is added by S06.
6. Prisma models are declared on the S06 branch, but no migration is created because the baseline/users-table creation strategy remains unresolved.

## Implementation standards (all slices)
- Follow `AGENTS.md`, `Final_PRD.md`, `architecture.md`, approved ADRs and S00 API conventions. Do not add unapproved functionality, roles, enums, microservices, or separate databases.
- Next.js Route Handlers + TypeScript + Zod; business services and module-specific repositories; Prisma + single Supabase PostgreSQL schema; centralized S01 JWT/RBAC. Use approved standardized error shape.
- Validate inputs on server; derive actor and role from verified session, not client fields. Enforce record-level authorization in service/repository queries; do not rely on hidden UI buttons.
- Provide migration/seed fixtures when the approved baseline strategy is available; S06 does not create a migration or seed data. Provide responsive UI, unit/route/repository tests, negative cases, human-reviewed PR, signed-off commits, workflow evidence and contribution log entries.
- Keep timestamps in UTC in storage; display local timezone consistently. Use deterministic fake clock for time tests. Do not claim NFR measurements without measured evidence.

## Evidence and definition of done
Capture: PR link and signed-off commits; requirements-to-test matrix; screenshots of allowed UI flows; test command/output; rejected/modified AI suggestion and human rationale; authorization/edge-case evidence; migration/baseline decision (no migration created in S06); reviewer sign-off; updates to `SLICE_REGISTER.md` and shared logs. Done only when all applicable criteria pass, integration works, and unresolved decisions are either approved or visibly block affected acceptance criteria. No slice is marked implemented merely because this spec exists.
