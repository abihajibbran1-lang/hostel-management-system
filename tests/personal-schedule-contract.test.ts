import assert from "node:assert/strict";
import test from "node:test";

import {
  createPersonalScheduleSchema,
  listPersonalSchedulesQuerySchema,
  updatePersonalScheduleSchema,
} from "../src/business/modules/schedules/personal-schedule-contract.ts";

const validSchedule = {
  title: "Study session",
  description: "Review notes",
  startAt: "2026-02-01T04:00:00.000Z",
  endAt: "2026-02-01T05:00:00.000Z",
};

test("accepts a trimmed title, optional description, and valid ISO timestamps", () => {
  const result = createPersonalScheduleSchema.parse({ ...validSchedule, title: "  Study session  " });

  assert.equal(result.title, "Study session");
  assert.equal(result.startAt, validSchedule.startAt);
});

test("rejects blank titles, malformed timestamps, unknown ownership, and recurrence inputs", () => {
  assert.equal(createPersonalScheduleSchema.safeParse({ ...validSchedule, title: "   " }).success, false);
  assert.equal(createPersonalScheduleSchema.safeParse({ ...validSchedule, startAt: "not-a-date" }).success, false);
  assert.equal(createPersonalScheduleSchema.safeParse({ ...validSchedule, userId: "attacker" }).success, false);
  assert.equal(createPersonalScheduleSchema.safeParse({ ...validSchedule, recurrenceRule: "daily" }).success, false);
});

test("rejects equal or reversed start and end instants, including an exact-zero boundary", () => {
  for (const endAt of [validSchedule.startAt, "2026-02-01T03:59:59.999Z"]) {
    assert.equal(createPersonalScheduleSchema.safeParse({ ...validSchedule, endAt }).success, false);
  }
});

test("accepts a positive one-millisecond interval at the lower duration boundary", () => {
  const result = createPersonalScheduleSchema.safeParse({
    ...validSchedule,
    startAt: "2026-02-01T04:00:00.000Z",
    endAt: "2026-02-01T04:00:00.001Z",
  });

  assert.equal(result.success, true);
});

test("PATCH requires at least one recognized update field and rejects ownership changes", () => {
  assert.equal(updatePersonalScheduleSchema.safeParse({}).success, false);
  assert.equal(updatePersonalScheduleSchema.safeParse({ title: "  New title " }).success, true);
  assert.equal(updatePersonalScheduleSchema.safeParse({ userId: "attacker" }).success, false);
  assert.equal(updatePersonalScheduleSchema.safeParse({ recurrenceRule: "daily" }).success, false);
});

test("accepts leap day and rejects invalid calendar dates for day listing", () => {
  assert.equal(listPersonalSchedulesQuerySchema.safeParse({ date: "2024-02-29" }).success, true);
  assert.equal(listPersonalSchedulesQuerySchema.safeParse({ date: "2026-02-29" }).success, false);
  assert.equal(listPersonalSchedulesQuerySchema.safeParse({ date: "2026-13-01" }).success, false);
  assert.equal(listPersonalSchedulesQuerySchema.safeParse({ date: "2026-2-01" }).success, false);
});
