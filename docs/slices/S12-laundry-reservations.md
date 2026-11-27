# S12 — Laundry Reservations

**Status:** Specified; implementation not verified | **Owner:** Member 5 (provisional) | **Reviewer:** Member 1 (proposed) | **Priority:** P0 | **Estimate:** team to confirm

## Goal and traceability
FR-13, BR-10, NFR-01; ADR-002.

Students view machine/date availability, reserve fixed 60-minute slots and cancel their own future reservations. No payments, variable duration or new staff administration workflow.

## Dependencies and boundaries
- S00, S01. Verify merged contracts before implementation; use mocks only for isolated tests.
- Reuse centralized JWT/RBAC, Zod validation, standard API errors, one Prisma schema and owning module repository/service.
- Use local disposable PostgreSQL for integration testing until shared Supabase is approved. Do not apply or reset shared migrations without authorization.

## Workflows
1. Load active machines and current slot availability from PostgreSQL; show available, booked and unavailable slots without other student identities.
2. Student selects a future available slot; server derives actor and starts a transaction.
3. Lock the slot row using PostgreSQL row locking, recheck machine activity, time and availability; insert Confirmed reservation and update slot to Booked atomically.
4. On conflict return standardized conflict error and refresh availability.
5. Cancellation locks the same slot and verifies owner, future start and active reservation; mark Cancelled and release slot if still bookable, retaining history.

## Data / proposed endpoints
`laundry_machines` (name, location, is_active); `laundry_slots` (machine_id, start_at, end_at, status Available/Unavailable/Booked, unique machine_id+start_at); `laundry_reservations` (slot_id, user_id, status Confirmed/Cancelled/Completed, booked_at, cancelled_at). Add reviewed PostgreSQL partial unique index for active reservation per slot. Ensure slot generation cannot create overlapping intervals for one machine (fixed aligned grid or approved DB exclusion constraint). Proposed routes: GET /api/laundry/machines; GET /api/laundry/slots?machineId=&date=; POST /api/laundry/reservations; GET /api/laundry/reservations/mine; POST /api/laundry/reservations/:id/cancel. Services: listSlots, reserveSlot, cancelReservation. No Redis locks.

All route/service names are proposals; reconcile with existing repository contracts before coding. Do not create parallel models or regenerate the migration baseline.

## Implementation checklist
- [ ] Review PRD, architecture, ADRs, AGENTS.md and dependencies; record decisions for blocked criteria.
- [ ] Review existing Prisma schema and migrations; propose additive changes in PR if needed.
- [ ] Load active machines and current slot availability from PostgreSQL; show available, booked and unavailable slots without other student identities.
- [ ] Student selects a future available slot; server derives actor and starts a transaction.
- [ ] Lock the slot row using PostgreSQL row locking, recheck machine activity, time and availability; insert Confirmed reservation and update slot to Booked atomically.
- [ ] On conflict return standardized conflict error and refresh availability.
- [ ] Cancellation locks the same slot and verifies owner, future start and active reservation; mark Cancelled and release slot if still bookable, retaining history.
- [ ] Implement role-specific UI, loading/empty/error states and server-side authorization.
- [ ] Run unit, integration and end-to-end checks; document results.

## Acceptance criteria
- **AC12-01:** Availability reflects committed bookings and does not expose other students’ identities.
- **AC12-02:** Two concurrent requests for one slot yield exactly one confirmed reservation; loser receives conflict.
- **AC12-03:** Different machines can be booked for the same time; overlapping slots on the same machine cannot be created/booked.
- **AC12-04:** Inactive machines, past slots, unavailable slots and invalid IDs cannot be booked.
- **AC12-05:** Owner can cancel future reservation and eligible slot becomes available; cancelled history retained.
- **AC12-06:** Other students cannot cancel or inspect private reservation details; cancellation of past slots rejected.
- **AC12-07:** Booking/cancellation failure rolls back both slot and reservation state; concurrent cancel/book leaves consistent state.

## Open decisions / blockers
1. Confirm operating hours, timezone, slot alignment, booking horizon and machine seed data.
2. Confirm slot generation ownership and completion policy; do not add an unapproved machine management UI.

Do not silently select business rules. Continue independent work; mark affected criteria blocked until team approval.

## Test plan
Unit: time boundaries and authorization. Real PostgreSQL with independent connections: simultaneous bookings, cancel/book race, rollback, partial unique index and overlapping-slot prevention. E2E: availability, booking, cancellation and refresh.

Use synthetic accounts and data; test direct API access as well as UI. Run existing regression suite and record exact commands/results. Mock-only tests do not satisfy PostgreSQL or storage integration criteria.

## Evidence and definition of done
- Record slice ID, owner, reviewer, branch, commit/PR, AI prompts and outputs, human review and revisions/rejections in workflow evidence log.
- Attach acceptance criterion results, screenshots or test logs, migration review and unresolved failures; redact credentials and personal data. Update group contribution log and slice register.
- Use signed-off commits and reviewed PR; merge only after required checks pass. No completion claim while mandatory acceptance criteria are blocked.
- Verify integration against shared Supabase when available; report NFR measurements and limitations rather than claiming compliance without evidence.
