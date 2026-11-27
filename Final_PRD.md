# Hostel Management System — Final Validated Product Requirements Document

**Status:** Final Validated  
**Basis:** Group 10 Deliverable 2 (Post-Human Validation Gate)[cite: 1, 2]  
**Purpose:** Consolidated, validated requirements document reflecting all human decisions and AI critique resolutions[cite: 1, 2].

## 1. Product / Feature Overview

### 1.1 Product intent
The Hostel Management System is intended to help students organize personal daily schedules, coordinate agreed shared responsibilities with roommates, manage meal-related arrangements, report hostel problems, and track complaint status and outcomes[cite: 2]. It supports the warden and hostel manager in reviewing and handling hostel issues while preserving agreed privacy boundaries[cite: 2].

### 1.2 User need
Students need a simple, effective way to coordinate daily hostel activities and shared responsibilities so that avoidable conflicts and stress are reduced and they can manage university routines more peacefully[cite: 2].

### 1.3 Scope summary
The system covers:
- Personal daily schedule management[cite: 2].
- Recording and coordinating agreed roommate responsibilities[cite: 2].
- In-app notifications for upcoming activities and agreed responsibilities[cite: 2].
- One reminder followed by a warden notification when non-completion is confirmed via system timeout or self-confirmation[cite: 2].
- Meal reservations for students with university commitments and advance notice of collection difficulties routed to kitchen staff[cite: 2].
- Fixed meal-portion allocation logging and warden audit verification[cite: 2].
- Identified hostel complaint submission, review, status management, tracking, and escalation[cite: 2].
- Separate new complaints for problems that recur after an earlier complaint is resolved, linked via parent audit IDs[cite: 2].

The system supports people responsible for hostel operations; it does not replace their human responsibilities[cite: 2].

---

## 2. Problem and User Need
Students experience difficulties with meal arrangements, daily schedules, roommate issues, and shared hostel responsibilities because coordination and responsibilities are not always clear[cite: 2]. Communication with hostel management can also be challenging[cite: 2]. These issues cause conflict, stress, and interfere with university routines[cite: 2].

---

## 3. Goals
- **G-01:** Help students create, view, and update their personal daily schedules[cite: 2].
- **G-02:** Support coordination of shared responsibilities agreed upon by roommates[cite: 2].
- **G-03:** Notify students about upcoming activities and agreed responsibilities[cite: 2].
- **G-04:** Notify the warden when an agreed responsibility remains incomplete after one reminder and non-completion is confirmed[cite: 2].
- **G-05:** Support meal reservations and advance communication routed to kitchen staff[cite: 2].
- **G-06:** Support fixed meal-portion logging and warden audit verification[cite: 2].
- **G-07:** Allow students to submit identified hostel complaints with mandatory fields and track their own status[cite: 2].
- **G-08:** Enable the warden to review complaints, correct priorities, and transition states through a formal lifecycle[cite: 2].
- **G-09:** Support student-initiated direct escalation (at 18 hours) and automatic escalation (at 24 hours)[cite: 2].
- **G-10:** Preserve earlier resolved complaints as separate records while maintaining parent reference links for recurring issues[cite: 2].
- **G-11:** Protect privacy across all student schedules, responsibilities, and complaints[cite: 2].

---

## 4. Non-Goals / Out of Scope
- **NG-01:** The system will not physically prepare or deliver meals[cite: 2].
- **NG-02:** The system will not replace warden or hostel manager operational duties[cite: 2].
- **NG-03:** Students will not be allowed to view other students' private schedules or complaint details[cite: 2].
- **NG-04:** The system will not guarantee roommate compliance or eliminate interpersonal disputes[cite: 2].
- **NG-05:** The system will not automatically resolve roommate conflicts without human involvement[cite: 2].
- **NG-06:** The system will not manage academic coursework or university examinations[cite: 2].

---

## 5. Users and Stakeholders

| Actor / stakeholder | Role supported by the system |
|---|---|
| Student | Manages own schedule; coordinates agreed responsibilities; receives in-app notifications; submits meal notices; submits/tracks own complaints; escalates complaints under FR-10[cite: 2]. |
| Roommate | Coordinates shared responsibilities agreed upon with other roommates[cite: 2]. |
| Warden | Receives assistance requests; receives incomplete-responsibility alerts; conducts digital meal portion audits; reviews and updates complaint status lifecycle[cite: 2]. |
| Hostel Manager | Receives escalated complaints (manual at 18h, automatic at 24h) and handles unresolved high-level issues[cite: 2]. |
| Kitchen Staff | Primary recipients for meal reservations and collection difficulty notices; logs portion allocations[cite: 2]. |
| System | Generates notifications, enforces privacy boundaries, tracks state transitions, and performs automatic escalation[cite: 2]. |

---

## 6. Ubiquitous Language / Glossary

| Term | Agreed meaning / use in this document |
|---|---|
| Complaint | A formal report submitted by a student containing mandatory system fields[cite: 2]. |
| Student | A hostel resident who manages personal schedules, shared duties, and complaints[cite: 2]. |
| Warden | Staff member managing facility complaints, portion verification audits, and student assistance requests[cite: 2]. |
| Hostel Manager | Administrative authority receiving escalated complaints[cite: 2]. |
| Shared Responsibility | A duty agreed upon by roommates recorded within the system[cite: 2]. |
| Reminder | An in-app notification sent to a responsible student prior to escalation[cite: 2]. |
| Non-Completion | Unfulfilled duty confirmed by student self-reporting or non-response timeout[cite: 2]. |
| Meal Reservation | Digital booking for students with authorized university commitments[cite: 2]. |
| Normal Collection Period | Designated meal service time window[cite: 2]. |
| Meal Portion | Standardized food quantity logged by kitchen staff and verified by warden audits[cite: 2]. |
| Complaint Status Lifecycle | Defined state machine: `Pending` -> `In Progress` -> `Resolved` / `Escalated`[cite: 2]. |
| Complaint Outcome | Formal resolution details recorded upon resolving a complaint[cite: 2]. |
| Direct Escalation | Escalation initiated by a student after 18 hours of warden inactivity or upon submitting a linked follow-up complaint[cite: 2]. |
| Automatic Escalation | System-driven escalation processed at the first scheduled five-minute polling check after 24 elapsed hours from submission, if the complaint remains unresolved[cite: 2]. |
| Recurring Problem | Re-occurrence of a resolved issue, logged as a new complaint referencing the `Original_Complaint_ID`[cite: 2]. |

---

## 7. Functional Requirements

### FR-01 — Personal Schedule Management
The system shall allow each student to create, view, and update their own daily schedule to manage personal routines privately[cite: 2].

### FR-02 — Shared Responsibility Coordination
The system shall allow roommates to record and coordinate shared responsibilities. The system shall provide an explicit "Request Warden Assistance" capability to notify the warden when coordination fails[cite: 2].

### FR-03 — Notifications for Activities and Responsibilities
The system shall send in-app notifications to students 30 minutes prior to scheduled activities. For agreed responsibility deadlines, the system shall send reminders 24 hours and 1 hour before the deadline, excluding completed or cancelled responsibilities[cite: 2].

### FR-04 — Incomplete Responsibility Notification
After sending one reminder, if a responsibility remains incomplete, the system shall notify the warden once non-completion is confirmed via assigned student self-reporting or automated system time-out, without exposing personal student schedules to other roommates[cite: 2].

The automatic check runs at the first five-minute worker poll at or after one hour past the current deadline. It evaluates each accepted assignment that is still incomplete and has received a reminder for its current version. Completion, cancellation, withdrawal or room transfer before the check excludes the affected work. A revised deadline uses its own grace period and requires a reminder for the revised assignment. The system sends one staff alert per duty across self-reports and automatic confirmations. The active primary Warden receives the alert, with Hostel Manager fallback if the house has no active primary Warden. No private schedule information is included.

### FR-05 — Meal Reservations and Collection Arrangements
The system shall route meal reservations and advance collection difficulty notices directly to Kitchen Staff, while providing a read-only audit copy to the Warden[cite: 2].

### FR-06 — Meal Portion Management & Audit
The system shall record fixed meal portion allocations logged by Kitchen Staff and allow the Warden to perform portion verification audits. Upon an audit failure, the system shall log a Portion Discrepancy Record[cite: 2].

### FR-07 — Hostel Complaint Submission
The system shall allow students to submit identified complaints by requiring mandatory fields: Category (Water, Hygiene, Pests, Electricity, Facilities), Room Number, Description, and Urgency Flag[cite: 2].

### FR-08 — Complaint Review and Lifecycle Management
The system shall enforce the complaint lifecycle (`Pending` -> `In Progress` -> `Resolved` / `Escalated`). It shall allow the Warden to update statuses and correct priority flags[cite: 2].

Wardens can review and act on complaints submitted under houses they are currently assigned to. The submission records the student's verified house at that time. Later room transfers do not change the complaint's house. The room number entered by the student remains part of the complaint report. Complaints without a verified submission house are handled in an unassigned intake queue by a designated Warden.

### FR-09 — Complaint Tracking
The system shall allow students to view the real-time status and outcome of their own complaints only[cite: 2].

### FR-10 — Direct Complaint Escalation
The system shall allow a student to directly escalate an active complaint to the Hostel Manager if no warden action occurs within 18 hours[cite: 2]. If a student disagrees with an outcome, the system shall allow submitting a new complaint linked to the `Original_Complaint_ID` and escalating it directly[cite: 2].

For S08, an active complaint is `Pending` or `In Progress`. Inactivity starts at submission and resets when the Warden records a status change or urgency correction. Viewing a complaint does not reset it. New Warden activity clears a previously recorded inactivity unlock. A student who submits a disagreement follow-up with a nonblank reason can explicitly escalate that new `Pending` complaint immediately. A recurrence follows the usual timeline.

### FR-11 — Automatic Escalation of Unresolved Complaints
The system shall monitor active complaints and automatically escalate any complaint that remains unresolved after 24 elapsed hours to the Hostel Manager at the first scheduled five-minute polling check after that threshold[cite: 2].

### FR-12 — Recurring Hostel Problems
If a problem recurs after resolution, the system shall create a new complaint containing a reference link to the `Original_Complaint_ID` rather than reopening the closed record[cite: 2].

### FR-13 — Laundry Facility Reservation
The system shall allow students to reserve available laundry facilities by selecting a washing machine, date, and time slot. The system shall display real-time available and booked slots, prevent overlapping reservations for the same machine, and allow students to cancel their own future reservations without affecting other bookings.

### FR-14 — Lost and Found Management & Verification
The system shall allow students to report lost or found items with mandatory details (item name, description, location, date, optional photo). The system shall display reported items in a searchable section, enable students to submit ownership claims, and allow the Warden to verify claims and mark items as `Returned` while masking student contact information from public view.

### FR-15 — Weekly Meal Menu Publishing
The system shall allow authorized Kitchen Staff to create, edit, and publish a weekly hostel meal menu (breakfast, lunch, dinner) per day. Students shall have read-only access to view the published menu by date. System changes to the menu shall be decoupled so that edits do not alter existing meal reservations or historical portion allocations.

---

## 8. Non-Functional Requirements

### NFR-01 — Privacy and Access Control
The system shall restrict students to viewing only their own schedules, responsibilities, and complaints. Cross-student data visibility is strictly prohibited[cite: 2].

### NFR-02 — Response Time (Formally Approved)
The system shall display complaint tracking views and schedule updates within a maximum response time of 2.0 seconds under standard operation[cite: 2].

### NFR-03 — Usability (Formally Approved)
At least 90% of first-time student users shall successfully submit a valid hostel complaint within 3 minutes without requiring external instruction[cite: 2].

### NFR-04 — Availability (Formally Approved)
The system shall maintain 99.0% operational availability on a monthly basis during operating term periods[cite: 2].

---

## 9. Business Rules and Constraints

### Business Rules
- **BR-01 — Complaint Identification:** Anonymous complaints are strictly prohibited; all complaints must be linked to an authenticated student ID[cite: 2].
- **BR-02 — Resolution Horizon:** Target complaint resolution timeframe is 24 hours from submission[cite: 2].
- **BR-03 — Automatic Escalation Trigger:** Complaints that remain unresolved after 24 elapsed hours become eligible for automatic escalation and transition to `Escalated` status assigned to the Manager at the first scheduled five-minute polling check after the threshold[cite: 2].
- **BR-04 — Privacy Boundary:** Student access is limited exclusively to self-owned records[cite: 2].
- **BR-05 — Direct Escalation Window:** Student direct escalation becomes eligible after 18 hours of warden inactivity. The eligibility is processed at the first scheduled five-minute polling check after the threshold; the student must still initiate the direct escalation[cite: 2].
- **BR-06 — Priority Oversight:** Warden holds authorization to adjust user-selected urgency flags[cite: 2].
- **BR-07 — Audit Immutability:** Resolved complaints are immutable; new reports must reference parent IDs[cite: 2].
- **BR-08 — Responsibility Privacy:** Non-completion tracking must not expose student schedule details[cite: 2].
- **BR-09 — Portion Discrepancy Logging:** Audit failures during meal verification must generate a logged discrepancy event[cite: 2].
- **BR-10 — Laundry Concurrency Lock:** Two students cannot reserve the exact same washing machine slot simultaneously. Reservation transactions must be atomic.
- **BR-11 — Lost & Found Privacy Boundary:** Private contact details of claimants and finders must never be exposed to other students; all claim verifications must be mediated strictly by the Warden.
- **BR-12 — Menu Immutability for Allocations:** Modifying a menu template does not retroactively alter existing meal reservation tickets or logged portion allocations.

### Constraints
- **CON-01 — Resolution Timeline:** Complaint escalation must respect the 18-hour manual and 24-hour automatic thresholds. Both thresholds are evaluated by the same five-minute polling worker and are processed at the first scheduled check after the relevant threshold has elapsed[cite: 2].
- **CON-02 — Access Governance:** Role-based access control must enforce single-owner privacy for all student data[cite: 2].
- **CON-03 — Operational Scoping:** System acts as a coordination tool and does not replace human staff duties[cite: 2].

---

## 10. Main User Flows / Scenarios

### Flow for FR-02 — Shared Responsibilities & Warden Assistance
**Trigger:** Roommates need to coordinate a duty or request assistance[cite: 2].  
**Actors:** Student, Roommate, Warden[cite: 2].  
1. Student logs shared responsibility[cite: 2].  
2. Roommates view duty in respective private dashboards[cite: 2].  
3. If dispute arises, student clicks "Request Warden Assistance"[cite: 2].  
4. System updates task status to `Assistance Requested` and notifies Warden[cite: 2].  
**Success:** Task recorded and assistance request dispatched to Warden[cite: 2].

### Flow for FR-07 — Submit Complaint
**Trigger:** Student encounters hostel facility issue[cite: 2].  
**Actor:** Student[cite: 2].  
1. Student opens submission form[cite: 2].  
2. Student inputs Category, Room Number, Description, and Urgency Flag[cite: 2].  
3. System validates mandatory fields[cite: 2].  
4. System creates record in `Pending` state and generates tracking confirmation[cite: 2].  
**Success:** Complaint recorded with initial status `Pending`[cite: 2].

### Flow for FR-10 — Direct Escalation (18-Hour Trigger)
**Trigger:** An active complaint reaches 18 hours since submission or the most recent recorded Warden action.
**Actors:** Student, Manager[cite: 2].  
1. The scheduled worker evaluates the complaint at five-minute intervals and marks it eligible at the first check after 18 hours of Warden inactivity have elapsed[cite: 2].  
2. System enables "Escalate to Manager" button on student tracking UI after eligibility is recorded[cite: 2].  
3. Student clicks button[cite: 2].  
4. System updates status to `Escalated` and assigns record to Manager queue[cite: 2].  
**Success:** Complaint directly escalated to Manager prior to automatic 24-hour sweep[cite: 2].

---

## 11. Acceptance Criteria

### AC-FR-02-02 — Warden Assistance Trigger
**Requirement:** FR-02[cite: 2]  
**Given** roommates require assistance with a shared responsibility, **when** a student selects "Request Warden Assistance", **then** the system updates the responsibility status to `Assistance Requested` and sends an in-app alert to the warden[cite: 2].

### AC-FR-05-01 — Meal Reservation System Receipt
**Requirement:** FR-05[cite: 2]  
**Given** a student submits a meal reservation for university commitments, **when** the request is sent, **then** the system routes the record to Kitchen Staff and generates a confirmation ticket for the student[cite: 2].

### AC-FR-06-02 — Portion Discrepancy Audit Logging
**Requirement:** FR-06, BR-09[cite: 2]  
**Given** the warden conducts a meal verification audit, **when** the warden flags a portion discrepancy, **then** the system creates a permanent `Portion Discrepancy Log` linked to kitchen staff logs[cite: 2].

### AC-FR-07-01 — Identified Complaint Validation
**Requirement:** FR-07, BR-01[cite: 2]  
**Given** a student fills out all mandatory fields (Category, Room, Description, Urgency), **when** submitted, **then** the system records the complaint as `Pending` and provides a tracking ID[cite: 2].

### AC-FR-10-01 — 18-Hour Manual Escalation
**Requirement:** FR-10, BR-05[cite: 2]  
**Given** a complaint has met the 18-hour Warden-inactivity condition and the next scheduled five-minute polling check has marked it eligible, **when** the student selects direct escalation, **then** the system updates status to `Escalated` and transfers it to the Manager queue[cite: 2].

### AC-FR-10-02 — Outcome Disagreement Linked Complaint
**Requirement:** FR-10, FR-12, BR-07[cite: 2]  
**Given** a student disagrees with a resolved outcome, **when** they submit a follow-up complaint, **then** the system creates a new `Pending` complaint containing a mandatory reference to `Original_Complaint_ID`[cite: 2].

### AC-FR-11-01 — Automatic Escalation at First Eligible Poll
**Requirement:** FR-11, BR-03, CON-01

**Given** a complaint remains unresolved after 24 elapsed hours, **when** the next scheduled five-minute worker polling check evaluates it, **then** the complaint is automatically transitioned to `Escalated` and assigned to the Manager. The worker must not require execution at the exact 24-hour timestamp, and repeated polling must not create duplicate escalation actions.
