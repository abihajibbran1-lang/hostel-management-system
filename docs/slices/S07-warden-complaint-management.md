# S07 — Warden Complaint Management

**Status:** Specified; ready after S06 | **Owner:** Member 3 (provisional) | **Reviewer:** Member 5 (confirm) | **Priority:** P0 | **Estimate:** 1.5–2 focused days (provisional)

## Goal and traceability
Implement **FR-08** Warden review, urgency correction, and complaint lifecycle `Pending → In Progress → Resolved / Escalated`. **FR-09** requires owners to see updates/outcomes; **BR-02** targets resolution within 24 hours; **BR-06** permits Warden urgency correction; **BR-07** makes resolved records immutable. S08 owns the *trigger and Manager routing* of escalation, so S07 must not invent escalation eligibility.

## Dependencies and boundaries
S00/S01, S06 complaint creation, status history, student tracking. S08 will integrate worker/manual escalation. No arbitrary Manager mutation endpoints or extra complaint states. Warden access is role-controlled and must follow agreed jurisdiction if multiple Wardens exist; Manager's escalation queue belongs to S08.

## Warden workflow
1. Authenticated Warden opens authorized complaint queue, filters by status/urgency, and views complaint detail.
2. Warden changes `Pending` to `In Progress`, recording actor and timestamp; may correct urgency with an auditable reason according to approved policy.
3. Warden records a resolution outcome and changes eligible active complaint to `Resolved`; transaction stores final outcome and status-history event.
4. Student owner sees updated status and outcome through S06; other students see nothing.
5. Once `Resolved`, all status/urgency/outcome edits to that complaint are rejected; new recurrence is S08 linked record, never reopening.

## Data / proposed API
- Reuse `complaints` and `complaint_status_history`; include Warden actor ID, event time, old/new state and rationale where relevant. Prefer history events for urgency changes as well; do not overwrite evidence.
- `GET /api/warden/complaints?status=...` — authorized Warden queue with bounded pagination.
- `GET /api/warden/complaints/:id` — authorized Warden detail.
- `PATCH /api/warden/complaints/:id/urgency` — change urgency with audit metadata.
- `POST /api/warden/complaints/:id/start` — `Pending` → `In Progress`.
- `POST /api/warden/complaints/:id/resolve` — active state → `Resolved` with nonempty resolution outcome.
- Routes are proposals; align with S00 conventions. Do not expose a generic unrestricted `PATCH status` or allow Warden to force `Escalated` without S08 rules.

## Implementation checklist
- [ ] Build Warden-only queue/detail and authorized query filters.
- [ ] Implement explicit allowed transitions and reject illegal/repeated transitions.
- [ ] Persist urgency corrections and resolution outcome in atomic status/history transactions.
- [ ] Record `last_warden_action_at` or equivalent authoritative action timestamp needed for S08; define exactly which Warden actions reset inactivity after team decision.
- [ ] Make resolved complaints immutable at service level (and guard against concurrent writes).
- [ ] Integrate S06 student tracking; add role/ownership and concurrency tests.

## Acceptance criteria
- **AC07-01:** Warden sees authorized complaint queue and can view mandatory details; Student/Kitchen Staff cannot call Warden routes.
- **AC07-02:** Allowed `Pending` → `In Progress` transition succeeds with actor/time history; illegal transitions fail without partial writes.
- **AC07-03:** Warden can correct urgency and an audit event preserves before/after value and actor.
- **AC07-04:** Resolving an active complaint requires a recorded outcome and writes history atomically; student owner can view it via S06.
- **AC07-05:** Resolved complaint cannot be edited or reopened; attempts do not change history or state.
- **AC07-06:** Concurrent updates cannot produce inconsistent status/history or duplicate transitions.
- **AC07-07:** Warden action timestamps are stored reliably for S08, but 18h interpretation remains undecided and is not assumed.

## Open decisions / blockers
1. Which Warden(s) can see and act on which complaints if more than one Warden exists? Approve jurisdiction/routing.
2. Is resolution allowed directly from `Pending`, or must `In Progress` occur first? Default to **Pending → In Progress → Resolved** until approved otherwise.
3. Which actions count as Warden activity for 18h inactivity? **OPEN — team decision**, tracked in S08. Record action history without pre-deciding policy.
4. Architecture mentions `Closed` as applicable, but PRD lifecycle contains no `Closed`; do not add it without approved ADR/PRD change.

## Implementation standards (all slices)
- Follow `AGENTS.md`, `Final_PRD.md`, `architecture.md`, approved ADRs and S00 API conventions. Do not add unapproved functionality, roles, enums, microservices, or separate databases.
- Next.js Route Handlers + TypeScript + Zod; business services and module-specific repositories; Prisma + single Supabase PostgreSQL schema; centralized S01 JWT/RBAC. Use approved standardized error shape.
- Validate inputs on server; derive actor and role from verified session, not client fields. Enforce record-level authorization in service/repository queries; do not rely on hidden UI buttons.
- Provide migration/seed fixtures, responsive UI, unit/integration/auth tests, negative cases, human-reviewed PR, signed-off commits, workflow evidence and contribution log entries.
- Keep timestamps in UTC in storage; display local timezone consistently. Use deterministic fake clock for time tests. Do not claim NFR measurements without measured evidence.

## Evidence and definition of done
Capture: PR link and signed-off commits; requirements-to-test matrix; screenshots of allowed UI flows; test command/output; rejected/modified AI suggestion and human rationale; authorization/edge-case evidence; migration results; reviewer sign-off; updates to `SLICE_REGISTER.md` and shared logs. Done only when all applicable criteria pass, integration works, and unresolved decisions are either approved or visibly block affected acceptance criteria. No slice is marked implemented merely because this spec exists.
