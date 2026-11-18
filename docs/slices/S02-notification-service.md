# S02 — Shared Notification Service and Inbox

**Status:** Ready for implementation after dependencies | **Provisional owner:** Member 2 (confirm with team) | **Reviewer:** Member 1 (confirm with team) | **Priority:** P1 | **Estimate:** Not yet recorded

## 1. Goal and traceability

Deliver the shared in-app notification capability and recipient-facing inbox. S02 owns notification persistence, deduplication, recipient retrieval, and read state. It is a shared capability in the Business Logic Tier, not a seventh domain module.

- **FR-02 / AC-FR-02-02:** S04 requests one Warden in-app alert when an authorized participant requests responsibility assistance.
- **FR-03:** Students receive in-app notifications 30 minutes before scheduled activities; responsibilities receive reminders 24 hours and 1 hour before deadlines, excluding completed/cancelled responsibilities.
- **FR-04:** After a reminder and confirmed non-completion, the responsible slice notifies the Warden without exposing private student schedules.
- **FR-05:** S10 routes meal reservations and collection-difficulty notices to Kitchen Staff and provides a read-only Warden audit copy.
- **FR-10 / FR-11:** S08 has escalation-related notification needs where that slice's approved workflow requires them.
- **NFR-01 / BR-04 / CON-02:** Recipient data is private; access control and row ownership are enforced on the server through S01.
- **Architecture:** the Notification Service creates/stores in-app notifications, provides retrieval/read state, and prevents duplicates. Modules request notifications through its service interface.
- **Plan/register:** S02 establishes the shared notification inbox/dispatch boundary used by modules.

S02 does not decide whether a schedule reminder, responsibility alert, meal notice, or complaint escalation is warranted. The owning domain module or worker owns that business decision and requests notification creation through S02.

## 2. Prerequisites and dependencies

- **S00:** Project scaffold, database configuration, shared API response conventions, Zod validation, repository layout, test tooling, and worker foundation.
- **S01:** Authenticated identity, active-account checks, centralized role authorization, and protected API boundary.
- **Database:** Approved Prisma/PostgreSQL configuration and development access are required before migrations or real persistence verification.
- **S03:** Supplies schedule data and agrees its future activity-notification request contract; S03 owns schedule rules and timing data.
- **S04:** Supplies the approved Warden-assistance request contract; S04 owns responsibility state and recipient-routing rules.
- **S05:** Owns worker-driven responsibility reminders and confirmed non-completion Warden alerts.
- **S08:** Owns complaint escalation workflow and its approved notification requests.
- **S10:** Owns meal reservation, collection-arrangement, and confirmation-ticket behavior.

## 3. Scope

**In scope:** shared in-app notification persistence; notification-creation dispatch interface for domain services; database-enforced deduplication; recipient-only inbox retrieval; individual mark-as-read state; a dedicated notifications page/list; validation; authorization; privacy; tests; and integration-contract documentation.

The required inbox displays the authenticated recipient's title, message, timestamp, read/unread state, and an individual mark-as-read action. A bell, badge, panel, dropdown, or alternative presentation is optional; the dedicated notifications page/list is the S02 baseline.

**Out of scope:** email, SMS, push notifications, or third-party messaging; a seventh Notifications domain module; public notification-creation endpoints; direct notification-table writes by domain modules; S03/S04/S05/S08/S10 business rules; worker job implementation; automatic notification retention/deletion; cross-user inbox visibility; bulk mark-as-read; and unread-state reversal.

S10 owns the FR-05 confirmation ticket. S02 must not represent that ticket as a notification unless an approved S10/S02 integration contract explicitly requires it.

## 4. Data and API contract

Use the approved `notifications` table owned by S02: `id` UUID primary key; `user_id` FK to `users.id`; required `type`; `title`; `message`; `related_module`; `related_entity_id`; `is_read` default false; `created_at`; nullable `read_at`; and unique `deduplication_key`.

**Working implementation defaults (owner-directed; not a formal project-wide approval):**

- Supported validated string types are `schedule_activity`, `responsibility_reminder`, `responsibility_incomplete`, `responsibility_assistance`, `meal_reservation`, `meal_collection_difficulty`, and `complaint_escalation`. A domain module may request only the type applicable to its approved workflow; adding a type requires specification review.
- A creation request requires recipient user ID, supported type, title, message, related module, related entity ID, and deterministic deduplication key. The service returns the created notification, or the existing notification for the same deduplication key when a duplicate is detected.
- The deduplication key is required and deterministic for the domain event/recipient combination. The database unique constraint is the authoritative duplicate-prevention boundary.
- `GET /api/notifications?limit=<1..100>&cursor=<notification-id>` is the working inbox endpoint. It returns only the authenticated recipient's notifications, newest `created_at` first. The default limit is 20; cursor pagination and response fields must be documented with the route when implemented.
- `PATCH /api/notifications/:id/read` is the working individual read-state endpoint. It derives recipient identity from S01, marks only the recipient's notification as read, and is idempotent: repeating it leaves the notification read and preserves the original `read_at` value.
- No public creation route exists. Domain services call the shared Notification Service directly through the approved dispatch interface.

Route handlers use Zod for query, parameter, and body validation; use S00 standardized API success/error responses; and enforce S01 authentication, active-account, and recipient-ownership checks. Invalid input must not write data. Protected state-changing routes follow the approved S01 Origin/CSRF policy. Exact response schemas, notification text limits, and `related_entity_id` format remain recorded risks below.

## 5. User flow

1. An owning domain service determines, under its own approved business rules, that a notification is required.
2. It sends a validated request with a deterministic deduplication key to the shared Notification Service.
3. S02 creates one notification or returns the existing matching notification; it does not create a duplicate.
4. An authenticated recipient opens the dedicated **Notifications** page and sees only their own notifications, newest first.
5. The recipient sees title, message, timestamp, and read/unread state.
6. The recipient marks an individual unread notification as read; the server verifies ownership and records the read state idempotently.
7. Invalid, unauthenticated, inactive, forbidden, or cross-user requests return safe standardized errors and do not expose or change another user's notification.

## 6. Implementation checklist

- [ ] Review S00/S01 response, validation, middleware, and cookie/Origin conventions before adding routes.
- [ ] Add the Prisma model/migration for the approved `notifications` record, including the unique deduplication key, after approved database configuration is available.
- [ ] Implement S02-owned repository methods for create-or-return-existing, recipient-only list, and recipient-only mark-as-read.
- [ ] Implement the shared Notification Service dispatch interface with supported-type validation and database-enforced idempotency.
- [ ] Implement recipient inbox and mark-as-read Route Handlers using S01 identity, Zod, and standardized responses.
- [ ] Build the dedicated Notifications page/list with title, message, timestamp, read/unread state, mark-as-read action, and clear empty/loading/error states. Do not require a bell or badge.
- [ ] Document each consuming slice's approved request contract; prohibit direct notification-table access outside S02.
- [ ] Add tests and record actual results and limitations.

## 7. Acceptance criteria

- **AC-S02-01:** A valid request from an approved domain-service integration creates an in-app notification containing only the approved S02 data fields.
- **AC-S02-02:** Repeated or concurrent requests using the same deduplication key create exactly one notification and return that created/existing notification according to the working contract.
- **AC-S02-03:** An authenticated active recipient retrieves only their own inbox entries, newest first, using the approved limit/cursor contract.
- **AC-S02-04:** Student A cannot retrieve, read, or infer the existence of Student B's notification through manipulated identifiers, query values, or UI state.
- **AC-S02-05:** A recipient marks only their own individual notification as read; repeated mark-as-read requests are idempotent and preserve the original read timestamp.
- **AC-S02-06:** The dedicated Notifications page/list shows the recipient's title, message, timestamp, and read/unread state, with an individual mark-as-read action and clear empty/loading/error states. A bell/badge is not required.
- **AC-S02-07:** Missing or malformed parameters/bodies, unsupported notification types, unauthenticated/inactive users, cross-origin state changes, and forbidden requests fail safely without persistence or read-state changes.
- **AC-S02-08:** Domain modules use the shared dispatch interface and do not directly write the `notifications` table.
- **AC-S02-09:** S04 assistance integration produces one deduplicated Warden notification once S04 is implemented; S02 does not claim S04 business behavior before that integration test exists.
- **AC-S02-10:** S02 does not create, own, or claim the S10 meal confirmation ticket unless an approved integration contract changes that boundary.
- **AC-S02-11:** Notification content and routes do not expose private schedules, duties, complaints, contact details, JWTs, cookies, secrets, or another recipient's data.

## 8. Test plan and evidence

**Backend automated:** Zod validation tests; repository tests with injected Prisma mocks; service tests for supported types, creation results, duplicate keys, and persistence failure; API tests for limit/cursor validation, newest-first retrieval, unauthenticated/inactive/forbidden behavior, individual read state, and standardized errors; concurrency/unique-constraint tests; and recipient-isolation tests using at least two synthetic users.

**Frontend automated:** component tests for the Notifications page/list, recipient title/message/timestamp/read-state display, individual mark-as-read interaction, empty/loading/error states, and absence of another user's data. Tests must not depend on a bell or badge.

**Integration:** use synthetic domain-service requests to prove the dispatch boundary and deduplication behavior. Add S04 assistance integration evidence only after S04 exists. Do not substitute notification tests for the owning slice's business-rule tests.

**Manual end-to-end:** sign in as User A; open Notifications; verify A's entries and state; mark one as read; refresh; sign in as User B; verify B cannot view or alter A's notification; repeat a creation request and verify one entry. Verify errors and empty state without exposing private data.

**Evidence to log:** branch/commit/PR link; AI prompts and human decisions; migration and redacted database verification; exact commands and results; API examples; inbox screenshots without secrets; duplicate/concurrency evidence; cross-user denial evidence; integration-contract evidence; known limitations. Update `docs/WORKFLOW_EVIDENCE_LOG.md` and `docs/GROUP_CONTRIBUTION_LOG.md` through the eventual PR.

## 9. Risks and decisions requiring confirmation

1. Notification title/message length, trimming, localization, and content-redaction rules.
2. Exact `related_entity_id` representation for polymorphic domain records and validation rules for `related_module`.
3. Final route response schemas and cursor encoding, while preserving the working endpoint paths and limits unless review changes them.
4. Whether any future approved staff workflow may view another user's notifications; default is recipient-only.
5. Whether retention, archival, deletion, unread reversal, bulk read, bell/badge, or alternative inbox presentation is added later; default is no automatic deletion, individual read only, and a dedicated page/list.
6. The final S03/S04/S05/S08/S10 request contracts and their synthetic integration fixtures.
7. Reliability boundary when notification persistence fails: the working default is no partial notification and a standardized failure returned to the caller. The caller must not claim delivery; S02 performs no automatic retry/outbox processing unless a reviewed mechanism is approved.
8. ADR-005 governs domain-owned worker polling, retries, `worker_job_runs`, locking, and restart recovery. It does not make those records S02-owned or assign worker retry/job ownership to S02.
9. Provisional owner/reviewer, estimate, and formal specification review/approval remain to be confirmed through the project process.

**Definition of done:** all applicable acceptance criteria pass; approved database migration and redacted connection verification run; service/repository/routes/page preserve tier and ownership boundaries; recipient privacy and cross-user isolation are verified; deduplication and read-state behavior are proven; approved consuming-slice contracts are tested; actual evidence is recorded; reviewer and coordinator accept completion evidence; and `SLICE_REGISTER.md` is updated. S02 is not complete merely because this specification is implementation-ready.

## Source references

- [Final_PRD.md](../../Final_PRD.md): FR-02 through FR-05, actors, privacy/access constraints, and acceptance criteria.
- [AGENTS.md](../../AGENTS.md): architecture boundaries, roles, notification responsibility, and implementation rules.
- [architecture.md](../../architecture.md): Notification Service responsibility, REST/Zod/Prisma conventions, `notifications` record, worker boundary, and tiers.
- [plan.md](../../plan.md): S02 scope, priority, dependencies, and sequencing.
- [SLICE_REGISTER.md](../../SLICE_REGISTER.md): S02 inbox/dispatch scope, dependencies, provisional owner/reviewer, and status process.
- [S00 specification](S00-project-foundation.md): shared foundation, notification location, validation/API conventions, worker foundation, and evidence expectations.
- [S01 specification](S01-authentication-rbac.md): authenticated identity, active-account protection, authorization, cookie, and Origin/CSRF conventions.
- [S03 specification](S03-personal-schedule-management.md): schedule-reminder integration boundary.
- [S04 specification](S04-shared-responsibility-coordination.md): Warden-assistance notification, deduplication, and reliable handoff boundary.
- [ADR-001](../../Architecture_Decision_Records/ADR-001-architecture-style.md): shared capability rather than a seventh domain module.
- [ADR-005](../../Architecture_Decision_Records/ADR-005-scheduled-escalation-worker.md): domain-owned worker polling, retry, idempotency, and recovery constraints.
