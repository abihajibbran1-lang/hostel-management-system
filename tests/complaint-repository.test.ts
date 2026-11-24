import {
  ComplaintCategory as PrismaComplaintCategory,
  ComplaintStatus as PrismaComplaintStatus,
} from "@prisma/client";
import assert from "node:assert/strict";
import test from "node:test";

import {
  ComplaintRepository,
  type ComplaintDelegateRecord,
  type ComplaintPrismaClient,
} from "../src/data/repositories/complaints/complaint-repository.ts";

const userA = "2f8855bb-05bb-4f8e-aee1-7c6cab541748";
const userB = "9cf1f1b8-89a3-49d3-9e1d-e1e5c9b938f1";
const complaintId = "a4d1490a-bfe8-4a5f-bb5e-6a8fc9b8e0a1";
const submittedAt = new Date("2026-11-24T10:00:00.000Z");

type HistoryRow = {
  complaintId: string;
  oldStatus: PrismaComplaintStatus | null;
  newStatus: PrismaComplaintStatus;
  changedBy: string | null;
  reason: string | null;
  changedAt: Date;
};

function makeDelegateRecord(overrides: Partial<ComplaintDelegateRecord> = {}): ComplaintDelegateRecord {
  return {
    id: complaintId,
    submittedBy: userA,
    category: PrismaComplaintCategory.WATER,
    roomNumber: "A-12",
    description: "Leaking tap",
    urgencyFlag: true,
    status: PrismaComplaintStatus.PENDING,
    statusHistory: [],
    submittedAt,
    createdAt: submittedAt,
    updatedAt: submittedAt,
    ...overrides,
  };
}

function createFakeClient(options: { failHistory?: boolean } = {}) {
  const stored: ComplaintDelegateRecord[] = [];
  const history: HistoryRow[] = [];
  let createArgs: Parameters<ComplaintPrismaClient["complaint"]["create"]>[0]["data"] | undefined;
  let findManyArgs: Parameters<ComplaintPrismaClient["complaint"]["findMany"]>[0] | undefined;
  let findFirstArgs: Parameters<ComplaintPrismaClient["complaint"]["findFirst"]>[0] | undefined;

  const client: ComplaintPrismaClient = {
    complaint: {
      create: async ({ data }) => {
        createArgs = data;
        const record = makeDelegateRecord({
          submittedBy: data.submittedBy,
          category: data.category,
          roomNumber: data.roomNumber,
          description: data.description,
          urgencyFlag: data.urgencyFlag,
          status: data.status,
          submittedAt: data.submittedAt,
          createdAt: data.submittedAt,
          updatedAt: data.submittedAt,
        });
        stored.push(record);
        return record;
      },
      findMany: async (args) => {
        findManyArgs = args;
        let results = [...stored];
        if (args.cursor) {
          const index = results.findIndex((item) => item.id === args.cursor?.id);
          results = index >= 0 ? results.slice(index + 1) : [];
        }
        return results.slice(0, args.take);
      },
      findFirst: async (args) => {
        findFirstArgs = args;
        return (
          stored.find(
            (item) => item.id === args.where.id && item.submittedBy === args.where.submittedBy,
          ) ?? null
        );
      },
    },
    complaintStatusHistory: {
      create: async ({ data }) => {
        if (options.failHistory) {
          throw new Error("history write failed");
        }
        history.push(data);
        return {};
      },
    },
    $transaction: async (operation) => {
      const storedSnapshot = [...stored];
      const historySnapshot = [...history];
      try {
        return await operation(client);
      } catch (error) {
        stored.splice(0, stored.length, ...storedSnapshot);
        history.splice(0, history.length, ...historySnapshot);
        throw error;
      }
    },
  };

  return {
    client,
    stored,
    history,
    getCreateArgs: () => createArgs,
    getFindManyArgs: () => findManyArgs,
    getFindFirstArgs: () => findFirstArgs,
  };
}

test("createWithInitialHistory writes Prisma enum constants and returns user-facing values", async () => {
  const { client, stored, history, getCreateArgs } = createFakeClient();
  const repository = new ComplaintRepository(client);

  const created = await repository.createWithInitialHistory({
    submittedBy: userA,
    category: "Water",
    roomNumber: "A-12",
    description: "Leaking tap",
    urgencyFlag: true,
    submittedAt,
  });

  assert.equal(getCreateArgs()?.category, PrismaComplaintCategory.WATER);
  assert.equal(getCreateArgs()?.status, PrismaComplaintStatus.PENDING);
  assert.equal(history[0].newStatus, PrismaComplaintStatus.PENDING);
  assert.equal(history[0].oldStatus, null);
  assert.equal(stored[0].category, PrismaComplaintCategory.WATER);
  assert.equal(stored[0].status, PrismaComplaintStatus.PENDING);
  assert.equal(created.category, "Water");
  assert.equal(created.status, "Pending");
  assert.equal(created.outcome, null);
});

test("every user-facing category maps to its generated Prisma enum constant", async () => {
  const cases = [
    ["Water", PrismaComplaintCategory.WATER],
    ["Hygiene", PrismaComplaintCategory.HYGIENE],
    ["Pests", PrismaComplaintCategory.PESTS],
    ["Electricity", PrismaComplaintCategory.ELECTRICITY],
    ["Facilities", PrismaComplaintCategory.FACILITIES],
  ] as const;

  for (const [userValue, prismaValue] of cases) {
    const { client, getCreateArgs } = createFakeClient();
    await new ComplaintRepository(client).createWithInitialHistory({
      submittedBy: userA,
      category: userValue,
      roomNumber: "A-12",
      description: "Leaking tap",
      urgencyFlag: true,
      submittedAt,
    });
    assert.equal(getCreateArgs()?.category, prismaValue);
  }
});

test("a history failure rolls back the complaint write", async () => {
  const { client, stored, history } = createFakeClient({ failHistory: true });
  const repository = new ComplaintRepository(client);

  await assert.rejects(
    repository.createWithInitialHistory({
      submittedBy: userA,
      category: "Water",
      roomNumber: "A-12",
      description: "Leaking tap",
      urgencyFlag: true,
      submittedAt,
    }),
    /history write failed/,
  );

  assert.equal(stored.length, 0);
  assert.equal(history.length, 0);
});

test("latest resolved history reason is returned as the user-facing outcome", async () => {
  const { client, stored, getFindManyArgs, getFindFirstArgs } = createFakeClient();
  stored.push(
    makeDelegateRecord({
      id: "id-resolved",
      status: PrismaComplaintStatus.RESOLVED,
      statusHistory: [{ reason: "Tap repaired and area cleaned" }],
    }),
  );
  const repository = new ComplaintRepository(client);

  const page = await repository.listForOwner(userA, { limit: 20 });
  assert.equal(page.complaints[0].outcome, "Tap repaired and area cleaned");
  assert.deepEqual(getFindManyArgs()?.include, {
    statusHistory: {
      where: {
        newStatus: PrismaComplaintStatus.RESOLVED,
        reason: { not: null },
      },
      orderBy: { changedAt: "desc" },
      take: 1,
    },
  });

  const detail = await repository.findOwned(userA, "id-resolved");
  assert.equal(detail?.outcome, "Tap repaired and area cleaned");
  assert.deepEqual(getFindFirstArgs()?.include, {
    statusHistory: {
      where: {
        newStatus: PrismaComplaintStatus.RESOLVED,
        reason: { not: null },
      },
      orderBy: { changedAt: "desc" },
      take: 1,
    },
  });
});

test("list maps Prisma enums back to user-facing values and stays cursor paged", async () => {
  const { client, stored, getFindManyArgs } = createFakeClient();
  stored.push(
    makeDelegateRecord({
      id: "id-1",
      submittedAt: new Date("2026-11-24T08:00:00.000Z"),
    }),
    makeDelegateRecord({
      id: "id-2",
      category: PrismaComplaintCategory.ELECTRICITY,
      status: PrismaComplaintStatus.IN_PROGRESS,
      submittedAt: new Date("2026-11-24T09:00:00.000Z"),
    }),
    makeDelegateRecord({
      id: "id-3",
      submittedAt: new Date("2026-11-24T10:00:00.000Z"),
    }),
  );
  const repository = new ComplaintRepository(client);

  const firstPage = await repository.listForOwner(userA, { limit: 2 });
  assert.deepEqual(
    firstPage.complaints.map((complaint) => complaint.id),
    ["id-1", "id-2"],
  );
  assert.equal(firstPage.complaints[0].category, "Water");
  assert.equal(firstPage.complaints[0].status, "Pending");
  assert.equal(firstPage.complaints[1].category, "Electricity");
  assert.equal(firstPage.complaints[1].status, "In Progress");
  assert.equal(firstPage.nextCursor, "id-2");
  assert.deepEqual(getFindManyArgs()?.where, { submittedBy: userA });
  assert.deepEqual(getFindManyArgs()?.orderBy, [{ submittedAt: "desc" }, { id: "desc" }]);

  const secondPage = await repository.listForOwner(userA, { limit: 2, cursor: "id-2" });
  assert.deepEqual(
    secondPage.complaints.map((complaint) => complaint.id),
    ["id-3"],
  );
  assert.equal(secondPage.nextCursor, undefined);
});

test("detail lookup filters by owner and maps Prisma enums back to user-facing values", async () => {
  const { client, stored, getFindFirstArgs } = createFakeClient();
  stored.push(
    makeDelegateRecord({
      category: PrismaComplaintCategory.FACILITIES,
      status: PrismaComplaintStatus.ESCALATED,
    }),
  );
  const repository = new ComplaintRepository(client);

  const ownRecord = await repository.findOwned(userA, complaintId);
  const foreignRecord = await repository.findOwned(userB, complaintId);

  assert.ok(ownRecord);
  assert.equal(ownRecord.category, "Facilities");
  assert.equal(ownRecord.status, "Escalated");
  assert.equal(foreignRecord, null);
  assert.deepEqual(getFindFirstArgs()?.where, { id: complaintId, submittedBy: userB });
});
