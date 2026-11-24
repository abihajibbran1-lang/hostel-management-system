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
  type ComplaintWhereInput,
} from "../src/data/repositories/complaints/complaint-repository.ts";

const userA = "2f8855bb-05bb-4f8e-aee1-7c6cab541748";
const userB = "9cf1f1b8-89a3-49d3-9e1d-e1e5c9b938f1";
const wardenId = "c4f2a5c9-7a6b-4e0d-9f31-2a8b5c6d7e90";
const complaintId = "a4d1490a-bfe8-4a5f-bb5e-6a8fc9b8e0a1";
const changedAt = new Date("2026-11-24T12:00:00.000Z");
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

function matchesWhere(record: ComplaintDelegateRecord, where: ComplaintWhereInput) {
  if (where.id !== undefined && record.id !== where.id) {
    return false;
  }
  if (where.submittedBy !== undefined && record.submittedBy !== where.submittedBy) {
    return false;
  }
  if (where.status !== undefined) {
    if (typeof where.status === "object") {
      if (!where.status.in.includes(record.status)) {
        return false;
      }
    } else if (record.status !== where.status) {
      return false;
    }
  }
  if (where.urgencyFlag !== undefined) {
    if (typeof where.urgencyFlag === "object") {
      if (record.urgencyFlag === where.urgencyFlag.not) {
        return false;
      }
    } else if (record.urgencyFlag !== where.urgencyFlag) {
      return false;
    }
  }
  return true;
}

function createFakeClient(options: { failHistory?: boolean; failUpdate?: boolean } = {}) {
  const stored: ComplaintDelegateRecord[] = [];
  const history: HistoryRow[] = [];
  let createArgs: Parameters<ComplaintPrismaClient["complaint"]["create"]>[0]["data"] | undefined;
  let findManyArgs: Parameters<ComplaintPrismaClient["complaint"]["findMany"]>[0] | undefined;
  let findFirstArgs: Parameters<ComplaintPrismaClient["complaint"]["findFirst"]>[0] | undefined;
  let updateManyArgs: Parameters<ComplaintPrismaClient["complaint"]["updateMany"]>[0] | undefined;

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
        let results = stored.filter((record) => matchesWhere(record, args.where));
        if (args.cursor) {
          const index = results.findIndex((item) => item.id === args.cursor?.id);
          results = index >= 0 ? results.slice(index + 1) : [];
        }
        return results.slice(0, args.take);
      },
      findFirst: async (args) => {
        findFirstArgs = args;
        return stored.find((record) => matchesWhere(record, args.where)) ?? null;
      },
      updateMany: async ({ where, data }) => {
        updateManyArgs = { where, data };
        if (options.failUpdate) {
          return { count: 0 };
        }
        let count = 0;
        for (let index = 0; index < stored.length; index += 1) {
          if (matchesWhere(stored[index], where)) {
            stored[index] = { ...stored[index], ...data };
            count += 1;
          }
        }
        return { count };
      },
    },
    complaintStatusHistory: {
      create: async ({ data }) => {
        if (options.failHistory) {
          throw new Error("history write failed");
        }
        history.push(data);
        if (data.newStatus === PrismaComplaintStatus.RESOLVED) {
          const index = stored.findIndex((record) => record.id === data.complaintId);
          if (index >= 0) {
            const current = stored[index];
            stored[index] = {
              ...current,
              statusHistory: [{ reason: data.reason }, ...(current.statusHistory ?? [])],
            };
          }
        }
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
    getUpdateManyArgs: () => updateManyArgs,
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

test("a history failure rolls back the initial complaint write", async () => {
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
  assert.deepEqual(getFindManyArgs()?.where, { submittedBy: userA });
  assert.deepEqual(getFindManyArgs()?.orderBy, [{ submittedAt: "desc" }, { id: "desc" }]);

  const detail = await repository.findOwned(userA, "id-resolved");
  assert.equal(detail?.outcome, "Tap repaired and area cleaned");
  assert.deepEqual(getFindFirstArgs()?.where, { id: "id-resolved", submittedBy: userA });
});

test("owner list remains cursor paged", async () => {
  const { client, stored } = createFakeClient();
  stored.push(
    makeDelegateRecord({ id: "id-1", submittedAt: new Date("2026-11-24T08:00:00.000Z") }),
    makeDelegateRecord({ id: "id-2", submittedAt: new Date("2026-11-24T09:00:00.000Z") }),
    makeDelegateRecord({ id: "id-3", submittedAt: new Date("2026-11-24T10:00:00.000Z") }),
  );
  const repository = new ComplaintRepository(client);

  const firstPage = await repository.listForOwner(userA, { limit: 2 });
  assert.deepEqual(
    firstPage.complaints.map((complaint) => complaint.id),
    ["id-1", "id-2"],
  );
  assert.equal(firstPage.nextCursor, "id-2");

  const secondPage = await repository.listForOwner(userA, { limit: 2, cursor: "id-2" });
  assert.deepEqual(
    secondPage.complaints.map((complaint) => complaint.id),
    ["id-3"],
  );
  assert.equal(secondPage.nextCursor, undefined);
});

test("warden list applies status and urgency filters with shared pagination", async () => {
  const { client, stored, getFindManyArgs } = createFakeClient();
  stored.push(
    makeDelegateRecord({ id: "id-1", status: PrismaComplaintStatus.PENDING, urgencyFlag: true }),
    makeDelegateRecord({
      id: "id-2",
      status: PrismaComplaintStatus.IN_PROGRESS,
      urgencyFlag: false,
    }),
    makeDelegateRecord({ id: "id-3", status: PrismaComplaintStatus.RESOLVED, urgencyFlag: false }),
  );
  const repository = new ComplaintRepository(client);

  const page = await repository.listForWarden({
    limit: 10,
    status: "In Progress",
    urgencyFlag: false,
  });

  assert.deepEqual(
    page.complaints.map((complaint) => complaint.id),
    ["id-2"],
  );
  assert.deepEqual(getFindManyArgs()?.where, {
    status: PrismaComplaintStatus.IN_PROGRESS,
    urgencyFlag: false,
  });
  assert.equal(getFindManyArgs()?.take, 11);
});

test("warden detail finds any complaint by ID and maps outcome", async () => {
  const { client, stored, getFindFirstArgs } = createFakeClient();
  stored.push(
    makeDelegateRecord({
      id: "warden-detail",
      submittedBy: userB,
      status: PrismaComplaintStatus.RESOLVED,
      statusHistory: [{ reason: "Resolved by warden" }],
    }),
  );
  const repository = new ComplaintRepository(client);

  const detail = await repository.findForWarden("warden-detail");
  assert.equal(detail?.submittedBy, userB);
  assert.equal(detail?.status, "Resolved");
  assert.equal(detail?.outcome, "Resolved by warden");
  assert.deepEqual(getFindFirstArgs()?.where, { id: "warden-detail" });
  assert.equal(await repository.findOwned(userA, "warden-detail"), null);
});

test("transitionToInProgress updates status and writes actor/time history", async () => {
  const { client, stored, history, getUpdateManyArgs } = createFakeClient();
  stored.push(makeDelegateRecord());
  const repository = new ComplaintRepository(client);

  const updated = await repository.transitionToInProgress(complaintId, wardenId, changedAt);

  assert.equal(updated?.status, "In Progress");
  assert.equal(stored[0].status, PrismaComplaintStatus.IN_PROGRESS);
  assert.deepEqual(getUpdateManyArgs(), {
    where: { id: complaintId, status: PrismaComplaintStatus.PENDING },
    data: { status: PrismaComplaintStatus.IN_PROGRESS },
  });
  assert.equal(history.length, 1);
  assert.equal(history[0].oldStatus, PrismaComplaintStatus.PENDING);
  assert.equal(history[0].newStatus, PrismaComplaintStatus.IN_PROGRESS);
  assert.equal(history[0].changedBy, wardenId);
  assert.deepEqual(history[0].changedAt, changedAt);
});

test("transitionToInProgress rejects a non-Pending complaint", async () => {
  const { client, stored, history } = createFakeClient();
  stored[0] = makeDelegateRecord({ status: PrismaComplaintStatus.RESOLVED });
  const repository = new ComplaintRepository(client);

  const updated = await repository.transitionToInProgress(complaintId, wardenId, changedAt);

  assert.equal(updated, null);
  assert.equal(stored[0].status, PrismaComplaintStatus.RESOLVED);
  assert.equal(history.length, 0);
});

test("resolveComplaint stores the outcome in resolved history and returns it", async () => {
  const { client, stored, history, getUpdateManyArgs } = createFakeClient();
  stored[0] = makeDelegateRecord({ status: PrismaComplaintStatus.IN_PROGRESS });
  const repository = new ComplaintRepository(client);

  const resolved = await repository.resolveComplaint(
    complaintId,
    wardenId,
    "Tap repaired and area cleaned",
    changedAt,
  );

  assert.equal(resolved?.status, "Resolved");
  assert.equal(resolved?.outcome, "Tap repaired and area cleaned");
  assert.equal(stored[0].status, PrismaComplaintStatus.RESOLVED);
  assert.deepEqual(getUpdateManyArgs()?.where, {
    id: complaintId,
    status: PrismaComplaintStatus.IN_PROGRESS,
  });
  assert.equal(history[0].newStatus, PrismaComplaintStatus.RESOLVED);
  assert.equal(history[0].reason, "Tap repaired and area cleaned");
  assert.equal(history[0].changedBy, wardenId);
  assert.deepEqual(history[0].changedAt, changedAt);
});

test("resolveComplaint rejects a Pending complaint", async () => {
  const { client, stored, history } = createFakeClient();
  stored.push(makeDelegateRecord());
  const repository = new ComplaintRepository(client);

  const resolved = await repository.resolveComplaint(complaintId, wardenId, "Done", changedAt);

  assert.equal(resolved, null);
  assert.equal(stored[0].status, PrismaComplaintStatus.PENDING);
  assert.equal(history.length, 0);
});

test("correctUrgency writes an auditable JSON reason without changing status", async () => {
  const { client, stored, history } = createFakeClient();
  stored.push(makeDelegateRecord());
  const repository = new ComplaintRepository(client);

  const updated = await repository.correctUrgency(
    complaintId,
    wardenId,
    false,
    "Downgraded after recheck",
    changedAt,
  );

  assert.equal(updated?.urgencyFlag, false);
  assert.equal(stored[0].urgencyFlag, false);
  assert.equal(stored[0].status, PrismaComplaintStatus.PENDING);
  assert.equal(history.length, 1);
  assert.equal(history[0].oldStatus, PrismaComplaintStatus.PENDING);
  assert.equal(history[0].newStatus, PrismaComplaintStatus.PENDING);
  assert.equal(history[0].changedBy, wardenId);
  assert.deepEqual(JSON.parse(String(history[0].reason)), {
    change: "urgency",
    from: true,
    to: false,
    note: "Downgraded after recheck",
  });
});

test("correctUrgency rejects no-op and terminal-state updates", async () => {
  const noOp = createFakeClient();
  const noOpRepository = new ComplaintRepository(noOp.client);
  assert.equal(
    await noOpRepository.correctUrgency(complaintId, wardenId, true, "No change", changedAt),
    null,
  );
  assert.equal(noOp.history.length, 0);

  const resolved = createFakeClient();
  resolved.stored[0] = makeDelegateRecord({ status: PrismaComplaintStatus.RESOLVED });
  const resolvedRepository = new ComplaintRepository(resolved.client);
  assert.equal(
    await resolvedRepository.correctUrgency(complaintId, wardenId, false, "Too late", changedAt),
    null,
  );
  assert.equal(resolved.history.length, 0);
  assert.equal(resolved.stored[0].status, PrismaComplaintStatus.RESOLVED);
});

test("missing complaints return null and write no history", async () => {
  const { client, history } = createFakeClient();
  const repository = new ComplaintRepository(client);

  assert.equal(await repository.findForWarden("missing"), null);
  assert.equal(await repository.transitionToInProgress("missing", wardenId, changedAt), null);
  assert.equal(await repository.resolveComplaint("missing", wardenId, "Done", changedAt), null);
  assert.equal(await repository.correctUrgency("missing", wardenId, false, "Recheck", changedAt), null);
  assert.equal(history.length, 0);
});

test("a history failure rolls back a status mutation", async () => {
  const { client, stored, history } = createFakeClient({ failHistory: true });
  stored.push(makeDelegateRecord());
  const repository = new ComplaintRepository(client);

  await assert.rejects(
    repository.transitionToInProgress(complaintId, wardenId, changedAt),
    /history write failed/,
  );

  assert.equal(stored[0].status, PrismaComplaintStatus.PENDING);
  assert.equal(history.length, 0);
});

test("a conditional update failure prevents status change and history", async () => {
  const { client, stored, history } = createFakeClient({ failUpdate: true });
  stored.push(makeDelegateRecord());
  const repository = new ComplaintRepository(client);

  const updated = await repository.transitionToInProgress(complaintId, wardenId, changedAt);

  assert.equal(updated, null);
  assert.equal(stored[0].status, PrismaComplaintStatus.PENDING);
  assert.equal(history.length, 0);
});
