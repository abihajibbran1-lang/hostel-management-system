# Slice test evidence

Record the checks that support each slice's acceptance criteria. Add a result after running the check.

| Slice / Requirement | Test Type | Input / Condition | Expected Result | Actual Result | Pass / Fail |
|---|---|---|---|---|---|
| S09 / AC09-01, FR-15 | PostgreSQL integration | Empty draft, then 21 valid slots across a year boundary | Reject incomplete publish. Publish the complete week. | Incomplete publish returned 400. Complete publish returned 200 and retained all 21 rows. | Pass |
| S09 / AC09-02, NFR-01 | API authorization and PostgreSQL integration | Student reads a draft date and calls Kitchen Staff endpoints | Draft entries stay hidden. Kitchen endpoints deny Student access. | Date view returned no draft items. Kitchen requests returned 403. A published date returned exactly its three meals. | Pass |
| S09 / AC09-03 | Contract and PostgreSQL integration | Invalid date, meal type, blank name, duplicate slot, outside-week edit, and overlapping creates for one week | Reject invalid input and persist only one template per week. | Validation cases were rejected. Competing creates returned 201 and 409 with one row stored. | Pass |
| S09 / AC09-04 | PostgreSQL integration | Force the second item write to fail during a draft or published batch save | Roll back the whole batch. | Both requests returned 500. The draft kept zero items and the published menu kept its previous entries. | Pass |
| S09 / AC09-05, BR-12, ADR-004 | PostgreSQL integration | Another Kitchen Staff user edits a published slot | Student sees the new name immediately. Original item IDs and creator stay stable. | Student read returned the edited name with the same item IDs. The shared menu retained its original creator. | Pass |
| S09 / AC09-05, BR-12, ADR-004 | Cross-slice regression | Edit a menu referenced by an S10 ticket and S11 portion log | Existing ticket and log snapshots stay unchanged. | S10 and S11 are not implemented. | Pending |
| S09 / AC09-01, AC09-02, FR-15 | Browser end to end | Kitchen Staff signs in, saves a draft, fills 21 slots, publishes, then edits breakfast. Student signs in separately. | Student sees no draft or edit controls, then three meals and the changed breakfast after refresh. | Chrome verified the full workflow against the production build and disposable local database. | Pass |
