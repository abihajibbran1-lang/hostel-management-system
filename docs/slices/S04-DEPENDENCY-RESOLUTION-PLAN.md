# S04 Dependency Resolution Plan

## 1. Purpose and scope

This plan identifies the decisions, cross-slice agreements, and evidence needed to establish S04 readiness for **Shared Responsibility Coordination and Warden Assistance**. It covers dependencies on S00, S01, S02, and S03, plus the S04-to-S05 service boundary.

This document is a coordination plan. It does not implement S04, change the PRD or architecture, approve any slice, or mark dependencies ready. User-approved choices below remain subject to formal confirmation by the affected slice owners and the team. Technical recommendations are not approvals by other owners.

**Current S04 status:** Planned. Implementation is not approved.

**Approval status:** The Owner reports Owner, formal team, and affected technical-owner approval of the consolidated S00–S04 decision package. This approval is recorded on the Owner's instruction; separate approver names, dates, and evidence references were not supplied. Technical verification is recorded only where repository evidence supports it. Approval does not establish dependency readiness or implementation authorization.

## 2. Dependency resolution plan

### 2.1 S00 — Shared database infrastructure and foundational capability dependency

**Existing evidence:** S00 provides the Next.js/API foundation, shared Prisma client, PostgreSQL datasource, and current migrations for notifications and personal schedules. S00 is recorded as Testing, with reviewer and coordinator acceptance pending. S03 records that its migration has not been applied because no development database is configured. S02 also records that the incremental migration/baseline strategy and live database verification remain unresolved.

**Approved decision — Owner, formal team, and affected technical-owner approval confirmed:** The application maintains authoritative house, room, and student-room assignment records. The Schedules & Responsibilities domain owns the foundational room/resident capability, established before S04 implementation. The Hostel Manager has overall assignment authority, including cross-house transfers; Wardens act only within their assigned house. The Manager enters initial records, assigns Wardens, and alone creates, changes, or removes Warden-house assignments. Wardens review their own houses' initial records and report errors; the Manager corrects them. Room-assignment changes retain actor, affected student, previous/new assignments, date/time, and change type; historical membership retains start/end dates, and former assignments become inactive rather than deleted. S04 consumes authoritative information through an approved service interface and must not keep competing assignment records or query foundational tables directly. Implementation and verification evidence remain outstanding as recorded below.

**Approved D01/D07 routing clarifications:** Each house has one designated primary Warden at a time. This is a business rule, not a prescribed database uniqueness constraint. The primary must be active to receive assistance notifications. If missing or inactive, notify the Hostel Manager, who appoints an active replacement; never silently route to an unrelated Warden. The authoritative relationship and service implementation remain unverified.

**Recommended resolution:**

1. Preserve the distinction between S00's shared application/database foundation and the Schedules & Responsibilities domain's ownership of the foundational room/resident capability. The Hostel Manager's operational authority does not transfer domain ownership.
2. Implement the approved application source and provisioning/authority rules through the foundational capability; repository evidence of that implementation is not present.
3. Establish and verify the foundational capability and initial records before S04 relies on them. Seed data alone is not proof of authoritative or reviewed records.
4. Define and verify the approved service interface through which S04 checks current room membership and Warden house permissions. S04 must not maintain competing room assignments or directly query foundational tables.
5. Implement the approved audit fields and inactive historical memberships in the foundational capability; exact schema and implementation remain open.
6. Confirm the development database connection, migration/baseline strategy, and migration application evidence before claiming database-backed readiness.
7. Resolve whether “house” and “building” are the same entity and how the Manager-established Warden-house assignment is technically verified. Do not invent this mapping or trust client-supplied house/Warden values.

**Still open:** exact database schema/storage, initial data validation, service-interface contract, authorization implementation, audit-history implementation, house/building relationship representation, technical verification of the authoritative Warden-house assignment and fallback, and database connectivity/migration baseline readiness. The one-designated-primary rule does not establish a database constraint or implementation contract.

**Readiness evidence required:**

- Formal confirmation of the selected application source, Schedules & Responsibilities ownership, and Manager/Warden authority rules.
- Evidence that initial house, room, student-room, and Warden-house records were entered, reviewed by Wardens in their own houses, corrected by the Manager where needed, and verified before S04 relies on them.
- An approved service-interface and authorization contract for active membership and Warden-house checks.
- Evidence of assignment audit fields and historical memberships with start/end dates and inactive former assignments.
- Redacted database connection and migration verification output from the agreed development environment.
- Approved baseline/deployment strategy and evidence that the applicable migrations are applied in that environment.
- Evidence identifying the source of room/house/Warden routing data, if house-based routing is approved.

### 2.2 S01 — Authentication and authorization

**Existing evidence:** JWT verification and active-user checks exist in middleware. Verified user ID and role are forwarded to protected API handlers. A reusable role authorization helper exists, and the personal-schedule API demonstrates a Student-specific route guard. S01's specification says module owners define action-level permissions. S01 remains Specification Draft in the register/specification; formal acceptance is not recorded.

**Recommended resolution:**

1. Reuse the existing JWT identity and active-user verification; do not create a second authentication mechanism for S04.
2. Require Student authorization for student coordination actions and Warden authorization for Warden functions. Add route-level guards consistent with S01's reusable role helper; the middleware's authentication alone does not enforce S04 action permissions.
3. S04 business operations must verify current membership and authorized participation using the approved foundational service interface. Do not query foundational room/resident tables directly. Authentication and role alone do not establish access to a particular duty.
4. Prevent cross-room reads, writes, assignment, and ID probing. Use a safe inaccessible-resource response consistent with the approved API convention.
5. Verify the Warden-to-house relationship server-side against the Manager-maintained authoritative assignment; do not accept a client-supplied Warden or house as proof of authorization. Warden room-management actions are limited to the assigned house.
6. Preserve safe failure behavior: unauthenticated, wrong-role, nonparticipant, former residents requesting new former-room responsibilities, and invalid requests must not disclose unrelated records or partially change state. Former participants retain only the selected read-only access to historical responsibilities in which they participated.

**Still open:** S01 slice readiness/acceptance; implementation of the approved Student/Warden action boundaries; room/participant authorization through the foundational service interface; and technical verification of the assigned-house relationship.

**Readiness evidence required:**

- S01 owner/reviewer confirmation of the supported middleware and route-guard integration pattern.
- Reviewed S04 role/action matrix and server-side participant/room authorization contract.
- Automated or reviewed evidence for unauthenticated, wrong-role, cross-room, unauthorized participant, and former-resident denial for new former-room responsibilities; verify read-only historical access for former participants. Denied requests must not mutate data or leak record existence.
- S01 slice status and acceptance evidence recorded through the project process; existing source code alone is not formal acceptance.

### 2.3 S02 — Notification service and assistance dispatch

**Existing evidence:** The shared notification service accepts a recipient user ID, supported type, content, related entity, and deterministic deduplication key. `responsibility_assistance` is an existing type. The repository uses a unique deduplication key and returns an existing notification on a duplicate-key conflict. S02 owns notification persistence and says consuming domain services call its dispatch interface rather than writing notification rows directly. S02 is In Progress; its S04 consuming contract, database integration evidence, and formal acceptance remain pending.

**Approved decisions:** S04 uses the S02 notification service and determines the correct Warden recipient. S04 must not write directly to notification tables. Formal S02 owner approval is reported by the Owner; implementation compatibility remains unverified.

**Approved routing clarifications:** Use the current designated primary Warden from the authoritative house assignment. Missing/inactive primary cases notify the Hostel Manager, who appoints an active replacement. Do not silently route to an unrelated Warden.

Selected participant-notification audiences are all assigned participants for Warden responsibility changes, and all responsibility participants for overall completion or cancellation. The approved assistance, reopening, and transfer notification rules also remain in force; exact notification content and any additional event/audience details remain open.

**Recommended resolution:**

1. S04 determines the current house and designated primary Warden from the authoritative capability, then calls the S02 dispatch interface. If no primary Warden exists, retain the request, flag administrative attention, and notify the Hostel Manager. If the primary Warden is inactive, do not send new notifications to that Warden; notify the Manager, who assigns an active replacement. Reassign an already active assistance request to the replacement without creating a new request/event or duplicating its notification. Do not silently route to an unrelated Warden.
2. Use a minimum notification payload: the recipient, approved assistance type, concise assistance message, and responsibility reference. Do not include personal schedule details, unrelated student records, private contact information, or unnecessary room/student information.
3. Use a deterministic key scoped to the assistance event and intended recipient. The event identity and repeat-request semantics must be agreed before finalizing the key; the persistence response must distinguish a newly created notification from the existing notification returned for the same deduplication key.
4. Handle repeated and concurrent requests idempotently. The responsibility status and alert must not diverge, and duplicate submissions for one logical assistance event must not create duplicate notifications.
5. **Preferred technical approach:** design T02/T03 together and use a transaction-bound S02 dispatch within the same PostgreSQL transaction as the responsibility state change, if the affected owners confirm that the service boundary can support it.
6. The current S02 service does not expose a verified transaction-bound dispatch interface. Transaction-backed repository injection may be possible, but is not an established contract and requires technical verification before relying on atomic dispatch.
7. **Alternative to evaluate if needed:** if transaction-bound dispatch is incompatible, evaluate a transactional outbox as the preferred alternative for review. It is not mandatory or approved. Outbox ownership, persistence, processing, retries, idempotency, and recovery require explicit technical-owner/architecture approval; no outbox or automatic notification retry is established.
8. Agree failure semantics: whether responsibility state rolls back when notification persistence fails, and how the caller receives a truthful failure result. S02 currently documents failure without claiming delivery and no automatic outbox/retry unless separately reviewed.

**Still open:** implemented and verified technical contract for primary-Warden lookup and the approved no-primary/inactive-primary fallback and reassignment; privacy-safe notification content; event identity/deduplication implementation; transaction-bound integration feasibility; and failure semantics. The approved recipient rules are not reopened.

**Readiness evidence required:**

- Joint S04/S02 owner and reviewer approval of the dispatch contract, recipient, payload, event/deduplication key, and failure behavior.
- Technical confirmation that the selected transaction strategy is compatible with the S02 service boundary.
- Integration evidence for repeated and concurrent requests, duplicate prevention, notification persistence failure, and consistency of responsibility status with alert creation.
- Privacy review of the notification payload.
- Approved room/house/primary-Warden mapping and evidence of the selected no-primary/inactive-Warden fallback.
- S02's own migration/database and slice acceptance evidence before declaring S02 formally ready.

### 2.4 S03 — Personal schedule integration and privacy

**Existing evidence:** S03 implements personal schedule operations scoped to the authenticated student's user ID. Its specification excludes roommate visibility, Warden access to private schedules, and shared duties. S03 is recorded as Testing; PostgreSQL/browser integration, NFR-02 measurement, reminder-interface agreement, and formal acceptance remain pending.

**Approved privacy and visibility decision:** Students see their own room information and shared responsibilities only when authorized participants; they cannot access unrelated rooms' responsibilities, unrelated students' individual responsibility records, or private personal schedules. Former participants have read-only access to historical responsibilities they participated in, but not new responsibilities for their former room. Wardens and Hostel Managers cannot access students' private personal schedules. Manager access is limited to information necessary for authorized administrative responsibilities.

**Recommended resolution:** S04 should not read, join, copy, or return personal schedule data for responsibility lists, details, Warden assistance views, or notification payloads. Shared-duty access should be based on approved participant and role authorization, not schedule visibility. Do not grant a Manager or Warden schedule access through S04.

**Approved NFR-01/FR-02 reconciliation:** NFR-01 protects private personal schedules and individually owned responsibility records. FR-02 permits a shared-responsibility record to be visible to its authorized participants for coordination; this is a limited shared-record permission, not access to another student's private schedule or unrelated individual records. S04 does not consume S03 schedule data. This records the approved interpretation and does not amend the PRD. S03's outstanding slice acceptance is not an S04 schedule-data dependency; S04 privacy implementation evidence is still absent.

**Readiness evidence required:**

- Reviewed S04 responses and notification payloads contain no personal schedule fields.
- Access tests show nonparticipants cannot access a duty and participants cannot access unrelated schedules or responsibility records.
- The team records its interpretation of the NFR-01/FR-02 shared-duty visibility relationship.

## 3. Approved S04 decisions — Owner, formal team, and affected technical-owner approval confirmed

The Owner reports approval by the Owner, formal team, and affected technical owners. The approval record is based on the Owner's instruction; separate names, dates, and evidence references were not supplied. Technical verification and dependency readiness are distinct and remain subject to the evidence below.

| Topic | Approved decision | Remaining implementation/evidence detail |
|---|---|---|
| D01 — Room/resident capability | Application source, foundational domain ownership, Manager/Warden authority, initial provisioning, audit/history, approved service boundary, and primary-Warden rules. | Schema/storage, initial-data verification, service implementation, authorization, audit evidence, house/building data relationship, and database/migration readiness. |
| D02 — Agreement and acceptance | Students may propose; Warden controls final distribution. New distribution notifies all assigned students; material assignment changes notify all affected students and require their renewed acceptance. Rejection and withdrawal requests notify the Warden. Non-response is not acceptance; the Warden reviews it after the acceptance deadline. Warden redistribution is governed by the approved rules. | Technical implementation and evidence for accepted transitions and notifications; no approved business rule is reopened. |
| D03 — Permission matrix | Students complete only their own parts; overall completion requires all parts. Completion notifies all participants. Reopening and cancellation follow D05; cancellation notifies all participants. Warden responsibility-management actions are house-limited. | Implementation evidence for authorized action and recipient behavior. |
| D04 — Status model | Separate overall and individual assignment states and the selected transitions in the Open Decision Register; no additional states. | Implementation and test evidence for state consistency and concurrent/conflicting lifecycle operations. |
| D05 — Lifecycle/history | Approved withdrawal/redistribution notifies the requester and affected participants. Room-transfer redistribution notifies affected remaining participants. Former participants retain the selected historical access. | Technical implementation/evidence for history, retention, audit, and membership transitions. |
| D06 — Assistance | One active assistance request per responsibility; duplicates are suppressed while a later new problem receives a distinct event identity. Assistance closes on completion/cancellation; reopening does not reopen an old request. | Verified event identity/deduplication, concurrent-operation and failure behavior; notification message content not otherwise specified. |
| D07 — Warden routing | Current active primary Warden receives assistance requests; missing/inactive primary cases notify the Hostel Manager. An active request is reassigned if its primary Warden becomes inactive or unavailable without creating a new event/duplicate alert. | Verified house/Warden relationship and reassignment implementation. |
| D08 — Warden authority | Wardens manage responsibilities only in their assigned house. Preserve the existing D08 notification rule where applicable; the assistance view is read-only. | Verify the exact D08 notification rule against the specific recipient rules above; audit implementation evidence. Do not broaden notification audiences. |
| D09 — Visibility/privacy | Authorized participants may view shared responsibilities; private personal schedules and unrelated individual responsibility records remain private. The approved interpretation reconciles this limited shared-record access with NFR-01 and FR-02. | Implementation and privacy-test evidence. |
| D10 — Performance | The maximum 2-second target applies to S04 application views/operations; external notification delivery is measured separately. | Performance evidence under the approved measurement definition and documented workload/environment; the target has not been demonstrated by repository evidence. |
| D11 — S04/S05 boundary | S04 owns responsibility data and exposes it through an approved service boundary; S05 must not query S04 tables directly. | Contract implementation and integration evidence. No S05 files or implementation were inspected or changed. |
| D12 — Self-reporting/timeout | Students self-report only their own part; S04 does not auto-mark non-completion; timeout detection and automatic alerts remain in S05. | S04 self-report implementation evidence. No S05 timeout details are selected here. |

## 4. Cross-slice agreements and responsible owners

Confirmed S04 governance: Ifadha Hussain is the S04 Owner and final S04 approval authority; Abiha is the S04 Reviewer. Abiha is also the Project Coordinator in a separate project-level role. This assignment does not resolve cross-slice dependencies or approve implementation.

| Agreement | Responsible parties by role | Required outcome |
|---|---|---|
| Foundational room/resident capability and Manager workflow | Schedules & Responsibilities domain owner; S00 owner/reviewer for shared infrastructure; S04 owner; team; Hostel Manager as operational authority | Confirm user-approved authority/source rules formally; establish verified initial records and the foundational service boundary described in §2.1. |
| S04 route and participant authorization | S01 owner/reviewer; S04 owner/reviewer | Verified identity/role handoff plus room/participant permission matrix and negative-access behavior. |
| Assistance dispatch contract | S02 owner/reviewer; S04 owner/reviewer | Jointly reviewed recipient, payload, event, deduplication, consistency, and failure contract. |
| House and Warden routing | Schedules & Responsibilities domain owner; S04 owner; S00 infrastructure owner; team; Hostel Manager as Warden-assignment authority | Verified primary-Warden mapping and selected no-primary/inactive-Warden handling through the approved interface. |
| S04-to-S05 service contract | S04 and S05 owners/reviewers | S05 uses an S04 service boundary; no direct S04 table access; approved data and completion semantics. |
| Schedule privacy and shared-duty visibility | S03 and S04 owners/reviewers; team | Apply the approved NFR-01/FR-02 interpretation, preserve S03 self-only schedule access, and verify S04 does not read or expose private schedule data. |
| S04 governance and approval path | S04 Owner Ifadha Hussain; S04 Reviewer Abiha; Project Coordinator Abiha in a separate project-level role | Reviewer review and final S04 approval authority are recorded distinctly. Final S04 implementation approval remains pending until the closed gate's decisions and dependencies are satisfied. |

The Slice Review Process document is marked **Proposed team process — confirm at the next team meeting**. Its use does not itself prove team approval. Record actual decisions and evidence through the approved project workflow once confirmed.

## 5. Remaining unresolved questions and approvals

The following implementation semantics and external confirmations remain open; already selected business rules are not reopened by these questions:

1. What exact schema/storage design and initial data-validation procedure implement the approved room/resident capability?
2. What approved service-interface contract lets S04 obtain current membership and Warden-house authorization without querying foundational tables?
3. How are audit history and start/end membership records implemented while former assignments remain inactive rather than deleted?
4. Do “house” and “building” refer to the same entity, and what technical interface verifies primary-Warden mapping and handles active-request reassignment?
5. What assignment/overall states follow Warden review of initial or revised rejection/non-response and redistribution?
6. What assignment-state and remaining-participant effects follow approved withdrawal/redistribution and room transfer where the selected rules do not specify them?
7. What assistance history/event identity is retained so a later new-problem request is distinct while concurrent duplicates remain prevented?
8. How is authorized shared-duty visibility reconciled with PRD NFR-01's own-responsibility and cross-student-visibility wording?
9. What test environment, workload, and measurement conditions/method verify the maximum 2-second S04 target? External notification delivery is measured separately.
10. What exact fields, permissions, versioning, and lifecycle semantics are in the S04/S05 service contract?
11. Can S02 support transaction-bound dispatch under the required consistency boundary, and what failure behavior applies? The existing S02 interface has no verified transaction-bound contract. If incompatible, evaluate an outbox as the preferred alternative for review; technical-owner/architecture approval is required for its ownership, persistence, processing, retries, and recovery.
12. What S05 timeout reference point and duration confirm non-completion? This behavior remains in S05.
13. What notification content/audiences apply beyond the selected assignment, completion, cancellation, Warden-change, reopening, transfer, and assistance recipients?

Each product, ownership, privacy, and cross-slice decision requires confirmation from the team and affected owners. Owner approval alone is not formal approval or dependency-readiness evidence.
## 6. Evidence required for dependency readiness

| Dependency | Minimum readiness evidence | Must not be claimed without |
|---|---|---|
| **S00 + foundational room/resident capability** | S00 shared infrastructure readiness; formal confirmation of the user-selected application source and Schedules & Responsibilities ownership; reviewed initial house/room/resident/Warden records; approved service and authorization boundary; database connection, migration/baseline and applicable migration evidence; S00 review/coordinator acceptance. | A schema file, seed fixtures alone, or user approval as proof of team/S00 confirmation, verified initial data, or database readiness. |
| **S01** | Confirmed identity/role integration; approved Student/Warden/Manager route permissions; reviewed room/participant and assigned-house checks through the approved interface; negative-access evidence, including historical-participant scope; S01 owner/reviewer acceptance. | JWT middleware alone as proof of room-level, participant, or house authorization. |
| **S02** | Jointly approved S04 dispatch contract; primary Warden recipient and fallback rules; privacy-reviewed payload; deterministic deduplication and one-active-request behavior; transaction-bound integration evidence or explicitly approved alternative; duplicate/concurrent/failure tests; S02 owner/reviewer acceptance. | A generic dispatch method or unique key alone as proof of S04 integration or atomic consistency. |
| **S03** | S04 privacy review/evidence showing no personal schedule reads or exposure; formal team/PRD resolution of the shared-duty visibility conflict where required. | S03 schedule data being available as permission for S04 to read it; unrelated S03 acceptance as an automatic S04 blocker. |
| **S04/S05** | Approved service boundary, fields, authorization, completion/cancellation semantics, and S05 owner/reviewer agreement; timeout remains separately approved in S05. | S05 directly querying S04-owned tables or S04 implementing S05 workers. |
| **S04 governance** | Confirmed owner and reviewer; blocking questions addressed; explicit team approval recorded; register status updated through the project process. | Owner approval of this plan or a branch existing as proof of team approval. |

## 7. Dependency resolution sequence

1. **Record governance:** S04 Owner Ifadha Hussain, S04 Reviewer Abiha, and final S04 approval authority Ifadha Hussain are confirmed; Abiha's Project Coordinator role remains distinct. Keep S04 Planned and the implementation gate CLOSED until all other required decisions, dependencies, and approvals are complete.
2. **Confirm the foundational capability:** formally confirm the user-approved application source, Schedules & Responsibilities domain ownership, Manager/Warden boundaries, initial-record review, historical/audit principles, and S04 service-interface boundary. Resolve technical details without creating a competing source.
3. **Confirm S00 readiness:** establish the agreed development database and migration/baseline evidence; record S00 review and acceptance state accurately.
4. **Confirm S01 integration:** jointly review Student/Warden route guards, participant checks, active-room validation, and safe failure behavior.
5. **Agree S04/S02 dispatch:** select recipient and payload rules; decide deterministic event identity; verify transaction-bound compatibility. If it is infeasible, obtain explicit approval for an alternative before implementation.
6. **Confirm S04 product scope:** obtain formal team confirmation of previously user-approved rules and the 15 additional Owner-approved resolutions recorded across D01-D12. Do not reopen selected rejection/non-response, redistribution/material-change, withdrawal, transfer, assistance deduplication/reassignment, concurrency, or notification-recipient rules. Resolve only remaining status semantics, privacy/PRD reconciliation, technical contracts, and measurement questions in section 5. Preserve all-participant completion/cancellation notices, all-assigned-participant Warden-change notices, and the separate read-only assistance view.
7. **Agree S04/S05 boundary:** define the service data needed by S05 without exposing S04 tables. Keep timeout and worker behavior in S05.
8. **Collect evidence and review:** attach the evidence listed in §6, confirm all blocking questions are resolved or explicitly bounded, and obtain owner/reviewer/team acceptance.

## 8. Final implementation-readiness gate

S04 is ready to enter implementation only when all of the following are documented:

- Required product and privacy decisions are confirmed by the team.
- Warden responsibility-management permissions within assigned houses and the read-only assistance-view scope are documented separately; selected notification audiences for completion, cancellation, and Warden changes are recorded; only status transitions not specified by the selected rules remain to be resolved or explicitly bounded.
- The foundational room/resident capability is formally confirmed, implemented, and verified before S04 relies on it; approved initial records and the S04 service-interface boundary are established.
- S00 database and migration/baseline readiness is verified.
- S01 Student/Warden and participant authorization integration is reviewed and accepted.
- S02 recipient routing, dispatch, deduplication, and transaction/failure strategy are jointly agreed and verified.
- The S04/S05 service boundary is agreed; S05 timeout behavior remains assigned to S05.
- The NFR-01 shared-visibility conflict and NFR-02 S04 target/measurement definition are formally addressed without silently changing the PRD.
- S04 Owner Ifadha Hussain, S04 Reviewer Abiha, and final S04 approval authority Ifadha Hussain are recorded; Abiha's Project Coordinator role is distinct. Required dependency-owner/team approvals and final S04 implementation approval by Ifadha Hussain are still required.

No dependency or slice is marked formally accepted or ready by this plan. The current S00/S01/S02/S03 status statements above reflect their documentation and available source evidence only.

**Current gate status: CLOSED.** Recording the S04 governance assignment does not satisfy the remaining readiness conditions or grant implementation approval.
