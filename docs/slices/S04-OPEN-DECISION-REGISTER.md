# S04 Open Decision Register

## 1. Purpose and status

S04 covers **Shared Responsibility Coordination and Warden Assistance**.

Its purpose is to allow roommates to coordinate agreed shared responsibilities and request Warden assistance when coordination problems occur.

**Current slice status:** Planned.

**Implementation is authorized by Ifadha Hussain, S04 Owner.** Owner, formal team, and affected technical-owner approvals for the consolidated decision package are confirmed by the Owner. Repository evidence does not verify all technical claims or dependencies, and final S04 implementation authorization has been granted by the Owner. The implementation gate is OPEN.

Distinguish these statuses throughout this document:

- **Approved decision** — Owner, formal team, and affected technical-owner approval is confirmed by the Owner's instruction. Technical implementation evidence is tracked separately.
- **Recommendation; review pending** — a technical recommendation that has not been reviewed or approved.
- **Approved technical recommendation** — Owner, formal team, and relevant technical-owner approval is confirmed; implementation compatibility evidence may remain outstanding.
- **Open** — no decision is recorded.
- **Approved by team** — use only when approval evidence is recorded below.

Approval provenance: the Owner confirmed approval status in the current instruction. Individual team/technical-owner names, approval dates, and separate evidence locations were not supplied and are not invented here. Approval does not constitute implementation, test, compatibility, or dependency-readiness evidence.

## 2. Functional requirements and acceptance criteria

The S04 specification records these slice acceptance criteria:

- **AC-S04-01:** A student with an active room assignment can participate in valid shared responsibilities with authorized roommates.
- **AC-S04-02:** Cross-room users, former residents, and unauthorized participants cannot access or modify responsibilities improperly.
- **AC-S04-03:** Shared responsibility features must not expose private personal schedules.
- **AC-S04-04:** Validate responsibility details, due times, membership, and assignments. Invalid requests must not partially persist.
- **AC-S04-05:** An authorized participant can request Warden assistance. The responsibility status changes to `Assistance Requested` and the Warden receives an in-app notification.
- **AC-S04-06:** Repeated or concurrent assistance requests must not produce duplicate notifications or inconsistent data.
- **AC-S04-07:** Students cannot access Warden-only assistance views. Wardens see only information necessary for their duties.
- **AC-S04-08:** Completion and cancellation follow approved rules and preserve the data needed by S05.
- **AC-S04-09:** Missing, unauthenticated, or unauthorized requests fail safely without changing data.
- **AC-S04-10:** S04 must not implement responsibility reminders or automatic non-completion alerts. These belong to S05.

The parent PRD requirement is **FR-02**. **AC-FR-02-02** requires the assistance action to update the responsibility status to `Assistance Requested` and send an in-app Warden alert.

## 3. Approved decisions — Owner, formal team, and affected technical-owner approval confirmed

The Owner reports formal team and affected technical-owner approval for the decisions in this register. Implementation and verification evidence remain separately tracked; unresolved technical details below are not reopened product decisions.

### D01 — Room and resident provisioning

**Status:** Approved; implementation and evidence remain outstanding.

**Approved rules:**

1. The application maintains authoritative house, room, and student-room assignment records.
2. The Hostel Manager has overall authority over room and resident assignments and handles cross-house transfers.
3. Authorized Wardens can assign and transfer students only within their assigned house.
4. Wardens cannot modify another house's assignments or approve cross-house transfers.
5. Room and resident management is a separate foundational capability owned by the Schedules & Responsibilities domain and must be established before S04 implementation.
6. S04 consumes this capability rather than maintaining competing room-assignment records.
7. The Hostel Manager enters all initial houses, rooms, student-room assignments, and Warden-house assignments.
8. The Hostel Manager assigns Wardens.
9. Authorized Wardens review and verify initial records for their assigned houses and report errors; the Manager makes corrections.
10. Only the Manager can create, change, or remove Warden-house assignments. The system verifies the assignment for Warden room-management actions.
11. Room-assignment changes record the actor, affected student, previous and new assignments, date/time, and change type.
12. Historical room memberships are retained with start and end dates; former assignments become inactive, not deleted.
13. S04 accesses authoritative room and resident information through an approved service interface. It must not directly query the foundational capability's database tables.
14. Initial records must be reviewed and verified before S04 relies on them for room-membership authorization.

**Approved routing clarifications:**

- Each house has one designated primary Warden at a time. This is a business rule and does not prescribe a database uniqueness constraint.
- The designated primary Warden must be active to receive assistance notifications.
- If the designated primary Warden is missing or inactive, notify the Hostel Manager. The Manager appoints an active replacement.
- Do not silently route assistance notifications to an unrelated Warden.

**Still open:**

- Exact database schema and storage design.
- Initial data validation details.
- The approved service-interface contract.
- Authorization implementation details, including verification of Warden-house assignments.
- Audit-history implementation details.

The rules above have Owner, formal team, and affected technical-owner approval. Their implementation is not evidenced in the repository.

**Approval record:** Approval status confirmed by the Owner in the current instruction. Separate approver names, dates, and evidence locations were not provided. Implementation evidence remains pending.

### D02 — Responsibility agreement and activation

**Status:** Approved; implementation and evidence remain outstanding.

**Previously user-approved rules:**

- Warden distributes responsibilities fairly among students in a room.
- Students may request a fairness review if they believe the allocation is unfair.
- Every assigned student must accept the responsibility.
- Until all assigned students accept, the overall status remains `Pending Acceptance`.
- Once all assigned students accept, the overall status becomes `Active`.
- Rejection does not automatically activate the responsibility. The Warden reviews and may redistribute it.
- The Warden sets an acceptance deadline and reviews non-responses after that deadline; silence is not acceptance.
- Material changes to the responsibility description, assigned students, duty distribution, or due date/time require affected participants to accept the revised responsibility again.
- Overall responsibility returns to `Pending Acceptance` until all required acceptances are received. Previous acceptance does not count for a changed responsibility.
- Minor spelling or formatting corrections do not require renewed acceptance.
- Students may request withdrawal after accepting; the Warden decides whether to approve it and redistribute the duty.
- When a student transfers out, historical responsibilities remain recorded; the Warden reviews unfinished responsibilities and may reassign them.

**Approved notification recipients:** A new distribution notifies all assigned students. Material assignment changes notify all affected students. Rejection and a withdrawal request notify the Warden. Approved withdrawal or redistribution notifies the requester and affected participants. Minor spelling or formatting corrections do not generate a notification.

**Additional approved rules:**

- Students may propose shared responsibilities for their room; the Warden controls final distribution and assignment.
- Students receive notifications about assignments requiring acceptance. Silence is not acceptance; after the deadline, the responsibility remains `Pending Acceptance` until Warden review.
- Affected participants' individual assignment status returns to `Pending`; unaffected participants retain existing acceptance.
- Rejection notifies the Warden, who decides whether to revise, redistribute, or cancel. Rejection of a revised responsibility also notifies the Warden for review.
- Fairness-review requests do not automatically change assignments.
- A student cannot unilaterally withdraw from an accepted responsibility. Approved withdrawal changes that individual assignment status to `Withdrawn`; the Warden redistributes work where necessary.
- A transferred student cannot receive new responsibilities for the former room or be compelled to continue unfinished duties for that room.

**Still open:** Technical representation and evidence for the approved acceptance deadline, Warden review, redistribution, withdrawal, and transfer rules. Do not reopen their approved business outcomes; exact persistence and audit implementation remain unverified.

**Approval record:** Owner confirms Owner, formal team, and affected technical-owner approval. Separate approver names, dates, and evidence locations were not provided. Implementation evidence remains pending.

### D03 — Permission matrix

**Status:** Approved; implementation and evidence remain outstanding.

**Previously user-approved rules:**

- Each student can mark only their own assigned part complete; a student cannot complete another student's part.
- All responsibility participants are notified when the overall responsibility becomes `Completed`.
- An approved reopening notifies relevant participants.
- A student may request reopening their own completed part. The Warden reviews and approves or rejects the request.
- If approved, the overall `Completed` responsibility returns to `Active`.
- The creator or any assigned participant may request cancellation. The Warden reviews participant cancellation requests.
- All responsibility participants are notified when a responsibility is cancelled.
- Room-transfer redistribution notifies affected remaining participants.

**Additional approved rules:**

- If reopening is approved, the individual part returns to the existing `Accepted` status, meaning assigned but not completed. Do not add an `Incomplete` status.
- Relevant participants are notified when a part is reopened.
- Only an authorized Warden makes the final decision on a participant cancellation request. An authorized Warden may also cancel responsibilities directly within their assigned house.

**Still open:** Other action permissions not specified here. The approved simultaneous completion, cancellation, and assistance behaviors must be preserved; their atomic implementation and failure consistency are technical verification items under T02/T03, not reopened business choices.

**Approval record:** Owner confirms Owner, formal team, and affected technical-owner approval. Separate approver names, dates, and evidence locations were not provided. Implementation evidence remains pending.

### D04 — Status model

**Status:** Approved; implementation and evidence remain outstanding.

Separate overall responsibility status from individual assignment status.

Proposed overall statuses:

- `Pending Acceptance`
- `Active`
- `Assistance Requested`
- `Completed`
- `Cancelled`

Proposed individual assignment statuses:

- `Pending`
- `Accepted`
- `Rejected`
- `Completed`
- `Withdrawn`

**Previously user-approved transitions/conditions:** all assigned students accepting changes the overall status from `Pending Acceptance` to `Active`; a valid assistance request changes the overall status to `Assistance Requested`; the overall responsibility becomes `Completed` only when all assigned students complete their own parts; after Warden approval to reopen a completed part, the overall status returns to `Active`. Assistance ends when the overall responsibility becomes `Completed` or `Cancelled`.

Approved clarification: reopening an individual part uses the existing `Accepted` assignment status, meaning assigned but not completed. Do not add an `Incomplete` status.

Do not add states. D02's material-change acceptance rule is approved: affected participants return to `Pending`, unaffected participants retain acceptance, and overall status returns to `Pending Acceptance`; minor spelling/formatting changes do not require renewed acceptance. Assistance ends at `Completed` or `Cancelled`; reopening does not reopen the prior request, and a new request may be made for a new problem after the prior request ends. Rejection, non-response, redistribution, withdrawal, room transfer, and conflicting lifecycle outcomes are among the approved decisions enumerated below. Implementation consistency and verification remain open.

**Approval record:** Owner confirms Owner, formal team, and affected technical-owner approval. Separate approver names, dates, and evidence locations were not provided. State-transition implementation evidence remains pending.

### D05 — Responsibility lifecycle

**Status:** Approved; implementation and evidence remain outstanding.

**Approved principles:**

- Rejection does not automatically activate the original assignment.
- Non-response is not acceptance.
- Withdrawal requires an agreed process.
- Former participants have read-only access to historical responsibilities they participated in, and cannot access new responsibilities created for their former room after leaving.
- Cancellation and overall completion notify all responsibility participants.
- A cancellation request may be made by the creator or an assigned participant and is reviewed by the Warden.
- A student may request reopening their own completed part; the Warden approves or rejects it. If approved, the part returns to `Accepted` (assigned but not completed) and the overall responsibility returns to `Active`.
- On room transfer, the Warden reviews unfinished responsibilities and may reassign them; the historical responsibility remains recorded.

**Additional approved transfer rules:**

- A transferred student cannot receive new responsibilities for the former room or be compelled to continue unfinished duties for that room.
- Relevant participants are notified of transfer-related changes.
- An approved reopened part uses the existing `Accepted` assignment status, as recorded under D03/D04.

**Still open:** Exact historical access/retention and audit implementation. Withdrawal, redistribution, and room-transfer business outcomes are approved; T02/T03 consistency and implementation evidence remain outstanding.

**Approval record:** Owner confirms Owner, formal team, and affected technical-owner approval. Separate approver names, dates, and evidence locations were not provided. Implementation evidence remains pending.

### D06 — Warden assistance

**Status:** Approved; implementation and evidence remain outstanding.

**Selected:**

- An authorized assigned participant can request Warden assistance about a shared responsibility problem.
- The overall responsibility changes to `Assistance Requested` when assistance is requested.
- Only one active assistance request exists per responsibility. Repeated requests do not create duplicate requests or notifications.
- A new assistance request may be made after the previous request ends.
- Assistance ends automatically when the responsibility becomes `Completed` or `Cancelled`.
- Participants are notified of relevant status changes.
- The Warden assistance view is read-only and does not grant a separate resolution or closure action.

**Additional approved rules:**

- Reopening a `Completed` responsibility does not reopen its previous assistance request. A new assistance request may be submitted for a new problem after the previous request has ended.
- Repeated or concurrent submissions must not create duplicate active assistance requests or duplicate notifications.

**Still open:**

- Assistance history and event identity/deduplication implementation details.
- Notification message content remains to be implemented and reviewed; the recipient rules are recorded in D02, D03, D05, and D08.
- Technical handling of the approved concurrent actions under T02/T03. The one-active-request, duplicate-prevention, completion/cancellation closure, and new-problem-after-closure rules remain selected.

Notification read state must not be treated as Warden acknowledgement or resolution unless the team explicitly defines it that way.

**Approval record:** Owner confirms Owner, formal team, and affected technical-owner approval. Separate approver names, dates, and evidence locations were not provided. Implementation evidence remains pending.

### D07 — Warden routing

**Status:** Approved; implementation and evidence remain outstanding.

**Previously user-approved:**

- Each house has one designated primary Warden.
- The system determines the student's current house and routes assistance notifications to its primary Warden.
- If no primary Warden is assigned, the request remains recorded, administrative attention is flagged, and the Hostel Manager is notified.
- If the primary Warden is inactive, new notifications are not sent to that Warden; the Manager is notified and assigns an active replacement.
- The system does not silently route to an unrelated Warden.

**Additional approved rules:** The current designated primary Warden is identified through the authoritative house assignment. The missing/inactive Warden notification and replacement rules are recorded under D01. An already active assistance request is reassigned when the primary Warden becomes inactive or is replaced; reassignment does not create a new assistance request/event or duplicate notification. Technical reassignment behavior and T02/T03 consistency remain unverified.

**Still open:**

- House is the Warden authorization boundary. Whether “house” and “building” require distinct stored entities and the exact room/house/Warden relationship representation remain implementation details. Verify the authoritative mapping and reassignment through the approved interface.

**Approval record:** Owner confirms Owner, formal team, and affected technical-owner approval. Separate approver names, dates, and evidence locations were not provided. Mapping/reassignment implementation evidence remains pending.

### D08 — Warden authority

**Status:** Approved; implementation and evidence remain outstanding.

**Selected:** Wardens have authority, only for rooms within their assigned house, to:

- Create responsibilities.
- Edit responsibilities.
- Reassign or redistribute responsibilities.
- Cancel responsibilities.

This supports situations such as a student becoming sick and going home, requiring the Warden to redistribute their duties among remaining roommates.

**Selected notification rule:** Notify all participants assigned to the responsibility when a Warden changes it.

**Assistance-view boundary:** The Warden assistance view is read-only and does not automatically grant a separate assistance-resolution or closure action. This is separate from Warden responsibility-management authority above.

**Approved visibility clarification:** Wardens may access responsibility and assistance information only for rooms within their assigned house. The assistance view remains read-only.

**Still open:**

- Exact audit-history implementation/details.

**Approval record:** Owner confirms Owner, formal team, and affected technical-owner approval. Separate approver names, dates, and evidence locations were not provided. Authorization and audit implementation evidence remains pending.

### D09 — Privacy and visibility

**Status:** Approved; privacy implementation evidence remains outstanding.

**Selected:**

- Students can view shared responsibilities only when they are authorized participants.
- Students see their own room information and cannot view responsibilities belonging to unrelated rooms or unrelated students' individual responsibility records.
- Former participants retain read-only access to historical responsibilities in which they participated, but cannot access new responsibilities created for their former room after leaving.
- Students cannot access other students' private schedules.
- Wardens cannot access students' private personal schedules.
- Hostel Managers may view room/resident records across houses and shared responsibilities when required for authorized administrative work; they cannot browse students' private personal schedules.

**Approved NFR-01/FR-02 reconciliation:** NFR-01 protects private personal schedules and individually owned responsibility records. FR-02 permits a shared-responsibility record to be visible to its authorized participants for coordination; this is a limited shared-record permission, not access to another student's private schedule or unrelated individual records. This records the approved interpretation and does not amend the PRD. S04 privacy implementation evidence remains outstanding.

**Approval record:** Owner confirms Owner, formal team, and affected technical-owner approval. Separate approver names, dates, and evidence locations were not provided. Implementation evidence remains pending.

### D10 — NFR-02 applicability

**Status:** Approved; performance evidence remains outstanding.

**Approved target:** Apply the PRD's maximum 2-second response-time target to S04 responsibility views and operations, including creation, updates, acceptance/rejection, completion, and assistance requests. This approval does not establish technical feasibility or achievement.

**Approved measurement definition:** Measure S04 application response time; measure external notification delivery time separately. Do not replace the maximum 2-second target with a percentile target or otherwise weaken it.

**Evidence still required:** Record the test environment, workload, and measurement conditions and results. The PRD has not been amended, and repository evidence does not show that S04 meets the target.

**Approval record:** Owner confirms Owner, formal team, and affected technical-owner approval. Separate approver names, dates, and evidence locations were not provided. Performance evidence remains pending.

### D11 — S04 to S05 service boundary

**Status:** Approved; service-contract implementation and evidence remain outstanding.

**Selected:** Option B. S05 must obtain responsibility information through an approved S04 service interface. S05 must not directly query S04-owned database tables.

The service-boundary decision is approved. The exact service contract, fields, permissions, versioning, lifecycle semantics, and implementation evidence remain to be completed. No S05 files or implementation were inspected.

**Approval record:** Owner confirms Owner, formal team, and affected technical-owner approval. Separate approver names, dates, and evidence locations were not provided. Service-contract evidence remains pending.

### D12 — Self-reporting versus automatic timeout

**Status:** Approved; S04 self-report implementation evidence remains outstanding.

**Selected boundary:**

- Students self-report completion only for their own assigned part, and S04 records that self-reported completion.
- S05 owns timeout duration, detection, and automatic alerts.
- S04 must not implement a timeout worker.
- S04 does not automatically mark responsibilities incomplete when deadlines pass.

The S05 timeout duration/confirmation semantics remain open and must not be inferred here.

**Approval record:** Owner confirms Owner, formal team, and affected technical-owner approval. Separate approver names, dates, and evidence locations were not provided. S04 implementation evidence remains pending.

### Traceability for the 15 additional Owner-approved S04 resolutions

The Owner-approved consolidated decision package states that it contains 15 additional resolutions. Their approved substance is recorded across D01-D12, including foundational room/resident ownership and Warden routing; responsibility proposal, distribution, acceptance, rejection, revision and withdrawal; completion, reopening, cancellation and selected notification audiences; room-transfer/history rules; assistance lifecycle, deduplication and reassignment; permissions/privacy; and the S04 performance target. The supplied package describes these as a consolidated set and does not provide a separate numbered list of 15 atomic decisions. This register therefore preserves the traceability to D01-D12 instead of inventing 15 new decision IDs or subdividing the approved rules arbitrarily. The content remains Owner-approved; formal team confirmation is pending.
## 4. User-approved technical recommendations; formal team and technical-owner approval pending

The user has approved these five recommendations as the selected technical approach. This records user approval only; formal team and technical-owner approval, along with implementation compatibility checks, remain pending. User approval does not authorize implementation by itself.

| ID | Recommendation | Status | Approval/evidence |
|---|---|---|---|
| **T01 — Validation and authorization** | Reuse S01 verified identity and authorization infrastructure; enforce room, participant, and house-level authorization; validate inputs and fail safely. | User-approved recommendation; technical-owner/team confirmation pending. | User approval: recorded in this conversation; technical-owner/team approver/date/evidence: _not recorded_ |
| **T02 — Atomic transactions** | Related responsibility and assignment changes should be atomic so partial updates do not persist. | User-approved recommendation; technical-owner/team confirmation pending. | User approval: recorded in this conversation; team approver/date/evidence: _not recorded_ |
| **T03 — Notification reliability** | Use the existing S02 notification service. Verify transaction-bound dispatch compatibility; existing S02 dispatch has no verified transaction-bound interface. If incompatible, evaluate a transactional outbox as the preferred alternative for review, not as a mandatory or approved architecture choice. Outbox ownership, persistence, processing, retry, and recovery require technical-owner/architecture approval. | User-approved recommendation; technical-owner/team confirmation pending. | User approval recorded in the S04 decision discussions; technical-owner/team approver/date/evidence: _not recorded_ |
| **T04 — Deduplication** | Use deterministic idempotency/deduplication keys that prevent concurrent duplicates while distinguishing genuinely new assistance events. | User-approved recommendation; technical-owner/team confirmation pending. | User approval: recorded in this conversation; technical-owner/team approver/date/evidence: _not recorded_ |
| **T05 — S04/S02 dispatch contract** | Agree on event type, recipient, payload, deduplication key, and failure behavior with the S02 owner. | User-approved recommendation; technical-owner/team confirmation pending. | User approval: recorded in this conversation; technical-owner/team approver/date/evidence: _not recorded_ |

**Implementation note:** T02 and T03 must be designed together. The existing S02 notification service does not expose a verified transaction-bound dispatch interface. Transaction-backed repository injection may be possible but is not an established contract and requires technical verification. If transaction-bound dispatch is incompatible, evaluate a transactional outbox as the preferred alternative for review; it is not mandatory or an approved architecture choice. Outbox ownership, persistence, retry, and recovery require technical-owner/architecture confirmation before adoption. Establish a compatible notification and transaction strategy before proceeding.

Do not implement these recommendations until formal team approval and implementation compatibility checks are complete.

## 5. Governance and dependency decisions

These are readiness checks, not completed approvals.

| ID | Decision/readiness check | Status | Approval/evidence |
|---|---|---|---|
| **G01 — Implementation gate** | S04 implementation is authorized. Outstanding technical dependencies and verification requirements remain tracked and must be addressed. | Open | Approver: _not recorded_ · Date: _not recorded_ · Evidence/location: _not recorded_ |
| **G02 — S00 readiness** | Confirm database readiness and migration strategy, and formally confirm and verify the user-selected application room/resident source and its service boundary. | Open | Approver: _not recorded_ · Date: _not recorded_ · Evidence/location: _not recorded_ |
| **G03 — S01 readiness** | Confirm authentication, role authorization, and room-level access-control integration. | Open | Approver: _not recorded_ · Date: _not recorded_ · Evidence/location: _not recorded_ |
| **G04 — S02 readiness** | Confirm notification dispatch integration, Warden recipient routing, transaction behavior, and deduplication. Resolve the S02/S04 integration dependency. | Open | Approver: _not recorded_ · Date: _not recorded_ · Evidence/location: _not recorded_ |
| **G05 — Ownership and review** | S04 governance assignment is confirmed: Ifadha Hussain is S04 Owner and final S04 approval authority; Abiha is S04 Reviewer. Abiha's Project Coordinator role is separate from the S04 Reviewer role. This resolves the ownership/reviewer assignment issue only; it does not approve implementation or resolve any product, technical, or dependency decision. | Resolved — governance assignment only | Confirmed by Ifadha Hussain (S04 Owner) in the user's instruction; approval date and separate evidence location not recorded. |
| **G06 — S03 integration** | Confirm privacy coordination between S03 and S04. S03 personal schedules are not the source of room/resident records. S04 must not access or expose S03 private personal schedule data. Room/resident source-of-truth and provisioning decisions must be resolved through Schedules & Responsibilities and S00, not S03. Unrelated S03 database, browser, or reminder work does not automatically block S04. | Open | Approver: _not recorded_ · Date: _not recorded_ · Evidence/location: _not recorded_ |

## 6. Dependency evidence and known gaps

The following are inspection findings, not claims that a dependency is formally accepted or fully ready.

### S00

- Shared API response helpers, Prisma client, PostgreSQL datasource, and Next.js Route Handler structure exist.
- Live database readiness, applied migrations, room provisioning, and seed data are not confirmed.

### S01

- JWT authentication and active-user checks exist.
- Reusable role authorization exists.
- Room-level authorization and S04-specific route guards are not confirmed.

### S02

- Notification contract and dispatch service exist.
- Notification persistence and deduplication exist.
- A verified S04 caller, Warden routing contract, and transaction-bound dispatch integration are not confirmed.

### S03

- S03 is integrated into `origin/main` (the S04 branch starting commit is `872d9ef1060bbf9d0eead76d08bb0c83b26cd963`, which contains S03 commit `3e1c2a29d41f8235e38ff7ba06b5b18206bfe569`).
- S04 must preserve the privacy boundary and must not access private personal schedules.
- S03 does not establish room/resident provisioning; its database/browser integration and formal acceptance remain pending in its specification.

### S04

- No implementation approval has been granted.
- No S04 implementation should begin until the open gates are resolved and implementation is explicitly approved.

## 7. Approval tracking

For each decision, record status using only the following labels:

- `User-approved; formal team confirmation pending`
- `Owner-approved; formal team confirmation pending`
- `Recommendation; review pending`
- `User-approved recommendation; team/technical confirmation pending`
- `Open`
- `Approved by team` — only when evidence exists

| Decision ID(s) | Status | Approver(s) | Approval date | Evidence or record location |
|---|---|---|---|---|
| D01–D09, D11–D12 | Previously recorded rules user-approved; consolidated clarifications Owner-approved; formal team confirmation pending | S04 Owner; formal team approver not recorded | _not recorded_ | Current S04 decision discussions/instruction; formal team evidence not recorded |
| D10 | 2-second target user-approved; measurement boundary Owner-approved; formal team/PRD confirmation pending | S04 Owner; formal team/PRD approver not recorded | _not recorded_ | Current S04 decision discussions/instruction; formal team evidence not recorded |
| T01–T05 | User-approved recommendation; technical-owner/team confirmation pending | User approval recorded in this conversation; team approver not recorded | _not recorded_ | _not recorded_ |
| G01–G04, G06 | Open | _not recorded_ | _not recorded_ | _not recorded_ |
| G05 | Resolved — governance assignment only | Ifadha Hussain (S04 Owner) | _not recorded_ | User instruction confirming S04 governance arrangement; separate evidence location not recorded |

Do not mark a decision `Approved by team` without documented evidence identifying who approved it, when, and where the evidence is recorded.

## 8. Final implementation gate

S04 can move to implementation planning only after:

1. Required functional decisions are confirmed.
2. Technical recommendations are reviewed and approved where necessary.
3. S00, S01, and S02 integration readiness is confirmed.
4. S04 ownership, reviewer, project coordinator distinction, and final approval authority are recorded.
5. The S04/S05 service boundary is agreed.
6. Required team and dependency-owner approvals are recorded, and final S04 implementation approval is explicitly recorded by Ifadha Hussain as S04 Owner.

G05 resolves the governance assignment. Ifadha Hussain, as S04 Owner, has authorized implementation. S04 retains its separate lifecycle status of **Planned**. The implementation gate is **OPEN**. Outstanding technical dependencies and verification requirements remain tracked and must be addressed during implementation.


