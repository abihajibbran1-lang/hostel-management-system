# S00 — Project Foundation

**Status:** Testing — reviewer and coordinator acceptance pending
**Owner:** Khadija Tul Kubra
**Current implementation status:** Testing (reviewer and coordinator acceptance pending)
**Reviewer:** abihajibbran1-lang
**Coordinator:** Abiha  
**Priority:** P0 (proposed in the Slice Register)  
**Target wave:** Wave 1 — Foundation  
**Estimated effort:** To be estimated by the owner after review  
**Specification version:** 0.1  
**Last updated:** 16 November 2026

## 1. Purpose and outcome

### Purpose
Establish the shared application and repository foundation on which the six domain modules and shared capabilities can be implemented consistently.

### Expected outcome
A locally runnable project foundation that follows the approved 3-Tier Layered Architecture, uses the approved technology stack, preserves the required module boundaries, and provides the baseline web-application, database, validation, error-handling, and worker-process structure needed by later slices.

### Why this is a separate slice
All later implementation slices depend on a consistent project structure, agreed tier boundaries, local development setup, and shared technical conventions. S00 establishes those foundations without implementing the business workflows owned by later slices.

## 2. Requirement and decision traceability

S00 has no standalone PRD functional requirement. Its obligations are derived from the approved architecture and accepted ADRs.

| Source | Requirement / decision | S00 obligation |
|---|---|---|
| `architecture.md` §4; ADR-001 | 3-Tier Layered Architecture | Establish Presentation, Business Logic, and Central RDBMS Data Tier boundaries. |
| `architecture.md` §5 and §17 | Six domain modules and approved logical project structure | Create the agreed structural locations and preserve module ownership boundaries. |
| `architecture.md` §12 | Approved technology stack | Use the selected technologies listed in Section 3 of this specification. |
| `architecture.md` §12.1 | Route handlers, Zod validation, module services, module repositories, Prisma | Establish the shared conventions and minimal foundation; detailed module contracts remain with later slices. |
| `architecture.md` §14; ADR-005 | Five-minute polling worker, persistent job metadata, retry/recovery requirements | Establish a dedicated worker entry point and local process capability; implement actual responsibility and complaint jobs in their owning slices. |
| `architecture.md` §15.9 | Single PostgreSQL database, one Prisma schema, module-owned tables | Establish one Prisma schema and module-organized repository structure. |
| `architecture.md` §17 | Worker has a dedicated entry point; app and worker may run as separate local processes | Ensure both local processes can be started independently. |
| NFR-02 | Complaint tracking views and schedule updates within 2.0 seconds under standard operation | Preserve this as a system-level quality target; S00 does not claim to verify it. |
| NFR-04 | 99.0% monthly operational availability during operating term periods | Preserve this as a system-level quality target; S00 does not claim to verify it. |
| NFR-01; CON-02 | Privacy and access control | Establish architecture boundaries that allow centralized authentication and privacy enforcement in S01 and later module slices. |

## 3. Approved technical baseline

The implementation must use the following selections from `architecture.md` §12:

| Concern | Approved selection |
|---|---|
| Web application | Next.js |
| Language | TypeScript |
| UI styling | Tailwind CSS |
| UI components | shadcn/ui |
| API transport | REST through Next.js Route Handlers |
| Input validation | Zod |
| API errors | Consistent standardized error response format |
| Relational database | PostgreSQL |
| ORM | Prisma |
| Database hosting | Supabase PostgreSQL |
| File storage | Supabase Storage, private bucket for Lost & Found images |
| Authentication | Stateless JWT |
| Password hashing | bcrypt |
| Runtime | Node.js |
| Scheduled polling | node-cron |
| Worker deployment for this deliverable | Local development; production hosting remains undecided |

The system uses one PostgreSQL database and one Prisma schema. Repositories are organized by module. The technology selections do not change the 3-Tier Layered Architecture.

## 4. Scope

### Included

- Establish the GitHub repository's application foundation and baseline developer setup.
- Establish the Next.js and TypeScript application using the approved stack.
- Establish the logical tier structure:
  - Presentation Tier
  - Business Logic Tier
  - Central RDBMS Data Tier
- Establish the approved logical locations for:
  - `src/app/` and REST API route-handler areas
  - `src/components/`
  - `src/business/modules/`
  - `src/business/notifications/`
  - `src/business/workers/`
  - `src/data/repositories/`
  - `src/data/database/`
  - `src/data/storage/`
  - `src/shared/`
  - `prisma/schema.prisma`
- Preserve all six domain module boundaries: Auth, Laundry, Complaints, Meals, Schedules & Responsibilities, and Lost & Found.
- Establish one Prisma schema and the connection/configuration foundation for the single Supabase PostgreSQL database.
- Establish shared Zod-validation and standardized API-error conventions without deciding every module's endpoint contract.
- Establish the dedicated worker entry point and local ability to run the worker separately from the web application.
- Provide an `.env.example` containing variable-name placeholders only, with no real credentials or secrets.
- Provide clear local setup and run instructions in `README.md`.
- Verify the baseline project can be installed, type-checked, and started locally using documented commands.

### Excluded

- Implementing login, logout, JWT issuance/verification, role guards, or row-level authorization (S01).
- Implementing any domain business workflow (S02–S14).
- Implementing actual notification inbox behavior (S02).
- Implementing actual responsibility reminder or complaint escalation job handlers (S05/S08).
- Designing final API paths or detailed request/response schemas for all modules; the architecture explicitly leaves these as implementation-level contracts.
- Deciding production hosting or production deployment topology.
- Adding a separate database, Prisma schema, microservice, queue broker, or alternative architecture.
- Adding unapproved third-party services or architectural patterns.

### Boundary and ownership

- S00 owns shared project scaffolding and cross-cutting baseline conventions only.
- Domain tables and business rules remain owned by their domain modules.
- The Auth module's authentication and authorization behavior belongs to S01.
- Notification persistence and read-state behavior belong to S02.
- The worker foundation belongs to S00; domain-specific scheduled job behavior belongs to the relevant slices.
- Do not create a seventh domain module for notifications or treat the worker as a domain module.

## 5. Roles and permissions

S00 does not implement user-facing role permissions.

| Actor / role | S00 interaction | Restriction |
|---|---|---|
| Developer / team member | Uses repository setup and local development instructions | Must follow the approved architecture and avoid committing secrets. |
| Student, Warden, Kitchen Staff, Manager | No completed product workflow in S00 | Authentication and role-specific access are implemented in S01 and later slices. |

The four product RBAC roles remain Student, Warden, Kitchen Staff, and Manager. S00 must not introduce additional product roles.

## 6. Preconditions and dependencies

- The GitHub repository exists and the approved project documents are committed.
- `AGENTS.md`, `Final_PRD.md`, `architecture.md`, and the five accepted ADRs are available in the repository under the canonical names.
- The team has accepted the centralized slice planning and review process.
- S00 is the first implementation slice and has no application-slice dependency.
- Required local development tools and access to the project's Supabase PostgreSQL environment must be available to the implementer. Exact tool versions and credential provisioning should be recorded in the repository setup instructions after the team confirms them; do not place secrets in GitHub.

## 7. Workflow and system behavior

S00 is a developer-facing foundation slice rather than an end-user business workflow.

1. A team member clones the GitHub repository.
2. The team member follows the documented prerequisite and environment setup instructions.
3. The team member configures local environment values using the documented `.env.example` as a guide and obtains secrets through the team's agreed private method.
4. The team member installs project dependencies using the documented package-manager workflow.
5. The team member can start the Next.js web application locally.
6. The team member can start the worker as a separate local process.
7. The team member can run the documented validation/type-check command(s).
8. The application structure preserves the tier and module boundaries in `architecture.md`.

### State transitions
Not applicable. S00 does not define a product-domain state machine.

## 8. Implementation tasks

### 8.1 Repository and project setup

- Confirm the repository root and canonical documentation filenames.
- Establish the Next.js + TypeScript project using the approved stack.
- Add the application files and configuration required by the selected framework.
- Preserve the approved logical project structure in `architecture.md` §17. Adapt filenames only where required by Next.js conventions.
- Ensure the project README explains prerequisites, local configuration, installation, and how to start the web app and worker.
- Add `.env.example` with placeholders only. Do not commit `.env`, credentials, tokens, database passwords, or private keys.

### 8.2 Presentation foundation

- Establish the Next.js application entry/layout structure.
- Establish Tailwind CSS.
- Establish shadcn/ui according to the selected stack.
- Keep presentation components separate from business rules and data access.
- Do not build detailed module screens as part of S00.

### 8.3 API and shared validation foundation

- Establish the Next.js Route Handler location/convention for REST endpoints.
- Establish Zod as the request-input validation technology.
- Establish a consistent standardized API success/error response convention.
- Keep endpoint paths and detailed module request/response schemas out of S00 unless required for a minimal health/startup verification route and explicitly agreed by the team.
- Do not invent a global API contract that conflicts with later module specifications.

### 8.4 Business Logic foundation

- Establish the six approved module directories under `src/business/modules/`.
- Establish the shared Notification Service location under `src/business/notifications/`.
- Establish the worker location under `src/business/workers/`.
- Keep business rules out of presentation components and data repositories.
- Do not implement the notification service or domain workflows in this slice.

### 8.5 Data foundation

- Establish `prisma/schema.prisma` as the single Prisma schema.
- Establish PostgreSQL as the relational database and Supabase PostgreSQL as the selected host.
- Establish shared database configuration/access location under `src/data/database/`.
- Establish module-organized repository locations under `src/data/repositories/`.
- Establish `src/data/storage/` for storage-related access boundaries.
- Do not create final domain schemas beyond what is needed for the agreed foundation and S01. Domain schema ownership remains with each slice.
- Record any schema/migration decision that affects other modules for review before implementation.

### 8.6 Worker foundation

- Establish a dedicated worker entry point under `src/business/workers/`.
- Ensure the web application and worker can be run as separate local processes, as permitted by the architecture.
- Use Node.js and the approved node-cron technology where the baseline scheduler is established.
- Preserve the five-minute polling decision from ADR-005.
- Do not implement complaint escalation or responsibility reminder business logic in S00.
- Do not let the worker directly update domain tables; future jobs must call owning module service interfaces.
- Production worker hosting remains undecided and must not be selected by this slice.

### 8.7 Integration and documentation

- Document local setup and run instructions.
- Document the available validation commands and expected outcomes.
- Ensure the project can be started from a clean clone by following the README.
- Record exact dependency/tool versions selected during setup in the project files; do not invent them in this specification.
- Record implementation decisions that materially affect later slices.

## 9. Acceptance criteria

| ID | Given | When | Then | Source |
|---|---|---|---|---|
| AC-S00-01 | A team member has cloned the repository and followed README prerequisites | They install dependencies using the documented workflow | The project installs without an undocumented manual step | Architecture §12, §17 |
| AC-S00-02 | The project is configured locally | The developer starts the web application using the README command | The Next.js application starts locally | Architecture §12, §17 |
| AC-S00-03 | The project is configured locally | The developer starts the worker using the README command | The worker starts as a separate local process from the web application | Architecture §14.4, §17 |
| AC-S00-04 | The project structure is inspected | A reviewer checks tier and module organization | Presentation, Business Logic, and Data responsibilities are separated, and all six approved domain modules have their designated locations | ADR-001; Architecture §4, §5, §17 |
| AC-S00-05 | The repository contains database configuration | A reviewer inspects the Prisma setup | There is one Prisma schema configured for the single PostgreSQL data tier; repositories are organized by module | Architecture §12, §15 |
| AC-S00-06 | A developer submits invalid input to a validation boundary included in the foundation | The request is processed | Zod validation is used and the API returns the agreed standardized error shape | Architecture §12, §12.1 |
| AC-S00-07 | The repository is prepared for local configuration | A reviewer inspects tracked files | `.env.example` contains placeholders only; no real credentials or secrets are committed | Architecture §16; project security practice |
| AC-S00-08 | A new team member follows the README from a clean clone | They complete the documented setup | They can configure, install, start the web app, start the worker, and run the documented checks without relying on undocumented instructions | Architecture §17 |
| AC-S00-09 | The codebase is reviewed | A reviewer checks cross-tier references and module access | Cross-module operations are designed to use owning module service interfaces; one module is not given direct access to another module's tables | Architecture §12.1 |
| AC-S00-10 | A reviewer checks worker implementation | They inspect worker responsibilities | The worker foundation is separate from domain job rules and does not directly implement domain rules by updating domain tables | Architecture §13–14; ADR-005 |

**Important:** S00 passing these criteria establishes the technical foundation. It does not prove NFR-02 response time or NFR-04 monthly availability. Those require system-level verification over relevant workflows and operating periods.

## 10. Test plan

| Test ID | Level | Scenario | Expected result | Evidence |
|---|---|---|---|---|
| T-S00-01 | Setup / reproducibility | Clean clone followed by README setup | Setup completes with documented steps | Setup notes and terminal output |
| T-S00-02 | Startup | Start web application locally | Application starts without startup error | Terminal output / screenshot |
| T-S00-03 | Startup | Start worker independently | Worker starts as a separate process | Terminal output |
| T-S00-04 | Static checks | Run the documented TypeScript/type-check and lint/build checks selected by the team | Checks complete successfully; any known warnings are recorded | Command output |
| T-S00-05 | Configuration | Inspect committed environment example and repository history | No actual secrets are present in tracked files | Review record |
| T-S00-06 | Architecture review | Inspect source directories and imports | Tier/module boundaries match the approved architecture | Reviewer checklist |
| T-S00-07 | Database foundation | Verify Prisma schema and database connection configuration in the team's development environment | One schema and the selected PostgreSQL connection configuration are in place | Migration/connection output with secrets redacted |
| T-S00-08 | Validation/error convention | Exercise the agreed minimal validation boundary | Invalid input is rejected through Zod and uses the standardized error response | Automated test or request/response evidence |

The team must choose exact package-manager commands and tool versions during setup and record them in the README/package files. Do not invent command output or report a test as passed until it has actually run.

## 11. Security, privacy, and failure handling

- No secrets may be committed. `.env.example` must contain placeholders only.
- Keep data access out of presentation components.
- Keep business rules out of route handlers and repositories; route handlers validate and call business services.
- Preserve module-owned repositories and service interfaces.
- Do not create an authentication bypass as a permanent project convention. Protected operations will be guarded in S01.
- Database connection failures must be surfaced through the project's agreed error/logging approach; exact operational monitoring is not specified by the architecture.
- Do not log credentials, JWTs, connection strings, or other secrets.
- Production hosting and production worker deployment remain undecided.
- The worker must not directly update domain tables to implement domain behavior.

## 12. Evidence required

- GitHub repository/commit showing the foundation structure.
- Screenshot or terminal evidence of clean setup and successful local web startup.
- Screenshot or terminal evidence of worker starting as a separate process.
- Evidence of documented static checks/build/type checks and their actual results.
- Reviewer checklist confirming the architecture structure and tier/module boundaries.
- Redacted evidence of the Prisma/PostgreSQL foundation.
- Review comments and human decisions about any implementation choices not fully prescribed by the architecture.
- Workflow evidence log entry showing AI-assisted work, human review, revisions/rejections where applicable, tests, and final decision.
- Contribution log entry identifying actual work completed by the owner and reviewer.

## 13. Ownership and review

- Implementer: Khadija Tul Kubra
- Reviewer: abihajibbran1-lang
- Coordinator: Abiha
- Team approval date: Pending
- Specification version: 0.1
- Related branch / pull request: `s00-project-foundation` / PR not yet opened (push withheld until local tests completed)
- Integration contacts: S01 owner; later slice owners as needed

## 14. Open questions, risks, and decisions

### Project Owner-approved foundation guidance — approvals confirmed; evidence separate

The Project Owner reports Owner, formal team, and affected technical-owner approval of the consolidated S00–S04 decision package. These approvals are recorded as confirmed based on the Owner's instruction for this task; individual approver names, dates, and separate evidence references were not supplied. Approval does not establish implementation or technical verification evidence:

- The existing repository project configuration and committed lockfile are the source of truth for the Node.js/package-manager constraints and dependency resolution. The current `package.json` declares Node.js `>=22.18.0` and npm `>=10.0.0`; `package-lock.json` is present, but no exact `packageManager` pin is declared. Record these as the observed constraints, not as proof of the installed runtime or a formally selected team standard. Do not invent versions or replace the lockfile without an approved change.
- Environment documentation must use placeholders only. Development database credentials are handed off through a private, access-controlled process using least-privilege access; no secret, credential, or connection string is recorded here.
- Defer an optional health endpoint unless a concrete foundation need is established and the endpoint is agreed within the architecture boundary.
- Reconcile the shared standardized API error convention with S01 before claiming a common contract. The exact response shape remains pending until the responsible owners confirm it.
- The existing separate local worker command is documented as `npm run worker` (`node src/business/workers/index.ts`) and README instructs running it in another terminal. Document and verify that startup as S00 evidence; the command text alone is not proof of a successful run.
- Production hosting, monitoring, and alerting remain deferred and undecided for the local-development deliverable.
- Database connection, baseline/deployment strategy, migration application, and redacted verification evidence remain required. No database readiness or migration application is claimed here.
- Preserve the approved room/resident ownership boundary: Schedules & Responsibilities owns the foundational capability and S04 consumes it through an approved service interface. Schema, migrations, service design, and verification remain pending.

The approvals above do not establish implementation or technical verification. Actual tool versions, commands, database connectivity, room/resident capability, and migration status require repository/environment evidence. The Owner reports verification complete, but the evidence below does not support recording database, migration, or room/resident readiness as verified.

| ID | Question / risk | Why it matters | Owner | Blocking? | Resolution |
|---|---|---|---|---|---|
| OQ-S00-01 | Which exact Node.js and package-manager versions are evidenced by the existing project configuration and lockfile, and are they accepted as the team standard? | Reproducible setup across five developers | Owner + team | Yes for final setup instructions | Current manifest constraints are Node.js `>=22.18.0` and npm `>=10.0.0`; `package-lock.json` exists and no exact `packageManager` pin is present. Confirm the exact runtime/package-manager standard with the team. |
| OQ-S00-02 | What exact local environment variable names are required for database connectivity and later authentication? | `.env.example` and local setup | Owner + S01 owner | No for initial scaffold; yes before dependent features run | Derive from implemented configuration and document; never invent secrets |
| OQ-S00-03 | What private, access-controlled, least-privilege process will provide development Supabase credentials? | Prevent secret leakage and excessive access | Team + S00 owner | Yes before connecting a developer environment | Owner-approved direction is private handoff and least privilege; exact process and evidence remain pending. Never record credentials here. |
| OQ-S00-04 | Health route/check disposition | Avoid adding an unnecessary API contract | Owner + reviewer | No | Deferred. Reconsider only if a concrete foundation need is established; no route is selected. |
| OQ-S00-05 | What exact standardized API error response shape will S00 and S01 share? | Consistent safe errors are needed across the API boundary | S00/S01 owners + coordinator/team | Yes before asserting a shared contract | Reconcile the specifications and record a jointly confirmed shape; neither document alone establishes agreement. |
| OQ-S00-06 | Has the documented separate worker process been successfully started and verified for S00 acceptance? | Web app and worker must run separately | Owner + team | Yes before S00 completion | The command is identified as `npm run worker` (`node src/business/workers/index.ts`). Startup evidence is recorded in `docs/WORKFLOW_EVIDENCE_LOG.md` (17 Nov 2026, S00 clean-clone startup verification); live database and migration readiness remain unverified. |
| OQ-S00-07 | Production hosting and worker monitoring/alerting are undecided | Production deployment cannot be finalized in S00 | Team | No for local deliverable | Defer; do not select a provider or monitoring design in S00. |

## 15. Definition of Done

- [ ] All included foundation tasks are implemented within the approved scope.
- [ ] Approved project structure preserves the three tiers and six domain module boundaries.
- [ ] Approved technology stack is represented in project configuration.
- [ ] One Prisma schema is established for the central PostgreSQL data tier.
- [ ] Local web application startup is verified.
- [ ] Separate local worker startup is verified.
- [ ] Zod validation and standardized API error convention are established at the agreed foundation boundary.
- [ ] README setup instructions are tested from a clean clone.
- [ ] `.env.example` contains placeholders only and no secrets are committed.
- [ ] Relevant tests/checks are run and actual results recorded.
- [ ] No unresolved blocking question remains.
- [ ] Reviewer has checked architecture boundaries and implementation.
- [ ] Workflow evidence log and contribution log are updated.
- [ ] Coordinator has reviewed the completion evidence.
- [ ] `SLICE_REGISTER.md` status is updated.

## 16. Approval record

| Version | Date | Prepared by | Reviewed by | Team decision | Notes |
|---|---|---|---|---|---|
| 0.1 | 15 Nov 2026 | Slice Coordinator | Pending | Specification Draft | Not approved for implementation yet |
| 0.2 | 16 Nov 2026 | Khadija Tul Kubra | Pending | Testing | Implementation began following owner instruction; peer review and coordinator acceptance remain pending. |

