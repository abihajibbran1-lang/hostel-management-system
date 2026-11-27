# S10 — Meal Reservations and Collection Arrangements

**Status:** Specified; implementation not verified | **Owner:** Member 4 (provisional) | **Reviewer:** Member 3 (proposed) | **Priority:** P1 | **Estimate:** team to confirm

## Goal and traceability
FR-05, AC-FR-05-01, FR-15, BR-12, NFR-01; ADR-004.

Students with authorized university commitments reserve meals and send advance collection difficulty notices. Kitchen Staff receive records; Warden receives read-only audit copies. No payment or physical delivery.

## Dependencies and boundaries
- S09, S01, S02 notification contract. Verify merged contracts before implementation; use mocks only for isolated tests.
- Reuse centralized JWT/RBAC, Zod validation, standard API errors, one Prisma schema and owning module repository/service.
- Use local disposable PostgreSQL for integration testing until shared Supabase is approved. Do not apply or reset shared migrations without authorization.

## Workflows
1. Student selects meal date/type from published menu and submits reservation under approved eligibility policy.
2. Server derives student identity, validates eligibility and menu context, creates reservation and immutable allocation snapshots in one transaction.
3. Return confirmation ticket from stored snapshot values, not live menu joins.
4. Route reservation and advance collection difficulty notice to Kitchen Staff; provide Warden read-only audit copy using S02 and authorized views.
5. Persist notice details and delivery state; retry delivery without duplicating logical records.

## Data / proposed endpoints
`meal_reservations` (user_id, meal_date, meal_type, status Reserved/Cancelled/Fulfilled, reserved_at); `meal_allocation_snapshots` (reservation_id, optional menu_item_id, item_name_snapshot, meal_date_snapshot, meal_type_snapshot, positive portion_count, snapshot_created_at). Notice persistence is a proposed schema extension requiring review. Proposed routes: POST /api/meals/reservations; GET /api/meals/reservations/mine; POST /api/meals/collection-notices; GET /api/kitchen/meal-arrangements; GET /api/warden/meal-arrangements. Services: reserveMeal, submitCollectionNotice, listArrangements. Persist durable notification event if delivery is outside the transaction.

All route/service names are proposals; reconcile with existing repository contracts before coding. Do not create parallel models or regenerate the migration baseline.

## Implementation checklist
- [ ] Review PRD, architecture, ADRs, AGENTS.md and dependencies; record decisions for blocked criteria.
- [ ] Review existing Prisma schema and migrations; propose additive changes in PR if needed.
- [ ] Student selects meal date/type from published menu and submits reservation under approved eligibility policy.
- [ ] Server derives student identity, validates eligibility and menu context, creates reservation and immutable allocation snapshots in one transaction.
- [ ] Return confirmation ticket from stored snapshot values, not live menu joins.
- [ ] Route reservation and advance collection difficulty notice to Kitchen Staff; provide Warden read-only audit copy using S02 and authorized views.
- [ ] Persist notice details and delivery state; retry delivery without duplicating logical records.
- [ ] Implement role-specific UI, loading/empty/error states and server-side authorization.
- [ ] Run unit, integration and end-to-end checks; document results.

## Acceptance criteria
- **AC10-01:** Eligible student receives a confirmation ticket and stored reservation; Kitchen Staff receive the record and Warden can read its audit copy.
- **AC10-02:** Advance collection difficulty notice reaches Kitchen Staff and Warden audit view without changing unrelated reservations.
- **AC10-03:** Student cannot view or submit as another student; Warden cannot mutate arrangements; unauthorized roles are denied.
- **AC10-04:** Menu edits do not change existing ticket names, dates, meal types or quantities.
- **AC10-05:** Failed snapshot creation rolls back reservation; notification retries do not duplicate logical alerts.
- **AC10-06:** Eligibility and advance-notice validation follow approved policy; affected tests remain blocked until policy is recorded.

## Open decisions / blockers
1. Confirm eligibility evidence for authorized university commitments and who verifies it.
2. Confirm reservation cutoff, duplicate reservation policy, advance notice timing and fixed portion quantities.
3. Confirm notice fields, whether notice must reference a reservation, staff recipient routing and permitted cancellation/fulfillment transitions; schema statuses alone do not authorize extra UI actions.

Do not silently select business rules. Continue independent work; mark affected criteria blocked until team approval.

## Test plan
Unit: eligibility and payload validation after approval. PostgreSQL: snapshot atomicity, history integrity, ownership. Integration: S02 routing/retries. E2E: student ticket, Kitchen Staff receipt, Warden read-only audit.

Use synthetic accounts and data; test direct API access as well as UI. Run existing regression suite and record exact commands/results. Mock-only tests do not satisfy PostgreSQL or storage integration criteria.

## Evidence and definition of done
- Record slice ID, owner, reviewer, branch, commit/PR, AI prompts and outputs, human review and revisions/rejections in workflow evidence log.
- Attach acceptance criterion results, screenshots or test logs, migration review and unresolved failures; redact credentials and personal data. Update group contribution log and slice register.
- Use signed-off commits and reviewed PR; merge only after required checks pass. No completion claim while mandatory acceptance criteria are blocked.
- Verify integration against shared Supabase when available; report NFR measurements and limitations rather than claiming compliance without evidence.
