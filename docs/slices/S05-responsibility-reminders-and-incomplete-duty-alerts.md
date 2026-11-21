# S05 — Responsibility Reminders and Incomplete-Duty Alerts

**Status:** Specified; blocked decisions listed below | **Owner:** Member 2 (provisional) | **Reviewer:** Member 1 (confirm) | **Priority:** P1 | **Estimate:** 1.5–2.5 focused days (provisional)

## Goal and traceability
Deliver **FR-03** reminders at 24 hours and 1 hour before agreed responsibility deadlines and **FR-04** Warden alerts after at least one reminder when non-completion is confirmed by assigned-student self-report or a team-approved automated timeout. **BR-08/NFR-01** prohibit leaking personal schedules. The separate FR-03 activity reminder at 30 minutes before activities belongs to S03's schedule integration with S02, **not** to responsibility reminder processing in S05.

## Dependencies and boundaries
- S00/S01: application, persistence, auth/RBAC.
- S02: deduplicated in-app notification service and authenticated inbox; stable event key contract.
- S04: agreed responsibilities, assignments, due times, status, authorized roommate participation.
- Approved five-minute Node.js `node-cron` worker and durable `worker_job_runs` foundation; worker calls **Schedules & Responsibilities service** (not domain tables directly).
- Excludes new assignment/consent workflows (S04), personal schedule disclosure, complaint escalation (S08), SMS/email, or invented default non-completion timeout.

## User/system workflow
1. S04 saves a responsibility, its assignees, due timestamp, and completion/cancellation state.
2. Every five minutes the worker checks due responsibility reminder events using the owning service. For each eligible assignment, create a 24h and 1h in-app reminder at the first eligible poll; if the responsibility is created after a reminder threshold, do **not** backfill stale reminders without a documented team decision.
3. Exclude responsibilities/assignments completed or cancelled before delivery. For deadlines less than 24h away, send only eligible future reminders according to approved catch-up policy.
4. Assigned student can explicitly report non-completion (S04 permission checks apply). If at least one reminder was delivered and non-completion is confirmed, send a single Warden alert.
5. Alternatively, an **approved** automated timeout may confirm non-completion; no automatic threshold may be coded until decided. Warden sees limited duty context, not another student's personal schedule.
6. Repeated worker polls, crashes, retries and duplicate confirmations do not produce duplicate logical notifications.

## Proposed data / service contract
- Reuse `responsibilities`, `responsibility_assignments`, `notifications`, `worker_job_runs` and existing room membership. Add minimal event/confirmation fields or records only after S04 and S02 schemas are reviewed; do not create parallel responsibility tables.
- Service methods (proposed): `listDueResponsibilityEvents(now)`, `deliverResponsibilityReminder(assignmentId, kind, now)`, `confirmResponsibilityIncomplete(assignmentId, actor, now)`, `alertWardenOfConfirmedNonCompletion(responsibilityId, now)`.
- Event dedupe keys: `responsibility:{id}:assignment:{userId}:reminder:24h`, similarly `1h`; Warden alert `responsibility:{id}:noncompletion:warden:{wardenId}`. If due date can change, define event versioning so stale events are invalidated and genuine new deadlines can be notified once; agree this before coding.
- Proposed `POST /api/responsibilities/:id/report-incomplete` (authorized assignee only); `GET /api/warden/responsibility-alerts` only if S02 inbox alone is insufficient. No public worker trigger endpoint.
- Worker: 5-minute poll, persisted state, PostgreSQL atomic claiming/locking, idempotency, initial attempt + up to 3 retries at 1/5/15 minutes, sequential processing and restart recovery; retain failed jobs for review.

## Implementation checklist
- [ ] Approve self-report semantics, automated timeout and Warden recipient mapping.
- [ ] Agree responsibility/assignment completion semantics, changed-deadline behavior, late-created duty policy.
- [ ] Implement due-event selection, transactional state recheck and stable dedupe keys.
- [ ] Add worker handler invoking owning service; use persisted job claiming, retry, recovery.
- [ ] Connect S02 notifications and student self-report UI/API.
- [ ] Add Warden alert visibility with minimum necessary duty details.
- [ ] Add unit, integration, worker-restart, race and RBAC tests.

## Acceptance criteria (testable)
- **AC05-01:** A pending responsibility due at `T` yields one eligible in-app reminder per assigned student at the first worker poll after `T-24h`, and one after `T-1h`, under approved catch-up rules.
- **AC05-02:** Completed/cancelled responsibilities produce no later reminders or non-completion alerts.
- **AC05-03:** A verified assignee can self-report non-completion; a different-room student cannot, and cannot discover the record via ID probing.
- **AC05-04:** A Warden alert occurs only after at least one reminder and a confirmed non-completion event; duplicate reports/polls produce one logical alert per intended Warden.
- **AC05-05:** Approved automated timeout (once defined) is enforced using fake-clock boundary tests; **blocked until team decision**.
- **AC05-06:** Notifications do not expose private schedules; Warden recipient and roommate privacy are verified.
- **AC05-07:** Worker restart, duplicate polling, concurrent claim attempts and retry do not double-deliver; exhausted retries remain auditable.

## Open decisions / blockers
1. **FR-04 automated confirmation timeout: OPEN.** Specify exact reference timestamp, duration and whether it applies per assignee or responsibility. Self-report path can proceed independently.
2. **Reminder catch-up and deadline edits: OPEN.** Decide behavior when a duty is created late, deadline changes or assignments change.
3. **Warden routing and who can report incomplete: OPEN** unless resolved in S04.
4. Clarify whether one assignee's non-completion triggers one responsibility-wide alert or individual alerts; preserve privacy.

## Implementation standards (all slices)
- Follow `AGENTS.md`, `Final_PRD.md`, `architecture.md`, approved ADRs and S00 API conventions. Do not add unapproved functionality, roles, enums, microservices, or separate databases.
- Next.js Route Handlers + TypeScript + Zod; business services and module-specific repositories; Prisma + single Supabase PostgreSQL schema; centralized S01 JWT/RBAC. Use approved standardized error shape.
- Validate inputs on server; derive actor and role from verified session, not client fields. Enforce record-level authorization in service/repository queries; do not rely on hidden UI buttons.
- Provide migration/seed fixtures, responsive UI, unit/integration/auth tests, negative cases, human-reviewed PR, signed-off commits, workflow evidence and contribution log entries.
- Keep timestamps in UTC in storage; display local timezone consistently. Use deterministic fake clock for time tests. Do not claim NFR measurements without measured evidence.

## Evidence and definition of done
Capture: PR link and signed-off commits; requirements-to-test matrix; screenshots of allowed UI flows; test command/output; rejected/modified AI suggestion and human rationale; authorization/edge-case evidence; migration results; reviewer sign-off; updates to `SLICE_REGISTER.md` and shared logs. Done only when all applicable criteria pass, integration works, and unresolved decisions are either approved or visibly block affected acceptance criteria. No slice is marked implemented merely because this spec exists.
