# S04 — Shared Responsibility Coordination and Warden Assistance

**Status:** Ready for implementation after dependencies and agreement rules | **Provisional owner:** Member 2 | **Reviewer:** Member 4 (confirm with team) | **Priority:** P1 | **Estimate:** 1.5–2.5 focused development days (provisional)

## 1. Goal and traceability
Allow verified roommates to record and coordinate **agreed shared responsibilities** and request Warden help when coordination fails. This is a complete Student-to-Warden vertical workflow in the **Schedules & Responsibilities** domain.

- **FR-02:** Roommates record/coordinate shared duties; explicit **Request Warden Assistance** action.
- **FR-03/FR-04 (integration boundary):** Persist due times, assignments, completion status for S05 reminders and non-completion alerting; do not duplicate worker logic in S04.
- **AC-FR-02-02:** Assistance action changes responsibility status to `Assistance Requested` and creates an in-app Warden alert.
- **BR-08 / NFR-01:** Shared responsibility visibility must not expose personal schedule details; only involved roommates and authorized Warden see appropriate duty data.
- **Architecture:** Schedules & Responsibilities owns room membership; shared Notification Service owns notification persistence and deduplication.

## 2. Prerequisites and dependencies
- **S00:** Shared app/API/database foundation.
- **S01:** Authenticated Student/Warden sessions and centralized RBAC.
- **S02:** Working notification creation interface to deliver Warden assistance alerts. Agree contract before integration.
- **S03:** Can be developed in parallel once room ownership conventions are agreed; S04 must never expose S03 personal schedule data.
- Room membership/assignment seed data available; authoritative `room_residents` records identify active roommates.

## 3. Scope and exclusions
**In scope:** room/active roommate validation; create shared responsibility; assign agreed participants; list own assigned/created shared responsibilities within approved room membership; detail view; allowed coordination updates; completion/cancellation where authorized; Warden assistance request and inbox alert; Warden read-only assistance queue/detail (or approved minimal review view); validation, tests, evidence.

**Out of scope:** Warden automatically settling disputes; personal schedule sharing; arbitrary cross-room assignments; responsibility 24h/1h reminder scheduling and non-completion escalation (S05); complaint escalation (S08); new fifth RBAC role called Roommate (roommate is an actor, not a role).

## 4. Data and proposed API
Use approved tables:
- `rooms`: `id`, unique `room_number`, optional `block`/`floor`, positive `capacity`.
- `room_residents`: `id`, `room_id`, `user_id`, `assigned_at`, nullable `ended_at`; enforce valid active room membership and no overlapping active assignments.
- `responsibilities`: `id`, nullable `room_id`, `title`, `description`, `due_at`, `status`, `created_by`, nullable `completed_at`, timestamps.
- `responsibility_assignments`: `id`, `responsibility_id`, `user_id`, `assigned_at`, `status`, nullable `completed_at`; unique `(responsibility_id, user_id)`.

**Proposed endpoints (adapt to S00 conventions):**
- `GET /api/responsibilities` — current student's authorized responsibilities.
- `POST /api/responsibilities` — create duty and approved roommate assignments.
- `GET /api/responsibilities/:id` — participant/creator view with minimum necessary data.
- `PATCH /api/responsibilities/:id` — permitted updates or completion/cancellation subject to agreed role/state rules.
- `POST /api/responsibilities/:id/request-assistance` — idempotently set `Assistance Requested`, notify authorized Warden.
- `GET /api/warden/responsibility-assistance` — Warden-only assistance queue.

**Security rules:** server derives actor from session; verifies active room membership and each assignee's active membership in same room. Do not return another student's personal schedule, complaint, or contact details. Prefer minimal participant identity fields only. Avoid leaking another room's responsibility existence; return safe `404` for inaccessible records. The exact agreement/approval workflow and edit/complete permissions require team decision before coding those transitions.

## 5. User flow
1. Student signs in and opens **Shared Responsibilities**.
2. App identifies the student's active room and eligible roommates from server-side membership records.
3. Student proposes/records an agreed duty (title, description, deadline, assignees); system validates the agreed-assignment rule.
4. Assigned roommates see the duty in their own dashboard, without any personal schedule data.
5. Authorized participant updates allowed duty state or marks their assignment complete according to team-approved rules.
6. If coordination fails, participant selects **Request Warden Assistance**.
7. Server atomically records `Assistance Requested` and requests one deduplicated in-app notification through S02.
8. Warden sees the request and limited relevant duty context; repeating the request does not create duplicate alerts.

## 6. Implementation checklist
- [ ] Agree and document roommate consent/acceptance mechanism and who can edit/complete/cancel shared duties.
- [ ] Implement room membership queries and validity constraints (including historical/ended assignments).
- [ ] Add Prisma models/migrations for rooms, room residents, responsibilities, assignments; respect approved field set.
- [ ] Implement service/repository with membership and assignment authorization enforced server-side.
- [ ] Build Student shared-duty list, creation/coordination form, detail/state UI, assistance button.
- [ ] Implement Warden-only minimal assistance list/detail.
- [ ] Integrate with S02 notification service via stable interface; use deduplication key and transaction/outbox pattern or equivalent reliable handoff to avoid state/alert mismatch.
- [ ] Provide S05 with due-at, assignment state, completion and cancellation service interfaces; document event/worker boundary.
- [ ] Add validation, authorization, duplicate-action and notification integration tests.
- [ ] Record evidence and update relevant docs.

## 7. Acceptance criteria
- **AC-S04-01:** Student with an active room assignment records a valid agreed duty with one or more authorized roommates; assignees see it in their authorized dashboard.
- **AC-S04-02:** Cross-room users, ended room residents, and unauthorized participants cannot be assigned or view/edit the duty.
- **AC-S04-03:** No participant sees another student's private schedule through any responsibility UI, response, or notification payload.
- **AC-S04-04:** Valid title, due time, membership and assignments are enforced; malformed input fails without partial persistence.
- **AC-S04-05:** An authorized participant's **Request Warden Assistance** changes duty status to `Assistance Requested` and produces one Warden in-app notification (FR-02, AC-FR-02-02).
- **AC-S04-06:** Repeated or concurrent assistance requests do not generate duplicate alerts or inconsistent duty state.
- **AC-S04-07:** Student cannot access Warden-only queue; Warden sees only the necessary assistance information.
- **AC-S04-08:** Assignment completion/cancellation follows documented team-approved rules and persists correctly; completed/cancelled status is available to S05.
- **AC-S04-09:** Missing/unauthenticated/forbidden requests fail safely and leave data unchanged.
- **AC-S04-10:** No 24h/1h reminders or automatic non-completion Warden alerts are claimed as complete until S05 passes its own acceptance tests.

## 8. Test plan and evidence
**Automated:** membership eligibility; duplicate assignment unique constraint; invalid duty payloads; participant vs nonparticipant API access; wrong role; status transitions; assistance notification integration; repeated/concurrent assistance requests; private schedule data absent from payloads.

**Manual end-to-end:** Student A and Student B share room; create/assign duty; B sees duty; Student C in another room cannot access; A requests assistance; Warden sees one alert and duty; repeat request and confirm no duplicates; check no personal schedule leakage.

**Evidence:** PR/commit links, AI output and human review notes, migration, test logs, Warden notification screenshot, cross-room denial, duplicate-request proof, outstanding decision notes. Update workflow evidence and contribution logs via PR.

## 9. Decisions/blockers to resolve before final state logic
1. How is **roommate agreement** recorded? Proposed minimum: explicit acceptance by each assignee, not silent assignment; requires team approval.
2. Who may edit due dates, assignees, completion, or cancellation? Define per-role transition matrix before coding.
3. Does `Assistance Requested` coexist with completion/cancellation, and may it be re-requested after resolution? Define allowed transitions.
4. Which Warden receives an alert if multiple Wardens exist? Agree routing; do not broadcast sensitive duty data by default.
5. S05 automated non-completion timeout remains unresolved and must not be invented in S04.

**Definition of done:** approved agreement/state rules recorded; all applicable tests and acceptance criteria pass; S02 notification integration proven; privacy verified; reviewer approves; evidence and slice register updated. If a rule is still open, mark affected criteria blocked rather than assuming success.
