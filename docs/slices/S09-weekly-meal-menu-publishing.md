# S09 — Weekly Meal Menu Publishing

**Status:** Specified; implementation not verified | **Owner:** Member 4 (provisional) | **Reviewer:** Member 5 (proposed) | **Priority:** P1 | **Estimate:** team to confirm

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

All route/service names are proposals; reconcile with existing repository contracts before coding. Do not create parallel models or regenerate the migration baseline.

## Implementation checklist
- [ ] Review PRD, architecture, ADRs, AGENTS.md and dependencies; record decisions for blocked criteria.
- [ ] Review existing Prisma schema and migrations; propose additive changes in PR if needed.
- [ ] Kitchen Staff selects a week and creates a Draft menu; enters breakfast, lunch and dinner items for each day.
- [ ] Validate dates within the selected week, meal type and nonempty item names; publish through an authorized service.
- [ ] Students select a date and see only published menu items; no edit controls or draft access.
- [ ] Kitchen Staff edits the template without rewriting any existing reservation snapshot or portion log. Coordinate the edit contract with S10/S11.
- [ ] Implement role-specific UI, loading/empty/error states and server-side authorization.
- [ ] Run unit, integration and end-to-end checks; document results.

## Acceptance criteria
- **AC09-01:** Kitchen Staff can create, edit and publish a valid weekly menu covering all seven days and three meal types.
- **AC09-02:** Students can read published menus by date but cannot read drafts or mutate menus, including via direct API calls.
- **AC09-03:** Invalid meal types, dates outside the week and blank names are rejected; duplicate week creation cannot create two templates.
- **AC09-04:** A failed multi-item save leaves no partial menu changes.
- **AC09-05:** Editing a published menu changes the current display but leaves existing S10 tickets and S11 logs unchanged (cross-slice integration gate).

## Open decisions / blockers
1. Confirm week start day, hostel timezone and whether multiple dishes per meal are required.
2. Confirm whether edits to published menus appear immediately or require republishing; do not invent an approval role.

Do not silently select business rules. Continue independent work; mark affected criteria blocked until team approval.

## Test plan
Unit: date/meal validation. PostgreSQL: unique week, atomic save, draft visibility. E2E: Kitchen Staff publish then Student view. Regression: S10/S11 snapshot immutability.

Use synthetic accounts and data; test direct API access as well as UI. Run existing regression suite and record exact commands/results. Mock-only tests do not satisfy PostgreSQL or storage integration criteria.

## Evidence and definition of done
- Record slice ID, owner, reviewer, branch, commit/PR, AI prompts and outputs, human review and revisions/rejections in workflow evidence log.
- Attach acceptance criterion results, screenshots or test logs, migration review and unresolved failures; redact credentials and personal data. Update group contribution log and slice register.
- Use signed-off commits and reviewed PR; merge only after required checks pass. No completion claim while mandatory acceptance criteria are blocked.
- Verify integration against shared Supabase when available; report NFR measurements and limitations rather than claiming compliance without evidence.
