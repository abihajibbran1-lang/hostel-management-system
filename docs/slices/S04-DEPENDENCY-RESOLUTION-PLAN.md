# S04 Dependency Resolution Plan

## 1. Purpose and scope

This plan identifies the decisions, cross-slice agreements, and evidence needed to establish S04 readiness for **Shared Responsibility Coordination and Warden Assistance**. It covers dependencies on S00, S01, S02, and S03, plus the S04-to-S05 service boundary.

This document is a coordination plan. It does not implement S04, change the PRD or architecture, approve any slice, or mark dependencies ready. User-approved choices below remain subject to formal confirmation by the affected slice owners and the team. Technical recommendations are not approvals by other owners.

**Current S04 status:** Planned. Implementation is not approved.

**Decision-status convention:** The user's selected product decisions are recorded as user-approved, with formal team/owner confirmation pending. The technical direction to reuse existing authentication, make related writes atomic, use S02 dispatch, deduplicate deterministically, and agree the S04/S02 contract was also user-approved; that does not establish compatibility or approval by S01/S02 owners. Other options and open questions remain unresolved until evidence is recorded.

## 2. Dependency resolution plan

### 2.1 S00 — Database, Prisma, and room/resident source of truth

**Existing evidence:** S00 provides the Next.js/API foundation, shared Prisma client, PostgreSQL datasource, and current migrations for notifications and personal schedules. S00 is recorded as Testing, with reviewer and coordinator acceptance pending. S03 records that its migration has not been applied because no development database is configured. S02 also records that the incremental migration/baseline strategy and live database verification remain unresolved.

**User-approved proposal; S00/team confirmation pending:** The Hostel Manager is the operational owner responsible for maintaining authoritative room and resident records, including room creation, assignments, joining, leaving, and transfers.

**Recommended resolution:**

1. Confirm the Manager's authority, permitted operations, and administrative workflow with S00/Schedules & Responsibilities owners and the team.
2. Keep domain data ownership in the Schedules & Responsibilities module as specified by architecture. Manager operational responsibility does not transfer table or business-rule ownership out of that module.
3. Identify the actual authoritative source of room/resident data and define how room creation, assignment, joining, leaving, and transfers update it. Do not treat seed data as the operational source of truth.
4. Preserve the user-selected principle that former roommates who participated retain appropriate historical access. Define the exact access permissions, retention rules, and room-transfer effects; these details remain unresolved.
5. Require server-side validation of the student's active room assignment at the time of each operation. Do not trust room IDs or participant lists supplied by the client.
6. Confirm the development database connection, approved migration/baseline strategy, and migration application evidence before claiming database-backed readiness.
7. Resolve whether “house” and “building” are the same entity, and establish an authoritative room-to-house-to-Warden mapping before implementing house-based routing. This mapping is not present in the inspected architecture or source.

**Still open:** Manager permissions and administrative workflow; source-of-truth system; active-membership semantics; historical access after transfer; house/building meaning; Warden mapping; database connectivity and migration/baseline readiness.

**Readiness evidence required:**

- Owner/team confirmation of the room/resident data source and Manager workflow.
- Approved semantics for active and historical membership, transfers, and access to existing responsibilities.
- Redacted database connection and migration verification output from the agreed development environment.
- Approved baseline/deployment strategy and evidence that the applicable migrations are applied in that environment.
- Evidence identifying the source of room/house/Warden routing data, if house-based routing is approved.

### 2.2 S01 — Authentication and authorization

**Existing evidence:** JWT verification and active-user checks exist in middleware. Verified user ID and role are forwarded to protected API handlers. A reusable role authorization helper exists, and the personal-schedule API demonstrates a Student-specific route guard. S01's specification says module owners define action-level permissions. S01 remains Specification Draft in the register/specification; formal acceptance is not recorded.

**Recommended resolution:**

1. Reuse the existing JWT identity and active-user verification; do not create a second authentication mechanism for S04.
2. Require Student authorization for student coordination actions and Warden authorization for Warden functions. Add route-level guards consistent with S01's reusable role helper; the middleware's authentication alone does not enforce S04 action permissions.
3. Enforce participant and active-room membership in Schedules & Responsibilities business operations and repository queries. Authentication and role alone do not establish access to a particular duty.
4. Prevent cross-room reads, writes, assignment, and ID probing. Use a safe inaccessible-resource response consistent with the approved API convention.
5. If house-based Warden authorization is confirmed, verify the Warden-to-house relationship server-side against the authoritative mapping; do not accept a client-supplied Warden or house as proof of authorization.
6. Preserve safe failure behavior: unauthenticated, wrong-role, nonparticipant, former-resident, and invalid requests must not disclose unrelated records or partially change state.

**Still open:** S01 formal readiness/acceptance; S04's exact Student/Warden action matrix; room/participant authorization; house-based Warden relationship and its source.

**Readiness evidence required:**

- S01 owner/reviewer confirmation of the supported middleware and route-guard integration pattern.
- Reviewed S04 role/action matrix and server-side participant/room authorization contract.
- Automated or reviewed evidence for unauthenticated, wrong-role, cross-room, former-resident, and unauthorized participant denial, including no data mutation or existence leak.
- S01 slice status and acceptance evidence recorded through the project process; existing source code alone is not formal acceptance.

### 2.3 S02 — Notification service and assistance dispatch

**Existing evidence:** The shared notification service accepts a recipient user ID, supported type, content, related entity, and deterministic deduplication key. `responsibility_assistance` is an existing type. The repository uses a unique deduplication key and returns an existing notification on a duplicate-key conflict. S02 owns notification persistence and says consuming domain services call its dispatch interface rather than writing notification rows directly. S02 is In Progress; its S04 consuming contract, database integration evidence, and formal acceptance remain pending.

**User-approved decisions; S02/team confirmation pending:** S04 uses the S02 notification service and determines the correct Warden recipient. S04 must not write directly to notification tables.

**Recommended resolution:**

1. S04 determines the Warden recipient from an approved authoritative room/house/Warden mapping, then calls the S02 dispatch interface. Do not broadcast to all Wardens or select an arbitrary Warden without an approved fallback rule.
2. Use a minimum notification payload: the recipient, approved assistance type, concise assistance message, and responsibility reference. Do not include personal schedule details, unrelated student records, private contact information, or unnecessary room/student information.
3. Use a deterministic key scoped to the assistance event and intended recipient. The event identity and repeat-request semantics must be agreed before finalizing the key.
4. Handle repeated and concurrent requests idempotently. The responsibility status and alert must not diverge, and duplicate submissions for one logical assistance event must not create duplicate notifications.
5. **Preferred technical approach:** design T02/T03 together and use a transaction-bound S02 dispatch within the same PostgreSQL transaction as the responsibility state change, if the affected owners confirm that the service boundary can support it.
6. The current S02 service does not expose a verified transaction-bound dispatch interface. Confirm compatibility before relying on atomic dispatch; do not represent it as already supported.
7. **Alternative:** if transaction-bound dispatch is not feasible, a transactional outbox may be considered only after explicit team/architecture approval, including its data ownership, processing, retries, idempotency, and recovery behavior. No outbox or automatic notification retry is currently established.
8. Agree failure semantics: whether responsibility state rolls back when notification persistence fails, and how the caller receives a truthful failure result. S02 currently documents failure without claiming delivery and no automatic outbox/retry unless separately reviewed.

**Still open:** recipient mapping and no-assignee behavior; notification content; event identity/repeat request rules; transaction-bound integration feasibility; failure semantics; outbox approval if needed.

**Readiness evidence required:**

- Joint S04/S02 owner and reviewer approval of the dispatch contract, recipient, payload, event/deduplication key, and failure behavior.
- Technical confirmation that the selected transaction strategy is compatible with the S02 service boundary.
- Integration evidence for repeated and concurrent requests, duplicate prevention, notification persistence failure, and consistency of responsibility status with alert creation.
- Privacy review of the notification payload.
- Approved room/house/Warden mapping and no-assignee behavior, if applicable.
- S02's own migration/database and slice acceptance evidence before declaring S02 formally ready.

### 2.4 S03 — Personal schedule integration and privacy

**Existing evidence:** S03 implements personal schedule operations scoped to the authenticated student's user ID. Its specification excludes roommate visibility, Warden access to private schedules, and shared duties. S03 is recorded as Testing; PostgreSQL/browser integration, NFR-02 measurement, reminder-interface agreement, and formal acceptance remain pending.

**User-approved privacy decisions; team confirmation pending:** Students may view shared responsibilities only when authorized participants. They may not access unrelated students' private schedules or individual responsibility records. Wardens may not access students' private personal schedules. Hostel Managers may access only information needed for their authorized administrative responsibilities.

**Recommended resolution:** S04 should not read, join, copy, or return personal schedule data for responsibility lists, details, Warden assistance views, or notification payloads. Shared-duty access should be based on approved participant and role authorization, not schedule visibility. Do not grant a Manager or Warden schedule access through S04.

**Still open:** The team must confirm how participant-only shared-duty access reconciles PRD NFR-01's “own responsibilities” wording with FR-02's roommate dashboard flow. The selected narrow participant exception is not a general permission to view another student's responsibility records. S03's outstanding acceptance does not create an S04 dependency on schedule data.

**Readiness evidence required:**

- Reviewed S04 responses and notification payloads contain no personal schedule fields.
- Access tests show nonparticipants cannot access a duty and participants cannot access unrelated schedules or responsibility records.
- The team records its interpretation of the NFR-01/FR-02 shared-duty visibility relationship.

## 3. User-approved S04 decisions — formal team/owner confirmation pending

The following choices were approved by the user for this plan. They are not recorded as formal team or affected-slice-owner approvals, and do not authorize implementation.

| Topic | User-approved choice | Remaining confirmation |
|---|---|---|
| Room/resident records | Hostel Manager is the proposed operational owner for authoritative room/resident maintenance, assignments, joining, leaving, and transfers. | S00/team must confirm source of truth, permissions, and workflow. Schedules & Responsibilities retains architecture-level domain ownership. |
| Distribution and acceptance | Warden distributes responsibilities fairly. Every assigned student must accept before status becomes Active. Rejection requires Warden review and possible redistribution. Non-response is not acceptance. | Define fairness review process, invitation response handling, edits during acceptance, and whether/when invitations expire. |
| Warden responsibility authority | Wardens may create, edit, reassign, redistribute, and cancel responsibilities within their assigned house. Participants affected by Warden changes must be notified. | Confirm with the S04 owner/team that responsibility-management actions are authorized only within the Warden's assigned house. Define the notification audience for other Warden changes and required audit history. This management capability is separate from the assistance view. |
| D03 — Cancellation notification | All responsibility participants must be notified when a responsibility is cancelled. | Preserve this selected rule. Notification audience for other Warden changes remains open. |
| D04 — Responsibility status model | The user selected separate overall responsibility and individual assignment statuses. Proposed overall statuses: `Pending Acceptance`, `Active`, `Assistance Requested`, `Completed`, `Cancelled`. Proposed individual assignment statuses: `Pending`, `Accepted`, `Rejected`, `Completed`, `Withdrawn`. | These proposed states await formal team approval. Exact transitions and lifecycle semantics, including withdrawal, completion, and assistance interactions, remain unresolved. |
| D05 — Historical access | Former roommates who participated in a responsibility retain appropriate historical access. | Exact historical access permissions, retention rules, and room-transfer effects remain unresolved. |
| Assistance view | Warden assistance view is read-only; it does not independently grant a separate assistance-resolution or closure action. | Clarify who records or confirms issue completion and how the assistance request is considered closed. Notification read state is not an assistance resolution. |
| Privacy | Only authorized participants may view shared duties. Students cannot access unrelated students' private schedules or individual responsibility records. Wardens cannot access private personal schedules. Manager access is limited to authorized administrative responsibilities. | Team must confirm the narrow shared-duty participant exception against NFR-01 and FR-02. Define Manager access actions without expanding access beyond approved administrative duties. |
| NFR-02 | NFR-02 is not a separate S04-specific performance acceptance criterion. | Whether the system-wide “schedule updates” target applies to responsibility operations remains subject to team clarification. Do not claim S04 meets or is exempt from a broader interpretation without that decision. |
| S04/S02 notifications | S04 uses the S02 notification service and determines the Warden recipient. | S02 owner/reviewer must confirm dispatch contract and recipient source. Transaction compatibility and failure behavior remain unresolved. |
| S04/S05 boundary | S05 obtains responsibility information through an approved S04 service interface; it must not directly query S04-owned tables. | S04/S05 owners must agree fields, permissions, completion semantics, and contract. |
| S05 behavior | S04 does not implement reminders, timeout workers, or automatic non-completion alerts. | S05 owns reminder and timeout behavior; timeout semantics remain unresolved in S05. S04 self-report rules depend on the S04 permission/lifecycle decisions. |

## 4. Cross-slice agreements and responsible owners

Owner names are intentionally not inferred here. The affected owners/reviewers must be confirmed in the register and approval records.

| Agreement | Responsible parties by role | Required outcome |
|---|---|---|
| Room/resident source and Manager workflow | S00 owner/reviewer; Schedules & Responsibilities/S04 owner; team; Hostel Manager as proposed operational user | Authoritative source, lifecycle, access, and evidence described in §2.1. |
| S04 route and participant authorization | S01 owner/reviewer; S04 owner/reviewer | Verified identity/role handoff plus room/participant permission matrix and negative-access behavior. |
| Assistance dispatch contract | S02 owner/reviewer; S04 owner/reviewer | Jointly reviewed recipient, payload, event, deduplication, consistency, and failure contract. |
| House and Warden routing | Schedules & Responsibilities/S04 owner; S00 data owner; team; relevant Warden operational owner | Authoritative room/house/Warden relationship and missing-assignee behavior. |
| S04-to-S05 service contract | S04 and S05 owners/reviewers | S05 uses an S04 service boundary; no direct S04 table access; approved data and completion semantics. |
| Schedule privacy and shared-duty visibility | S03 and S04 owners/reviewers; team | Preserve S03 self-only schedule boundary and record the narrow authorized-participant interpretation for shared duties. |
| S04 approval and reviewer assignment | Slice Coordinator/team; confirmed S04 owner and reviewer | Resolve current reviewer mismatch (register lists Member 3; S04 spec lists Member 4), record approval, and update status only through the prescribed process. |

The Slice Review Process document is marked **Proposed team process — confirm at the next team meeting**. Its use does not itself prove team approval. Record actual decisions and evidence through the approved project workflow once confirmed.

## 5. Remaining unresolved questions and approvals

The following questions remain open; this plan does not choose answers:

1. What authoritative system/source holds room, resident, house/building, and Warden assignments, and who provisions and maintains it?
2. What are the approved Manager permissions for room/resident records, including transfer history and audit evidence?
3. Are “house” and “building” the same concept? How is a room mapped to a house and its responsible Warden?
4. What happens to an assistance request when no Warden is assigned or routing data is incomplete?
5. How is fairness review requested and decided? How are duties redistributed after rejection?
6. What happens when an assignee withdraws, a student transfers rooms, or the duty changes after acceptance? Can remaining participants continue, and how is a replacement accepted? What exact historical access permissions and retention rules apply to former participants?
7. Who may edit, complete, or cancel a responsibility? Can assignees report only their own completion? What makes an overall duty Completed?
8. How does `Assistance Requested` coexist with Completed or Cancelled? Can another request be made while one is pending or after the issue is completed?
9. Which participants receive notifications for Warden edits, reassignment, and redistribution other than cancellation? Cancellation notifies all responsibility participants. What Warden action history is required?
10. Who records or confirms completion of the underlying issue, and how is an assistance request considered closed? The assistance view is read-only and does not itself grant a separate resolution or closure action; responsibility-management permissions are a separate capability.
11. Does NFR-02's “schedule updates” response target include responsibility operations? S04 has no separate NFR-02 acceptance criterion unless the team clarifies otherwise.
12. Can the S02 dispatch service use a transaction-bound repository/client, and what is the failure behavior if that is not possible? If an outbox is proposed, who owns it and approves its worker/retry behavior?
13. What precise service fields and methods does S05 require from S04? How do approved completion and cancellation rules affect reminder eligibility?
14. What is the S05 automated non-completion timeout reference point and duration? The S05 specification identifies this as open; do not implement it in S04.
15. Confirm S04 owner/reviewer. The register and S04 specification list different provisional reviewers.

Each product, ownership, privacy, and cross-slice decision requires confirmation from the team and affected owners. A user selection or technical recommendation alone is not formal approval.

## 6. Evidence required for dependency readiness

| Dependency | Minimum readiness evidence | Must not be claimed without |
|---|---|---|
| **S00** | Approved room/resident provisioning owner and source; redacted development database connection evidence; agreed migration/baseline strategy; applicable migration verification; review/coordinator acceptance. | A schema file alone, placeholder Prisma validation, seed fixtures alone, or an unverified database URL. |
| **S01** | Confirmed identity/role integration; approved Student/Warden route permissions; reviewed room/participant checks; negative-access evidence; S01 owner/reviewer acceptance. | JWT middleware alone as proof of room-level or participant authorization. |
| **S02** | Jointly approved S04 dispatch request contract; Warden recipient source; privacy-reviewed payload; deterministic deduplication; transaction-bound integration evidence or explicitly approved alternative; duplicate/concurrent/failure tests; S02 owner/reviewer acceptance. | The existence of a generic dispatch method or unique key alone as proof of S04 integration or atomic consistency. |
| **S03** | S04 privacy review/evidence showing no personal schedule reads or exposure; team-recorded shared-duty interpretation where needed. | S03 schedule data being available as permission for S04 to read it. S03's own database/browser acceptance remains separately pending. |
| **S04/S05** | Approved service boundary, fields, authorization, completion/cancellation semantics, and S05 owner/reviewer agreement; timeout remains separately approved in S05. | S05 directly querying S04-owned tables or S04 implementing S05 workers. |
| **S04 governance** | Confirmed owner and reviewer; resolved blocking questions; explicit team approval recorded; register status updated through the project process. | User approval of this plan or a branch existing as proof of team approval. |

## 7. Dependency resolution sequence

1. **Confirm governance:** resolve S04 owner/reviewer assignment and confirm the approval path. Keep S04 Planned until formal approval is recorded.
2. **Resolve data ownership:** confirm the Manager's proposed operational role, authoritative room/resident source, lifecycle/history rules, and house/building/Warden mapping.
3. **Confirm S00 readiness:** establish the agreed development database and migration/baseline evidence; record S00 review and acceptance state accurately.
4. **Confirm S01 integration:** jointly review Student/Warden route guards, participant checks, active-room validation, and safe failure behavior.
5. **Agree S04/S02 dispatch:** select recipient and payload rules; decide deterministic event identity; verify transaction-bound compatibility. If it is infeasible, obtain explicit approval for an alternative before implementation.
6. **Confirm S04 product scope:** confirm acceptance, permission, status, withdrawal/transfer, completion/cancellation, Warden responsibility-management actions within assigned houses, the separate read-only assistance view, assistance closure behavior, the selected all-participant cancellation notification rule, notification audience for other Warden changes, and privacy rules. Update affected specifications only through separately approved change control.
7. **Agree S04/S05 boundary:** define the service data needed by S05 without exposing S04 tables. Keep timeout and worker behavior in S05.
8. **Collect evidence and review:** attach the evidence listed in §6, confirm all blocking questions are resolved or explicitly bounded, and obtain owner/reviewer/team acceptance.

## 8. Final implementation-readiness gate

S04 is ready to enter implementation only when all of the following are documented:

- Required product and privacy decisions are confirmed by the team.
- Warden responsibility-management permissions within assigned houses and the read-only assistance-view scope are documented as separate capabilities; assistance closure actions and notification audience for other Warden changes are defined or explicitly bounded, and cancellation notification to all responsibility participants is preserved.
- S00 database and room/resident source readiness is verified.
- S01 Student/Warden and participant authorization integration is reviewed and accepted.
- S02 recipient routing, dispatch, deduplication, and transaction/failure strategy are jointly agreed and verified.
- The S04/S05 service boundary is agreed; S05 timeout behavior remains assigned to S05.
- S04 owner and reviewer are confirmed, and formal team implementation approval is recorded.

No dependency or slice is marked formally accepted or ready by this plan. The current S00/S01/S02/S03 status statements above reflect their documentation and available source evidence only.
