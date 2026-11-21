# S04 Open Decision Register

## 1. Purpose and status

S04 covers **Shared Responsibility Coordination and Warden Assistance**.

Its purpose is to allow roommates to coordinate agreed shared responsibilities and request Warden assistance when coordination problems occur.

**Current slice status:** Planned.

**Implementation is not approved.** Required team decisions, dependency readiness, cross-slice agreements, and explicit team approval must be confirmed first. This register records user-selected proposals and technical recommendations; it does not itself approve them.

Distinguish these statuses throughout this document:

- **User-selected; team approval pending** — the user selected or proposed an approach, but no formal team approval is recorded.
- **Recommendation; review pending** — a technical recommendation that has not been reviewed or approved.
- **Open** — no decision is recorded.
- **Approved by team** — use only when approval evidence is recorded below.

Unless evidence is added to the approval tracking fields, every user selection in this register is **“User-proposed/selected; team approval pending.”**

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

## 3. User-selected decisions — team approval pending

Each decision below has an approval status and evidence fields. User selections are not formal team approvals.

### D01 — Room and resident provisioning

**Status:** User-selected; team approval pending.

**Selected:** Hostel Manager.

The Manager is responsible for maintaining authoritative room and resident records, including student room assignments, joining, leaving, and transfers.

Still requires confirmation of the actual system source of truth, permissions, and operational workflow.

**Approval evidence:** Approver: _not recorded_ · Date: _not recorded_ · Evidence/location: _not recorded_.

### D02 — Responsibility agreement and activation

**Status:** User-selected; team approval pending.

**Selected approach:**

- Warden distributes responsibilities fairly among students in a room.
- Students may request a fairness review if they believe the allocation is unfair.
- Every assigned student must accept the responsibility.
- Until all assigned students accept, the overall status remains `Pending Acceptance`.
- Once all assigned students accept, the overall status becomes `Active`.
- Rejection does not automatically activate the responsibility. The Warden reviews and may redistribute it.

**Approval evidence:** Approver: _not recorded_ · Date: _not recorded_ · Evidence/location: _not recorded_.

### D03 — Permission matrix

**Status:** User-selected; team approval pending.

**Selected:** Cancellation must be allowed, and all responsibility participants must be notified when a responsibility is cancelled.

Still unresolved:

- Whether the creator can edit shared responsibility details.
- Whether each assignee can report their own completion.
- Whether students are prohibited from editing another student's completion status.
- Exact participant and Warden permissions for each action.

Do not assume these permissions are approved.

**Approval evidence:** Approver: _not recorded_ · Date: _not recorded_ · Evidence/location: _not recorded_.

### D04 — Status model

**Status:** User-selected; team approval pending.

**Selected:** Separate overall responsibility status from individual assignment status.

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

The exact status transitions still require agreement, especially for withdrawal, completion, and assistance. Preserve the PRD requirement that an assistance request changes the responsibility status to `Assistance Requested`; the relationship between that status and any separate assistance state remains to be clarified.

**Approval evidence:** Approver: _not recorded_ · Date: _not recorded_ · Evidence/location: _not recorded_.

### D05 — Responsibility lifecycle

**Status:** User-selected; team approval pending.

**Selected principles:**

- Rejection does not automatically activate the original assignment.
- Non-response is not acceptance.
- Withdrawal requires an agreed process.
- Former roommates retain appropriate access to historical responsibilities in which they participated.
- Cancellation notifies participants.
- Completion follows agreed individual and overall completion rules.

Still unresolved:

- Whether remaining roommates continue after someone withdraws.
- How a replacement participant is assigned.
- Exact completion rules.
- How room transfers affect active responsibilities.

**Approval evidence:** Approver: _not recorded_ · Date: _not recorded_ · Evidence/location: _not recorded_.

### D06 — Warden assistance

**Status:** User-selected; team approval pending.

**Selected:**

- A student can request Warden assistance about a shared responsibility problem.
- Assistance closes when the issue is completed.

Still unresolved:

- Who records or confirms completion.
- How cancellation affects an open assistance request.
- Whether repeated requests are allowed while assistance is already pending.
- How an assistance request is acknowledged and resolved.

Notification read state must not be treated as Warden acknowledgement or resolution unless the team explicitly defines it that way.

**Approval evidence:** Approver: _not recorded_ · Date: _not recorded_ · Evidence/location: _not recorded_.

### D07 — Warden routing

**Status:** User-selected; team approval pending.

**Selected:**

- One Warden is responsible for each hostel house/building.
- A branch with three houses may have three Wardens.
- Assistance requests route to the Warden responsible for the student's assigned house.

Still unresolved:

- Whether “house” and “building” represent the same entity in the actual system.
- What happens when no Warden is assigned.
- The authoritative room-to-house-to-Warden mapping.

**Approval evidence:** Approver: _not recorded_ · Date: _not recorded_ · Evidence/location: _not recorded_.

### D08 — Warden authority

**Status:** User-selected; team approval pending.

**Selected:** Wardens have authority, only for rooms within their assigned house, to:

- Create responsibilities.
- Edit responsibilities.
- Reassign or redistribute responsibilities.
- Cancel responsibilities.

This supports situations such as a student becoming sick and going home, requiring the Warden to redistribute their duties among remaining roommates.

**Selected notification rule:** Notify participants when the Warden changes a responsibility.

**Assistance-view boundary:** The Warden assistance view is read-only and does not automatically grant a separate assistance-resolution or closure action. This is separate from Warden responsibility-management authority above.

Still unresolved:

- Whether notifications go to affected participants only, all participants, or everyone in the room.
- Exact Warden permissions and audit requirements.
- Warden access must not expose unrelated personal schedules.

**Approval evidence:** Approver: _not recorded_ · Date: _not recorded_ · Evidence/location: _not recorded_.

### D09 — Privacy and visibility

**Status:** User-selected; team approval pending.

**Selected:**

- Students can view shared responsibilities only when they are authorized participants.
- Students cannot access unrelated students' private schedules or individual responsibility records.
- Wardens cannot access students' private personal schedules.
- Hostel Managers may access only information necessary for their authorized administrative responsibilities.

These selected privacy boundaries remain subject to team approval and must be interpreted consistently with NFR-01 and FR-02's roommate dashboard flow.

**Approval evidence:** Approver: _not recorded_ · Date: _not recorded_ · Evidence/location: _not recorded_.

### D10 — NFR-02 applicability

**Status:** User-selected; team approval pending.

**Selected:** NFR-02 does not apply specifically to S04.

This is a user decision and still requires team ratification. The PRD states that complaint tracking views and schedule updates must meet a maximum 2.0-second response time; whether responsibility operations are included in “schedule updates” has not been authoritatively clarified.

**Approval evidence:** Approver: _not recorded_ · Date: _not recorded_ · Evidence/location: _not recorded_.

### D11 — S04 to S05 service boundary

**Status:** User-selected; team approval pending.

**Selected:** Option B. S05 must obtain responsibility information through an approved S04 service interface. S05 must not directly query S04-owned database tables.

Still requires agreement between S04 and S05 owners on the exact service contract, fields, permissions, and integration.

**Approval evidence:** Approver: _not recorded_ · Date: _not recorded_ · Evidence/location: _not recorded_.

### D12 — Self-reporting versus automatic timeout

**Status:** User-selected; team approval pending.

**Selected boundary:**

- S04 supports authorized student self-reporting according to approved rules.
- S05 owns timeout duration, detection, and automatic alerts.
- S04 must not implement a timeout worker.

Exact self-reporting rules depend on the unresolved D03–D05 decisions. The S05 timeout duration/confirmation semantics remain open and must not be inferred here.

**Approval evidence:** Approver: _not recorded_ · Date: _not recorded_ · Evidence/location: _not recorded_.

## 4. User-approved technical recommendations; formal team and technical-owner approval pending

The user has approved these five recommendations as the selected technical approach. This records user approval only; formal team and technical-owner approval, along with implementation compatibility checks, remain pending. User approval does not authorize implementation by itself.

| ID | Recommendation | Status | Approval/evidence |
|---|---|---|---|
| **T01 — Validation and authorization** | Use existing authentication and authorization patterns, validate inputs, enforce room-level access, and fail safely. | User-approved recommendation; team/technical confirmation pending. | User approval: recorded in this conversation; team approver/date/evidence: _not recorded_ |
| **T02 — Atomic transactions** | Related responsibility and assignment changes should be atomic so partial updates do not persist. | User-approved recommendation; team/technical confirmation pending. | User approval: recorded in this conversation; team approver/date/evidence: _not recorded_ |
| **T03 — Notification reliability** | Use the existing S02 notification service. Notification failure handling and transaction consistency require an agreed integration strategy. | User-approved recommendation; team/technical confirmation pending. | User approval: recorded in this conversation; team approver/date/evidence: _not recorded_ |
| **T04 — Deduplication** | Use deterministic idempotency/deduplication for assistance requests and notifications. | User-approved recommendation; team/technical confirmation pending. | User approval: recorded in this conversation; team approver/date/evidence: _not recorded_ |
| **T05 — S04/S02 dispatch contract** | Agree on the assistance request event, recipient identification, notification payload, and dispatch behavior with the S02 owner. | User-approved recommendation; team/technical confirmation pending. | User approval: recorded in this conversation; team approver/date/evidence: _not recorded_ |

**Implementation note:** T02 and T03 must be designed together. The existing S02 notification service does not expose a verified transaction-bound dispatch interface. The implementation must establish a compatible notification and transaction strategy before proceeding.

Do not implement these recommendations until formal team approval and implementation compatibility checks are complete.

## 5. Governance and dependency decisions

These are readiness checks, not completed approvals.

| ID | Decision/readiness check | Status | Approval/evidence |
|---|---|---|---|
| **G01 — Implementation gate** | S04 implementation remains blocked until required decisions, approvals, and dependencies are confirmed. | Open | Approver: _not recorded_ · Date: _not recorded_ · Evidence/location: _not recorded_ |
| **G02 — S00 readiness** | Confirm database readiness, migration strategy, and authoritative room/resident data source. | Open | Approver: _not recorded_ · Date: _not recorded_ · Evidence/location: _not recorded_ |
| **G03 — S01 readiness** | Confirm authentication, role authorization, and room-level access-control integration. | Open | Approver: _not recorded_ · Date: _not recorded_ · Evidence/location: _not recorded_ |
| **G04 — S02 readiness** | Confirm notification dispatch integration, Warden recipient routing, transaction behavior, and deduplication. Resolve the S02/S04 integration dependency. | Open | Approver: _not recorded_ · Date: _not recorded_ · Evidence/location: _not recorded_ |
| **G05 — Ownership and review** | Current documentation conflicts on reviewer: Member 3 in the register and Member 4 in the S04 specification. Confirm S04 owner, reviewer, and approval authority with the team. | Open | Approver: _not recorded_ · Date: _not recorded_ · Evidence/location: _not recorded_ |
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

- `User-selected; team approval pending`
- `Recommendation; review pending`
- `User-approved recommendation; team/technical confirmation pending`
- `Open`
- `Approved by team` — only when evidence exists

| Decision ID(s) | Status | Approver(s) | Approval date | Evidence or record location |
|---|---|---|---|---|
| D01–D12 | User-selected; team approval pending | _not recorded_ | _not recorded_ | _not recorded_ |
| T01–T05 | User-approved recommendation; team/technical confirmation pending | User approval recorded in this conversation; team approver not recorded | _not recorded_ | _not recorded_ |
| G01–G06 | Open | _not recorded_ | _not recorded_ | _not recorded_ |

Do not mark a decision `Approved by team` without documented evidence identifying who approved it, when, and where the evidence is recorded.

## 8. Final implementation gate

S04 can move to implementation planning only after:

1. Required functional decisions are confirmed.
2. Technical recommendations are reviewed and approved where necessary.
3. S00, S01, and S02 integration readiness is confirmed.
4. S04 ownership and reviewer responsibilities are confirmed.
5. The S04/S05 service boundary is agreed.
6. The team explicitly approves implementation.

These conditions are not claimed to be satisfied. This register does not change the S04 status from **Planned** and does not constitute implementation approval.
