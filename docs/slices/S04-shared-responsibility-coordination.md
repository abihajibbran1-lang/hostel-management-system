# S04 — Shared Responsibility Coordination and Warden Assistance

**Status:** Planned — implementation gate CLOSED | **Owner:** Ifadha Hussain | **Reviewer:** Abiha | **Final S04 approval authority:** Ifadha Hussain (S04 Owner) | **Project Coordinator:** Abiha (separate project-level role) | **Priority:** P1 | **Estimate:** 1.5–2.5 focused development days (provisional)

## 1. Goal and traceability
Allow verified roommates to record and coordinate **agreed shared responsibilities** and request Warden help when coordination fails. This is a complete Student-to-Warden vertical workflow in the **Schedules & Responsibilities** domain.

- **FR-02:** Roommates record/coordinate shared duties; explicit **Request Warden Assistance** action.
- **FR-03/FR-04 (integration boundary):** Persist due times, assignments, completion status for S05 reminders and non-completion alerting; do not duplicate worker logic in S04.
- **AC-FR-02-02:** Assistance action changes responsibility status to `Assistance Requested` and creates an in-app Warden alert.
- **BR-08 / NFR-01:** Shared responsibility visibility must not expose personal schedule details; only involved roommates and authorized Warden see appropriate duty data.
- **NFR-02:** The S04 Owner has approved applying the PRD's maximum 2-second response-time target to S04 responsibility views and operations. This is not technically verified or achieved; formal team/PRD confirmation and test environment, workload, and measurement conditions remain pending. Measure external notification delivery separately; do not weaken the maximum target with a percentile measure.
- **Architecture:** Schedules & Responsibilities owns room membership; shared Notification Service owns notification persistence and deduplication.

## 2. Prerequisites and dependencies
- **S00:** Shared app/API/database foundation.
- **S01:** Authenticated Student/Warden sessions and centralized RBAC.
- **S02:** Working notification creation interface to deliver Warden assistance alerts. Agree contract before integration.
- **S03:** Can be developed in parallel once room ownership conventions are agreed; S04 must never expose S03 personal schedule data.
- The foundational room/resident capability is established before S04 implementation and its initial records are reviewed and verified. S04 consumes current membership and Warden-house authorization through its approved service interface; S04 does not maintain competing room assignments or directly query foundational tables.
- Each house has one designated primary Warden at a time as a business rule. An active designated primary receives assistance notifications; missing/inactive-primary cases go to the Hostel Manager for active replacement. The technical mapping and interface remain subject to confirmation.

Previously user-approved decisions and the 15 additional Owner-approved resolutions recorded across D01-D12 remain subject to formal team and affected-owner confirmation. The Project Owner-approved consolidated S00-S04 recommendations also require relevant slice-owner confirmation. Approval is separate from implementation, testing, compatibility, and dependency readiness. This does not authorize implementation; the gate remains CLOSED.

## 3. Scope and exclusions
**In scope:** verify room/active roommate membership through the foundational capability's approved service interface; propose, distribute and coordinate shared responsibilities; list and detail authorized shared responsibilities; completion, reopening and cancellation under the approved rules; Warden assistance request and inbox alert; Warden responsibility management only within the assigned house; and a separate read-only Warden assistance view. S04 does not own or create foundational room/resident records and does not query their tables directly. The Warden assistance view grants no separate resolution or closure action.

**Out of scope:** Warden automatically settling disputes; personal schedule sharing; arbitrary cross-room assignments; responsibility 24h/1h reminder scheduling and non-completion escalation (S05); complaint escalation (S08); new fifth RBAC role called Roommate (roommate is an actor, not a role).

## 4. Data and proposed API
The Schedules & Responsibilities domain owns the foundational room/resident capability. S04 consumes it only through an approved service interface and must not own, create, or directly query its room or membership tables. The exact interface and the way responsibility records refer to the authoritative room context remain unresolved.

The following responsibility/assignment data is a proposal from the S04 specification and architecture, not a finalized schema:
- `responsibilities`: `id`, `title`, `description`, `due_at`, `status`, `created_by`, nullable `completed_at`, timestamps.
- `responsibility_assignments`: `id`, `responsibility_id`, `user_id`, `assigned_at`, `status`, nullable `completed_at`; unique `(responsibility_id, user_id)`.

**Owner-approved lifecycle clarifications — formal team confirmation pending:**

Overall responsibility statuses remain `Pending Acceptance`, `Active`, `Assistance Requested`, `Completed`, and `Cancelled`. Individual assignment statuses remain `Pending`, `Accepted`, `Rejected`, `Completed`, and `Withdrawn`; do not add an `Incomplete` status.

- Students may propose duties; the Warden controls final distribution. Each assigned student must accept before the overall responsibility becomes `Active`.
- Material changes to the responsibility description, assigned students, duty distribution, or due date/time return affected assignment statuses to `Pending`; unaffected participants retain acceptance. Overall status returns to `Pending Acceptance`. Minor spelling/formatting corrections do not require renewed acceptance.
- Each student completes only their own part. Overall status becomes `Completed` only when all assigned parts are complete.
- Warden-approved reopening returns the individual assignment to existing `Accepted` (assigned but not completed); an overall `Completed` responsibility returns to `Active`.
- Approved withdrawal sets the assignment to `Withdrawn`. Only an authorized Warden makes the final decision on participant cancellation requests; an authorized Warden may also cancel directly within the assigned house.
- Assistance ends when overall status becomes `Completed` or `Cancelled`. Reopening does not reopen the previous assistance request; a new request may be made for a new problem after the previous request ends.

Exact assignment/overall status transitions after Warden review of rejection/non-response, redistribution, approved withdrawal, and room transfer remain open where the selected rules do not specify them. The approved rejection, non-response, redistribution, transfer, assistance-deduplication/reassignment, and concurrent completion/cancellation/assistance rules are not reopened; T02/T03 must verify their atomic implementation and failure consistency.

**Proposed endpoints (adapt to S00 conventions):**
- `GET /api/responsibilities` — current student's authorized responsibilities.
- `POST /api/responsibilities` — create duty and approved roommate assignments.
- `GET /api/responsibilities/:id` — authorized participant view with minimum necessary data, subject to the selected former-participant historical access rule.
- `PATCH /api/responsibilities/:id` — permitted updates or completion/cancellation subject to agreed role/state rules.
- `POST /api/responsibilities/:id/request-assistance` — idempotently set `Assistance Requested`, notify authorized Warden.
- `GET /api/warden/responsibility-assistance` — Warden-only assistance queue.

**Security rules:** server derives actor from the authenticated request; verifies current room membership and assigned-house authorization through the approved foundational service interface. Do not accept client-supplied room/Warden identity as authorization, or directly query foundational tables. Do not return another student's personal schedule, complaint, or contact details. Prefer minimal participant identity fields only. Avoid leaking unrelated responsibility existence; return safe `404` for inaccessible records. Formal reconciliation of authorized shared-duty visibility with PRD NFR-01 remains required. Exact interface and authorization implementation remain open.

## 5. User flow
1. Student signs in and opens **Shared Responsibilities**.
2. App obtains the student's current room and eligible roommates through the approved foundational room/resident service interface.
3. A student may propose a duty for their room; the Warden controls final distribution and assignment.
4. The Warden sets an acceptance deadline and sends assignment notifications. Every assigned student must accept; silence is not acceptance. Until all required acceptances arrive, the overall status is `Pending Acceptance`; after the deadline it remains so until Warden review.
5. Material changes to description, assigned students, distribution, or due date/time require affected participants to accept the revision. Their assignment status returns to `Pending`; unaffected participants retain acceptance; the overall status returns to `Pending Acceptance`. Minor spelling/formatting corrections do not require renewed acceptance.
6. Authorized participants view the shared duty without personal schedule data. Each student reports completion only for their own part.
7. A participant may request Warden assistance. S04 routes to the current designated primary Warden; missing/inactive primary cases notify the Hostel Manager. S04 requests one deduplicated in-app notification through S02 using the confirmed T02/T03 strategy. Transaction-bound dispatch compatibility remains unverified.
8. The Warden's assistance view shows only relevant information and is read-only. Repeated/concurrent requests do not create duplicate active requests or duplicate notifications.

## 6. Implementation checklist
- [ ] Obtain formal team/affected-owner confirmation of the Owner-approved acceptance, distribution, permission, completion, reopening, cancellation and transfer rules.
- [ ] Integrate the approved foundational room/resident service interface for current membership and assigned-house authorization; do not create or directly query its tables.
- [ ] Finalize and implement S04-owned responsibility/assignment persistence only after the applicable product rules and schema/interface contracts are approved.
- [ ] Implement service/repository with participant and assignment authorization enforced server-side using the approved foundational interface.
- [ ] Build Student shared-duty list, creation/coordination form, detail/state UI, assistance button.
- [ ] Implement Warden-only minimal assistance list/detail.
- [ ] Integrate with the S02 notification service via its approved interface and deterministic deduplication. Verify transaction-bound dispatch compatibility; the existing S02 interface is not verified as transaction-bound. If incompatible, evaluate a transactional outbox as the preferred alternative for review, subject to technical-owner/architecture approval. Establish a compatible state/notification consistency strategy before implementation.
- [ ] Provide S05 with due-at, assignment state, completion and cancellation service interfaces; document event/worker boundary.
- [ ] Add validation, authorization, duplicate-action and notification integration tests.
- [ ] Record evidence and update relevant docs.

## 7. Acceptance criteria
- **AC-S04-01:** Student with an active room assignment may propose a valid duty for Warden distribution to authorized roommates. Every assignee accepts before the overall responsibility becomes `Active`; authorized participants can view it.
- **AC-S04-02:** Unrelated-room users and unauthorized participants cannot access or modify responsibilities. Former participants may retain read-only access to historical responsibilities in which they participated, but cannot access new responsibilities for their former room, subject to the approved visibility contract.
- **AC-S04-03:** No participant sees another student's private schedule through any responsibility UI, response, or notification payload.
- **AC-S04-04:** Valid title, due time, membership and assignments are enforced; malformed input fails without partial persistence.
- **AC-S04-05:** An authorized participant's **Request Warden Assistance** changes duty status to `Assistance Requested` and produces one in-app notification to the current active designated primary Warden; missing/inactive Warden routing follows the approved Manager fallback (FR-02, AC-FR-02-02).
- **AC-S04-06:** Repeated or concurrent assistance requests do not generate duplicate active requests, duplicate alerts, or inconsistent duty state; a new request can follow closure for a new problem.
- **AC-S04-07:** Student cannot access the Warden assistance view; Wardens access responsibility/assistance information only within their assigned house. The assistance view is read-only and grants no closure action.
- **AC-S04-08:** Each student completes only their own assigned part; overall completion requires all parts. Reopening and cancellation follow the approved rules, notify the specified participants, and persist status needed by S05.
- **AC-S04-09:** Missing/unauthenticated/forbidden requests fail safely and leave data unchanged.
- **AC-S04-10:** No 24h/1h reminders or automatic non-completion Warden alerts are claimed as complete until S05 passes its own acceptance tests.

## 8. Test plan and evidence
**Automated:** active membership through the approved foundational interface; student proposal and Warden distribution; acceptance/deadline/non-response; initial and revised acceptance including affected/unaffected participants; minor edits; rejection and Warden review; withdrawal and transfer; own-part completion; reopening to existing `Accepted`; Warden-final cancellation; all selected notice audiences; room/house/role/privacy denial; assistance close/reopen/new-problem behavior and deduplication; notification failure/transaction consistency; private schedule data absent from payloads; and S05 interface behavior. Measure the maximum 2-second S04 application-response target under conditions formally agreed by the team; measure external notification delivery separately. The target is not yet verified.

**Manual end-to-end:** Student proposes a duty, Warden distributes it, assignees accept, and the responsibility activates only after all required acceptances. Exercise rejection, material edit, room transfer, completion/reopening/cancellation, assistance and Warden fallback. Verify unrelated-room denial, participant/history access, notification audiences, no duplicates, and no schedule privacy leakage.

**Evidence:** PR/commit links, AI output and human review notes, migration, test logs, Warden notification screenshot, cross-room denial, duplicate-request proof, outstanding decision notes. Update workflow evidence and contribution logs via PR.

## 9. Remaining decisions and integration blockers
1. What assignment/overall states follow Warden review of initial or revised rejection/non-response and redistribution?
2. What assignment-state and remaining-participant effects follow approved withdrawal and necessary redistribution?
3. On room transfer, what assignment transitions apply to active/pending responsibilities and how are remaining participants/replacement acceptance handled? The transferred student cannot be compelled to continue former-room duties.
4. What assistance history/event identity is retained so a later new-problem request is distinct while concurrent duplicates remain prevented?
5. How are “house” and “building” defined, and what technical interface verifies primary-Warden mapping and handles reassignment of an active assistance request?
6. How is authorized shared-duty visibility reconciled with PRD NFR-01?
7. What team-agreed test environment, workload and measurement method verify the maximum 2-second target? External notification delivery is measured separately; achievement is unverified.
8. What exact versioned S04/S05 service contract, fields, permissions and lifecycle semantics are required? S05 timeout duration and confirmation semantics remain S05 questions.
9. Can S02 support transaction-bound dispatch? If incompatible, who approves/owns an outbox and its persistence, processing, retry and recovery behavior?
10. What notification content and audiences apply to changes beyond the selected assignment, completion, cancellation, Warden-change, reopening, transfer, and assistance recipients?

**Definition of done:** formal team and affected-owner confirmation recorded; required S00/S01/S02 dependencies verified; applicable tests and acceptance criteria pass; S02 notification integration and S05 interface proven; privacy and performance evidence recorded; reviewer review by Abiha recorded; final S04 approval by Ifadha Hussain recorded; and project evidence/register updated. If a rule remains open, mark affected criteria blocked. S04 remains Planned and the implementation gate CLOSED until every readiness condition and approval is satisfied.
