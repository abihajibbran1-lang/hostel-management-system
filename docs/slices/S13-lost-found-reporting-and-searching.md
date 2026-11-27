# S13 — Lost & Found Reporting and Searching

**Status:** Specified; implementation not verified | **Owner:** Member 5 (provisional) | **Reviewer:** Member 4 (proposed) | **Priority:** P1 | **Estimate:** team to confirm

## Goal and traceability
FR-14 (reporting/search), BR-11, NFR-01; approved Lost & Found storage architecture.

Students report lost/found items and search listings with optional photos. Claims and handover belong to S14. No public anonymous access or direct contact exchange.

## Dependencies and boundaries
- S00, S01; private storage for photo acceptance. Verify merged contracts before implementation; use mocks only for isolated tests.
- Reuse centralized JWT/RBAC, Zod validation, standard API errors, one Prisma schema and owning module repository/service.
- Use local disposable PostgreSQL for integration testing until shared Supabase is approved. Do not apply or reset shared migrations without authorization.

## Workflows
1. Student selects Lost or Found and enters item name, description, location and event date; optional photos.
2. Validate fields and file count, size and actual image format server-side; derive reporter identity from session.
3. Store photos in private Supabase bucket using server-controlled paths; persist only stable paths and metadata in PostgreSQL.
4. Create Open report; list/search authorized reports by item text with proposed type/date/location filters.
5. Generate signed image URLs on demand after authorization (15-minute expiry); omit reporter contact data and avoid exposing internal storage paths. Handle failed upload/DB write with cleanup or recorded retry.

## Data / proposed endpoints
`lost_found_items` (reported_by, item_type Lost/Found, title, description, location, event_date, status Open/Claimed/Returned/Closed); `lost_found_images` (item_id, storage_path, uploaded_by, created_at). JPEG/PNG/WebP only, max 5 MB each, max 3 images per item. Proposed routes: POST /api/lost-found/items; GET /api/lost-found/items?search=; GET /api/lost-found/items/:id; authorized image URL endpoint if needed. Services: createReport, searchReports, getReport; storage adapter with local test double until Supabase is available.

All route/service names are proposals; reconcile with existing repository contracts before coding. Do not create parallel models or regenerate the migration baseline.

## Implementation checklist
- [ ] Review PRD, architecture, ADRs, AGENTS.md and dependencies; record decisions for blocked criteria.
- [ ] Review existing Prisma schema and migrations; propose additive changes in PR if needed.
- [ ] Student selects Lost or Found and enters item name, description, location and event date; optional photos.
- [ ] Validate fields and file count, size and actual image format server-side; derive reporter identity from session.
- [ ] Store photos in private Supabase bucket using server-controlled paths; persist only stable paths and metadata in PostgreSQL.
- [ ] Create Open report; list/search authorized reports by item text with proposed type/date/location filters.
- [ ] Generate signed image URLs on demand after authorization (15-minute expiry); omit reporter contact data and avoid exposing internal storage paths. Handle failed upload/DB write with cleanup or recorded retry.
- [ ] Implement role-specific UI, loading/empty/error states and server-side authorization.
- [ ] Run unit, integration and end-to-end checks; document results.

## Acceptance criteria
- **AC13-01:** Student can submit valid Lost and Found reports without photos; missing required fields are rejected.
- **AC13-02:** Search returns matching authorized reports with useful item details and no contact information or private user profile fields.
- **AC13-03:** Valid photos within limits are accepted; unsupported format, spoofed content, oversize or fourth photo rejected.
- **AC13-04:** Bucket is private; signed URLs expire after 15 minutes and are never persisted; database contains no image binaries.
- **AC13-05:** Failed upload or database write does not expose incomplete reports or leave unmanaged objects; cleanup is verified.
- **AC13-06:** Unauthenticated access is denied; S14 can consume stable item IDs and status without bypassing privacy.

## Open decisions / blockers
1. Confirm date validation, search filters and visibility of Returned/Closed items.
2. Confirm whether/how reporter may correct reports; no unapproved delete workflow.
3. Supabase Storage is not configured yet: local adapter tests are allowed but real private bucket, signed URL and cleanup tests remain pending.

Do not silently select business rules. Continue independent work; mark affected criteria blocked until team approval.

## Test plan
Unit: required fields, file signatures/limits and response projection. PostgreSQL: search and ownership. Storage adapter tests: upload failure and cleanup. Real Supabase Storage integration: private access and URL expiry. E2E: report and search.

Use synthetic accounts and data; test direct API access as well as UI. Run existing regression suite and record exact commands/results. Mock-only tests do not satisfy PostgreSQL or storage integration criteria.

## Evidence and definition of done
- Record slice ID, owner, reviewer, branch, commit/PR, AI prompts and outputs, human review and revisions/rejections in workflow evidence log.
- Attach acceptance criterion results, screenshots or test logs, migration review and unresolved failures; redact credentials and personal data. Update group contribution log and slice register.
- Use signed-off commits and reviewed PR; merge only after required checks pass. No completion claim while mandatory acceptance criteria are blocked.
- Verify integration against shared Supabase when available; report NFR measurements and limitations rather than claiming compliance without evidence.
