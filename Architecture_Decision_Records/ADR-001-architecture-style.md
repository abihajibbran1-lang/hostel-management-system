# ADR-001: Architecture Style

**Status:** Accepted  
**Revision:** Updated to incorporate the two later-approved domain modules.

## Context
The system requires an overall structure that separates the user interface, business logic, and data access while supporting maintainability and transaction handling. The original architecture identified Auth, Laundry, Complaints, and Meals as Business Logic domain modules. The later-approved product scope also requires Schedules & Responsibilities and Lost & Found to have explicit ownership and boundaries.

## Alternatives considered
- **Modular Monolith**
- **Microservices**
- **3-Tier Layered Architecture**

## Decision
Adopt a **3-Tier Layered Architecture** consisting of:
- Presentation Tier
- Business Logic Tier, divided into six domain modules:
  1. Auth
  2. Laundry
  3. Complaints
  4. Meals
  5. Schedules & Responsibilities
  6. Lost & Found
- Central RDBMS Data Tier

The Notification Service is a shared capability used by the domain modules. It is not a seventh domain module. The scheduled background worker is supporting infrastructure in the Business Logic Tier, not a domain module.

## Rationale
Microservices add operational overhead, distributed transaction issues, network latency, and multi-database maintenance. A pure Modular Monolith lacks the standard tier separation selected for this system. The 3-Tier Layered Architecture clearly separates UI, Business Logic, and Data Access while allowing the Business Logic Tier to be organized into six cohesive domain modules.

## Trade-offs / consequences
The selected structure preserves standard tier separation and a central relational data tier. Six explicit domain boundaries improve ownership clarity for the complete approved product scope. The Notification Service and worker remain shared/supporting capabilities rather than being treated as extra domain modules. The alternatives would introduce the stated operational, transaction, latency, maintenance, or tier-separation concerns.
