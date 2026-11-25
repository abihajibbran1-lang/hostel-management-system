import { UserRole } from "@prisma/client";
import assert from "node:assert/strict";
import test from "node:test";
import { NextResponse } from "next/server.js";

import type { AuthenticatedIdentity } from "../src/business/modules/auth/jwt-service.ts";
import {
  WardenComplaintService,
  type WardenComplaintStore,
} from "../src/business/modules/complaints/warden-complaint-service.ts";
import type { ComplaintRecord } from "../src/data/repositories/complaints/complaint-repository.ts";

const complaintId = "a4d1490a-bfe8-4a5f-bb5e-6a8fc9b8e0a1";
const wardenId = "c4f2a5c9-7a6b-4e0d-9f31-2a8b5c6d7e90";
const now = new Date("2026-11-24T12:00:00.000Z");

const warden: AuthenticatedIdentity = { userId: wardenId, role: UserRole.WARDEN };
const student: AuthenticatedIdentity = {
  userId: "2f8855bb-05bb-4f8e-aee1-7c6cab541748",
  role: UserRole.STUDENT,
};

function makeRecord(overrides: Partial<ComplaintRecord> = {}): ComplaintRecord {
  return {
    id: complaintId,
    submittedBy: student.userId,
    category: "Water",
    roomNumber: "A-12",
    description: "Leaking tap",
    urgencyFlag: true,
    status: "Pending",
    outcome: null,
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createStore(overrides: Partial<WardenComplaintStore> = {}): WardenComplaintStore {
  return {
    listForWarden: async () => ({ complaints: [] }),
    findForWarden: async () => makeRecord(),
    transitionToInProgress: async () => makeRecord({ status: "In Progress" }),
    resolveComplaint: async (_id, _actor, outcome) => makeRecord({ status: "Resolved", outcome }),
    correctUrgency: async (_id, _actor, urgencyFlag) => makeRecord({ urgencyFlag }),
    ...overrides,
  };
}

function isResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

test("list validates queue filters and returns the repository page for a Warden", async () => {
  let receivedQuery: unknown;
  const service = makeService(
    createStore({
      listForWarden: async (query) => {
        receivedQuery = query;
        return { complaints: [makeRecord()] };
      },
    }),
  );

  const result = await service.list(warden, {
    status: "In Progress",
    urgencyFlag: "false",
    limit: "5",
  });

  assert.equal(isResponse(result), false);
  assert.deepEqual(receivedQuery, {
    status: "In Progress",
    urgencyFlag: false,
    limit: 5,
  });
});

test("list rejects unauthenticated, non-Warden and invalid query requests", async () => {
  let calls = 0;
  const service = makeService(
    createStore({
      listForWarden: async () => {
        calls += 1;
        return { complaints: [] };
      },
    }),
  );

  const unauthenticated = await service.list(null, {});
  const wrongRole = await service.list(student, {});
  const invalidQuery = await service.list(warden, { status: "Closed" });

  assert.equal(isResponse(unauthenticated), true);
  if (isResponse(unauthenticated)) assert.equal(unauthenticated.status, 401);
  assert.equal(isResponse(wrongRole), true);
  if (isResponse(wrongRole)) assert.equal(wrongRole.status, 403);
  assert.equal(isResponse(invalidQuery), true);
  if (isResponse(invalidQuery)) assert.equal(invalidQuery.status, 400);
  assert.equal(calls, 0);
});

test("get validates the ID, returns records, and maps missing IDs to 404", async () => {
  const requestedIds: string[] = [];
  const service = makeService(
    createStore({
      findForWarden: async (id) => {
        requestedIds.push(id);
        return id === complaintId ? makeRecord() : null;
      },
    }),
  );

  const found = await service.get(warden, complaintId);
  const missing = await service.get(warden, "9cf1f1b8-89a3-49d3-9e1d-e1e5c9b938f1");
  const invalid = await service.get(warden, "not-a-uuid");

  assert.equal(isResponse(found), false);
  assert.deepEqual(requestedIds, [complaintId, "9cf1f1b8-89a3-49d3-9e1d-e1e5c9b938f1"]);
  assert.equal(isResponse(missing), true);
  if (isResponse(missing)) assert.equal(missing.status, 404);
  assert.equal(isResponse(invalid), true);
  if (isResponse(invalid)) assert.equal(invalid.status, 400);
});

test("start uses verified actor and server time for Pending complaints", async () => {
  let startedBy: string | undefined;
  let startedAt: Date | undefined;
  const service = makeService(
    createStore({
      transitionToInProgress: async (id, actorUserId, changedAt) => {
        startedBy = actorUserId;
        startedAt = changedAt;
        return makeRecord({ status: "In Progress" });
      },
    }),
    () => now,
  );

  const result = await service.start(warden, complaintId);

  assert.equal(isResponse(result), false);
  assert.equal(startedBy, wardenId);
  assert.deepEqual(startedAt, now);
});

test("start rejects invalid states and missing complaints", async () => {
  const resolvedService = makeService(
    createStore({ findForWarden: async () => makeRecord({ status: "Resolved" }) }),
  );
  const missingService = makeService(
    createStore({ findForWarden: async () => null }),
  );

  const invalid = await resolvedService.start(warden, complaintId);
  const missing = await missingService.start(warden, complaintId);

  assert.equal(isResponse(invalid), true);
  if (isResponse(invalid)) assert.equal(invalid.status, 400);
  assert.equal(isResponse(missing), true);
  if (isResponse(missing)) assert.equal(missing.status, 404);
});

test("start maps a conditional update failure to a validation error", async () => {
  const service = makeService(
    createStore({ transitionToInProgress: async () => null }),
  );

  const result = await service.start(warden, complaintId);

  assert.equal(isResponse(result), true);
  if (isResponse(result)) assert.equal(result.status, 400);
});

test("resolve validates outcome, uses server time, and stores the trimmed outcome", async () => {
  let resolvedBy: string | undefined;
  let resolvedAt: Date | undefined;
  let storedOutcome: string | undefined;
  const service = makeService(
    createStore({
      findForWarden: async () => makeRecord({ status: "In Progress" }),
      resolveComplaint: async (_id, actorUserId, outcome, changedAt) => {
        resolvedBy = actorUserId;
        storedOutcome = outcome;
        resolvedAt = changedAt;
        return makeRecord({ status: "Resolved", outcome });
      },
    }),
    () => now,
  );

  const result = await service.resolve(warden, complaintId, { outcome: "  Tap repaired.  " });

  assert.equal(isResponse(result), false);
  assert.equal(resolvedBy, wardenId);
  assert.deepEqual(resolvedAt, now);
  assert.equal(storedOutcome, "Tap repaired.");
});

test("resolve rejects blank outcomes and invalid states", async () => {
  let calls = 0;
  const service = makeService(
    createStore({
      findForWarden: async () => makeRecord({ status: "In Progress" }),
      resolveComplaint: async () => {
        calls += 1;
        return makeRecord({ status: "Resolved" });
      },
    }),
  );

  const blank = await service.resolve(warden, complaintId, { outcome: "   " });
  const pendingService = makeService(
    createStore({ findForWarden: async () => makeRecord() }),
  );
  const invalidState = await pendingService.resolve(warden, complaintId, { outcome: "Done" });

  assert.equal(isResponse(blank), true);
  if (isResponse(blank)) assert.equal(blank.status, 400);
  assert.equal(isResponse(invalidState), true);
  if (isResponse(invalidState)) assert.equal(invalidState.status, 400);
  assert.equal(calls, 0);
});

test("correctUrgency validates input, rejects no-ops, and uses the verified actor", async () => {
  let correctedBy: string | undefined;
  let correctedAt: Date | undefined;
  let storedReason: string | undefined;
  const service = makeService(
    createStore({
      correctUrgency: async (_id, actorUserId, _urgencyFlag, reason, changedAt) => {
        correctedBy = actorUserId;
        storedReason = reason;
        correctedAt = changedAt;
        return makeRecord({ urgencyFlag: false });
      },
    }),
    () => now,
  );

  const updated = await service.correctUrgency(warden, complaintId, {
    urgencyFlag: false,
    reason: "  Downgraded after recheck.  ",
  });

  assert.equal(isResponse(updated), false);
  assert.equal(correctedBy, wardenId);
  assert.deepEqual(correctedAt, now);
  assert.equal(storedReason, "Downgraded after recheck.");

  const noOp = await service.correctUrgency(warden, complaintId, {
    urgencyFlag: true,
    reason: "No change",
  });
  assert.equal(isResponse(noOp), true);
  if (isResponse(noOp)) assert.equal(noOp.status, 400);
});

test("correctUrgency rejects missing complaints and resolved complaints", async () => {
  const missingService = makeService(
    createStore({ findForWarden: async () => null }),
  );
  const resolvedService = makeService(
    createStore({ findForWarden: async () => makeRecord({ status: "Resolved" }) }),
  );

  const missing = await missingService.correctUrgency(warden, complaintId, {
    urgencyFlag: false,
    reason: "Rechecked",
  });
  const resolved = await resolvedService.correctUrgency(warden, complaintId, {
    urgencyFlag: false,
    reason: "Rechecked",
  });

  assert.equal(isResponse(missing), true);
  if (isResponse(missing)) assert.equal(missing.status, 404);
  assert.equal(isResponse(resolved), true);
  if (isResponse(resolved)) assert.equal(resolved.status, 400);
});

test("Warden service exposes no escalation or generic status mutation", () => {
  const service = makeService(createStore());

  assert.equal("escalate" in service, false);
  assert.equal("updateStatus" in service, false);
});

function makeService(store: WardenComplaintStore, clock?: () => Date) {
  return new WardenComplaintService(store, clock, async () => ({
    houseIds: ["test-house"], intake: false,
  }));
}