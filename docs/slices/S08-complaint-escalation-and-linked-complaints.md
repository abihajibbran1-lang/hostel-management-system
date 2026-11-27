# S08 — Complaint Escalation and Linked Complaints

**Status:** Testing | **Owner:** Abiha | **Requested reviewer:** abihajibbran1-lang | **Priority:** P0 | **Estimate:** 2–3 focused days (provisional) | **AI workflow:** HTL

## Goal and traceability
Implement **FR-10** Student-initiated escalation after **18 hours of Warden inactivity** (once the team defines inactivity), **FR-11/BR-03** automatic escalation of unresolved complaints after **24 elapsed hours from submission**, and **FR-12/BR-07** new linked complaints for recurring resolved issues without reopening old records. The first five-minute worker poll after each threshold handles eligibility/automatic transition (**BR-05/CON-01**). Outcome disagreement permits a **new linked complaint** with direct escalation to Manager, not mutation of the resolved original.

## Dependencies and boundaries
- S00/S01 auth, S02 Manager in-app notification contract, S06 complaint creation/owner tracking, S07 lifecycle/history and Warden action timestamps.
- Shared Node.js `node-cron` worker every 5 minutes with durable `worker_job_runs`, PostgreSQL atomic claiming/locking, restart recovery, initial attempt plus 3 retries at 1/5/15 minutes; worker calls **Complaints module service**, never writes complaint domain tables directly.
- Only four roles: Student, Warden, Kitchen Staff, Manager. Manager queue/detail must be authorized. No email/SMS, no reopening resolved complaints, no new `Closed` status.

## Workflows
### A. 18h manual escalation
1. The inactivity clock starts at submission for Pending and In Progress complaints. A Warden status or urgency change resets the clock and clears an unlock. Reads have no effect.
2. At the first five-minute poll after the eligible 18h threshold, worker records `manual_escalation_eligible_at` or equivalent, only if complaint remains active and policy qualifies.
3. Student owner sees an enabled **Escalate to Manager** action; eligibility does **not** automatically escalate at 18h.
4. Student action rechecks eligibility/ownership/state in a transaction, changes status to `Escalated`, records history and request time, and emits one deduplicated Manager notification.

### B. 24h automatic escalation
1. At the first worker poll at or after `submitted_at + 24 elapsed hours`, unresolved complaints transition to `Escalated`, with one notification to the designated Manager. The 24-hour job runs first when both jobs are due in the same poll.
2. Resolved complaints and already escalated complaints are skipped. This rule is independent of the open 18h inactivity definition.

### C. Linked recurrence and outcome disagreement
1. Owner selects **Report recurrence** on a resolved complaint, or **Disagree with outcome** to create a new complaint referencing original ID.
2. Server creates a **new** identified complaint with mandatory S06 fields and `original_complaint_id`; original remains unchanged and immutable.
3. Disagreement requires an explicit choice and nonblank reason. The new complaint remains Pending until the student selects the separate escalation action, which is immediately available for disagreements. Recurrence uses standard eligibility.
4. Student sees both records and their relationship; only authorized Manager sees escalated cases.

## Data / proposed endpoints
- Use `submitted_at` and the latest Warden action in complaint history, plus `manual_escalation_eligible_at`, `manual_escalation_requested_at`, `auto_escalated_at`, `original_complaint_id`, `disagreement_reason` and `assigned_manager_id`. Reuse complaint history, notifications and worker job runs.
- Proposed `GET /api/complaints/:id/escalation-eligibility` (owner only); `POST /api/complaints/:id/escalate` (owner + eligible); `POST /api/complaints/:id/follow-ups` (owner, validated S06 complaint fields and reason); `GET /api/manager/complaints` and `GET /api/manager/complaints/:id` (Manager only).
- Proposed module services: `evaluateManualEscalationEligibility(now)`, `escalateUnresolvedAfter24Hours(now)`, `requestManualEscalation(actor,id,now)`, `createLinkedComplaint(actor,originalId,payload,reason)`.
- Use atomic compare-and-update/row locks for state transitions, history and outbox/event dedupe. If notification write is not in same DB transaction, persist a durable event/job so retries cannot lose the Manager alert.

## Implementation checklist
- [x] Record approved inactivity, Manager routing, disagreement, and post-escalation policies.
- [x] Implement the Manager queue, Student actions, worker jobs and transaction-bound notifications.
- [x] Test timing, privacy, retries and duplicate suppression against a temporary PostgreSQL engine.
- [ ] Verify independently connected PostgreSQL sessions, actual worker restart and browser acceptance.

## Acceptance criteria
- **AC08-01:** 18h manual eligibility is set at the first five-minute poll at or after the approved inactivity threshold.
- **AC08-02:** Eligibility alone does not change status; only eligible complaint owner can request manual escalation; duplicate requests are idempotent.
- **AC08-03:** Unresolved complaint created at `T` is automatically escalated at first poll after `T+24h`; not before. Resolved/already-escalated complaints are skipped.
- **AC08-04:** Escalation changes status to `Escalated`, stores Manager routing and actor/source history, and creates one authorized in-app Manager alert.
- **AC08-05:** Student can create a new linked recurrence complaint referencing a resolved original; original is unchanged and cannot be reopened.
- **AC08-06:** An outcome-disagreement follow-up can be directly escalated without 18h wait, but unrelated recurrence does not automatically bypass the threshold.
- **AC08-07:** Student cannot link another student's private complaint or access foreign IDs; Manager-only endpoints deny all other roles.
- **AC08-08:** Parallel worker polls, crashes and retries produce one transition and one logical notification; persisted failed jobs remain inspectable.
- **AC08-09:** Fake-clock tests cover exact threshold, one tick before/after, 18h vs 24h collision, resolution just before poll, and Warden activity just before eligibility.

## Approved decisions and remaining verification

Abiha approved the S08 plan and the four proposed rules on 27 November 2026 in the HTL planning checkpoint. The code uses the latest recorded Warden action and an active Manager configured by `COMPLAINT_ESCALATION_MANAGER_ID`. The Manager queue and detail are read-only and scoped to the stored assignment. Manager resolution is deferred. Unavailable routing preserves the complaint state and the automatic job retries on the existing schedule.

The implementation preserves the four existing complaint statuses. History, state, assignment and notification are committed in one transaction with a complaint row lock. The temporary engine exercised overlapping operations over one Prisma connection. Independent database sessions, worker restart, browser verification and reviewer acceptance remain pending.

## Manual verification

1. Apply the migrations to a disposable PostgreSQL database. Provision two Students, a Warden authorized for the complaint house or intake, and two Managers. Set `COMPLAINT_ESCALATION_MANAGER_ID` to the designated Manager's UUID.
2. Run `npm.cmd run dev` and `npm.cmd run worker` in separate terminals. Submit a complaint as a Student. For timing demonstrations, seed synthetic complaint and history timestamps around the 18-hour and 24-hour boundaries in the disposable database.
3. Wait for a worker poll, then refresh student tracking. At 18 hours the status stays active and the escalation button appears. Record a Warden urgency change before escalation and verify the button is removed on refresh. For a separate 24-hour active complaint, verify automatic escalation and a single Manager notification after polling.
4. Resolve a separate complaint as Warden. Create a recurrence and a disagreement follow-up as its owner. Check that both have new IDs and link to the unchanged original. Only the disagreement offers immediate escalation.
5. Sign in as the assigned Manager and open **Escalated complaints** and **Notifications**. Confirm the other Manager cannot see that complaint in the queue or open its detail. Confirm a different Student cannot read, escalate or link the original.

## Implementation standards (all slices)
- Follow `AGENTS.md`, `Final_PRD.md`, `architecture.md`, approved ADRs and S00 API conventions. Do not add unapproved functionality, roles, enums, microservices, or separate databases.
- Next.js Route Handlers + TypeScript + Zod; business services and module-specific repositories; Prisma + single Supabase PostgreSQL schema; centralized S01 JWT/RBAC. Use approved standardized error shape.
- Validate inputs on server; derive actor and role from verified session, not client fields. Enforce record-level authorization in service/repository queries; do not rely on hidden UI buttons.
- Provide migration/seed fixtures, responsive UI, unit/integration/auth tests, negative cases, human-reviewed PR, signed-off commits, workflow evidence and contribution log entries.
- Keep timestamps in UTC in storage; display local timezone consistently. Use deterministic fake clock for time tests. Do not claim NFR measurements without measured evidence.

## Evidence and definition of done
Capture: PR link and signed-off commits; requirements-to-test matrix; screenshots of allowed UI flows; test command/output; rejected/modified AI suggestion and human rationale; authorization/edge-case evidence; migration results; reviewer sign-off; updates to `SLICE_REGISTER.md` and shared logs. Done only when all applicable criteria pass, integration works, and unresolved decisions are either approved or visibly block affected acceptance criteria. No slice is marked implemented merely because this spec exists.
