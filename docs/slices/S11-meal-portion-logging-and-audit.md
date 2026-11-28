# S11 — Meal Portion Logging and Warden Audit

**Status:** Testing | **Owner:** Abiha | **Requested reviewer:** abihajibbran1-lang | **Priority:** P1 | **Estimate:** team to confirm | **AI workflow:** HTL

## Goal and traceability
FR-06, AC-FR-06-02, BR-09, BR-12, NFR-01; ADR-004.

Kitchen Staff log fixed portion allocations; Warden verifies them and creates permanent discrepancy records on failure. No inventory or procurement system.

## Dependencies and boundaries
- S09, S10, S01. Verify merged contracts before implementation; use mocks only for isolated tests.
- Reuse centralized JWT/RBAC, Zod validation, standard API errors, one Prisma schema and owning module repository/service.
- Use local disposable PostgreSQL for integration testing until shared Supabase is approved. Do not apply or reset shared migrations without authorization.

## Workflows
1. Kitchen Staff selects meal date/type and item, records allocation using approved fixed portion standard.
2. Server captures historical item name and meal context at logging time; actor and timestamp are server derived.
3. Warden opens authorized log and records verification against approved expected quantity and observed quantity.
4. Failed verification creates permanent discrepancy linked to the original log; successful verification records audit evidence without a false discrepancy.
5. Keep original log and discrepancy history intact across menu edits.

## Data / proposed endpoints
`meal_portion_logs` (meal_date, meal_type, optional menu_item_id, item_name_snapshot, portion_count, logged_by, logged_at); `meal_portion_discrepancies` (portion_log_id, recorded_by, expected_portions, observed_portions, optional description, recorded_at). Architecture does not specify successful-audit persistence: propose minimal audit record for review. Proposed routes: POST /api/kitchen/portion-logs; GET /api/warden/portion-logs; POST /api/warden/portion-logs/:id/audit. Services: logPortions, verifyPortions. Audit and discrepancy writes atomic.

All route/service names are proposals; reconcile with existing repository contracts before coding. Do not create parallel models or regenerate the migration baseline.

## Implementation checklist
- [ ] Review PRD, architecture, ADRs, AGENTS.md and dependencies; record decisions for blocked criteria.
- [ ] Review existing Prisma schema and migrations; propose additive changes in PR if needed.
- [ ] Kitchen Staff selects meal date/type and item, records allocation using approved fixed portion standard.
- [ ] Server captures historical item name and meal context at logging time; actor and timestamp are server derived.
- [ ] Warden opens authorized log and records verification against approved expected quantity and observed quantity.
- [ ] Failed verification creates permanent discrepancy linked to the original log; successful verification records audit evidence without a false discrepancy.
- [ ] Keep original log and discrepancy history intact across menu edits.
- [ ] Implement role-specific UI, loading/empty/error states and server-side authorization.
- [ ] Run unit, integration and end-to-end checks; document results.

## Acceptance criteria
- **AC11-01:** Kitchen Staff can record a valid fixed allocation with historical meal context.
- **AC11-02:** Only Warden can perform verification; Kitchen Staff cannot forge auditor identity or delete discrepancies.
- **AC11-03:** Failed audit creates a permanent discrepancy linked to the correct log with expected/observed counts and actor/time.
- **AC11-04:** Successful audit does not create a discrepancy.
- **AC11-05:** Menu edits do not change historical portion logs or discrepancy context.
- **AC11-06:** A failed transaction leaves no partial audit; retry of the same submission does not duplicate its discrepancy.

## Approved decisions and implementation

Abiha approved the plan on 28 November 2026. A portion is one whole standard serving. Kitchen Staff logs a positive planned count for a published meal slot. The log snapshots the name, date and meal type. The Warden compares the observed count with the stored plan. Zero observed is valid, and any difference is a failure.

Each log has one final audit record, including passes. An identical retry by the same Warden returns the existing result. A changed submission conflicts. Failed audits create one discrepancy in the same transaction. Logs, audits and discrepancies have no update or delete actions. Handle mistakes outside the app until a correction workflow is approved.

Active Wardens can audit shared kitchen logs hostel-wide. The API returns staff attribution and meal counts. It does not return Student identities or reservation records. The additive migration introduces `meal_portion_audits` for final evidence, alongside the two architecture-defined tables.

## Manual verification

1. Apply migrations to a disposable local PostgreSQL database, provision active Kitchen Staff and Warden accounts, and run `npm.cmd run dev`.
2. Publish a weekly menu. As Kitchen Staff, open **Meal portion logs**, choose a date, and log two allocations for a published meal.
3. As Warden, open **Meal portion audits** for that date. Record a matching count for one allocation and zero for the other. The matching audit should pass without a discrepancy. The failed audit should retain a discrepancy ID and both counts.
4. Edit the published meal name and reload the audit page. Verify the logs retain their original names, counts and discrepancy IDs. If an S10 ticket exists for that meal, verify its snapshot still displays the original name.

## Test plan
Unit: quantity validation and approved audit rules. PostgreSQL: immutable history, audit rollback, foreign keys and duplicate submission. E2E: Kitchen Staff log, Warden pass/fail audit, menu edit regression.

Use synthetic accounts and data; test direct API access as well as UI. Run existing regression suite and record exact commands/results. Mock-only tests do not satisfy PostgreSQL or storage integration criteria.

## Evidence and definition of done
- Record slice ID, owner, reviewer, branch, commit/PR, AI prompts and outputs, human review and revisions/rejections in workflow evidence log.
- Attach acceptance criterion results, screenshots or test logs, migration review and unresolved failures; redact credentials and personal data. Update group contribution log and slice register.
- Use signed-off commits and reviewed PR; merge only after required checks pass. No completion claim while mandatory acceptance criteria are blocked.
- Verify integration against shared Supabase when available; report NFR measurements and limitations rather than claiming compliance without evidence.
