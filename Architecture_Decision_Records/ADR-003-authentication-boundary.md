# ADR-003: Authentication Boundary

**Status:** Accepted

## Context
The system has four actor roles: Student, Warden, Kitchen Staff, and Manager. Role-based access control must enforce strict single-owner privacy and row-level access control on API endpoints.

## Alternatives considered
- Stateful session-based authentication
- Stateless JWT authentication with RBAC middleware

## Decision
Use **Stateless JWT with Centralized RBAC Middleware Guard**. The middleware evaluates user ID and role claims and enforces single-owner row-level access control on all API endpoints before requests reach business logic.

## Rationale
Stateful sessions require server-side session stores or sticky sessions. Stateless JWTs allow scalable request verification using user ID and role claims evaluated at the middleware layer.

## Trade-offs / consequences
The selected approach uses stateless request verification and centralized middleware guards. The stateful alternative would require server-side session storage or sticky sessions.
