# Slice Register — Hostel Management System

**Document status:** Initial planning baseline  
**Register owner / Slice Coordinator:** Abiha (team coordinator)  
**Team labels:** Member 1–5 (replace with actual names after the team confirms assignments)  
**Last updated:** 21 November 2026

## 1. Purpose

This is the single source of truth for the implementation-slice plan. It records the agreed slice inventory, requirement traceability at a planning level, dependencies, proposed ownership, review responsibility, and current status.

Detailed slice specifications are separate files under `docs/slices/`. A row in this register does **not** by itself authorize implementation. A slice must have an approved detailed specification before implementation begins.

## 2. Coordination rules

1. The Slice Coordinator maintains this register and the common specification format.
2. The Coordinator drafts or coordinates each detailed specification using `Final_PRD.md`, `architecture.md`, and the accepted ADRs.
3. All team members may comment, identify omissions, and propose changes.
4. The assigned reviewer checks requirement coverage, dependencies, privacy/security implications, testability, and integration boundaries.
5. The team approves the specification before its status changes to **Approved**.
6. Implementers follow the approved specification. They must not silently change requirements, architecture, API contracts, data ownership, or acceptance criteria.
7. A proposed change is recorded and reviewed using `docs/SLICE_REVIEW_PROCESS.md`.
8. The workflow evidence log and contribution log are maintained throughout the work, not reconstructed only at the end.

## 3. Status definitions

| Status | Meaning |
|---|---|
| Planned | Slice exists in the register; detailed specification has not started. |
| Specification Draft | Coordinator is preparing the detailed specification. |
| Under Review | Draft is available for team and reviewer feedback. |
| Changes Requested | Review identified changes required before approval. |
| Approved | Specification has been reviewed and approved; implementation may begin when dependencies are ready. |
| In Progress | Implementation is underway against the approved specification. |
| Testing | Implementation is complete enough for the defined tests and acceptance checks. |
| Complete | Acceptance criteria and required evidence have been reviewed; integration impact is addressed. |
| Blocked | Work cannot proceed; blocker and owner are recorded. |
| Deferred | Team explicitly moved the slice out of the current implementation window; reason and approval are recorded. |

**Initial status for every slice: Planned.** Status must be updated here when it changes.

## 4. Slice inventory

The owners below are the **provisional allocation** from the project plan. Confirm names, capacity, and reviewers with the team before implementation. Reviewer assignments are proposed to provide cross-review; they are not permanent authority.

| ID | Slice | Main scope | Requirement traceability (planning level) | Dependencies | Proposed owner | Proposed reviewer | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| S00 | Project Foundation | Repository/application foundation, shared conventions, local setup, baseline integration and developer documentation | Architecture baseline; project-wide NFRs and constraints | None | Khadija Tul Kubra | abihajibbran1-lang | P0 | Testing |
| S01 | Authentication and RBAC | Sign-in/authentication boundary, role enforcement, authenticated identity and ownership checks | NFR-01; BR-01, BR-04; CON-02; architecture auth/security decisions; ADR-003 | S00 | Member 1 | Member 3 | P0 | Specification Draft |
| S02 | Shared Notification Service and Inbox | Shared in-app notification capability and notification inbox/dispatch boundary used by modules | FR-03, FR-04, FR-05; FR-02 assistance notification; FR-10/FR-11 escalation notifications where specified; architecture shared capability and worker decisions | S00, S01 | Khadija Tul Kubra | abihajibbran1-lang | P1 | In Progress |
| S03 | Personal Schedule Management | Student create/view/update own private daily schedule; Karachi-local day filtering; overlapping activities allowed; recurrence and reminder delivery deferred | FR-01; NFR-01, NFR-02; BR-04 | S01; S02/S05 reminder-interface agreement remains pending for AC-S03-08 | Member 2 | Member 4 | P1 | Testing |
| S04 | Shared Responsibility Coordination and Warden Assistance | Record and coordinate roommate-agreed responsibilities; request Warden assistance | FR-02; NFR-01; BR-08; relevant PRD workflow and acceptance criteria | S01, S02 | Member 2 | Member 3 | P1 | Planned |
| S05 | Responsibility Reminders and Incomplete-Duty Alerts | Scheduled reminders and Warden alert after one reminder and confirmed non-completion | FR-03, FR-04; BR-08; architecture worker rules; ADR-005 | S02, S04; S00 worker foundation | Member 2 | Member 5 | P1 | Planned |
| S06 | Complaint Submission and Student Tracking | Identified complaint creation and student access to own complaint tracking | FR-07, FR-09; BR-01, BR-04; NFR-01, NFR-02, NFR-03 | S01 | Member 3 | Member 4 | P0 | Planned |
| S07 | Warden Complaint Management | Warden review, priority correction and complaint lifecycle management | FR-08; BR-06; relevant complaint states and PRD workflows | S01, S06 | Member 3 | Member 5 | P0 | Planned |
| S08 | Complaint Escalation and Linked Complaints | Student direct escalation, automatic escalation, recurring/new linked complaints and audit linkage | FR-10, FR-11, FR-12; BR-02, BR-03, BR-05, BR-07; CON-01; ADR-005 | S01, S02, S06, S07; worker foundation | Member 3 | Member 1 | P0 | Planned |
| S09 | Weekly Meal Menu Publishing | Kitchen Staff create/edit/publish weekly breakfast/lunch/dinner menu; student read-only view | FR-15; BR-12 | S01 | Member 4 | Member 2 | P1 | Planned |
| S10 | Meal Reservations and Collection Arrangements | Student meal reservations and advance collection-difficulty notices routed to Kitchen Staff; Warden audit copy | FR-05; BR-12; relevant PRD acceptance criteria | S01, S02, S09 | Member 4 | Member 3 | P1 | Planned |
| S11 | Meal Portion Logging and Audit | Fixed portion allocation logging, Warden verification, discrepancy record | FR-06; BR-09, BR-12; ADR-004 | S01, S09, S10 | Member 4 | Member 5 | P1 | Planned |
| S12 | Laundry Reservations | Available machine slots, 60-minute reservations, cancellation and atomic prevention of duplicate slot booking | FR-13; BR-10; ADR-002 | S01 | Member 5 | Member 1 | P0 | Planned |
| S13 | Lost & Found Reporting and Searching | Student lost/found item reports, searchable listings and private image storage handling | FR-14; BR-11; architecture storage constraints | S01 | Member 4 | Member 5 | P1 | Planned |
| S14 | Lost & Found Claims and Verification | Student claim flow, Warden-mediated verification and Returned status | FR-14; BR-11 | S01, S13 | Member 5 | Member 3 | P1 | Planned |

### Notes on traceability

- The mapping above is a **planning-level map**, not a substitute for detailed requirement-by-requirement traceability in each slice specification.
- Notification Service is a shared capability, not a seventh domain module.
- The Background Worker is supporting infrastructure, not a domain module.
- The six domain modules remain those identified by the architecture: Auth, Laundry, Complaints, Meals, Schedules & Responsibilities, and Lost & Found.
- Do not add a new RBAC role for Roommate. The PRD describes Roommate as a coordination actor; the architecture identifies four RBAC roles: Student, Warden, Kitchen Staff, and Manager.
- The PRD/architecture conflict between complaint lifecycle terminology and the architecture's `Closed` representation must be recorded and referred for a team decision; do not invent or silently substitute a state.

## 5. Dependency overview

The following is a logical dependency guide. It does not require every slice to be completed serially; independent slices may proceed in parallel once their approved dependencies and integration contracts are ready.

```text
S00
└── S01
    ├── S02
    │   ├── S04 ── S05
    │   ├── S03
    │   ├── S08
    │   └── S10
    ├── S06 ── S07 ── S08
    ├── S09 ── S10 ── S11
    ├── S12
    └── S13 ── S14
```

More precisely:
- S00 → S01 → S02
- S01 → S03
- S01 + S02 → S04
- S04 + S02 + worker foundation → S05
- S01 → S06 → S07 → S08 (S08 also depends on notification and worker capabilities)
- S01 → S09 → S10 → S11 (S10 also uses S02)
- S01 → S12
- S01 → S13 → S14

## 6. Proposed implementation waves

These waves are a planning sequence, not permission to skip specification review.

| Wave | Slices | Planning intent |
|---|---|---|
| 1 — Foundation | S00, S01 | Establish repository conventions, runnable application foundation, authentication and access-control boundary. |
| 2 — Shared capability | S02 | Establish shared notifications and agreed integration boundary. |
| 3 — Main workflows | S03, S04, S06, S07, S09, S12, S13 | Build workflows whose dependencies are ready; parallel work is possible after contracts are agreed. |
| 4 — Dependent workflows | S05, S08, S10, S11, S14 | Complete worker-driven reminders/escalation, meal allocation/audit and Lost & Found verification. |
| 5 — Integration and stabilization | Cross-slice | End-to-end checks, privacy/security checks, regression, defect correction, documentation and demo preparation. |

## 7. Open questions and blockers that must remain visible

Do not convert these into implementation assumptions without a recorded team decision or an authoritative source clarification.

| ID | Open item | Impact | Handling |
|---|---|---|---|
| OQ-01 | Exact business definition of Warden inactivity for the 18-hour direct-escalation condition | S08 | Preserve the 18-hour threshold and five-minute polling behavior. Team must define which complaint statuses qualify, what Warden actions count as activity, and when the inactivity clock starts/resets. Do not finalize eligibility logic until decided. |
| OQ-02 | How system timeout confirms responsibility non-completion under FR-04 | S05 | Do not invent timeout duration or confirmation semantics. |
| OQ-03 | Responsibility assignment and completion-confirmation rules | S04/S05 | Clarify who can assign, acknowledge, complete and confirm a responsibility. |
| OQ-04 | Meal reservation eligibility and acceptable proof for university commitments | S10 | Clarify before finalizing validation and acceptance criteria. |
| OQ-05 | Exact fixed meal portion categories/quantities | S11 | Confirm with the team/PRD; do not invent values. |
| OQ-06 | Laundry operating hours and slot-generation policy | S12 | 60-minute slot duration is established; operating window and slot generation remain to be clarified if not specified elsewhere. |
| OQ-07 | Complaint lifecycle naming conflict (`Resolved`/`Escalated` in PRD versus `Closed` in architecture schema) | S06–S08 | Record exact source statements and obtain a team decision before implementing the conflicting state mapping. |
| OQ-08 | Complaint title field mismatch between architecture schema and PRD mandatory submission fields | S06 | Do not make title mandatory unless the team confirms the requirement. |
| OQ-09 | Exact API paths and request/response contracts | Relevant slices | Define in detailed specs/API contracts and review across affected owners. |
| OQ-10 | Production hosting and operational monitoring for persistent worker | S00/S05/S08 | Local worker execution is in scope; production hosting remains undecided. |
| OQ-11 | Data retention/cleanup policy and JWT secret provisioning/rotation | S00/S01 and affected modules | Record implementation/security decision; do not invent retention periods or secrets. |

## 8. Slice readiness and completion gates

A slice may move to **Approved** only when:
- Purpose and scope are clear.
- PRD/architecture/ADR traceability is recorded.
- Dependencies and integration boundaries are identified.
- Open questions affecting the slice are resolved or explicitly marked as non-blocking.
- Acceptance criteria are observable and testable.
- Required tests and evidence are identified.
- Owner and reviewer are confirmed.
- The reviewer and team approval are recorded.

A slice may move to **Complete** only when:
- Approved acceptance criteria have been checked.
- Required tests have been run and results recorded.
- Privacy, authorization, validation, failure and edge cases relevant to the slice have been checked.
- Integration with dependent/consuming slices has been checked.
- Known defects and limitations are recorded.
- Workflow evidence and contribution records are updated.
- Reviewer and Coordinator have accepted the completion evidence.

## 9. Change history

| Date | Change | Updated by |
|---|---|---|
| 15 Nov 2026 | Initial centralized register and proposed 15-slice inventory created from the project planning baseline. | Slice Coordinator |
| 16 Nov 2026 | S00 implementation started on `s00-project-foundation`; owner and reviewer confirmed. Foundation is in testing pending clean-clone/database verification and reviewer/coordinator acceptance. | Khadija Tul Kubra |
| 21 Nov 2026 | S03 implementation and local verification checkpoint recorded; status set to Testing. Existing provisional owner/reviewer fields were preserved. PostgreSQL integration, browser end-to-end testing, NFR-02 measurement, S02/S05 reminder agreement, and reviewer/coordinator acceptance remain pending. | Ifadha Hussain |


## 10. Specification drafting update — 15 Nov 2026

- S00 detailed specification drafted as `docs/slices/S00-project-foundation.md`; status changed to **Specification Draft**.
- S01 detailed specification drafted as `docs/slices/S01-authentication-rbac.md`; status changed to **Specification Draft**.
- Neither specification is approved for implementation until owner/reviewer/team review is recorded.
