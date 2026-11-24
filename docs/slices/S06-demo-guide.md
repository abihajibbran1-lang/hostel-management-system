# S06 — Complaint Submission and Student Tracking Demo Guide

**Status:** Draft guide; database-backed demonstration pending approved baseline/migration and credentials. This guide does not claim that a live demo has been performed.

## Purpose

Demonstrate S06: an authenticated Student submits an identified complaint and then views only their own complaint status and permitted outcome through refresh/revisit.

## Preconditions

- Local application can start (`npm run dev`) per `README.md`.
- A provisioned active Student account and sign-in credentials are available through the team's private process. Do not commit credentials.
- The database baseline/migration strategy is approved and the required schema, including `users`, `complaints` and `complaint_status_history`, exists in the target development database. This remains unresolved.
- No Warden status updates are available until S07; outcome display in a live demo therefore depends on existing resolved history data written by S07.

## Demo steps

1. Start the app and sign in as the provisioned Student.
2. Open `/complaints`.
3. Submit a valid complaint:
   - Category: one of Water, Hygiene, Pests, Electricity, Facilities.
   - Room number: trimmed text, 1–30 characters, letters/numbers/spaces/hyphens only, such as `A-12`.
   - Description: nonempty text.
   - Urgency flag: explicitly on or off.
4. Observe the confirmation message containing the complaint UUID as the tracking reference.
5. Observe the new complaint in "My Complaints" with status `Pending` and the submitted details.
6. Revisit or refresh `/complaints` and confirm the record persists with the same status.
7. Sign out, sign in as a second Student, and open `/complaints`. Confirm the first Student's complaint is not visible.
8. Using the second Student's session, request `/api/complaints/<first-student-complaint-uuid>`. Confirm a generic `404` response.

## Validation and negative cases to show

- Missing category, invalid category, empty room number, invalid room characters, overlong room number, empty description, or omitted urgency flag → standardized validation error and no new complaint.
- Unauthenticated request to `/api/complaints` → `401`.
- Authenticated Warden/Kitchen Staff/Manager request to complaint Student routes → `403`.
- Cross-origin or missing-Origin POST → `403`.
- Forged `submitted_by` or `status` fields in the POST body are rejected by strict validation or ignored; identity and status come from the server.

## Evidence to capture

- Screenshots of the form, successful confirmation, and owner-only tracking list.
- Redacted request/response evidence for validation failures, `401`, `403` and `404` cases.
- Test command/output already recorded in `docs/WORKFLOW_EVIDENCE_LOG.md`.
- Database-backed evidence is still pending and must not be claimed from this guide alone.

## Known limitations / pending

- NFR-02 response-time measurement is pending.
- NFR-03 first-time-user usability trial is pending.
- Real database integration, migration/baseline decision and users-table creation strategy remain unresolved.
- S07 must store resolution outcomes in `ComplaintStatusHistory.reason` before a live resolved-outcome display can be demonstrated.
- S06 does not include Warden management, escalation, reminders or worker behaviour.
