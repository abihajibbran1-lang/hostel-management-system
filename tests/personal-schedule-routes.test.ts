import assert from "node:assert/strict";
import test from "node:test";
import { UserRole, type PersonalSchedule } from "@prisma/client";
import { ZodError } from "zod";

import type { PersonalScheduleService } from "../src/business/modules/schedules/personal-schedule-service.ts";
import {
  createPersonalScheduleCreateHandler,
  createPersonalScheduleListHandler,
} from "../src/app/api/schedules/schedule-collection-handler.ts";
import {
  createPersonalScheduleGetHandler,
  createPersonalScheduleUpdateHandler,
} from "../src/app/api/schedules/[id]/schedule-item-handler.ts";

const userA = "2f8855bb-05bb-4f8e-aee1-7c6cab541748";
const userB = "9cf1f1b8-89a3-49d3-9e1d-e1e5c9b938f1";
const scheduleId = "a4d1490a-bfe8-4a5f-bb5e-6a8fc9b8e0a1";

function createSchedule(overrides: Partial<PersonalSchedule> = {}): PersonalSchedule {
  return {
    id: scheduleId,
    userId: userA,
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

function request(
  path: string,
  options: {
    method?: string;
    userId?: string;
    role?: string;
    body?: unknown;
    origin?: string;
  } = {},
) {
  const { method = "GET", userId = userA, role = UserRole.STUDENT, body, origin } = options;
  return new Request(`https://hostel.example.test${path}`, {
    method,
    headers: {
      ...(userId ? { "x-auth-user-id": userId } : {}),
      ...(role ? { "x-auth-role": role } : {}),
      ...(origin ? { origin } : {}),
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

const routeContext = { params: Promise.resolve({ id: scheduleId }) };
const validBody = {
  title: "Study session",
  description: "Review notes",
  startAt: "2026-02-01T04:00:00.000Z",
  endAt: "2026-02-01T05:00:00.000Z",
};

test("lists only the verified student's schedules for a selected day", async () => {
  let receivedUserId: string | undefined;
  let receivedDate: string | undefined;
  const handler = createPersonalScheduleListHandler({
    listForDate: async (ownerId, date) => {
      receivedUserId = ownerId;
      receivedDate = date;
      return [createSchedule()];
    },
    create: async () => createSchedule(),
  } as Pick<PersonalScheduleService, "listForDate" | "create">);

  const response = await handler(request("/api/schedules?date=2026-02-01"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(receivedUserId, userA);
  assert.equal(receivedDate, "2026-02-01");
  assert.equal(body.data.schedules[0].title, "Study session");
  assert.equal("userId" in body.data.schedules[0], false);
  assert.equal("recurrenceRule" in body.data.schedules[0], false);
});

test("rejects unauthenticated, non-Student, and invalid date list requests before service calls", async () => {
  let calls = 0;
  const handler = createPersonalScheduleListHandler({
    listForDate: async () => {
      calls += 1;
      return [];
    },
    create: async () => createSchedule(),
  } as Pick<PersonalScheduleService, "listForDate" | "create">);

  const unauthenticated = await handler(request("/api/schedules?date=2026-02-01", { userId: "" }));
  const wrongRole = await handler(
    request("/api/schedules?date=2026-02-01", { role: UserRole.WARDEN }),
  );
  const invalidDate = await handler(request("/api/schedules?date=2026-02-29"));

  assert.equal(unauthenticated.status, 401);
  assert.equal(wrongRole.status, 403);
  assert.equal(invalidDate.status, 400);
  assert.equal(calls, 0);
});

test("creates a schedule using authenticated ownership and rejects forged user IDs", async () => {
  let receivedUserId: string | undefined;
  const handler = createPersonalScheduleCreateHandler({
    create: async (ownerId) => {
      receivedUserId = ownerId;
      return createSchedule();
    },
    listForDate: async () => [],
  } as Pick<PersonalScheduleService, "create" | "listForDate">);

  const created = await handler(
    request("/api/schedules", {
      method: "POST",
      origin: "https://hostel.example.test",
      body: validBody,
    }),
  );
  const forgedOwner = await handler(
    request("/api/schedules", {
      method: "POST",
      origin: "https://hostel.example.test",
      body: { ...validBody, userId: userB },
    }),
  );

  assert.equal(created.status, 201);
  assert.equal(receivedUserId, userA);
  assert.equal(forgedOwner.status, 400);
});

test("rejects cross-origin and missing-Origin schedule creation", async () => {
  let calls = 0;
  const handler = createPersonalScheduleCreateHandler({
    create: async () => {
      calls += 1;
      return createSchedule();
    },
    listForDate: async () => [],
  } as Pick<PersonalScheduleService, "create" | "listForDate">);

  const crossOrigin = await handler(
    request("/api/schedules", {
      method: "POST",
      origin: "https://attacker.example.test",
      body: validBody,
    }),
  );
  const missingOrigin = await handler(
    request("/api/schedules", { method: "POST", body: validBody }),
  );

  assert.equal(crossOrigin.status, 403);
  assert.equal(missingOrigin.status, 403);
  assert.equal(calls, 0);
});

test("returns the same generic 404 for missing and non-owned schedule IDs", async () => {
  let ownerSeen: string | undefined;
  const handler = createPersonalScheduleGetHandler({
    getOwned: async (ownerId) => {
      ownerSeen = ownerId;
      return null;
    },
    updateOwned: async () => null,
  } as Pick<PersonalScheduleService, "getOwned" | "updateOwned">);

  const missing = await handler(request(`/api/schedules/${scheduleId}`), routeContext);
  const otherOwner = await handler(
    request(`/api/schedules/${scheduleId}`, { userId: userB }),
    routeContext,
  );

  assert.equal(ownerSeen, userB);
  assert.equal(missing.status, 404);
  assert.equal(otherOwner.status, 404);
  const missingBody = await missing.json();
  const otherOwnerBody = await otherOwner.json();
  assert.deepEqual(missingBody, otherOwnerBody);
  assert.deepEqual(missingBody, {
    error: { code: "NOT_FOUND", message: "Resource not found." },
  });
});

test("returns an owned schedule and updates only the requested owner's activity", async () => {
  let getOwner: string | undefined;
  let patchArgs: unknown;
  const updated = createSchedule({ title: "Updated study session" });
  const getHandler = createPersonalScheduleGetHandler({
    getOwned: async (ownerId) => {
      getOwner = ownerId;
      return createSchedule();
    },
    updateOwned: async () => null,
  });
  const patchHandler = createPersonalScheduleUpdateHandler({
    getOwned: async () => createSchedule(),
    updateOwned: async (ownerId, id, input) => {
      patchArgs = { ownerId, id, input };
      return updated;
    },
  });

  const fetched = await getHandler(request(`/api/schedules/${scheduleId}`), routeContext);
  const patched = await patchHandler(
    request(`/api/schedules/${scheduleId}`, {
      method: "PATCH",
      origin: "https://hostel.example.test",
      body: { title: "Updated study session" },
    }),
    routeContext,
  );
  const fetchedBody = await fetched.json();
  const patchedBody = await patched.json();

  assert.equal(fetched.status, 200);
  assert.equal(getOwner, userA);
  assert.equal(fetchedBody.data.schedule.title, "Study session");
  assert.equal("userId" in fetchedBody.data.schedule, false);
  assert.equal(patched.status, 200);
  assert.equal(patchedBody.data.schedule.title, "Updated study session");
  assert.deepEqual(patchArgs, {
    ownerId: userA,
    id: scheduleId,
    input: { title: "Updated study session" },
  });
});

test("validates PATCH shape, origin, and the service's merged interval errors", async () => {
  let calls = 0;
  const handler = createPersonalScheduleUpdateHandler({
    updateOwned: async () => {
      calls += 1;
      throw new ZodError([
        {
          code: "custom",
          message: "End time must be later than start time.",
          path: ["endAt"],
        },
      ]);
    },
    getOwned: async () => createSchedule(),
  } as Pick<PersonalScheduleService, "getOwned" | "updateOwned">);

  const invalidMergedInterval = await handler(
    request(`/api/schedules/${scheduleId}`, {
      method: "PATCH",
      origin: "https://hostel.example.test",
      body: { startAt: "2026-02-01T06:00:00.000Z" },
    }),
    routeContext,
  );
  const emptyUpdate = await handler(
    request(`/api/schedules/${scheduleId}`, {
      method: "PATCH",
      origin: "https://hostel.example.test",
      body: {},
    }),
    routeContext,
  );
  const crossOrigin = await handler(
    request(`/api/schedules/${scheduleId}`, {
      method: "PATCH",
      origin: "https://attacker.example.test",
      body: { title: "Changed" },
    }),
    routeContext,
  );

  assert.equal(invalidMergedInterval.status, 400);
  assert.equal(emptyUpdate.status, 400);
  assert.equal(crossOrigin.status, 403);
  assert.equal(calls, 1);
});

test("returns 404 for a non-owned PATCH and never updates another student's record", async () => {
  let ownerSeen: string | undefined;
  const handler = createPersonalScheduleUpdateHandler({
    updateOwned: async (ownerId) => {
      ownerSeen = ownerId;
      return null;
    },
    getOwned: async () => null,
  } as Pick<PersonalScheduleService, "getOwned" | "updateOwned">);

  const response = await handler(
    request(`/api/schedules/${scheduleId}`, {
      method: "PATCH",
      userId: userB,
      origin: "https://hostel.example.test",
      body: { title: "Attempted change" },
    }),
    routeContext,
  );

  assert.equal(response.status, 404);
  assert.equal(ownerSeen, userB);
});
