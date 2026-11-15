# ADR-005: Scheduled Escalation Worker

**Status:** Accepted  
**Revision:** Updated to specify the agreed polling cadence and execution behavior.

## Context
The system must support:
- Student-initiated direct complaint escalation after 18 hours of Warden inactivity.
- Automatic escalation of unresolved complaints after 24 elapsed hours from submission.
- Responsibility reminder processing.
The thresholds do not require execution at the exact threshold timestamp. The team selected one five-minute polling cycle to evaluate both complaint thresholds.

## Alternatives considered
- Event-driven queue broker, such as Kafka or RabbitMQ
- Scheduled polling worker service

## Decision
Use a **Scheduled Background Polling Worker Service** in the Business Logic Tier.

The worker:
- Runs a polling cycle every five minutes using node-cron.
- Evaluates the 18-hour manual-escalation eligibility and 24-hour automatic-escalation conditions in the same polling cycle.
- Processes each threshold at the first scheduled polling check after that threshold has elapsed.
- At 18 hours of Warden inactivity, records manual-escalation eligibility; the student still initiates the escalation.
- Automatically escalates an unresolved complaint at the first polling check after 24 elapsed hours from submission.
- Processes approved responsibility reminder jobs, including reminders 24 hours and 1 hour before the deadline. Completed/cancelled responsibilities are excluded and reminders are deduplicated.
- Uses one initial attempt plus three retries, with retry delays of 1, 5, and 15 minutes.
- Persists job execution metadata in a shared `worker_job_runs` table, uses idempotency and PostgreSQL locking/atomic claiming, and recovers overdue work after restart.
- Marks jobs failed for administrator review after the final unsuccessful attempt.
- Calls owning module service interfaces and does not directly implement domain rules by updating domain tables.

For this deliverable, local development is the deployment target. Production hosting is undecided, but production must provide a persistent Node.js worker process. A normal serverless request lifecycle alone must not be assumed to host the continuously running worker.

## Rationale
A scheduled polling worker provides the required periodic timestamp checks with limited infrastructure. Event brokers introduce additional infrastructure and asynchronous message complexity. A five-minute interval gives a predictable processing window while allowing both escalation thresholds to share the same polling mechanism. Persisted job state, retries, idempotency, and restart recovery improve reliability without introducing a separate message-broker platform.

## Trade-offs / consequences
Threshold actions may occur up to one polling interval after their elapsed-time threshold, rather than at the exact timestamp. The worker and database must prevent duplicate actions across repeated polls, retries, and restarts. Production hosting must support a persistent Node.js process; the production provider remains undecided. The precise business definition of Warden inactivity remains governed by the PRD/team clarification and is not redefined by this ADR.
