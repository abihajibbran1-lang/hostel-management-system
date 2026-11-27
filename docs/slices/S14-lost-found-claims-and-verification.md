# S14 — Lost & Found Claims and Verification

**Status:** Specified; implementation not verified | **Owner:** Member 5 (provisional) | **Reviewer:** Member 3 (proposed) | **Priority:** P1 | **Estimate:** team to confirm

## Goal and traceability
FR-14 (claims/verification), BR-11, NFR-01; approved Lost & Found architecture.

Students submit ownership claims; Warden verifies and records return. Multiple claims may exist but only one may be approved/handed over. No direct student contact exchange.

## Dependencies and boundaries
- S13, S01. Verify merged contracts before implementation; use mocks only for isolated tests.
- Reuse centralized JWT/RBAC, Zod validation, standard API errors, one Prisma schema and owning module repository/service.
- Use local disposable PostgreSQL for integration testing until shared Supabase is approved. Do not apply or reset shared migrations without authorization.

## Workflows
1. Student opens eligible report and submits ownership claim description; server derives claimant identity.
2. Create Pending claim; claimant sees own claim only and Warden sees authorized verification queue.
3. Warden reviews evidence and approves or rejects using transaction that locks item and rechecks state; enforce one approved claim per item at DB level.
4. Approved claim moves item to Claimed under agreed workflow; Warden records actual handover and marks item Returned atomically.
5. Retain claim review actor/time and handover history; public listing never exposes contact details or claim evidence.

## Data / proposed endpoints
`lost_found_claims` (item_id, claimant_user_id, claim_description, status Pending/Approved/Rejected, reviewed_by, reviewed_at, handover_at, timestamps); reuse S13 items. Proposed partial unique index on approved claim per item and transactional state checks. Proposed routes: POST /api/lost-found/items/:id/claims; GET /api/lost-found/claims/mine; GET /api/warden/lost-found/claims; POST /api/warden/lost-found/claims/:id/review; POST /api/warden/lost-found/claims/:id/handover. Services: submitClaim, reviewClaim, recordHandover.

All route/service names are proposals; reconcile with existing repository contracts before coding. Do not create parallel models or regenerate the migration baseline.

## Implementation checklist
- [ ] Review PRD, architecture, ADRs, AGENTS.md and dependencies; record decisions for blocked criteria.
- [ ] Review existing Prisma schema and migrations; propose additive changes in PR if needed.
- [ ] Student opens eligible report and submits ownership claim description; server derives claimant identity.
- [ ] Create Pending claim; claimant sees own claim only and Warden sees authorized verification queue.
- [ ] Warden reviews evidence and approves or rejects using transaction that locks item and rechecks state; enforce one approved claim per item at DB level.
- [ ] Approved claim moves item to Claimed under agreed workflow; Warden records actual handover and marks item Returned atomically.
- [ ] Retain claim review actor/time and handover history; public listing never exposes contact details or claim evidence.
- [ ] Implement role-specific UI, loading/empty/error states and server-side authorization.
- [ ] Run unit, integration and end-to-end checks; document results.

## Acceptance criteria
- **AC14-01:** Student can submit a valid claim and view own claim status; cannot read other claim evidence or impersonate another claimant.
- **AC14-02:** Only authorized Warden can approve/reject or record handover; review actor/time persisted.
- **AC14-03:** Multiple pending claims are supported; concurrent approvals result in at most one approved claim.
- **AC14-04:** Handover requires approved claim; marks item Returned and records handover once in one transaction.
- **AC14-05:** Returned item cannot be handed over again or accept new claims; retry does not duplicate return.
- **AC14-06:** Public listing and other student responses mask finder/claimant contact information and claim evidence.
- **AC14-07:** Failed review/handover rolls back item and claim state together.

## Open decisions / blockers
1. Confirm which report types are claimable, whether reporter can claim own report and repeat claim policy.
2. Confirm Warden jurisdiction, verification evidence requirements and handling of other pending claims after approval/return.
3. Confirm whether approval can be reversed and whether Closed is used; do not invent extra state transitions.

Do not silently select business rules. Continue independent work; mark affected criteria blocked until team approval.

## Test plan
Unit: role/state guards and claim validation. PostgreSQL: concurrent approvals, uniqueness, handover rollback and retries. E2E: report, claim, Warden review and return; privacy regression.

Use synthetic accounts and data; test direct API access as well as UI. Run existing regression suite and record exact commands/results. Mock-only tests do not satisfy PostgreSQL or storage integration criteria.

## Evidence and definition of done
- Record slice ID, owner, reviewer, branch, commit/PR, AI prompts and outputs, human review and revisions/rejections in workflow evidence log.
- Attach acceptance criterion results, screenshots or test logs, migration review and unresolved failures; redact credentials and personal data. Update group contribution log and slice register.
- Use signed-off commits and reviewed PR; merge only after required checks pass. No completion claim while mandatory acceptance criteria are blocked.
- Verify integration against shared Supabase when available; report NFR measurements and limitations rather than claiming compliance without evidence.
