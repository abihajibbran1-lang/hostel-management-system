# S06 — Complaint Submission and Student Tracking

**Status:** Specified; ready after S00/S01 | **Owner:** Member 3 (provisional) | **Reviewer:** Member 4 (confirm) | **Priority:** P0 | **Estimate:** 1.5–2 focused days (provisional)

## Goal and traceability
Implement **FR-07** identified complaint creation and **FR-09** student-only live status/outcome tracking; **BR-01** prohibits anonymous complaints, **BR-04/NFR-01** require single-owner privacy, and **NFR-02** targets complaint tracking response within 2.0 seconds under standard operation. **NFR-03** targets at least 90% first-time valid complaint completion within 3 minutes (requires usability evidence, not assertion).

## Dependencies and boundaries
S00 scaffold/API/Prisma, S01 Student authentication and ownership checks, room-number validation conventions from S04 room service if available. No need to block S06 on S07/S08 or S02. Warden review, escalation, status changes, and linked follow-ups are S07/S08, not S06.

## User workflow
1. Signed-in Student opens **Submit Complaint**.
2. Form requires category **Water / Hygiene / Pests / Electricity / Facilities**, room number, nonempty description and explicit urgency flag.
3. Server validates all fields, obtains submitter ID from session, creates identified complaint with `Pending` status and submission timestamp, and records initial history entry in one transaction.
4. Student sees success with complaint reference and can view only their own complaints, latest status, submitted details and authorized resolution outcome when available.
5. Student refreshes/revisits tracking page to see Warden updates persisted by S07; never sees other students' complaints.

## Data / proposed endpoints
- Reuse `complaints`: `id`, `student_id`, `original_complaint_id` nullable (S08), `category`, `room_number`, `description`, `urgency_flag`, `status`, `created_at`, `updated_at`, relevant outcome/escalation timestamps as defined in architecture.
- Reuse `complaint_status_history`: complaint FK, actor, prior/new state, timestamp, optional reason/outcome metadata; initial event is `Pending`.
- `POST /api/complaints`: validated payload with four required fields; `student_id`/`status`/`created_at` supplied by server, not client.
- `GET /api/complaints`: authenticated Student's own complaints, bounded pagination and newest first.
- `GET /api/complaints/:id`: Student owner-only detail and permitted status/outcome; return `404` for foreign IDs.
- Read-only student view in S06. If architecture mentions `title`, do not require it unless team approves; PRD mandatory fields above remain authoritative. No `Closed` status added to PRD lifecycle without decision.

## Implementation checklist
- [ ] Validate category, room number, description and urgency server-side with Zod; consistent error shape.
- [ ] Ensure complaint creation requires authenticated Student and uses verified identity.
- [ ] Add Prisma migration and initial status-history entry transactionally.
- [ ] Add complaint form with clear validation and confirmation state.
- [ ] Implement indexed, owner-scoped list/detail queries; include current status and authorized outcome.
- [ ] Add integration tests for data isolation, invalid payloads, initial state and rollback.
- [ ] Measure complaint list/detail latency under documented standard conditions; run first-time usability trial for NFR-03 if possible and report actual results.

## Acceptance criteria
- **AC06-01:** Valid authenticated Student submission persists a complaint with the four mandatory fields, verified student ID, `Pending` status and initial audit history.
- **AC06-02:** Missing/invalid category, room number, description or urgency fails with field-level validation and creates no complaint.
- **AC06-03:** Anonymous and non-Student complaint creation are denied.
- **AC06-04:** Student A can list/detail only A's complaints; Student B cannot access A's ID, status, description or outcome; no cross-student count leakage.
- **AC06-05:** Tracking reflects persisted status/outcome updates from S07 after reload; S06 cannot mutate lifecycle status through student API.
- **AC06-06:** Complaint creation/history transaction rolls back together on failure.
- **AC06-07:** NFR-02 and NFR-03 results are measured and documented (pass/fail/limitations); do not infer compliance from functional tests.

## Open decisions / blockers
1. Room number validation: free text vs authoritative room record, and whether student's own assigned room is mandatory. PRD requires room number but does not prescribe exact check.
2. Complaint `title` appears in some architecture notes but is **not** a mandatory PRD field; optional only if agreed.
3. Tracking refresh mechanism can be ordinary page refresh/polling; no real-time socket feature is required.

## Implementation standards (all slices)
- Follow `AGENTS.md`, `Final_PRD.md`, `architecture.md`, approved ADRs and S00 API conventions. Do not add unapproved functionality, roles, enums, microservices, or separate databases.
- Next.js Route Handlers + TypeScript + Zod; business services and module-specific repositories; Prisma + single Supabase PostgreSQL schema; centralized S01 JWT/RBAC. Use approved standardized error shape.
- Validate inputs on server; derive actor and role from verified session, not client fields. Enforce record-level authorization in service/repository queries; do not rely on hidden UI buttons.
- Provide migration/seed fixtures, responsive UI, unit/integration/auth tests, negative cases, human-reviewed PR, signed-off commits, workflow evidence and contribution log entries.
- Keep timestamps in UTC in storage; display local timezone consistently. Use deterministic fake clock for time tests. Do not claim NFR measurements without measured evidence.

## Evidence and definition of done
Capture: PR link and signed-off commits; requirements-to-test matrix; screenshots of allowed UI flows; test command/output; rejected/modified AI suggestion and human rationale; authorization/edge-case evidence; migration results; reviewer sign-off; updates to `SLICE_REGISTER.md` and shared logs. Done only when all applicable criteria pass, integration works, and unresolved decisions are either approved or visibly block affected acceptance criteria. No slice is marked implemented merely because this spec exists.
