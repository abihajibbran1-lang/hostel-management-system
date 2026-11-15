# Slice Specification Guide

**Applies to:** All implementation slices in this repository  
**Maintained by:** Slice Coordinator  
**Specification location:** `docs/slices/`

## 1. Purpose

Every implementation slice must use one consistent specification format. The purpose is to prevent overlapping work, inconsistent assumptions, missing requirements, and avoidable integration problems.

The slice register at repository root (`SLICE_REGISTER.md`) is the master index. This folder contains one detailed Markdown specification per slice.

## 2. Rules for all team members

1. Do not create a new slice independently. Propose it to the Slice Coordinator, who checks whether it belongs in an existing slice or requires a register change.
2. Do not change a slice's scope, acceptance criteria, data ownership, architecture boundary, or dependencies without review.
3. Use the canonical sources: `Final_PRD.md`, `architecture.md`, and the five accepted ADRs. Follow the source precedence in `AGENTS.md`.
4. If sources conflict or leave a behavior undefined, record an open question. Do not silently fill the gap using personal preference.
5. A slice must be approved before implementation begins.
6. Implement only the approved scope. If implementation reveals a necessary change, pause the affected work and raise a change proposal.
7. Keep the slice status current in `SLICE_REGISTER.md`.
8. Record implementation activity, AI assistance, human decisions, tests, revisions, and evidence in `docs/WORKFLOW_EVIDENCE_LOG.md`.
9. Record each member's actual contribution in `docs/GROUP_CONTRIBUTION_LOG.md`.
10. Every slice should have an implementer and a reviewer. The reviewer should not simply approve their own work.

## 3. File naming

Use this format:

`S##_short-descriptive-name.md`

Examples:
- `S00-project-foundation.md`
- `S01-authentication-rbac.md`
- `S02-notification-service.md`

Keep the slice ID identical to the ID in `SLICE_REGISTER.md`. Do not renumber slices casually; if a slice is split, merged, or removed, record the decision and update references.

## 4. Required specification template

Copy the template below for every slice. Replace all bracketed prompts. If something is not known, write **Open question** and explain what must be decided. Do not leave a critical ambiguity disguised as an assumption.

---

# S##_ — [Slice name]

**Status:** Specification Draft  
**Owner:** [Member name]  
**Reviewer:** [Member name]  
**Coordinator:** Abiha  
**Priority:** [P0/P1 — confirm from register]  
**Target wave:** [Wave]  
**Estimated effort:** [Team estimate; do not guess]  
**Last updated:** [Date]

## 1. Purpose and outcome

- **Purpose:** [What user/system need does this slice address?]
- **Expected outcome:** [What observable capability exists when complete?]
- **Why this is a separate slice:** [Boundary from neighboring slices.]

## 2. Requirement traceability

| Source ID | Requirement / decision | What this slice must satisfy | Acceptance criteria reference |
|---|---|---|---|
| [FR/NFR/BR/CON/ADR] | [Exact short description] | [Specific obligation] | [AC-...] |

Use exact requirement IDs and preserve their meaning. Identify any requirements only partially addressed by this slice.

## 3. Scope

### Included
- [Explicit capability]
- [Explicit capability]

### Excluded
- [Related capability owned by another slice]
- [Anything explicitly out of scope]

### Boundary and ownership
- Domain module(s): [Use architecture's module names]
- Shared capabilities used: [e.g. notification service / worker, if applicable]
- Data owned by this module: [Refer to architecture; do not invent cross-module ownership]
- Other slices/interfaces involved: [List]

## 4. Roles and permissions

| Actor / RBAC role | Allowed actions in this slice | Restrictions / privacy boundary |
|---|---|---|
| [Role] | [Actions] | [Restrictions] |

Distinguish PRD actors from the four architecture RBAC roles. Do not create a new authorization role without approval.

## 5. Preconditions and dependencies

- Required prior slices and their approved outputs:
- Required configuration/services:
- Required data/state:
- External or shared interfaces:
- Dependency status:
- What can be developed in parallel:

## 6. Workflow and state behavior

Describe the normal user/system workflow in numbered steps.

1. [Trigger]
2. [User action]
3. [Validation/authorization]
4. [Business operation]
5. [Persistence/result]
6. [Notification or follow-up, if required]
7. [Visible outcome]

### State transitions (if applicable)

| Current state | Trigger/action | Required authorization | Next state | Side effect / notification |
|---|---|---|---|---|
| [State] | [Trigger] | [Role] | [State] | [Effect] |

If no state machine applies, write **Not applicable**. Do not invent state names or transitions.

## 7. Implementation tasks

Break work into small, reviewable tasks. Include only layers relevant to this slice.

### Presentation
- [Page/component/form/view and user-visible behavior]

### API / route handlers
- [Endpoint responsibility, validation boundary, response behavior]
- [Link to API contract if one exists]

### Business logic
- [Rules, authorization handoff, state transition, idempotency, etc.]

### Data / persistence
- [Owned repository operations and schema impact]
- [Transaction/concurrency behavior if applicable]
- [Migration/seed impact]

### Worker / notifications / storage
- [Only if applicable; identify owning service/interface]
- [Retry, idempotency, privacy, or signed-URL behavior where applicable]

### Integration
- [Consumers/providers and agreed interface]
- [Error/failure behavior across the boundary]

## 8. Acceptance criteria

Write observable, testable statements. Prefer Given/When/Then.

| ID | Given | When | Then | Requirement |
|---|---|---|---|---|
| AC-S##-01 | [Initial condition] | [Action/event] | [Observable result] | [FR/NFR/BR] |

Include relevant cases for:
- Successful/normal workflow
- Invalid input and validation
- Unauthenticated and unauthorized access
- Ownership/privacy boundary
- Duplicate requests or concurrent operations
- Failure/retry/recovery behavior, if applicable
- Boundary times and state transitions, if applicable
- Empty, missing, deleted, or unavailable data
- Integration/notification behavior

Do not add criteria for unresolved rules. Link them to Open Questions instead.

## 9. Test plan

| Test ID | Level | Scenario | Expected result | Evidence location / result |
|---|---|---|---|---|
| T-S##-01 | Unit / Integration / E2E / Security / Concurrency | [Scenario] | [Expected result] | [To be completed] |

Specify the appropriate mix of:
- Unit tests
- API/business-logic integration tests
- Database/transaction/concurrency tests
- Authorization and privacy tests
- End-to-end workflow tests
- Worker/retry/restart tests, if applicable
- NFR verification or measured limitations, where relevant

Do not claim an NFR is satisfied merely because a feature was implemented. Record how it was measured and any limitations.

## 10. Security, privacy, and failure handling

- Authentication/authorization checks:
- Ownership enforcement:
- Sensitive data exposure risks:
- Input validation:
- Error handling and safe user-facing messages:
- Logging/audit requirements:
- Retry/idempotency/concurrency concerns:
- Failure modes and recovery:
- Relevant NFR/BR/ADR:

Write **Not applicable** only where justified.

## 11. Evidence required

List the evidence that must be added to the workflow evidence log, such as:
- Requirement/specification review and approval
- Relevant AI prompts/outputs and human evaluation/revision/rejection
- Implementation commits or pull requests
- Test commands and results
- Screenshots or short recordings of user-visible behavior
- Database/concurrency/security test results
- Reviewer feedback and resolution
- Known defects and limitations

Do not include passwords, tokens, private keys, real personal data, or secrets in evidence.

## 12. Ownership and review

- Implementer:
- Reviewer:
- Coordinator:
- Team approval date:
- Specification version:
- Related pull request/branch:
- Integration contact(s):

## 13. Open questions, risks, and decisions

| ID | Question / risk | Why it matters | Owner | Blocking? | Resolution / decision reference |
|---|---|---|---|---|---|
| OQ-S##-01 | [Question] | [Impact] | [Name] | Yes/No | [Pending/link] |

A blocking open question prevents approval or the affected implementation task. Non-blocking questions must have an explicit boundary so they do not become accidental scope.

## 14. Definition of Done

- [ ] All included tasks are implemented within the approved scope.
- [ ] Acceptance criteria have been checked and results recorded.
- [ ] Relevant automated tests pass; test command/results are recorded.
- [ ] Authorization and privacy boundaries are verified.
- [ ] Relevant failure, validation, and edge cases are tested.
- [ ] Integration with dependent/consuming slices is verified.
- [ ] No unresolved blocking question remains.
- [ ] Known defects and limitations are documented.
- [ ] Code has been reviewed by the assigned reviewer.
- [ ] Workflow evidence log is updated.
- [ ] Group contribution log is updated.
- [ ] Coordinator has reviewed the completion evidence.
- [ ] `SLICE_REGISTER.md` status is updated.

## 5. Approval record

Append a record whenever the specification is approved or materially revised.

| Version | Date | Prepared by | Reviewed by | Team decision | Notes |
|---|---|---|---|---|---|
| 0.1 | [Date] | [Name] | [Name] | Draft / Changes requested / Approved | [Notes] |

## 6. How to handle unresolved requirements

The project already has known open questions. In particular:
- The exact definition of Warden inactivity for the 18-hour manual-escalation condition remains open. Preserve the 18-hour threshold and five-minute polling behavior, but do not finalize the eligibility rule until the team decides.
- Responsibility non-completion timeout/confirmation behavior must not be invented.
- Responsibility assignment/completion rules must be clarified.
- Meal reservation eligibility/proof and fixed portion values must be confirmed.
- Laundry operating hours/slot-generation policy must be confirmed if not defined by the source documents.
- Complaint lifecycle terminology (`Resolved`/`Escalated` in the PRD versus `Closed` in the architecture schema) must be referred for a decision.
- Do not make the architecture's complaint title field mandatory unless the team confirms it.

Add other open questions as they are discovered. The coordinator should keep the register's open-question table and slice-specific questions consistent.

## 7. Initial slice specification sequence

Prepare and approve specifications in dependency order:
1. S00 — Project Foundation
2. S01 — Authentication and RBAC
3. S02 — Shared Notification Service and Inbox
4. Prepare the next wave's specifications before those slices begin implementation.

This sequence does not mean all later specifications must wait until S02 is fully implemented; drafting/review can proceed in parallel when dependencies and decisions are understood. Implementation still requires approved prerequisites and contracts.
