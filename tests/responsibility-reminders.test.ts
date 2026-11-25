import assert from "node:assert/strict";
import test from "node:test";
import { planResponsibilityReminders } from "../src/business/modules/schedules/responsibility-service.ts";

const dueAt = new Date("2026-11-27T12:00:00Z");
const candidate = {
  id: "10000000-0000-4000-8000-000000000001",
  reminderVersion: 1,
  reminderEligibleAt: new Date("2026-11-25T11:00:00Z"),
  responsibility: { dueAt },
};

test("responsibility reminders cross the approved 24-hour and 1-hour thresholds once per assignment version", () => {
  assert.deepEqual(planResponsibilityReminders([candidate], new Date("2026-11-26T11:59:59Z")), []);
  const first = planResponsibilityReminders([candidate], new Date("2026-11-26T12:00:00Z"));
  assert.equal(first.length, 1);
  assert.equal(first[0].scheduledFor.toISOString(), "2026-11-26T12:00:00.000Z");
  const second = planResponsibilityReminders([candidate], new Date("2026-11-27T11:00:00Z"));
  assert.equal(second.length, 2);
  assert.equal(second[0].idempotencyKey, first[0].idempotencyKey);
  assert.notEqual(second[0].idempotencyKey, second[1].idempotencyKey);
  const revised = planResponsibilityReminders([{ ...candidate, reminderVersion: 2 }], new Date("2026-11-27T11:00:00Z"));
  assert.notEqual(revised[1].idempotencyKey, second[1].idempotencyKey);
});

test("late agreement skips thresholds that already passed and expired duties are excluded", () => {
  const late = { ...candidate, reminderEligibleAt: new Date("2026-11-26T14:00:00Z") };
  const jobs = planResponsibilityReminders([late], new Date("2026-11-27T11:05:00Z"));
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].scheduledFor.toISOString(), "2026-11-27T11:00:00.000Z");
  assert.deepEqual(planResponsibilityReminders([candidate], dueAt), []);
});
