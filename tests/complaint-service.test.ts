import assert from "node:assert/strict";
import test from "node:test";

import { ComplaintService, type ComplaintStore } from "../src/business/modules/complaints/complaint-service.ts";
import type { ComplaintRecord } from "../src/data/repositories/complaints/complaint-repository.ts";

const studentId = "2f8855bb-05bb-4f8e-aee1-7c6cab541748";
const now = new Date("2026-11-24T10:00:00.000Z");

function makeRecord(overrides: Partial<ComplaintRecord> = {}): ComplaintRecord {
  return {
    id: "a4d1490a-bfe8-4a5f-bb5e-6a8fc9b8e0a1",
    submittedBy: studentId,
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

test("create uses the verified student ID, server clock and Pending status", async () => {
  let receivedWrite: Parameters<ComplaintStore["createWithInitialHistory"]>[0] | undefined;
  const store = {
    createWithInitialHistory: async (write) => {
      receivedWrite = write;
      return makeRecord();
    },
    listForOwner: async () => ({ complaints: [] }),
    findOwned: async () => null,
  } as ComplaintStore;

  const service = new ComplaintService(store, () => now);
  const created = await service.create(studentId, {
    category: "Water",
    roomNumber: "A-12",
    description: "Leaking tap",
    urgencyFlag: true,
  });

  assert.equal(receivedWrite?.submittedBy, studentId);
  assert.deepEqual(receivedWrite?.submittedAt, now);
  assert.equal(created.status, "Pending");
});

test("list and detail are owner scoped and the service has no status mutation", async () => {
  let listedOwner: string | undefined;
  let detailedOwner: string | undefined;
  const store = {
    createWithInitialHistory: async () => makeRecord(),
    listForOwner: async (ownerId) => {
      listedOwner = ownerId;
      return { complaints: [makeRecord()] };
    },
    findOwned: async (ownerId) => {
      detailedOwner = ownerId;
      return makeRecord();
    },
  } as ComplaintStore;

  const service = new ComplaintService(store);
  await service.listForOwner(studentId, { limit: 20 });
  await service.getOwned(studentId, "a4d1490a-bfe8-4a5f-bb5e-6a8fc9b8e0a1");

  assert.equal(listedOwner, studentId);
  assert.equal(detailedOwner, studentId);
  assert.equal("updateStatus" in service, false);
  assert.equal("start" in service, false);
  assert.equal("resolve" in service, false);
  assert.equal("escalate" in service, false);
});
