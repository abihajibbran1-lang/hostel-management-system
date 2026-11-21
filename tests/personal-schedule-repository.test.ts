import assert from "node:assert/strict";
import test from "node:test";
import type { PersonalSchedule, PrismaClient } from "@prisma/client";

import { PersonalScheduleRepository } from "../src/data/repositories/schedules/personal-schedule-repository.ts";

const userId = "2f8855bb-05bb-4f8e-aee1-7c6cab541748";
const otherUserId = "9cf1f1b8-89a3-49d3-9e1d-e1e5c9b938f1";
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

function createRepository(personalSchedule: Record<string, unknown>) {
  return new PersonalScheduleRepository({
    personalSchedule,
  } as unknown as Pick<PrismaClient, "personalSchedule">);
}

test("creates an owner-linked schedule and does not accept ownership through schedule fields", async () => {
  let received: unknown;
  const record = createSchedule();
  const repository = createRepository({
    create: async ({ data }: { data: unknown }) => {
      received = data;
      return record;
    },
  });

  const result = await repository.create(userId, {
    title: record.title,
    description: record.description,
    startAt: record.startAt,
    endAt: record.endAt,
  });

  assert.equal(result, record);
  assert.deepEqual(received, {
    title: record.title,
    description: record.description,
    startAt: record.startAt,
    endAt: record.endAt,
    userId,
  });
});

test("lists only owner schedules overlapping the selected day, ordered by start time", async () => {
  const records = [createSchedule()];
  let received: unknown;
  const repository = createRepository({
    findMany: async (args: unknown) => {
      received = args;
      return records;
    },
  });
  const startAt = new Date("2026-01-31T19:00:00.000Z");
  const endAt = new Date("2026-02-01T19:00:00.000Z");

  assert.deepEqual(await repository.listIntersectingDay(userId, startAt, endAt), records);
  assert.deepEqual(received, {
    where: { userId, startAt: { lt: endAt }, endAt: { gt: startAt } },
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
  });
});

test("gets and updates records with both schedule ID and owner ID in the query", async () => {
  let findArgs: unknown;
  let updateArgs: unknown;
  const updated = createSchedule({ title: "Updated study session" });
  let lookupCount = 0;
  const repository = createRepository({
    findFirst: async (args: unknown) => {
      findArgs = args;
      lookupCount += 1;
      return lookupCount === 1 ? createSchedule() : updated;
    },
    updateMany: async (args: unknown) => {
      updateArgs = args;
      return { count: 1 };
    },
  });

  assert.equal((await repository.findOwned(otherUserId, scheduleId))?.userId, userId);
  assert.deepEqual(findArgs, { where: { id: scheduleId, userId: otherUserId } });

  const result = await repository.updateOwned(userId, scheduleId, { title: updated.title });
  assert.equal(result, updated);
  assert.deepEqual(updateArgs, {
    where: { id: scheduleId, userId },
    data: { title: updated.title },
  });
  assert.deepEqual(findArgs, { where: { id: scheduleId, userId } });
});

test("returns the same null result for a missing or non-owned update", async () => {
  const repository = createRepository({
    updateMany: async () => ({ count: 0 }),
  });

  assert.equal(await repository.updateOwned(otherUserId, scheduleId, { title: "Changed" }), null);
});

test("uses an atomic interval predicate for one-sided time updates", async () => {
  const received: unknown[] = [];
  const repository = createRepository({
    updateMany: async (args: unknown) => {
      received.push(args);
      return { count: 0 };
    },
  });

  await repository.updateOwned(userId, scheduleId, {
    startAt: new Date("2026-02-01T06:00:00.000Z"),
  });
  await repository.updateOwned(userId, scheduleId, {
    endAt: new Date("2026-02-01T03:00:00.000Z"),
  });

  assert.deepEqual(received, [
    {
      where: {
        id: scheduleId,
        userId,
        endAt: { gt: new Date("2026-02-01T06:00:00.000Z") },
      },
      data: { startAt: new Date("2026-02-01T06:00:00.000Z") },
    },
    {
      where: {
        id: scheduleId,
        userId,
        startAt: { lt: new Date("2026-02-01T03:00:00.000Z") },
      },
      data: { endAt: new Date("2026-02-01T03:00:00.000Z") },
    },
  ]);
});
