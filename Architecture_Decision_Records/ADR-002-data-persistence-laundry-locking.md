# ADR-002: Data Persistence — Laundry Reservation Locking

**Status:** Accepted

## Context
Laundry reservations must prevent two students from reserving the exact same washing machine slot simultaneously. The reservation transaction must be atomic.

## Alternatives considered
- Application-level distributed lock using Redis
- Relational database transaction isolation and row locking

## Decision
Use **RDBMS Transaction Isolation & Row Locking**, with ACID-compliant relational database transactions to prevent double-booking slot conflicts atomically.

## Rationale
Redis locks require managing additional external infrastructure and cache synchronization state. Database-level ACID transaction isolation relies on the core RDBMS and ensures strict atomicity without extra dependencies.

## Trade-offs / consequences
The decision relies on the relational database's transaction isolation and row-locking mechanisms. It avoids the additional Redis infrastructure and cache synchronization state described for the alternative.
