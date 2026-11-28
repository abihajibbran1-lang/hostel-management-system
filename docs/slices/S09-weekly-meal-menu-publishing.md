# S09 — Weekly Meal Menu Publishing

**Status:** Testing | **Owner:** Abiha | **Requested reviewer:** abihajibbran1-lang | **Priority:** P1 | **Estimate:** team to confirm | **AI workflow:** HTL

## Goal and traceability
FR-15, BR-12, NFR-01; ADR-004.

Kitchen Staff create, edit and publish weekly menus; Students view published menus by date. No reservations or audits in this slice.

## Dependencies and boundaries
- S00, S01. Verify merged contracts before implementation; use mocks only for isolated tests.
- Reuse centralized JWT/RBAC, Zod validation, standard API errors, one Prisma schema and owning module repository/service.
- Use local disposable PostgreSQL for integration testing until shared Supabase is approved. Do not apply or reset shared migrations without authorization.

## Workflows
1. Kitchen Staff selects a week and creates a Draft menu; enters breakfast, lunch and dinner items for each day.
2. Validate dates within the selected week, meal type and nonempty item names; publish through an authorized service.
3. Students select a date and see only published menu items; no edit controls or draft access.
4. Kitchen Staff edits the template without rewriting any existing reservation snapshot or portion log. Coordinate the edit contract with S10/S11.

## Data / proposed endpoints
`weekly_menus` (unique week_start_date, Draft/Published/Archived, created_by); `menu_items` (weekly_menu_id, meal_date, meal_type, item_name, optional description). Preserve references needed by history. Proposed routes: GET /api/meals/menu?date=; POST /api/meals/menus; PATCH /api/meals/menus/:id; POST /api/meals/menus/:id/publish. Services: getPublishedMenu, saveMenu, publishMenu. Use transactions for multi-item writes.

The implemented routes use those paths and add `GET /api/meals/menus?weekStart=YYYY-MM-DD` for Kitchen Staff. Student reads return the published entries for the requested date. Kitchen writes derive the creator from the session. The additive migration creates only the two S09 tables.

## Implementation checklist
- [x] Review PRD, architecture, ADRs, dependencies, and existing Prisma schema.
- [x] Add the menu migration, Kitchen Staff draft/edit/publish flow, and Student date view.
- [x] Validate complete publication, date and meal slots, and server authorization.
- [x] Preserve menu item IDs on edits for the future S10/S11 history references.
- [ ] Verify the cross-slice snapshot acceptance check once S10 and S11 are implemented.

## Acceptance criteria
- **AC09-01:** Kitchen Staff can create, edit and publish a valid weekly menu covering all seven days and three meal types.
- **AC09-02:** Students can read published menus by date but cannot read drafts or mutate menus, including via direct API calls.
- **AC09-03:** Invalid meal types, dates outside the week and blank names are rejected; duplicate week creation cannot create two templates.
- **AC09-04:** A failed multi-item save leaves no partial menu changes.
- **AC09-05:** Editing a published menu changes the current display but leaves existing S10 tickets and S11 logs unchanged (cross-slice integration gate).

## Approved decisions and remaining gate

Abiha approved on 27 November 2026. The hostel week is Monday–Sunday in `Asia/Karachi`. Each date has one entry for breakfast, lunch and dinner, and an entry can describe multiple dishes. A draft needs all 21 entries before publishing. Approved edits to published entries appear after a successful atomic save. Each edit keeps the existing item ID and slot. All Kitchen Staff manage the shared menu, and the original creator is recorded.

S10 and S11 own immutable reservation and portion snapshots. During S11, a local PostgreSQL regression confirmed that edits to the published menu preserve an existing S10 ticket and S11 portion log and discrepancy. See [test evidence](../test.md).

## Manual verification

1. Apply the migrations to disposable local PostgreSQL, provision active Kitchen Staff and Student test accounts, and run `npm.cmd run dev`.
2. As Kitchen Staff, open **Manage weekly menu**, select a week, create a draft and save at least one meal. As Student, open **Meal menu** for that date and confirm that the draft stays hidden.
3. Fill all 21 names and select **Save and publish**. As Student, check that one date shows breakfast, lunch and dinner. Change an item as Kitchen Staff and refresh the Student view to confirm the change is visible immediately.

## Test plan
Unit: date/meal validation. PostgreSQL: unique week, atomic save, draft visibility. E2E: Kitchen Staff publish then Student view. Regression: S10/S11 snapshot immutability.

Use synthetic accounts and data; test direct API access as well as UI. Run existing regression suite and record exact commands/results. Mock-only tests do not satisfy PostgreSQL or storage integration criteria.

## Evidence and definition of done
- Record slice ID, owner, reviewer, branch, commit/PR, AI prompts and outputs, human review and revisions/rejections in workflow evidence log.
- Attach acceptance criterion results, screenshots or test logs, migration review and unresolved failures; redact credentials and personal data. Update group contribution log and slice register.
- Use signed-off commits and reviewed PR; merge only after required checks pass. No completion claim while mandatory acceptance criteria are blocked.
- Verify integration against shared Supabase when available; report NFR measurements and limitations rather than claiming compliance without evidence.
