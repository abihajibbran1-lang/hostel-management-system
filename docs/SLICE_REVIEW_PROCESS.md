# Slice Review and Approval Process

**Process owner:** Slice Coordinator (Abiha)  
**Applies to:** All project implementation slices  
**Status:** Proposed team process — confirm at the next team meeting

## 1. Purpose

This process ensures that the five team members work from one consistent, reviewed implementation plan. It prevents independently invented slice scopes, duplicate work, hidden requirement changes, and incompatible module interfaces.

The Slice Coordinator controls the planning documents and register. This does not mean the Coordinator makes every product or technical decision alone: substantive decisions remain subject to the project's agreed team approval and authoritative documents.

## 2. Roles

### Slice Coordinator
- Maintains `SLICE_REGISTER.md` and this process.
- Creates or coordinates the first draft of each slice specification.
- Checks traceability to `Final_PRD.md`, `architecture.md`, and accepted ADRs.
- Assigns a reviewer in consultation with the team.
- Collects feedback and records decisions.
- Ensures unresolved questions are visible.
- Updates statuses and change history.
- Does not silently override the PRD, architecture, ADRs, or team decisions.

### Slice Owner / Implementer
- Reviews the specification before accepting the task.
- Identifies unclear requirements, dependencies, estimates, and risks.
- Implements only approved scope.
- Keeps implementation and test evidence.
- Raises a change proposal when the approved specification is insufficient or incorrect.

### Reviewer
- Checks correctness, completeness, testability, security/privacy, and integration.
- Reviews the implementation and relevant tests.
- Requests changes with specific reasons.
- Does not approve their own implementation.

### All team members
- May comment on any specification.
- Must raise contradictions and missing requirements before approval.
- Must record actual contributions and material decisions.
- Must not create competing versions of the same specification.

## 3. Standard workflow

<ol>
<li><b>Register the slice.</b> Coordinator confirms the slice ID, purpose, scope boundary, dependencies, provisional owner and reviewer in `SLICE_REGISTER.md`.</li>
<li><b>Draft the specification.</b> Coordinator prepares the file using `docs/slices/README.md` and the authoritative project documents.</li>
<li><b>Owner feasibility review.</b> Proposed implementer checks whether the tasks are understandable and feasible, and identifies missing technical detail.</li>
<li><b>Independent review.</b> Assigned reviewer checks requirements, architecture, dependencies, privacy/security, testability, and cross-slice impact.</li>
<li><b>Team review.</b> Team members comment on product behavior, ambiguous rules, and integration assumptions. Unresolved substantive decisions remain open.</li>
<li><b>Resolve feedback.</b> Coordinator updates the draft and records accepted/rejected suggestions with reasons where material.</li>
<li><b>Approve.</b> Team approval is recorded in the specification's approval table. Coordinator updates register status to Approved.</li>
<li><b>Implement.</b> Owner works against the approved specification. Changes require the change process below.</li>
<li><b>Test and review.</b> Owner records test results; reviewer checks code, acceptance evidence and integration impact.</li>
<li><b>Complete.</b> Coordinator confirms the completion evidence and updates register status.</li>
</ol>

## 4. Review checklist

A reviewer should be able to answer **yes** to each applicable item before recommending approval.

### Requirements and scope
- [ ] Slice has a clear user/system outcome.
- [ ] Every relevant FR/NFR/BR/constraint/ADR is identified.
- [ ] Included and excluded functionality is explicit.
- [ ] No functionality has been silently dropped or duplicated.
- [ ] Actors and RBAC roles are distinguished correctly.
- [ ] Requirements are not reworded in a way that changes their meaning.

### Architecture and integration
- [ ] Slice respects the approved three-tier architecture and module boundaries.
- [ ] Data ownership and repository boundaries are clear.
- [ ] Shared notification and worker responsibilities are correctly treated as shared capabilities/infrastructure, not extra domain modules.
- [ ] API/service contracts and consumers/providers are identified where needed.
- [ ] Dependencies are accurate and do not create an unrecognized cycle.
- [ ] Relevant ADRs are followed.

### Behavior and quality
- [ ] Normal workflow and applicable state transitions are described.
- [ ] Acceptance criteria are observable and testable.
- [ ] Authorization, ownership privacy, validation and failure cases are covered.
- [ ] Concurrency, retries, idempotency, timing and recovery are covered where relevant.
- [ ] Test plan matches the risks and requirements.
- [ ] Evidence requirements are practical and clear.

### Open issues
- [ ] Conflicts and unknowns are recorded, not guessed.
- [ ] Blocking questions are resolved or explicitly block approval.
- [ ] Owner, reviewer, and integration contacts are identified.

## 5. Approval rules

A specification may be marked **Approved** only when:
- The proposed owner and reviewer have reviewed it.
- The team has had an opportunity to review it.
- No unresolved blocking question remains.
- Requirement and architecture traceability is adequate.
- Acceptance criteria and test/evidence expectations are clear.
- Approval date, version, and reviewers are recorded in the specification.

If team members disagree about product behavior or an architectural decision:
1. Record the exact point of disagreement.
2. Quote or link the conflicting source statements.
3. Keep the relevant requirement open.
4. Ask the team to decide or update the authoritative document through its change process.
5. Do not let an implementer settle the disagreement by coding their preferred interpretation.

The team should agree how it records a final approval (for example, a recorded meeting decision or explicit approval comments on the GitHub pull request). Do not assume a voting rule unless the team adopts one.

## 6. Change request process

A change request is required when anyone proposes to change:
- Slice scope or ownership
- Acceptance criteria
- Requirement interpretation
- Data model or module ownership
- API/service contract
- Dependencies
- Security/privacy behavior
- Architecture or ADR decision
- A previously approved business rule

### Change request steps

1. Stop work only on the affected behavior if continuing would risk implementing the wrong requirement. Unaffected work may continue.
2. Open a GitHub issue or pull request describing the proposed change.
3. Identify the affected slice IDs, FR/NFR/BR IDs, architecture sections and ADRs.
4. Explain why the current specification is insufficient or incorrect.
5. Describe impact on other slices, tests, schedule, data, and integration.
6. Coordinator reviews and assigns the right reviewers.
7. Team decides whether to accept, reject, or defer the change.
8. If accepted, update the relevant source document(s), slice specification(s), register, and tests.
9. Record decision, approver(s), date, and rationale.
10. Resume affected implementation against the updated approved version.

Do not edit the final PRD or accepted architecture/ADR as if they were ordinary implementation notes. A change to an authoritative document requires explicit team review and a recorded version/history.

## 7. GitHub working convention

Recommended approach:
- Keep `main` as the shared stable branch.
- Create a short-lived feature branch for implementation or documentation changes.
- Use pull requests for changes to slice specifications and implementation.
- Link the relevant slice ID in the branch, PR title, and commit messages where practical (for example, `S06 complaint submission`).
- Request review from the assigned reviewer.
- Do not merge a specification PR until review feedback is resolved and the approval decision is recorded.
- Do not merge implementation PRs without relevant tests and reviewer approval.
- Keep secrets and real personal data out of commits, screenshots, and evidence.
- Avoid editing the same central register simultaneously; Coordinator owns its merge/update.

These are proposed collaboration conventions. If the course/team has a required GitHub workflow, follow that requirement and update this process.

## 8. Definition of slice completion

A slice is not complete merely because the code runs on the implementer's machine. Completion requires:
- Approved scope implemented.
- Acceptance criteria checked.
- Relevant tests run and results recorded.
- Authorization/privacy and relevant edge cases tested.
- Integration with dependent/consuming slices checked.
- Code reviewed.
- Known limitations/defects recorded.
- Workflow evidence and contribution log updated.
- Coordinator updates `SLICE_REGISTER.md`.

## 9. Required project records

| Record | Location | Maintained by |
|---|---|---|
| Slice inventory/status/dependencies | `SLICE_REGISTER.md` | Slice Coordinator |
| Detailed slice specifications | `docs/slices/S##_*.md` | Coordinator, with owner/reviewer input |
| Review/approval decisions | Slice specification approval table and GitHub PR/issue | Coordinator |
| AI-assisted workflow evidence | `docs/WORKFLOW_EVIDENCE_LOG.md` | All members; Coordinator checks completeness |
| Individual contribution evidence | `docs/GROUP_CONTRIBUTION_LOG.md` | All members; Coordinator checks completeness |
| Architectural decisions | `Architecture_Decision_Records/` and `architecture.md` | Team-approved change process |

## 10. First actions

1. Add this file at `docs/SLICE_REVIEW_PROCESS.md`.
2. Add `SLICE_REGISTER.md` at the repository root.
3. Replace Member 1–5 placeholders with actual team names after confirming the provisional allocation.
4. Ask all members to review and agree to this process.
5. Start the S00 specification draft.
6. Review and approve S00 before beginning foundation implementation.
7. Draft S01 next, identifying any S00 outputs it depends on.
