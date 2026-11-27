import assert from "node:assert/strict";
import test from "node:test";
import { escalationSchedule, followUpSchema } from "../src/business/modules/complaints/escalation-service.ts";
import { toStudentComplaintResponse, toComplaintResponse } from "../src/business/modules/complaints/complaint-response.ts";
import { managerComplaints } from "../src/app/api/manager/complaints/handlers.ts";
import { studentEscalation } from "../src/app/api/complaints/[id]/escalation-handlers.ts";

const id = "10000000-0000-4000-8000-000000000001";
const submittedAt = new Date("2026-11-27T00:00:00Z");

test("recorded Warden activity resets 18h eligibility but never the submission-based 24h deadline", () => {
  const action = { id, changedAt: new Date("2026-11-27T17:59:00Z") };
  assert.equal(escalationSchedule({ submittedAt, statusHistory: [] }, true).scheduledFor.toISOString(), "2026-11-27T18:00:00.000Z");
  assert.deepEqual(escalationSchedule({ submittedAt, statusHistory: [action] }, true), {
    version: id, scheduledFor: new Date("2026-11-28T11:59:00Z"),
  });
  assert.equal(escalationSchedule({ submittedAt, statusHistory: [action] }, false).scheduledFor.toISOString(), "2026-11-28T00:00:00.000Z");
});

test("only disagreement accepts a nonblank reason and client routing fields are rejected", () => {
  const fields = { category: "Water", roomNumber: "A1", description: "A leak", urgencyFlag: false };
  assert.ok(followUpSchema.safeParse({ ...fields, kind: "recurrence" }).success);
  assert.ok(!followUpSchema.safeParse({ ...fields, kind: "recurrence", reason: "Disagree" }).success);
  assert.ok(!followUpSchema.safeParse({ ...fields, kind: "disagreement", reason: "  " }).success);
  assert.ok(followUpSchema.safeParse({ ...fields, kind: "disagreement", reason: "Still leaking" }).success);
  assert.ok(!followUpSchema.safeParse({ ...fields, kind: "disagreement", reason: "Still leaking", assignedManagerId: id }).success);
});

test("only active disagreement follow-ups get an immediate student action without a worker unlock", () => {
  const record = {
    id, submittedBy: id, originalComplaintId: id, category: "Water", roomNumber: "A1",
    description: "Leak", urgencyFlag: false, status: "Pending", outcome: null,
    submittedAt, createdAt: submittedAt, updatedAt: submittedAt,
  };
  assert.equal(toStudentComplaintResponse(record).canEscalate, undefined);
  assert.equal(toStudentComplaintResponse({ ...record, disagreementReason: "Leak persists" }).canEscalate, true);
  assert.equal(toStudentComplaintResponse({ ...record, disagreementReason: "Leak persists", status: "Escalated" }).canEscalate, undefined);
  assert.ok(!("originalComplaintId" in toComplaintResponse(record)));
});

test("Manager queue rejects Students and escalation writes reject cross-origin requests", async () => {
  const headers = { "x-auth-user-id": id, "x-auth-role": "STUDENT", origin: "https://unrelated.example" };
  assert.equal((await managerComplaints(new Request("http://localhost/api/manager/complaints", { headers }))).status, 403);
  assert.equal((await studentEscalation(new Request(`http://localhost/api/complaints/${id}/escalate`, {
    headers, method: "POST",
  }), { params: Promise.resolve({ id }) })).status, 403);
});
