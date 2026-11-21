# S08 — Complaint Escalation and Linked Complaints

**Status:** Specified; 18-hour eligibility decision OPEN | **Owner:** Member 3 (provisional) | **Reviewer:** Member 1 (confirm) | **Priority:** P0 | **Estimate:** 2–3 focused days (provisional)

## Goal and traceability
Implement **FR-10** Student-initiated escalation after **18 hours of Warden inactivity** (once the team defines inactivity), **FR-11/BR-03** automatic escalation of unresolved complaints after **24 elapsed hours from submission**, and **FR-12/BR-07** new linked complaints for recurring resolved issues without reopening old records. The first five-minute worker poll after each threshold handles eligibility/automatic transition (**BR-05/CON-01**). Outcome disagreement permits a **new linked complaint** with direct escalation to Manager, not mutation of the resolved original.

## Dependencies and boundaries
- S00/S01 auth, S02 Manager in-app notification contract, S06 complaint creation/owner tracking, S07 lifecycle/history and Warden action timestamps.
- Shared Node.js `node-cron` worker every 5 minutes with durable `worker_job_runs`, PostgreSQL atomic claiming/locking, restart recovery, initial attempt plus 3 retries at 1/5/15 minutes; worker calls **Complaints module service**, never writes complaint domain tables directly.
- Only four roles: Student, Warden, Kitchen Staff, Manager. Manager queue/detail must be authorized. No email/SMS, no reopening resolved complaints, no new `Closed` status.

## Workflows
### A. 18h manual escalation
1. S07 records auditable Warden actions. Team first approves exact meaning of **inactivity** and which actions reset clock.
2. At the first five-minute poll after the eligible 18h threshold, worker records `manual_escalation_eligible_at` or equivalent, only if complaint remains active and policy qualifies.
3. Student owner sees an enabled **Escalate to Manager** action; eligibility does **not** automatically escalate at 18h.
4. Student action rechecks eligibility/ownership/state in a transaction, changes status to `Escalated`, records history and request time, and emits one deduplicated Manager notification.

### B. 24h automatic escalation
1. At first worker poll after `created_at + 24 elapsed hours`, unresolved, not-already-escalated complaint is transitioned to `Escalated`, routed to Manager, logged and notified exactly once.
2. Resolved complaints and already escalated complaints are skipped. This rule is independent of the open 18h inactivity definition.

### C. Linked recurrence and outcome disagreement
1. Owner selects **Report recurrence** on a resolved complaint, or **Disagree with outcome** to create a new complaint referencing original ID.
2. Server creates a **new** identified complaint with mandatory S06 fields and `original_complaint_id`; original remains unchanged and immutable.
3. A new disagreement follow-up supports direct Manager escalation under FR-10, without waiting 18h; recurrence alone must not silently grant that bypass. Team approves how disagreement is declared/validated.
4. Student sees both records and their relationship; only authorized Manager sees escalated cases.

## Data / proposed endpoints
- Reuse `complaints` timestamps `created_at`, `last_warden_action_at` (or equivalent), `manual_escalation_eligible_at`, `manual_escalation_requested_at`, `auto_escalated_at`, `original_complaint_id`, status and outcome; `complaint_status_history`; `notifications`; `worker_job_runs`.
- Proposed `GET /api/complaints/:id/escalation-eligibility` (owner only); `POST /api/complaints/:id/escalate` (owner + eligible); `POST /api/complaints/:id/follow-ups` (owner, validated S06 complaint fields and reason); `GET /api/manager/complaints` and `GET /api/manager/complaints/:id` (Manager only).
- Proposed module services: `evaluateManualEscalationEligibility(now)`, `escalateUnresolvedAfter24Hours(now)`, `requestManualEscalation(actor,id,now)`, `createLinkedComplaint(actor,originalId,payload,reason)`.
- Use atomic compare-and-update/row locks for state transitions, history and outbox/event dedupe. If notification write is not in same DB transaction, persist a durable event/job so retries cannot lose the Manager alert.

## Implementation checklist
- [ ] **Obtain and record team decision for 18h Warden inactivity; do not silently choose interpretation.**
- [ ] Implement Manager queue with minimum necessary complaint details and authorization.
- [ ] Add eligible-at timestamp calculation and first-poll checks for manual eligibility.
- [ ] Add Student manual action with transactional revalidation and deduped notification.
- [ ] Implement 24h auto-escalation service and five-minute worker handler.
- [ ] Add linked complaint creation (recurrence vs disagreement) and original immutability.
- [ ] Integrate S02 and worker durable retries/claiming; document local app + worker startup.
- [ ] Add fake-clock boundary tests, race tests, retry/restart tests and privacy tests.

## Acceptance criteria
- **AC08-01:** 18h manual eligibility is set at first five-minute poll after approved inactivity threshold; not before. **Blocked until team decision**.
- **AC08-02:** Eligibility alone does not change status; only eligible complaint owner can request manual escalation; duplicate requests are idempotent.
- **AC08-03:** Unresolved complaint created at `T` is automatically escalated at first poll after `T+24h`; not before. Resolved/already-escalated complaints are skipped.
- **AC08-04:** Escalation changes status to `Escalated`, stores Manager routing and actor/source history, and creates one authorized in-app Manager alert.
- **AC08-05:** Student can create a new linked recurrence complaint referencing a resolved original; original is unchanged and cannot be reopened.
- **AC08-06:** An outcome-disagreement follow-up can be directly escalated without 18h wait, but unrelated recurrence does not automatically bypass the threshold.
- **AC08-07:** Student cannot link another student's private complaint or access foreign IDs; Manager-only endpoints deny all other roles.
- **AC08-08:** Parallel worker polls, crashes and retries produce one transition and one logical notification; persisted failed jobs remain inspectable.
- **AC08-09:** Fake-clock tests cover exact threshold, one tick before/after, 18h vs 24h collision, resolution just before poll, and Warden activity just before eligibility.

## Open decisions / blockers
1. **18-hour Warden inactivity: OPEN — TEAM DECISION REQUIRED.** Is clock measured from submission while `Pending`, from last qualifying Warden action regardless of active status, or another agreed definition? Record decision in ADR/plan before AC08-01 is accepted. Do not change the 18h duration.
2. Decide how Warden actions affect manual eligibility, and whether eligibility is revoked after new Warden activity.
3. Define authoritative Manager routing when multiple Managers exist, including notification recipients.
4. Define permitted disagreement reason/validation and whether direct escalation is automatic upon creating the follow-up or requires explicit Student action; preserve FR-10 capability either way.
5. Clarify whether escalation is a terminal state and which Manager outcome workflow exists; do not invent a new lifecycle.

## Implementation standards (all slices)
- Follow `AGENTS.md`, `Final_PRD.md`, `architecture.md`, approved ADRs and S00 API conventions. Do not add unapproved functionality, roles, enums, microservices, or separate databases.
- Next.js Route Handlers + TypeScript + Zod; business services and module-specific repositories; Prisma + single Supabase PostgreSQL schema; centralized S01 JWT/RBAC. Use approved standardized error shape.
- Validate inputs on server; derive actor and role from verified session, not client fields. Enforce record-level authorization in service/repository queries; do not rely on hidden UI buttons.
- Provide migration/seed fixtures, responsive UI, unit/integration/auth tests, negative cases, human-reviewed PR, signed-off commits, workflow evidence and contribution log entries.
- Keep timestamps in UTC in storage; display local timezone consistently. Use deterministic fake clock for time tests. Do not claim NFR measurements without measured evidence.

## Evidence and definition of done
Capture: PR link and signed-off commits; requirements-to-test matrix; screenshots of allowed UI flows; test command/output; rejected/modified AI suggestion and human rationale; authorization/edge-case evidence; migration results; reviewer sign-off; updates to `SLICE_REGISTER.md` and shared logs. Done only when all applicable criteria pass, integration works, and unresolved decisions are either approved or visibly block affected acceptance criteria. No slice is marked implemented merely because this spec exists.
