# S01 — Authentication and RBAC

**Status:** Specification Draft — team review required  
**Owner:** Member 1 (provisional; confirm actual name)  
**Reviewer:** Member 3 (provisional; confirm actual name)  
**Coordinator:** Abiha  
**Priority:** P0 (proposed in the Slice Register)  
**Target wave:** Wave 1 — Foundation  
**Estimated effort:** To be estimated by the owner after review  
**Specification version:** 0.1  
**Last updated:** 15 November 2026

## 1. Purpose and outcome

### Purpose
Provide the approved stateless JWT authentication and centralized role-based authorization boundary for the Hostel Management System.

### Expected outcome
The system can authenticate provisioned user accounts, establish the authenticated user's identity and role through a stateless JWT, protect the token using the approved cookie settings, and enforce centralized role and single-owner access checks before protected requests reach Business Logic services.

### Why this is a separate slice
Authentication and authorization are shared prerequisites for every domain module. Implementing them once at the central boundary prevents each module from inventing its own authentication or role-checking approach.

## 2. Requirement and decision traceability

| Source | Requirement / decision | S01 obligation |
|---|---|---|
| NFR-01 | Students can view only their own schedules, responsibilities, and complaints; cross-student visibility is prohibited | Establish centralized identity/authorization controls that support the required privacy boundary. |
| BR-01 | Anonymous complaints are prohibited and complaints must link to an authenticated student ID | Provide authenticated identity for complaint submission; complaint-specific enforcement is tested again in S06. |
| BR-04 | Student access is limited to self-owned records | Ensure authenticated identity is available to protected routes and ownership checks are enforced before business logic. |
| CON-02 | RBAC must enforce single-owner privacy for all student data | Enforce role checks and ownership boundary centrally, with resource-specific ownership applied by protected module operations. |
| Architecture §5.2, §12.1, §13, §15.1, §16 | Auth module, centralized middleware, JWT, bcrypt, user account fields | Implement the documented Auth responsibility and user persistence baseline. |
| ADR-003 | Stateless JWT with Centralized RBAC Middleware Guard | Middleware evaluates user ID and role claims and enforces single-owner row-level access control on API endpoints before requests reach business logic. |
| Architecture §17 | `src/business/modules/auth/`, `src/data/repositories/auth/`, `src/app/api/auth/`, `src/middleware.ts` | Place Auth implementation within the approved logical structure, adapting filenames only where required by Next.js conventions. |

## 3. Approved authentication and authorization baseline

The following are fixed decisions from the architecture and ADR-003:

- Authentication approach: stateless JWT.
- JWT expiry: eight hours.
- Token storage: HttpOnly cookie.
- Cookie settings: `Secure` in production and `SameSite=Lax`.
- Apply CSRF protection to state-changing operations as required by the cookie-based authentication design.
- Password hashing: bcrypt; plaintext passwords must never be stored.
- Centralized RBAC middleware evaluates authenticated user ID and role claims.
- Centralized middleware enforces role authorization and single-owner row-level access control on protected API endpoints before requests reach Business Logic.
- Supported RBAC roles are exactly:
  - Student
  - Warden
  - Kitchen Staff
  - Manager
- Logout clears the authentication cookie.
- No token blacklist or refresh-token mechanism is selected for this version. A copied JWT may remain valid until its expiry.

Do not replace this approach with stateful server-side sessions unless the team formally changes the accepted ADR.

## 4. Scope

### Included

- Auth module foundation under the approved module boundary.
- Authentication of existing/provisioned user accounts.
- Password verification using bcrypt hashes.
- Stateless JWT issuance and verification according to the approved eight-hour expiry.
- HttpOnly cookie handling with the approved settings.
- Logout behavior that clears the authentication cookie.
- Centralized middleware/guard that reads authenticated user ID and role claims.
- Role authorization for the four approved RBAC roles.
- Single-owner access control at the protected API boundary, so student-owned resources cannot be accessed by another student.
- Auth user repository and persistence using the single Prisma schema.
- Consistent handling of unauthenticated and unauthorized requests using the project's standardized API error convention from S00.
- Tests for authentication, role restrictions, ownership boundaries, cookie behavior, expiry, and logout.

### Excluded

- Creating a public self-registration workflow. The source documents do not specify whether users can self-register.
- Defining who provisions initial user accounts or who may create/deactivate staff accounts.
- Password reset, email verification, multi-factor authentication, social login, account recovery, or password-change workflows; these are not specified in the approved source documents.
- Token refresh, refresh-token storage, or token blacklist; explicitly not selected for this version.
- Implementing business workflows for complaints, schedules, responsibilities, meals, laundry, or Lost & Found.
- Replacing module-specific business rules with generic middleware logic.
- Making assumptions that all authenticated users may access all records.
- Introducing additional RBAC roles.

### Boundary and ownership

- Auth owns user account identity, password hashes, role values, authentication, and centralized authorization integration.
- Auth does not own domain records belonging to other modules.
- Other modules must use the authenticated identity and enforce the relevant record ownership/business rules through their own services and repositories.
- Protected requests must pass the centralized Auth boundary before Business Logic is reached.
- The architecture states that cross-module operations use owning module service interfaces; Auth must not directly query another module's tables to perform that module's business operation.

## 5. Roles and permissions

The architecture defines four RBAC roles. This slice establishes role recognition and the central authorization mechanism. The exact per-action permission matrix for every domain feature must be specified by the relevant module slices; do not invent a complete permissions matrix here.

| RBAC role | S01 responsibility | Boundary |
|---|---|---|
| Student | Authenticate as Student; protected requests carry Student identity/role | Access to student-owned records only where applicable; no cross-student private data access |
| Warden | Authenticate as Warden; protected requests carry Warden identity/role | Warden permissions for domain workflows are defined by the relevant module slices |
| Kitchen Staff | Authenticate as Kitchen Staff; protected requests carry Kitchen Staff identity/role | Kitchen Staff permissions for meal workflows are defined by S09–S11 |
| Manager | Authenticate as Manager; protected requests carry Manager identity/role | Manager permissions for complaint escalation workflows are defined by S08 |

Roommate is a PRD actor involved in coordination, not a fifth RBAC role. Do not add a Roommate role.

## 6. Preconditions and dependencies

- S00 project foundation is complete and approved.
- Next.js application, TypeScript, Prisma schema, PostgreSQL configuration, shared validation/error conventions, and repository structure are available.
- The team has access to the development database through its agreed private credential-sharing process.
- User records can be provisioned for testing. The provisioning method must be confirmed by the team; this slice must not silently add public registration.
- The exact login identifier and account-provisioning policy are resolved or explicitly bounded before finalizing the login interface.
- All later protected domain slices depend on S01's authentication and authorization boundary.

## 7. Workflow and system behavior

### 7.1 Authentication workflow (provisioned account)

1. A user opens the sign-in interface/API.
2. The user submits the agreed login identifier and password.
3. The Auth route validates the input using Zod.
4. The Auth service retrieves the relevant provisioned user account through the Auth repository.
5. The submitted password is checked against the stored bcrypt password hash.
6. If credentials are valid and the account is active, the Auth service issues a stateless JWT containing the identity and role claims required by the accepted design.
7. The JWT is stored in an HttpOnly cookie with the approved expiry and cookie settings.
8. Subsequent protected API requests pass through centralized middleware.
9. Middleware verifies the token, evaluates the user ID and role claims, and applies the role and ownership boundary before Business Logic is reached.
10. The request proceeds only if the applicable authentication and authorization checks pass.

The architecture does not prescribe the exact JWT claim names, signing algorithm/library, login route, or complete request/response schema. Those must be selected and recorded during implementation review without changing the accepted stateless JWT decision.

### 7.2 Logout workflow

1. An authenticated user requests logout.
2. The Auth operation clears the authentication cookie.
3. Subsequent requests without a valid authenticated token are treated as unauthenticated.

Because no blacklist or refresh-token mechanism is selected, logout clears the browser cookie; it does not revoke a separately copied token before its expiry.

### 7.3 Protected request workflow

1. A request reaches a protected API endpoint.
2. Centralized middleware checks whether a valid JWT is present.
3. Middleware verifies the JWT and extracts the authenticated user ID and role claims.
4. Middleware checks whether the role is permitted for the protected operation.
5. The applicable single-owner row-level access rule is enforced before the request reaches Business Logic.
6. If checks pass, the request continues to the relevant module service.
7. If authentication or authorization fails, the request is rejected using the standardized API error convention.

### State transitions

Not applicable as a product-domain state machine. Authentication has token validity/expiry behavior, but the source documents do not define a separate user account lifecycle beyond `is_active`.

## 8. Implementation tasks

### 8.1 Presentation

- Provide the sign-in interaction required for the agreed login identifier and password.
- Provide a logout interaction.
- Do not add registration, password reset, account recovery, or other unspecified account screens without team approval.
- Do not expose JWT values to client-side JavaScript or display them in the interface.

### 8.2 API / route handlers

- Implement Auth route handlers under the architecture's `src/app/api/auth/` area, adapting filenames to Next.js conventions.
- Validate incoming authentication input with Zod.
- Use the standardized API success/error response convention established in S00.
- Keep password verification and token issuance in the Auth Business Logic service rather than embedding business logic in the route handler.
- Do not publish final route paths or request/response contracts in this specification; record the chosen implementation-level contracts in the Auth slice/API documentation and review them.

#### Implemented route contract (pending review)

- `POST /api/auth/login` accepts JSON `email` and `password`. It validates the request with Zod, authenticates only provisioned active accounts, returns the shared API success envelope without a token value, and sets the `auth_token` HttpOnly cookie.
- Invalid credentials and inactive accounts receive the same generic standardized authentication-failure response and no authentication cookie.
- `POST /api/auth/logout` clears the `auth_token` cookie using matching path, HttpOnly, SameSite, and production-Secure attributes.
- Login and logout are POST-only. No state-changing GET endpoint is implemented.
- Login and logout check the reusable Origin validator. They allow same-origin requests and reject cross-origin and missing-Origin requests with the standardized 403 response.

### 8.3 Business logic

- Implement the Auth service under `src/business/modules/auth/`.
- Authenticate provisioned user accounts.
- Verify passwords against bcrypt hashes.
- Issue and verify stateless JWTs with an eight-hour expiry.
- Ensure authenticated identity and role are derived from verified token claims, not trusted from client-supplied identity fields.
- Implement centralized role guards for Student, Warden, Kitchen Staff, and Manager.
- Implement single-owner access enforcement at the protected API boundary.
- Clear the authentication cookie on logout.
- Do not implement refresh tokens or token blacklist.

### 8.4 Data / persistence

The architecture's Auth `users` table contains:

| Field | Documented definition |
|---|---|
| `id` | UUID primary key |
| `full_name` | Required text |
| `email` | Required unique text |
| `password_hash` | Required text; bcrypt hash |
| `role` | Required role value: Student, Warden, Kitchen Staff, Manager |
| `is_active` | Required boolean, default true |
| `created_at`, `updated_at` | Timestamps |

Additional documented rule: accounts referenced by historical records are deactivated rather than physically deleted.

Tasks:
- Implement the Auth-owned user model in the single Prisma schema.
- Implement the Auth repository under `src/data/repositories/auth/`.
- Persist password hashes only; never plaintext passwords.
- Preserve the documented role values and `is_active` behavior.
- Do not add unapproved user profile fields, roles, account lifecycle states, or deletion rules.

### 8.5 Middleware and security

- Implement centralized authentication/RBAC middleware at the approved architecture boundary (`src/middleware.ts`, adapted to the selected Next.js conventions).
- Verify JWT before allowing protected API operations to reach Business Logic.
- Enforce role authorization using the four approved roles.
- Enforce single-owner row-level privacy before Business Logic.
- Use HttpOnly cookie storage, eight-hour expiry, `Secure` in production, and `SameSite=Lax`.
- Apply CSRF protection to state-changing operations as required by the cookie-based authentication design.
- Ensure logout clears the cookie.
- Do not log passwords, password hashes, JWTs, signing secrets, or cookie values.

#### Implemented middleware boundary (pending review)

- `src/middleware.ts` runs with the Next.js Node.js middleware runtime so it can use the Auth repository for the required current-account active-status check.
- It matches `/api/:path*`, leaves `POST /api/auth/login` public, and lets `POST /api/auth/logout` reach its cookie-clearing handler regardless of cookie validity. It does not match pages, `_next` assets, or other framework resources.
- For protected API requests, it reads `auth_token`, verifies it through the central JwtService, then calls the Auth repository `isActive` method on every request. Missing, malformed, tampered, expired, or inactive-account requests receive the standardized unauthenticated response.
- Only after verified token and active-account checks succeed does it overwrite the internal `x-auth-user-id` and `x-auth-role` request headers passed to downstream protected handlers.
- Reusable role guards centralize the four `UserRole` values and return the standardized forbidden response for an authenticated role that is not allowed. No route-to-role permission map is defined in S01; consuming slices must supply their approved permission requirements.

### 8.6 Integration

- Publish a clear Auth service/middleware interface for protected modules to use.
- Document how route handlers obtain verified user identity and role.
- Ensure module slices do not create their own independent JWT verification or role systems.
- Ensure module-specific ownership checks are compatible with the central boundary.
- S02 and all later protected domain slices use the shared authentication boundary.

## 9. Acceptance criteria

| ID | Given | When | Then | Source |
|---|---|---|---|---|
| AC-S01-01 | A provisioned active user has a valid bcrypt password hash | The user submits valid credentials through the agreed sign-in operation | Authentication succeeds and a stateless JWT is issued | Architecture §13, §15.1, §16; ADR-003 |
| AC-S01-02 | A user submits an incorrect password or invalid credentials | Authentication is attempted | Authentication is rejected and no authenticated cookie/session is established | Architecture §15.1, §16; security requirement |
| AC-S01-03 | Authentication succeeds | The response is inspected | JWT is stored in an HttpOnly cookie with eight-hour expiry, `SameSite=Lax`, and `Secure` in production | Architecture §16 |
| AC-S01-04 | A protected API request contains a valid JWT | Centralized middleware processes the request | Middleware verifies the token and obtains the authenticated user ID and role claims before Business Logic is reached | ADR-003; Architecture §5.2, §12.1 |
| AC-S01-05 | A protected request has no token, an invalid token, or an expired token | The request is processed | The request is rejected as unauthenticated using the standardized API error convention | ADR-003; Architecture §12.1, §16 |
| AC-S01-06 | A valid authenticated user requests an operation restricted to another role | Middleware evaluates the request | The request is rejected before the protected Business Logic operation executes | ADR-003; Architecture §5.2 |
| AC-S01-07 | Student A is authenticated and requests a private record owned by Student B | The protected operation performs the ownership check | Access is denied; Student A cannot view Student B's private record | NFR-01; BR-04; CON-02; ADR-003 |
| AC-S01-08 | A Student requests their own record and the operation is allowed by the relevant module | The ownership check runs | The authenticated identity is used to scope access to the Student's own record | NFR-01; BR-04; ADR-003 |
| AC-S01-09 | An authenticated user requests logout | Logout completes | The authentication cookie is cleared; a subsequent browser request without a valid cookie is unauthenticated | Architecture §16 |
| AC-S01-10 | The user table and repository are reviewed | A reviewer checks persisted account data | The documented user fields and four role values are represented; password storage is a bcrypt hash, not plaintext | Architecture §15.1, §16 |
| AC-S01-11 | A state-changing request uses the cookie-based authentication design | The request passes through the applicable CSRF protection | The CSRF behavior required by the agreed design is enforced | Architecture §16 |
| AC-S01-12 | A reviewer inspects the repository and module integration | They check authentication and authorization implementation | Protected modules use the centralized Auth boundary rather than implementing independent JWT/role systems | ADR-003; Architecture §5.2, §12.1 |

**Important ownership nuance:** Central middleware must establish verified identity, role authorization, and the approved single-owner access boundary. Each domain module remains responsible for applying its own record ownership/business rules through its owning service/repository. The implementation must demonstrate that the combined boundary prevents cross-student access; do not assume a generic role check alone proves row ownership.

## 10. Test plan

| Test ID | Level | Scenario | Expected result | Evidence |
|---|---|---|---|---|
| T-S01-01 | Unit | Verify password against a valid bcrypt hash | Correct password verifies successfully | Test output |
| T-S01-02 | Unit | Verify password against a non-matching password | Verification fails | Test output |
| T-S01-03 | Integration | Authenticate a provisioned active user | JWT is issued and cookie attributes match the approved settings | Redacted response/test output |
| T-S01-04 | Integration | Authenticate with invalid credentials | Request rejected; no authenticated cookie issued | Test output |
| T-S01-05 | Integration | Access protected endpoint without a cookie | Request rejected before business service executes | Test output |
| T-S01-06 | Integration | Access protected endpoint with invalid/expired JWT | Request rejected | Test output |
| T-S01-07 | Authorization | Test each of the four approved roles against the role guards used by the implemented operations | Allowed roles proceed; disallowed roles are rejected | Role matrix/test output |
| T-S01-08 | Privacy / security | Student A attempts to access Student B's private record through a protected module operation | Access denied; no record data disclosed | Automated test and redacted response |
| T-S01-09 | Privacy / security | Student accesses their own record through a protected module operation | Access is scoped to their own identity and permitted by the module | Automated test |
| T-S01-10 | Integration | Logout and then call a protected endpoint using the browser's cleared cookie | Browser request is unauthenticated | Test output |
| T-S01-11 | Security | Inspect cookie flags and token exposure | HttpOnly is set; Secure is set in production; SameSite=Lax; token is not exposed to client JavaScript | Browser/test evidence |
| T-S01-12 | Security | Exercise state-changing cookie-authenticated requests under the agreed CSRF design | Requests meet the approved CSRF protection behavior | Test output |
| T-S01-13 | Data | Inspect persisted test user records | Password hashes are stored; plaintext passwords are absent; role values are constrained to the four approved roles | Redacted DB/test evidence |
| T-S01-14 | Regression | Run authentication/authorization tests with representative protected routes from integrated slices | Central boundary remains consistent across modules | Test output |

Test credentials must be synthetic. Never include real passwords, JWTs, cookies, signing keys, or personal data in evidence.

## 11. Security, privacy, and failure handling

- Passwords must be hashed with bcrypt; plaintext passwords must never be stored.
- JWT must be stateless and expire after eight hours.
- JWT must be stored in an HttpOnly cookie.
- Set `Secure` in production and `SameSite=Lax`.
- Apply CSRF protection to state-changing operations as required by the cookie-based authentication design.
- Centralized middleware evaluates verified user ID and role claims before Business Logic.
- Student access must remain limited to self-owned schedules, responsibilities, and complaints.
- Do not trust user ID or role values supplied in request bodies, query strings, or client-controlled headers as proof of identity.
- Do not reveal whether an account exists versus whether its password is wrong unless the team approves that behavior; the source documents do not define the exact authentication error wording.
- Logout clears the cookie. No blacklist or refresh-token mechanism is selected; a copied JWT may remain valid until expiry.
- Accounts referenced by historical records are deactivated rather than physically deleted.
- Do not log passwords, password hashes, JWTs, signing secrets, or cookie values.
- Exact JWT signing-key provisioning/rotation and CSRF implementation details are not fully prescribed in the source documents and require implementation review.

## 12. Evidence required

- Auth specification review and team approval.
- GitHub commits/PR showing Auth module, repository, middleware and route-handler implementation.
- Redacted tests demonstrating successful and failed authentication.
- Redacted evidence of cookie attributes and eight-hour expiry.
- Tests demonstrating each approved role's guard behavior.
- Tests demonstrating Student A cannot access Student B's private record and a student can access their own record where allowed by the module.
- Tests showing logout clears the cookie.
- Evidence of CSRF protection behavior for applicable state-changing requests.
- Database evidence showing documented user fields and bcrypt hashes only (never show actual credentials).
- Reviewer comments and any human changes to AI-generated code or design.
- Workflow evidence log and contribution log updated with actual contributions and test outcomes.

## 13. Ownership and review

- Implementer: Member 1 (provisional; confirm)
- Reviewer: Member 3 (provisional; confirm)
- Coordinator: Abiha
- Team approval date: Pending
- Specification version: 0.1
- Related branch / pull request: To be created
- Integration contacts: S00 owner; S02 owner; all protected module owners

## 14. Open questions, risks, and decisions

### Project Owner-approved S01 integration guidance — approvals confirmed; evidence separate

The Project Owner reports Owner, formal team, and affected technical-owner approval of the consolidated S00–S04 decision package. These approvals are recorded as confirmed based on the Owner's instruction for this task; individual approver names, dates, and separate evidence references were not supplied. Approval does not establish S04 authorization implementation or test evidence:

- Account provisioning and account/role administration are outside the S01 authentication module's scope. Any administrative workflow that creates accounts, assigns roles, or deactivates/reactivates accounts must be authorized, attributable to an actor, and separately agreed; this entry does not select its owner or grant a role permission.
- Protect JWT signing-secret configuration and establish a private provisioning and rotation process. Never commit or expose secrets. The exact handoff, access-control, rotation, and recovery process remains open.
- S01's centralized authentication and generic role guards provide identity and role checks. S04 must additionally enforce its own resource-level room-membership, participant, and assigned-house authorization through the approved Schedules & Responsibilities interface. A generic role guard does not prove those checks.
- For S04 integration, preserve the approved Student participant boundary, Warden assigned-house boundary, primary-Warden routing as a S04/domain responsibility, and Hostel Manager authority only for authorized administrative work. These are not a new S01 action-permission matrix; module owners must implement and verify their resource rules.
- Reconcile the shared API error convention with S00. The exact common error shape is not yet established by this S01 document; login failures must continue to avoid disclosing whether an account exists.
- Continue verifying passwords against bcrypt hashes. Do not change the hashing approach without a reviewed decision. The production account-provisioning work factor remains unresolved; test/dummy-hash costs are not that policy.
- S01 review, reviewer/coordinator acceptance, and approval evidence remain required and are not satisfied by these recommendations.

The approvals above do not establish S04 room, participant, or assigned-house authorization implementation. S01's slice status and acceptance remain as recorded in its approval workflow.

| ID | Question / risk | Why it matters | Owner | Blocking? | Resolution |
|---|---|---|---|---|---|
| OQ-S01-01 | What controlled account-provisioning workflow, owner, and attribution process will be used? | Public self-registration is not part of the approved controlled-provisioning approach; unauthorized account and role changes must be prevented. | Team + relevant owner | No for S01 authentication; required before implementing account administration | Do not add public registration or an S01 admin provisioning API. The administrative workflow, responsible owner, and attribution details remain unresolved. |
| OQ-S01-02 | Is email the login identifier, or is another identifier required? | Approved decision: email is the sign-in identifier. | Team | No | Use the unique User email field for login |
| OQ-S01-03 | Which authorized administrative process owns account creation, role assignment, deactivation, and reactivation, and how are those changes attributed? | Prevent unauthorized privilege assignment and provide accountability | Team + S01 owner | Yes before implementing account administration | Account administration remains outside the S01 authentication module. Owner-approved guidance requires authorized, attributable changes; the responsible owner, workflow, and role permission remain pending. |
| OQ-S01-04 | What password length/complexity policy applies? | Approved input policy: minimum 8 characters and maximum 72 UTF-8 bytes. No additional complexity rule is approved. | Team | No | Enforce only the approved input policy |
| OQ-S01-05 | Which exact JWT claim names and additional validation requirements will be used? | Approved contract: HS256 protected header; `sub` is the required canonical UUID user ID; `role` is one of the four `UserRole` values; `exp` is required and set to eight hours. No issuer, audience, refresh token, or optional claims are included. | Owner + reviewer + team | No | Implement and test the approved minimum claim contract |
| OQ-S01-06 | How will JWT signing secrets be privately provisioned, access-controlled, rotated, and recovered in local development? | `JWT_SECRET` is required from private environment configuration and must be at least 32 UTF-8 bytes; missing, empty, or weak values are rejected. | Team | Yes before local auth can run safely | Owner-approved direction is protected private configuration; exact handoff, least-privilege access, rotation, and recovery process remain pending. Do not commit secrets. |
| OQ-S01-07 | What exact CSRF protection mechanism will be used for state-changing cookie-authenticated requests? | Approved behavior: reusable Origin validation allows same-origin requests and rejects cross-origin and missing-Origin login/logout requests with 403. | Owner + reviewer | No for implemented login/logout routes | Apply the approved Origin policy to later state-changing routes |
| OQ-S01-08 | What exact per-action permissions apply to Warden and Manager across all modules? | Auth provides centralized reusable role guards, but module-specific permission mapping is not defined in S01. | Relevant module owners + team | No for core identity mechanism; yes before each affected module action is implemented | Define and test permissions within each module slice; do not add an S01 route-to-role map |
| OQ-S01-09 | How should deactivated users' existing JWTs behave before their eight-hour expiry? | Approved behavior is implemented: every protected API request checks the user's current active status through the Auth repository, so a deactivated account is denied even if its JWT has not expired. | Team | No | Preserve this check in the centralized middleware boundary |
| OQ-S01-10 | What exact API error codes/messages are used for unauthenticated and unauthorized requests, and what shared shape do S00 and S01 use? | S00 and S01 need a consistent safe response convention; login failures must not reveal whether an email exists | S00/S01 owners + coordinator/team | Yes before asserting a shared contract | The shared shape remains pending reconciliation with S00. Preserve generic login-failure behavior and record the jointly confirmed convention before claiming it is approved. |
| OQ-S01-11 | What bcrypt work factor applies to provisioned production account hashes? | Current Auth code verifies existing bcrypt hashes only. The non-secret dummy hash uses cost 12 for missing/inactive-account comparison timing, while tests use cost 10 synthetic hashes to keep the test suite fast. No production provisioning/hash-creation work factor is selected in S01. | Team | Yes before controlled account provisioning creates production accounts | Record the provisioning work-factor policy separately; do not treat the test or dummy-hash cost as that policy |
| OQ-S01-12 | How should a state-changing request with no `Origin` header be handled? | Approved behavior: login and logout reject a missing Origin header with the standardized 403 response; same-origin is allowed and cross-origin is rejected. | Team | No | Apply the approved Origin policy consistently to later state-changing routes |

### 14.1 HTL implementation checkpoint — details still requiring recorded approval

This checkpoint records only unresolved details. It does not approve an additional security policy, API contract, or domain workflow.

| Item | Current recorded position | Required approval/evidence before completion |
|---|---|---|
| JWT claim names | `jose`, HS256, and eight-hour expiry are approved working decisions. The minimum contract is `sub` (canonical UUID user ID), `role` (one of the four `UserRole` values), and `exp` (eight-hour expiry). The protected header is HS256. Issuer, audience, refresh-token, and optional claims are intentionally absent. | Token helpers must reject missing/invalid `sub`, missing/invalid `role`, expired tokens, malformed tokens, and tokens not using HS256. |
| JWT secret management and rotation | `JWT_SECRET` is read only from private environment configuration. Missing, empty, and values shorter than 32 UTF-8 bytes are rejected; the placeholder contains no usable secret. No delivery, access-control, rotation, or recovery procedure is recorded here. | Team records the local and production secret-provisioning process, access control, rotation trigger/procedure, and recovery handling. Live configuration evidence must remain redacted. |
| Ownership-test integration contract | Auth establishes verified identity and provides the central authorization boundary; the owning domain module remains responsible for its private-record repository/service rule. S01 must not create an S02-or-later business endpoint merely to demonstrate ownership. | S01 reviewer and the selected protected-module owner approve a test contract that states the trusted authenticated identity input, protected record owner identifier, allowed/denied results, and synthetic test fixture. The completed test must prove Student A is denied Student B's record and may access an allowed own record. |
| S01 specification and reviewer approval | The detailed specification currently lists provisional implementer/reviewer assignments and a pending team approval date. Creating a feature branch does not change the slice status or constitute specification approval. | Record the confirmed implementer, reviewer, specification approval, review comments, and coordinator acceptance in the prescribed project records before marking S01 Complete. |

## 15. Definition of Done

- [ ] Auth module follows the approved architecture boundaries.
- [ ] User persistence matches the documented Auth schema fields and four roles.
- [ ] Passwords are stored as bcrypt hashes only.
- [ ] Stateless JWT authentication uses the approved eight-hour expiry.
- [ ] JWT is stored in an HttpOnly cookie with approved cookie settings.
- [ ] Centralized middleware verifies identity and role claims before protected Business Logic.
- [ ] Centralized role guards recognize Student, Warden, Kitchen Staff, and Manager.
- [ ] Single-owner privacy is demonstrated through integrated protected-resource tests.
- [ ] Logout clears the authentication cookie.
- [ ] Applicable CSRF protection is implemented and tested.
- [ ] No unapproved registration, password reset, refresh token, blacklist, or extra role has been added.
- [ ] Relevant unit, integration, authorization, privacy, and security tests pass; results are recorded.
- [ ] No unresolved blocking question remains for the implemented scope.
- [ ] Code has been reviewed by the assigned reviewer.
- [ ] Workflow evidence log and contribution log are updated.
- [ ] Coordinator has reviewed the completion evidence.
- [ ] `SLICE_REGISTER.md` status is updated.

## 16. Approval record

| Version | Date | Prepared by | Reviewed by | Team decision | Notes |
|---|---|---|---|---|---|
| 0.1 | 15 Nov 2026 | Slice Coordinator | Pending | Specification Draft | Not approved for implementation yet |

