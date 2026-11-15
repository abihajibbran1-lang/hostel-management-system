# ADR-004: Immutable Meal Allocation Snapshots

**Status:** Accepted

## Context
Updating a weekly meal menu template must not alter existing meal reservations, historical portion allocations, or historical audit records.

## Alternatives considered
- Dynamic foreign key references to menu templates
- Immutable snapshot records

## Decision
Use **Immutable Meal Allocation Snapshots**, saved in the Data Layer at the time of reservation or logging, to decouple active menu edits from historical records.

## Rationale
Dynamic foreign key references can break historical audit integrity whenever a menu template is modified. Immutable snapshot records preserve the exact food portion assignments at reservation time.

## Trade-offs / consequences
Historical reservation and portion records retain the snapshot recorded at the time of reservation or logging. Active menu edits are decoupled from those historical records.
