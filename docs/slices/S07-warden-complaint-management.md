# S07 — Warden Complaint Management

**Status:** Testing; implementation and local verification recorded; integration, evidence, decisions and acceptance pending | **Owner:** Member 3 (provisional) | **Reviewer:** Member 5 (confirm) | **Priority:** P0 | **Estimate:** 1.5–2 focused days (provisional)

## Goal and traceability
Implement **FR-08** Warden review, urgency correction, and complaint lifecycle `Pending → In Progress → Resolved / Escalated`. **FR-09** requires owners to see updates/outcomes; **BR-02** targets resolution within 24 hours; **BR-06** permits Warden urgency correction; **BR-07** makes resolved records immutable. S08 owns the *trigger and Manager routing* of escalation, so S07 must not invent escalation eligibility.

## Dependencies and boundaries
S00/S01, S06 complaint creation, status history, student tracking, and the verified room and house assignments service. S08 will integrate worker/manual escalation. No arbitrary Manager mutation endpoints or extra complaint states. The Manager escalation queue belongs to S08.

S06 captures the verified house when the student submits. The snapshot survives later transfers. S07 scopes list, detail, start, resolve and urgency correction to the Warden's current house assignments. The designated intake Warden can also handle complaints without a submission house. The intake configuration uses `COMPLAINT_INTAKE_WARDEN_ID`. Legacy complaints without a snapshot enter intake. Student-entered room numbers remain descriptive.

## Warden workflow
1. Authenticated Warden opens authorized complaint queue, filters by status/urgency, and views complaint detail.
2. Warden changes `Pending` to `In Progress`, recording actor and timestamp; may correct urgency with an auditable reason according to approved policy.
3. Warden records a resolution outcome and changes eligible active complaint to `Resolved`; transaction stores final outcome and status-history event.
4. Student owner sees updated status and outcome through S06; other students see nothing.
5. Once `Resolved`, all status/urgency/outcome edits to that complaint are rejected; new recurrence is S08 linked record, never reopening.

## Data / implemented API
- Reuses `complaints` and `complaint_status_history`; Warden actor ID, event time, old/new state and rationale are written to status history.
- Resolution outcome is written to `reason` of the `Resolved` history event. Urgency corrections are written as same-state history rows with structured JSON in `reason`.
- `GET /api/warden/complaints?status=...&urgencyFlag=...&limit=...&cursor=...` — authorized Warden queue with S02-style bounded pagination.
- `GET /api/warden/complaints/:id` — authorized Warden detail.
- `POST /api/warden/complaints/:id/start` — `Pending` → `In Progress`.
- `POST /api/warden/complaints/:id/resolve` — `In Progress` → `Resolved` with non-empty outcome.
- `PATCH /api/warden/complaints/:id/urgency` — urgency correction with required reason.
- No generic unrestricted `PATCH status`; Warden cannot force `Escalated`; no S08 escalation, assignment or Manager queue.

## Implementation checklist
- [x] **Implemented:** Warden-only queue/detail with status and urgency filters, S02-style cursor pagination, and verified identity from middleware headers.
- [x] **Implemented:** Explicit `Pending → In Progress` and `In Progress → Resolved` transitions; repeated, illegal and terminal-state mutations rejected.
- [x] **Implemented:** Transactional status/history writes with Warden actor, server timestamp, resolution outcome and structured urgency audit reason.
- [x] **Implemented:** Warden action timestamps recorded in `complaint_status_history` for future S08 use; no 18-hour inactivity rule decided.
- [x] **Implemented:** Resolved complaint immutability at service, repository and UI level.
- [x] **Implemented:** Warden UI at `/warden/complaints`; successful actions refresh both selected complaint and queue.
- [x] **Tested locally:** contract 5/5, complaint repository 16/16, service 11/11, API routes 7/7, UI view 7/7; full suite `npm.cmd test` 149/149; `npm.cmd run typecheck` passed.
- [x] **Reviewed:** three documented read-only review stages; findings recorded in `docs/WORKFLOW_EVIDENCE_LOG.md`.
- [x] **Final local checks:** `npm.cmd run lint` completed successfully with no lint findings; `npm.cmd run build` completed successfully with compilation, type validation, 14/14 static pages, build traces and optimization. The build included all S07 routes: `/api/warden/complaints`, `/api/warden/complaints/[id]`, `/api/warden/complaints/[id]/resolve`, `/api/warden/complaints/[id]/start`, `/api/warden/complaints/[id]/urgency`, and `/warden/complaints`.
- [ ] **Unverified:** real PostgreSQL/Supabase integration, real database concurrency, browser/E2E flow, live student visibility of S07 outcome, NFR-02/NFR-03 evidence, and reviewer/coordinator acceptance.

## Acceptance criteria
- **AC07-01:** Implemented and locally tested; Warden sees queue/detail, other roles denied. Real DB/browser verification pending.
- **AC07-02:** Implemented and locally tested; illegal transitions fail before repository writes. Real DB atomicity pending.
- **AC07-03:** Implemented; JSON `reason` preserves before/after value, note, actor and time. Encoding approval pending.
- **AC07-04:** Implemented; S06 reads resolved history `reason` as outcome. Live Warden-to-student integration pending.
- **AC07-05:** Implemented and locally tested at service/repository/UI level; real DB immutability pending.
- **AC07-06:** Conditional updates and rollback paths locally tested with fakes; real database concurrency unverified.
- **AC07-07:** Implemented via history actor/timestamps; S08 activity interpretation remains a team decision.

## Open decisions / blockers
1. **Warden jurisdiction (resolved):** Use current Warden house assignments, the verified house snapshot at submission, and a designated Warden intake queue for complaints without a house.
2. **Transition policy:** Use **Pending → In Progress → Resolved**, as specified by FR-08 and the current S07 workflow.
3. **Warden activity semantics (OPEN, S08):** Which actions count as Warden activity for 18-hour inactivity? S07 records actor/time history without deciding eligibility.
4. `Closed` remains outside the PRD lifecycle; do not add it without an approved ADR/PRD change.
5. **Urgency audit encoding:** Preserve same-state history rows with JSON in `reason`, including before/after urgency and the explanation.
6. **Warden action timestamps:** S07 preserves actor and time in `complaint_status_history`. Which events affect the inactivity clock remains an S08 decision.

## Implementation standards (all slices)
- Follow `AGENTS.md`, `Final_PRD.md`, `architecture.md`, approved ADRs and S00 API conventions. Do not add unapproved functionality, roles, enums, microservices, or separate databases.
- Next.js Route Handlers + TypeScript + Zod; business services and module-specific repositories; Prisma + single Supabase PostgreSQL schema; centralized S01 JWT/RBAC. Use approved standardized error shape.
- Validate inputs on server; derive actor and role from verified session, not client fields. Enforce record-level authorization in service/repository queries; do not rely on hidden UI buttons.
- Provide migration/seed fixtures, responsive UI, unit/integration/auth tests, negative cases, human-reviewed PR, signed-off commits, workflow evidence and contribution log entries.
- Keep timestamps in UTC in storage; display local timezone consistently. Use deterministic fake clock for time tests. Do not claim NFR measurements without measured evidence.

## Evidence and definition of done
Actual local evidence recorded in `docs/WORKFLOW_EVIDENCE_LOG.md` and `docs/GROUP_CONTRIBUTION_LOG.md`: contract, repository, service, API and UI implementation; focused test results; full suite `npm.cmd test` 149/149; `npm.cmd run typecheck` passed; three read-only review stages with corrections. Subsequent final checks on 24 Nov 2026 passed: `npm.cmd run lint` with no findings and `npm.cmd run build` with compilation, type validation, 14/14 static pages, build traces and optimization. The build included all S07 routes and `/warden/complaints`. No migration or schema change was made.

Not yet available: real database/Supabase integration, real concurrency proof, browser/E2E evidence, student visibility test with live data, NFR-02/NFR-03 measurements, PR/signed-off commits, screenshots, reviewer sign-off and coordinator acceptance. Done only when all applicable criteria pass, integration works, and unresolved decisions are approved or visibly block affected criteria. S07 remains Testing, not Complete.
