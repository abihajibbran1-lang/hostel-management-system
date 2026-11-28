# AGENTS.md
# Hostel Management System — AI Coding Agent Instructions

## 1. Purpose and Governing Principle

This repository contains the Hostel Management System. The product helps students organize personal daily schedules, coordinate agreed shared responsibilities with roommates, manage meal-related arrangements, report hostel problems, and track complaint status and outcomes. It also supports Warden and Hostel Manager workflows and includes laundry reservations, Lost and Found, and weekly meal-menu publishing.

The system is a **coordination tool**. It does not physically prepare or deliver meals and does not replace the operational responsibilities of hostel staff.

**Implementation rule:** implement the approved product and architecture. Do not redesign the system, silently reinterpret validated requirements, or treat an unapproved technical preference as an accepted decision.

## 2. Authoritative Documents and File Names

Use these canonical project filenames:

| File | Authority |
|---|---|
| `Final_PRD.md` | Final Validated Product Requirements Document. Authoritative for product scope, goals, actors, functional requirements, non-functional requirements, business rules, constraints, non-goals, user flows, and acceptance criteria. |
| `architecture.md` | Approved main architecture document. Authoritative for architectural goals and drivers, ASRs, selected style, tiers, named modules, component interactions, data responsibilities, and architectural constraints. |
| `Architecture_and_ADRs.zip` | Archive identified by the project team as containing the five accepted ADRs (ADR-001 through ADR-005). |

The five ADR filenames referenced by `architecture.md` are:

1. `ADR-001-architecture-style.md`
2. `ADR-002-data-persistence-laundry-locking.md`
3. `ADR-003-authentication-boundary.md`
4. `ADR-004-immutable-meal-allocation-snapshots.md`
5. `ADR-005-scheduled-escalation-worker.md`

If the archive is extracted, refer to the individual ADRs by those exact filenames. Do not assume an extraction directory or relative path unless it exists in the repository.

### Source precedence

1. `Final_PRD.md` governs approved product behavior and requirements.
2. `architecture.md` governs the approved architecture and documented component responsibilities/interactions.
3. The accepted ADRs govern the specific architectural decisions they record.
4. Existing repository code and conventions may be followed where they do not conflict with these documents.

If the sources conflict, identify the exact conflicting statements and ask the project team for a decision. Do not silently resolve a substantive conflict by choosing one source or inventing a compromise.

## 3. Product Goals and Supported Actors

### 3.1 Product goals

Preserve the PRD goals:

- **G-01:** Help students create, view, and update their personal daily schedules.
- **G-02:** Support coordination of shared responsibilities agreed upon by roommates.
- **G-03:** Notify students about upcoming activities and agreed responsibilities.
- **G-04:** Notify the Warden when an agreed responsibility remains incomplete after one reminder and non-completion is confirmed.
- **G-05:** Support meal reservations and advance communication routed to Kitchen Staff.
- **G-06:** Support fixed meal-portion logging and Warden audit verification.
- **G-07:** Allow students to submit identified hostel complaints with mandatory fields and track their own status.
- **G-08:** Enable the Warden to review complaints, correct priorities, and transition states through a formal lifecycle.
- **G-09:** Support student-initiated direct escalation at 18 hours and automatic escalation at 24 hours.
- **G-10:** Preserve earlier resolved complaints as separate records while maintaining parent reference links for recurring issues.
- **G-11:** Protect privacy across student schedules, responsibilities, and complaints.

### 3.2 Actors and roles

The PRD identifies these actors/stakeholders:

- **Student:** manages own schedule; coordinates agreed responsibilities; receives notifications; submits meal notices; submits and tracks own complaints; escalates complaints under FR-10.
- **Roommate:** coordinates shared responsibilities agreed upon with other roommates.
- **Warden:** receives assistance requests and incomplete-responsibility alerts; conducts meal-portion audits; reviews and updates complaint status.
- **Hostel Manager / Manager:** receives escalated complaints and handles unresolved higher-level issues.
- **Kitchen Staff:** receive meal reservations and collection-difficulty notices; log portion allocations.
- **System:** generates notifications, enforces privacy boundaries, tracks state transitions, and performs automatic escalation.

The architecture identifies the four RBAC roles as **Student, Warden, Kitchen Staff, and Manager**. Do not invent additional authorization roles without approval.

## 4. Approved Architecture

### 4.1 Selected style

The accepted architectural style is **3-Tier Layered Architecture**, consisting of:

1. **Presentation Tier**
2. **Business Logic Tier**
3. **Central RDBMS Data Tier**

The Business Logic Tier is divided into six named domain modules: **Auth, Laundry, Complaints, Meals, Schedules & Responsibilities, and Lost & Found**. The Notification Service is a shared capability, not a seventh domain module.

The architecture process considered Modular Monolith, Microservices, and 3-Tier Layered Architecture. The documented rationale for not selecting Microservices includes operational overhead, distributed transaction issues, network latency, and multi-database maintenance. The documented rationale for not selecting a pure Modular Monolith is that it lacks the standard tier separation selected for this system.

Do not replace the accepted 3-Tier Layered Architecture with Microservices, Modular Monolith, or another style.

### 4.2 Tier responsibilities

**Presentation Tier**
- Provides the user interface for supported student and staff workflows.
- Presents information and accepts user requests.
- Remains separate from business rules and data access.

**Business Logic Tier**
- Contains application business rules.
- Contains the six domain modules listed in Section 5.
- Contains the shared Notification Service and scheduled background worker as supporting capabilities.

**Central RDBMS Data Tier**
- Provides the central relational data store.
- Supports persistent system records.
- Supports the approved transactional laundry reservation mechanism and immutable meal allocation snapshots.

### 4.3 Architectural Significant Requirements (ASRs)

Preserve the architecture's ASR identifiers and concerns:

- **ASR-01 — Laundry concurrency (FR-13 / BR-10):** simultaneous bookings for the same slot must not cause double-booking; reservation transactions must be atomic and concurrency must be handled at the data layer.
- **ASR-02 & ASR-05 — Privacy and authentication (NFR-01 / CON-02):** the four actor roles require centralized authentication middleware, role guards, and row-level access control enforcing single-owner privacy.
- **ASR-03 — Menu decoupling (FR-15 / BR-12):** menu-template edits must not alter historical audit logs, portion records, or existing reservation tickets; immutable meal allocation snapshots are required.
- **ASR-04 — Escalations (FR-10 / FR-11 / BR-03):** the 18-hour manual-escalation unlock and 24-hour automatic escalation use scheduled background checks.
- **Latency and uptime driver (NFR-02 / NFR-04):** laundry availability and complaint tracking require efficient database access to support approved response-time and availability targets.

The architecture also identifies strict privacy, tier separation, historical meal integrity, complaint escalation timing, response time, and availability as architectural drivers.

## 5. Named Modules and Boundaries

All six following domain modules are explicitly approved in the updated `architecture.md`.

### 5.1 Auth Module

- Supports stateless JWT authentication.
- Provides centralized role-based access-control middleware.
- Evaluates user ID and role claims.
- Enforces single-owner row-level access control on API endpoints before requests reach business logic.
- Applies the documented roles: Student, Warden, Kitchen Staff, and Manager.

See `ADR-003-authentication-boundary.md`.

### 5.2 Laundry Module

- Supports laundry facility reservations.
- Supports availability and booked-slot checks.
- Supports cancellation of a student's own future reservation.
- Uses atomic relational database transactions and row locking to prevent two students from reserving the same washing-machine slot simultaneously.

See `ADR-002-data-persistence-laundry-locking.md`.

### 5.3 Complaints Module

- Supports identified complaint submission.
- Supports complaint review and status lifecycle management.
- Supports student complaint tracking.
- Supports direct and automatic complaint escalation.
- Students can view their own complaints only.
- Warden and Manager actions follow the roles and complaint workflow defined in the PRD.
- Complaint timestamps support the 18-hour direct-escalation and 24-hour automatic-escalation rules.

The documented lifecycle is `Pending` → `In Progress` → `Resolved` / `Escalated`.

See `ADR-005-scheduled-escalation-worker.md`.

### 5.4 Meals Module

- Supports meal reservations and collection arrangements.
- Supports meal portion logging and Warden audit verification.
- Supports weekly meal-menu creation, editing, publishing, and student read-only viewing.
- Uses immutable snapshots saved in the Data Layer at reservation or logging time so menu-template edits do not change existing meal reservations or historical portion allocations.

See `ADR-004-immutable-meal-allocation-snapshots.md`.

### 5.5 Schedules & Responsibilities Module

- Owns rooms, room-resident assignments, personal schedules, shared responsibilities, and responsibility assignments.
- Enforces privacy for personal schedules and responsibility records.
- Exposes a read-only Room service interface to other modules that need room information.
- Does not expose private schedule details to other students.

### 5.6 Lost & Found Module

- Owns lost/found item reports, claims, claim status, and image references.
- Supports Warden-mediated claim verification and handover.
- Stores image objects in a private Supabase Storage bucket and stores stable object paths in PostgreSQL.
- Does not expose private contact details of claimants or finders to other students.

### 5.7 Shared Notification Service

- Provides in-app notification creation, retrieval, read state, and deduplication for all domain modules.
- Owns the `notifications` table.
- Is a shared capability, not a seventh domain module.

## 6. Documented Component Interactions and Interface Limits

The architecture documents this interaction flow:

1. A user interacts with the Presentation Tier.
2. Requests pass through centralized Auth middleware and RBAC guards.
3. The middleware evaluates JWT user ID and role claims and enforces row-level access control before a request reaches business logic.
4. Authorized requests are handled by the relevant one of the six Business Logic domain modules.
5. REST endpoints are implemented through Next.js Route Handlers; request data is validated with Zod.
6. Modules use their own services and repositories. Cross-module operations call the owning module's service interface.
7. Business Logic uses the single PostgreSQL Data Tier through Prisma and module-specific repositories.
8. The five-minute polling worker checks both complaint escalation thresholds and responsibility reminder jobs.

The architecture now specifies REST through Next.js Route Handlers, module service boundaries, and the approved technology stack. Exact endpoint paths and detailed request/response schemas remain implementation-level contracts.

Do not invent or describe as approved:
- API endpoint paths or request/response schemas.
- HTTP or other transport protocols.
- Detailed module-to-module contracts or dependencies.
- Database table ownership or a complete database schema.
- A dependency-injection or communication mechanism.
- Deployment topology or third-party software integrations.

Use existing repository conventions where present and consistent with the approved documents. If a missing interface or contract affects correctness, request clarification rather than guessing.

## 7. Mandatory Accepted ADR Decisions

All five ADRs are accepted and must be followed. The following summaries reflect the decisions previously provided for this project; consult the corresponding ADR file for its complete wording when it is available in the repository.

### ADR-001 — Architecture Style
**File:** `ADR-001-architecture-style.md`  
**Accepted decision:** 3-Tier Layered Architecture with six Business Logic domain modules: Auth, Laundry, Complaints, Meals, Schedules & Responsibilities, and Lost & Found.
- Preserve Presentation, Business Logic, and Central RDBMS Data tiers.
- Notification Service is a shared capability, not an additional domain module.
- Do not replace this decision with Microservices, Modular Monolith, or another architecture.

### ADR-002 — Data Persistence: Laundry Reservation Locking
**File:** `ADR-002-data-persistence-laundry-locking.md`  
**Accepted decision:** RDBMS transaction isolation and row locking.
- Use ACID-compliant relational database transactions for laundry reservation concurrency.
- Prevent two students from reserving the exact same washing-machine slot atomically.
- Do not substitute Redis locks or separate cache-synchronized lock state for the accepted mechanism.

### ADR-003 — Authentication Boundary
**File:** `ADR-003-authentication-boundary.md`  
**Accepted decision:** Stateless JWT with centralized RBAC middleware guard.
- Evaluate authenticated user ID and role claims.
- Enforce centralized role authorization and single-owner row-level access control before business logic.
- Preserve Student, Warden, Kitchen Staff, and Manager roles.
- Do not replace the decision with stateful server-side sessions without an approved ADR change.

### ADR-004 — Immutable Meal Allocation Snapshots
**File:** `ADR-004-immutable-meal-allocation-snapshots.md`  
**Accepted decision:** Immutable meal allocation snapshots.
- Save snapshots in the Data Layer at reservation or logging time, as applicable.
- Editing a weekly menu template must not change existing reservations, historical portion allocations, or audit records.
- Do not make historical records depend on mutable menu-template data in a way that changes their recorded meaning.

### ADR-005 — Scheduled Escalation Worker
**File:** `ADR-005-scheduled-escalation-worker.md`  
**Accepted decision:** Scheduled background polling worker in the Business Logic Tier.
- The worker polls every five minutes using node-cron and evaluates both 18-hour manual-escalation eligibility and 24-hour automatic escalation in the same polling cycle.
- Each threshold is processed at the first scheduled polling check after it has elapsed; exact-time execution is not required.
- The worker also processes approved responsibility reminder jobs.
- Use one initial attempt plus three retries, with 1/5/15-minute backoff, idempotency, persisted job state, and restart recovery.
- Do not replace polling with Kafka, RabbitMQ, or another queue-based architecture without an approved decision.

## 8. Functional Requirements

Implement the behavior in `Final_PRD.md`. Preserve the requirement identifiers.

### FR-01 — Personal Schedule Management
Allow each student to create, view, and update their own daily schedule to manage personal routines privately.

### FR-02 — Shared Responsibility Coordination
Allow roommates to record and coordinate shared responsibilities. Provide an explicit **Request Warden Assistance** capability to notify the Warden when coordination fails.

### FR-03 — Notifications for Activities and Responsibilities
Send in-app notifications 30 minutes before scheduled activities and responsibility reminders 24 hours and 1 hour before deadlines; exclude completed/cancelled responsibilities.

### FR-04 — Incomplete Responsibility Notification
After sending one reminder, if a responsibility remains incomplete, notify the Warden once non-completion is confirmed through assigned-student self-reporting or automated system timeout. Do not expose personal student schedules to other roommates.

### FR-05 — Meal Reservations and Collection Arrangements
Route meal reservations and advance collection-difficulty notices directly to Kitchen Staff, while providing a read-only audit copy to the Warden.

### FR-06 — Meal Portion Management and Audit
Record fixed meal portion allocations logged by Kitchen Staff and allow the Warden to perform portion-verification audits. Upon audit failure, log a Portion Discrepancy Record.

### FR-07 — Hostel Complaint Submission
Allow students to submit identified complaints with all mandatory fields:
- Category: Water, Hygiene, Pests, Electricity, or Facilities.
- Room Number.
- Description.
- Urgency Flag.

### FR-08 — Complaint Review and Lifecycle Management
Enforce the complaint lifecycle `Pending` → `In Progress` → `Resolved` / `Escalated`. Allow the Warden to update statuses and correct priority flags.

### FR-09 — Complaint Tracking
Allow students to view the real-time status and outcome of their own complaints only.

### FR-10 — Direct Complaint Escalation
Allow a student to directly escalate an active complaint to the Hostel Manager if no Warden action occurs within 18 hours. If a student disagrees with an outcome, allow submission of a new complaint linked to `Original_Complaint_ID` and direct escalation as specified by the PRD.

### FR-11 — Automatic Escalation of Unresolved Complaints
Monitor active complaints and automatically escalate any complaint remaining unresolved after 24 elapsed hours at the first scheduled five-minute polling check after that threshold.

### FR-12 — Recurring Hostel Problems
If a problem recurs after resolution, create a new complaint containing a reference link to `Original_Complaint_ID` rather than reopening the closed record.

### FR-13 — Laundry Facility Reservation
Allow students to reserve available laundry facilities by selecting a washing machine, date, and time slot. Display real-time available and booked slots, prevent overlapping reservations for the same machine, and allow students to cancel their own future reservations without affecting other bookings.

### FR-14 — Lost and Found Management and Verification
Allow students to report lost or found items with item name, description, location, date, and optional photo. Display reported items in a searchable section, enable students to submit ownership claims, and allow the Warden to verify claims and mark items as `Returned`. Mask student contact information from public view.

### FR-15 — Weekly Meal Menu Publishing
Allow authorized Kitchen Staff to create, edit, and publish a weekly hostel meal menu (breakfast, lunch, dinner) per day. Students have read-only access to view the published menu by date. Menu changes must not alter existing meal reservations or historical portion allocations.

## 9. Non-Functional Requirements

All four NFRs are approved and must be preserved:

- **NFR-01 — Privacy and Access Control:** Restrict students to viewing only their own schedules, responsibilities, and complaints. Cross-student data visibility is strictly prohibited.
- **NFR-02 — Response Time:** Display complaint-tracking views and schedule updates within a maximum response time of 2.0 seconds under standard operation.
- **NFR-03 — Usability:** At least 90% of first-time student users must successfully submit a valid hostel complaint within 3 minutes without external instruction.
- **NFR-04 — Availability:** Maintain 99.0% operational availability monthly during operating-term periods.

Do not omit NFR-03. Do not claim an NFR is satisfied merely because a feature has been implemented; use appropriate verification evidence.

## 10. Business Rules

Preserve all PRD business rules:

- **BR-01 — Complaint Identification:** Anonymous complaints are prohibited; all complaints must be linked to an authenticated student ID.
- **BR-02 — Resolution Horizon:** Target complaint resolution timeframe is 24 hours from submission.
- **BR-03 — Automatic Escalation Trigger:** Complaints unresolved after 24 elapsed hours become eligible for automatic escalation and transition to `Escalated` status at the first scheduled five-minute polling check after the threshold.
- **BR-04 — Privacy Boundary:** Student access is limited exclusively to self-owned records.
- **BR-05 — Direct Escalation Window:** Student direct escalation unlocks after 18 hours of Warden inactivity.
- **BR-06 — Priority Oversight:** The Warden is authorized to adjust user-selected urgency flags.
- **BR-07 — Audit Immutability:** Resolved complaints are immutable; new reports must reference parent IDs.
- **BR-08 — Responsibility Privacy:** Non-completion tracking must not expose student schedule details.
- **BR-09 — Portion Discrepancy Logging:** Audit failures during meal verification must generate a logged discrepancy event.
- **BR-10 — Laundry Concurrency Lock:** Two students cannot reserve the exact same washing-machine slot simultaneously. Reservation transactions must be atomic.
- **BR-11 — Lost and Found Privacy Boundary:** Private contact details of claimants and finders must never be exposed to other students; all claim verifications must be mediated strictly by the Warden.
- **BR-12 — Menu Immutability for Allocations:** Modifying a menu template must not retroactively alter existing meal reservation tickets or logged portion allocations.

## 11. Constraints and Non-Goals

### 11.1 Constraints

- **CON-01 — Resolution Timeline:** Complaint escalation must comply with the 18-hour manual / 24-hour automatic thresholds; both are evaluated by the same five-minute polling cycle and processed at the first check after the relevant threshold.
- **CON-02 — Access Governance:** Role-based access control must enforce single-owner privacy for all student data.
- **CON-03 — Operational Scoping:** The system acts as a coordination tool and does not replace human staff duties.

### 11.2 Non-Goals / Out of Scope

- **NG-01:** The system will not physically prepare or deliver meals.
- **NG-02:** The system will not replace Warden or Hostel Manager operational duties.
- **NG-03:** Students will not be allowed to view other students' private schedules or complaint details.
- **NG-04:** The system will not guarantee roommate compliance or eliminate interpersonal disputes.
- **NG-05:** The system will not automatically resolve roommate conflicts without human involvement.
- **NG-06:** The system will not manage academic coursework or university examinations.

Do not implement non-goals as product features unless the project team explicitly changes the approved scope.

## 12. Privacy and Data-Integrity Invariants

These invariants apply across implementation, APIs, persistence, and user interfaces.

### 12.1 Student privacy and authorization
- Enforce authentication and role-based authorization centrally as described by the Auth architecture and ADR-003.
- Enforce single-owner access to student records.
- Students must not view other students' private schedules, responsibilities, or complaint details.
- Non-completion tracking must not expose personal schedule details to roommates.
- Lost and Found claimant/finder contact details must not be exposed to other students.
- Lost and Found claim verification is Warden-mediated.

### 12.2 Laundry concurrency
- Prevent two students from reserving the exact same washing-machine slot.
- Use atomic RDBMS transactions and row locking as required by ADR-002.
- Cancellation of one student's future reservation must not affect another student's booking.

### 12.3 Meal history
- Preserve immutable meal allocation snapshots at reservation or logging time, as applicable.
- Menu-template edits must not retroactively alter existing meal reservation tickets, historical portion allocations, or audit records.
- Record portion discrepancies when the Warden's verification audit identifies a discrepancy.

### 12.4 Complaint history
- Link each complaint to an authenticated student ID.
- Preserve the documented complaint lifecycle and escalation behavior.
- Resolved complaints are immutable.
- A recurring issue after resolution creates a new complaint linked through `Original_Complaint_ID`; do not reopen the resolved record.
- Preserve complaint timestamps needed for 18-hour and 24-hour escalation.

## 13. Required PRD User Flows and Acceptance Criteria

Do not regress the documented flows and acceptance criteria.

### 13.1 FR-02 — Shared Responsibilities and Warden Assistance flow
The documented flow is:
1. A student logs a shared responsibility.
2. Roommates view the duty in their respective private dashboards.
3. If a dispute arises, a student selects **Request Warden Assistance**.
4. The system updates the task status to `Assistance Requested` and notifies the Warden.

**AC-FR-02-02:** When a student selects Request Warden Assistance, the system updates the responsibility status to `Assistance Requested` and sends an in-app alert to the Warden.

### 13.2 FR-07 — Submit Complaint flow
The documented flow is:
1. Student opens the complaint submission form.
2. Student enters Category, Room Number, Description, and Urgency Flag.
3. System validates mandatory fields.
4. System creates the complaint in `Pending` state and generates tracking confirmation.

**AC-FR-07-01:** On valid submission with all mandatory fields, record the complaint as `Pending` and provide a tracking ID.

### 13.3 FR-10 — Direct Escalation flow
The PRD flow states:
1. Eighteen hours elapse without Warden response on a pending complaint.
2. At the first eligible poll, the system detects 18 hours since submission or the last recorded Warden action.
3. The system enables the **Escalate to Manager** button on the student's tracking UI.
4. The student selects the button.
5. The system updates status to `Escalated` and assigns the record to the Manager queue.

**AC-FR-10-01:** Given an active complaint has a current worker-recorded 18-hour unlock, when the owner selects direct escalation, change its status to `Escalated` and assign it to the designated Manager.

### 13.4 Meal reservation receipt
**AC-FR-05-01:** When a student submits a meal reservation for university commitments, route the record to Kitchen Staff and generate a confirmation ticket for the student.

### 13.5 Portion discrepancy audit
**AC-FR-06-02:** When the Warden flags a portion discrepancy during a meal verification audit, create a permanent `Portion Discrepancy Log` linked to Kitchen Staff logs.

### 13.6 Outcome disagreement and linked complaint
**AC-FR-10-02:** When a student disagrees with a resolved outcome and submits a follow-up complaint, create a new `Pending` complaint containing a mandatory reference to `Original_Complaint_ID`.

## 14. Approved S08 Interpretation: 18-Hour Direct Escalation

The approved S08 rule applies to `Pending` and `In Progress` complaints. Submission starts the 18-hour clock. Recorded Warden status changes and urgency corrections reset it and invalidate any existing unlock. Viewing the complaint has no effect. The worker records eligibility for the student action. A new linked disagreement complaint with a nonblank reason permits explicit student escalation without waiting 18 hours. See the PRD and plan decision record.

The 24-hour rule is measured from complaint submission. If the complaint remains unresolved after 24 elapsed hours, automatic escalation occurs at the first scheduled polling check after that threshold.

## 15. Approved and Unspecified Technical Decisions

The following technical decisions are approved and must be reflected consistently in implementation:

- Next.js, TypeScript, Tailwind CSS, and shadcn/ui.
- REST API through Next.js Route Handlers; Zod request validation and standardized API error responses.
- One PostgreSQL database hosted through Supabase, one Prisma schema, and module-specific repositories.
- Supabase Storage private bucket for Lost & Found images.
- Stateless JWT authentication, eight-hour expiry, HttpOnly cookie, bcrypt password hashing, Secure cookie in production, SameSite=Lax, and CSRF protection where required.
- Node.js worker scheduled with node-cron every five minutes.
- One initial worker attempt plus three retries, with 1/5/15-minute backoff; persisted retry metadata, idempotency, locking, and restart recovery.
- Fixed 60-minute laundry slots.
- Lost & Found image limits: JPEG/PNG/WebP, 5 MB maximum each, up to three images per item; signed URLs expire after 15 minutes.
- Local development is the target for this deliverable. Production worker hosting remains undecided; production must provide a persistent Node.js process.
- The project folder baseline is documented in `architecture.md`.

The following remain unspecified or implementation-level and must not be invented as settled architectural decisions:

- Exact endpoint paths and complete request/response schemas.
- Exact Prisma model syntax, generated migration details, and seed data.
- JWT signing-key provisioning/rotation and deployment secret management.
- Exact production hosting provider/topology for the persistent worker.
- CI/CD platform.
- Exact data-retention periods and any scheduled notification cleanup.
- Exact signed-URL generation implementation and operational storage policies beyond the approved limits.
- Detailed module service method signatures and dependency-injection implementation.
- Detailed production monitoring/alerting configuration.

Follow the approved PRD definition of Warden inactivity recorded in Section 14.

Use existing repository conventions where they are present and do not conflict with the approved sources. Where a missing decision affects correctness, security, or an architectural boundary, ask the project team before proceeding.

The architecture identifies Student, Warden, Hostel Manager, and Kitchen Staff as actors/operational recipients, not external software integrations. Supabase is the approved managed database and storage provider.

## 16. Development and Change-Control Procedure

Before implementing a feature or changing existing behavior:

1. Identify the applicable PRD requirement IDs.
2. Identify relevant goals, business rules, constraints, non-goals, and acceptance criteria.
3. Check `architecture.md` for the relevant tier and explicitly documented module ownership.
4. Check the applicable ADR for mandatory architectural decisions.
5. Identify unresolved requirements or missing interface definitions.
6. Implement only behavior supported by approved requirements and decisions.
7. Add or update tests that verify the behavior and relevant invariants.
8. Report any requirement that remains unverified or requires team clarification.

When modifying existing code:
- Preserve existing behavior unless the requested change explicitly requires a change.
- Avoid unrelated refactoring.
- Do not weaken privacy or authorization checks.
- Do not bypass transactional safeguards.
- Do not modify historical records in ways that violate immutability requirements.
- Do not add external services or infrastructure without approval.
- Do not silently change requirement behavior to simplify implementation.

If a proposed change conflicts with an approved requirement or ADR:
1. Identify the affected requirement or ADR.
2. Explain the conflict.
3. Describe the proposed alternative and its impact.
4. Request explicit team approval.
5. Update the relevant documentation only after approval.

Accepted ADRs are mandatory project decisions, not optional suggestions.

## 17. Testing and Verification Expectations

Tests should verify the approved requirements and architectural invariants. As applicable to implemented features, cover:

### Authentication and privacy
- JWT authentication and centralized role-based authorization.
- Authorization based on user identity and role claims.
- Student access restricted to self-owned records.
- Denial of access to another student's private schedules, responsibilities, and complaints.
- Masking of Lost and Found claimant/finder contact information from other students.
- Non-completion tracking that does not expose personal schedule details.

### Laundry
- Competing reservation attempts for the same machine and slot cannot both succeed.
- Reservation operation is atomic and uses the approved RDBMS locking mechanism.
- Students can cancel only their own future reservations.
- Cancellation does not affect another student's booking.

### Meals
- Meal reservation routing to Kitchen Staff and confirmation ticket generation.
- Kitchen Staff portion logging.
- Warden verification and discrepancy logging.
- Weekly menu create/edit/publish behavior and student read-only viewing.
- Historical snapshots and existing reservation/portion records remain unchanged after menu-template edits.

### Complaints
- Mandatory complaint fields and identified submission.
- Initial `Pending` status and tracking ID.
- Valid complaint lifecycle and Warden priority correction.
- Students can view only their own complaints.
- Resolved complaints remain immutable.
- Recurring issues create new linked complaint records.
- Direct escalation follows the team-confirmed 18-hour eligibility rule; the worker records eligibility at the first five-minute poll after the threshold.
- Unresolved complaints are automatically escalated at 24 elapsed hours to the Manager.

### Schedules and responsibilities
- Personal schedule create/view/update behavior and privacy.
- Shared responsibility coordination.
- Warden assistance request updates status to `Assistance Requested` and sends an in-app alert.
- Notifications occur 30 minutes before activities and responsibility deadlines.
- One reminder precedes Warden notification when non-completion is confirmed.

### Non-functional requirements
- Verify the 2.0-second response-time target under standard operation.
- Evaluate the 90% first-time complaint-submission usability target within three minutes without external instruction.
- Evaluate 99.0% monthly operational availability during operating-term periods.

Do not report a requirement or NFR as verified without test results or other appropriate evidence.

## 18. Final Instruction to the Coding Agent

Treat `Final_PRD.md`, `architecture.md`, and the five accepted ADRs as the governing project sources, together with this `AGENTS.md`.

Implement the approved Hostel Management System without redesigning its architecture or changing validated requirements. Preserve all functional and non-functional requirements, business rules, constraints, non-goals, privacy boundaries, data-integrity invariants, and accepted ADR decisions.

When information is missing or ambiguous:
- State exactly what is missing or ambiguous.
- Identify the affected requirement, constraint, or ADR.
- Ask the project team for clarification when the issue affects correctness or a technical decision.
- Do not invent a decision and present it as approved.


## 19. Approved Database Schema and Ownership

Use the logical schema and field definitions in `architecture.md` Section 15 as the architecture baseline. Do not create additional domain modules or bypass ownership boundaries.

- Auth owns `users`.
- Schedules & Responsibilities owns `rooms`, `room_residents`, `personal_schedules`, `responsibilities`, and `responsibility_assignments`.
- Laundry owns `laundry_machines`, `laundry_slots`, and `laundry_reservations`.
- Complaints owns `complaints` and `complaint_status_history`.
- Meals owns `weekly_menus`, `menu_items`, `meal_reservations`, `meal_allocation_snapshots`, `meal_portion_logs`, `meal_portion_audits`, and `meal_portion_discrepancies`.
- Lost & Found owns `lost_found_items`, `lost_found_images`, and `lost_found_claims`.
- Notification Service owns `notifications`.
- Worker infrastructure owns `worker_job_runs`.

All modules use the same PostgreSQL database and Prisma schema but must access another module's data through its service interface. Use module-specific repositories. Keep historical records where required, enforce relational constraints, and preserve meal snapshots.

## 20. Approved Worker and Storage Configuration

- Poll every five minutes. Both complaint thresholds are evaluated by the same polling cycle.
- 18-hour manual escalation: record eligibility at the first poll after 18 hours of Warden inactivity; the student initiates the escalation.
- 24-hour automatic escalation: automatically escalate an unresolved complaint at the first poll after 24 elapsed hours from submission.
- Responsibility reminders: 24 hours and 1 hour before the deadline; exclude completed/cancelled responsibilities and deduplicate. Preserve the PRD's 30-minute scheduled-activity notification requirement; responsibility deadlines use the 24-hour and 1-hour reminder schedule.
- Retry one initial attempt plus three retries, with 1/5/15-minute delays. Persist attempts and job state, use idempotency and locking, and recover overdue work after restart.
- Lost & Found images: private Supabase Storage bucket, JPEG/PNG/WebP, maximum 5 MB each, up to three images per item, signed URLs with 15-minute expiry.
- Worker deployment: local for this deliverable; production must use a persistent Node.js process. Production hosting is undecided.

