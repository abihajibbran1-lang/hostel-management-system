import assert from "node:assert/strict";
import test from "node:test";
import type { PersonalSchedule } from "@prisma/client";
import { ZodError } from "zod";

import { PersonalScheduleService } from "../src/business/modules/schedules/personal-schedule-service.ts";

const userId = "2f8855bb-05bb-4f8e-aee1-7c6cab541748";
const scheduleId = "a4d1490a-bfe8-4a5f-bb5e-6a8fc9b8e0a1";

function createSchedule(overrides: Partial<PersonalSchedule> = {}): PersonalSchedule {
  return {
    id: scheduleId,
    userId,
    title: "Study session",
    description: null,
    startAt: new Date("2026-02-01T04:00:00.000Z"),
    endAt: new Date("2026-02-01T05:00:00.000Z"),
    recurrenceRule: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

test("creates the schedule with a server-supplied owner and UTC instants", async () => {
  let received: unknown;
  const record = createSchedule();
  const service = new PersonalScheduleService({
    create: async (ownerId, input) => {
      received = { ownerId, input };
      return record;
    },
    listIntersectingDay: async () => [],
    findOwned: async () => null,
    updateOwned: async () => null,
  });

  const created = await service.create(userId, {
    title: "Study session",
    description: null,
    startAt: "2026-02-01T04:00:00.000Z",
    endAt: "2026-02-01T05:00:00.000Z",
  });

  assert.equal(created, record);
  assert.deepEqual(received, {
    ownerId: userId,
    input: {
      title: "Study session",
      description: null,
      startAt: new Date("2026-02-01T04:00:00.000Z"),
      endAt: new Date("2026-02-01T05:00:00.000Z"),
    },
  });
});

test("rejects invalid create intervals and invalid dates before calling the repository", async () => {
  let createCalls = 0;
  const service = new PersonalScheduleService({
    create: async () => {
      createCalls += 1;
      return createSchedule();
    },
    listIntersectingDay: async () => [],
    findOwned: async () => null,
    updateOwned: async () => null,
  });
  const validInput = {
    title: "Study session",
    startAt: "2026-02-01T04:00:00.000Z",
    endAt: "2026-02-01T05:00:00.000Z",
  };

  for (const input of [
    { ...validInput, endAt: validInput.startAt },
    { ...validInput, endAt: "2026-02-01T03:59:59.999Z" },
    { ...validInput, startAt: "not-a-date" },
  ]) {
    await assert.rejects(
      service.create(userId, input),
      (error: unknown) => error instanceof ZodError,
    );
  }

  assert.equal(createCalls, 0);
});

test("uses Karachi-local day bounds for lists and accepts overlapping activities", async () => {
  let receivedBounds: [Date, Date] | undefined;
  const service = new PersonalScheduleService({
    listIntersectingDay: async (_ownerId, startAt, endAt) => {
      receivedBounds = [startAt, endAt];
      return [createSchedule()];
    },
    create: async () => createSchedule(),
    findOwned: async () => null,
    updateOwned: async () => null,
  });

  const listed = await service.listForDate(userId, "2026-02-01");
  assert.equal(listed.length, 1);
  assert.deepEqual(receivedBounds, [
    new Date("2026-01-31T19:00:00.000Z"),
    new Date("2026-02-01T19:00:00.000Z"),
  ]);

  const overlapping = await service.create(userId, {
    title: "Another activity at the same time",
    startAt: "2026-02-01T04:30:00.000Z",
    endAt: "2026-02-01T05:30:00.000Z",
  });
  assert.equal(overlapping.title, "Study session");
});

test("PATCH validates merged start and end values before any write", async () => {
  const existing = createSchedule();
  let updates = 0;
  const service = new PersonalScheduleService({
    findOwned: async () => existing,
    updateOwned: async () => {
      updates += 1;
      return existing;
    },
    create: async () => existing,
    listIntersectingDay: async () => [],
  });

  await assert.rejects(
    service.updateOwned(userId, scheduleId, { startAt: "2026-02-01T05:00:00.000Z" }),
    (error: unknown) => error instanceof ZodError,
  );
  await assert.rejects(
    service.updateOwned(userId, scheduleId, { endAt: "2026-02-01T03:59:59.999Z" }),
    (error: unknown) => error instanceof ZodError,
  );
  assert.equal(updates, 0);
});

test("PATCH validates the final range when both values change and accepts a valid update", async () => {
  const existing = createSchedule();
  let receivedUpdate: unknown;
  const service = new PersonalScheduleService({
    findOwned: async () => existing,
    updateOwned: async (_ownerId, _id, input) => {
      receivedUpdate = input;
      return createSchedule({
        startAt: input.startAt ?? existing.startAt,
        endAt: input.endAt ?? existing.endAt,
      });
    },
    create: async () => existing,
    listIntersectingDay: async () => [],
  });

  const updated = await service.updateOwned(userId, scheduleId, {
    startAt: "2026-02-01T06:00:00.000Z",
    endAt: "2026-02-01T07:00:00.000Z",
  });

  assert.equal(updated?.startAt.toISOString(), "2026-02-01T06:00:00.000Z");
  assert.deepEqual(receivedUpdate, {
    startAt: new Date("2026-02-01T06:00:00.000Z"),
    endAt: new Date("2026-02-01T07:00:00.000Z"),
  });
});

test("returns null without writing when the current student does not own the record", async () => {
  let updates = 0;
  const service = new PersonalScheduleService({
    findOwned: async () => null,
    updateOwned: async () => {
      updates += 1;
      return null;
    },
    create: async () => createSchedule(),
    listIntersectingDay: async () => [],
  });

  assert.equal(await service.updateOwned(userId, scheduleId, { title: "Changed" }), null);
  assert.equal(updates, 0);
});

test("rejects a one-sided time update if the persisted interval changed during the request", async () => {
  let lookups = 0;
  const initial = createSchedule({
    endAt: new Date("2026-02-01T06:00:00.000Z"),
  });
  const changedConcurrently = createSchedule({
    endAt: new Date("2026-02-01T05:30:00.000Z"),
  });
  const service = new PersonalScheduleService({
    findOwned: async () => {
      lookups += 1;
      return lookups === 1 ? initial : changedConcurrently;
    },
    updateOwned: async () => null,
    create: async () => initial,
    listIntersectingDay: async () => [],
  });

  await assert.rejects(
    service.updateOwned(userId, scheduleId, { startAt: "2026-02-01T05:45:00.000Z" }),
    (error: unknown) => error instanceof ZodError,
  );
});
