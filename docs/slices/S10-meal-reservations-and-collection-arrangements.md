# S10 — Meal Reservations and Collection Arrangements

**Status:** Testing | **Owner:** Abiha | **Requested reviewer:** abihajibbran1-lang | **Priority:** P1 | **Estimate:** team to confirm | **AI workflow:** HTL

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

## Approved decisions

Abiha approved the policies on 27 November 2026. A Warden verifies a university commitment outside the app and records approval for the student and meal slot. The app retains the approving Warden and timestamp. Wardens can approve within their assigned houses. The Warden designated by `MEAL_INTAKE_WARDEN_ID` handles students without a verified house.

Reservations close at 21:00 Asia/Karachi the previous day. One reservation stores one portion per student, date and meal type, and retries return the original ticket. A notice requires a date, meal type and explanation, with an optional reference to the student's own ticket for that slot. Notices may be sent up to and including one hour before collection starts. A notice retry with the same request ID returns the original record. A changed payload requires a new request ID.

Initial collection hours are breakfast 08:00–09:00, lunch 14:00–15:00 and dinner 20:00–21:00 in Asia/Karachi. Managers maintain these hours in **Meal collection hours**. Changes affect new notice submissions. Previous notices and tickets are preserved.

Active Kitchen Staff receive one notification per reservation or notice per account. If no active Kitchen Staff are available or notification persistence fails, the transaction rolls back and the student can retry. Warden audit copies are read-only and scoped to the verified house recorded at submission or designated intake. The separate Warden approval action does not edit audit records. Cancellation, fulfillment, and S11 portion audit remain outside S10.

## Implementation and manual verification

The migration adds reservation, allocation snapshot, approval, notice and collection-window tables. The existing S09 published menu lookup supplies the slot. S02 notifications commit with the arrangement transaction. The API endpoints in the data section are implemented, alongside `POST /api/warden/meal-approvals` and Manager-only `GET/PATCH /api/manager/meal-collection-windows`. See [test evidence](../test.md).

1. Migrate disposable local PostgreSQL and run `npm.cmd run dev`. Provision Student, Warden, Kitchen Staff and Manager accounts. Verify the student's house and assign its Warden, or configure `MEAL_INTAKE_WARDEN_ID`.
2. Publish a future S09 menu. In **Meal audit and approvals**, record eligibility for that Student and meal. In **My meal arrangements**, reserve and confirm that the returned ticket has one portion. Repeat the reservation to confirm the same ticket is returned.
3. Send a notice before the cutoff. Verify the Kitchen Staff queue and inbox and the Warden audit copy. As a Manager, change the opening and closing times and refresh the Student view.
4. Edit the published menu and check that the existing reservation ticket still contains the original name and portion count.

## Test plan
Unit: eligibility and payload validation after approval. PostgreSQL: snapshot atomicity, history integrity, ownership. Integration: S02 routing/retries. E2E: student ticket, Kitchen Staff receipt, Warden read-only audit.

Use synthetic accounts and data; test direct API access as well as UI. Run existing regression suite and record exact commands/results. Mock-only tests do not satisfy PostgreSQL or storage integration criteria.

## Evidence and definition of done
- Record slice ID, owner, reviewer, branch, commit/PR, AI prompts and outputs, human review and revisions/rejections in workflow evidence log.
- Attach acceptance criterion results, screenshots or test logs, migration review and unresolved failures; redact credentials and personal data. Update group contribution log and slice register.
- Use signed-off commits and reviewed PR; merge only after required checks pass. No completion claim while mandatory acceptance criteria are blocked.
- Verify integration against shared Supabase when available; report NFR measurements and limitations rather than claiming compliance without evidence.
