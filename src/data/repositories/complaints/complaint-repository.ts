import { ComplaintCategory, ComplaintStatus } from "@prisma/client";

import type { ComplaintListQuery } from "../../../business/modules/complaints/complaint-contract.ts";
import type { WardenComplaintQueueQuery } from "../../../business/modules/complaints/warden-complaint-contract.ts";

import { prisma } from "../../database/prisma.ts";

export type ComplaintRecord = {
  id: string;
  submittedBy: string;
  submittedHouseId?: string | null;
  originalComplaintId?: string | null;
  disagreementReason?: string | null;
  manualEscalationEligibleAt?: Date | null;
  category: string;
  roomNumber: string;
  description: string;
  urgencyFlag: boolean;
  status: string;
  outcome: string | null;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

type OutcomeHistoryEntry = {
  reason: string | null;
};

export type ComplaintDelegateRecord = Omit<
  ComplaintRecord,
  "category" | "status" | "outcome"
> & {
  category: ComplaintCategory;
  status: ComplaintStatus;
  statusHistory?: OutcomeHistoryEntry[];
};

export type ComplaintWrite = {
  submittedBy: string;
  submittedHouseId?: string | null;
  originalComplaintId?: string;
  disagreementReason?: string;
  category: string;
  roomNumber: string;
  description: string;
  urgencyFlag: boolean;
  submittedAt: Date;
};

export type ComplaintListPage = {
  complaints: ComplaintRecord[];
  nextCursor?: string;
};

export type ComplaintWhereInput = {
  id?: string;
  submittedBy?: string;
  status?: ComplaintStatus | { in: ComplaintStatus[] };
  urgencyFlag?: boolean | { not: boolean };
  submittedHouseId?: string | null | { in: string[] };
  OR?: ComplaintWhereInput[];
};

export type ComplaintScope = { houseIds: string[]; intake: boolean };

function scopedComplaints(scope: ComplaintScope): ComplaintWhereInput {
  const assigned = { submittedHouseId: { in: scope.houseIds } };
  return scope.intake ? { OR: [assigned, { submittedHouseId: null }] } : assigned;
}

export type ComplaintUpdateData = {
  status?: ComplaintStatus;
  urgencyFlag?: boolean;
  manualEscalationEligibleAt?: null;
};

const prismaCategoryByValue: Record<string, ComplaintCategory> = {
  Water: ComplaintCategory.WATER,
  Hygiene: ComplaintCategory.HYGIENE,
  Pests: ComplaintCategory.PESTS,
  Electricity: ComplaintCategory.ELECTRICITY,
  Facilities: ComplaintCategory.FACILITIES,
};

const valueByPrismaCategory: Record<ComplaintCategory, string> = {
  [ComplaintCategory.WATER]: "Water",
  [ComplaintCategory.HYGIENE]: "Hygiene",
  [ComplaintCategory.PESTS]: "Pests",
  [ComplaintCategory.ELECTRICITY]: "Electricity",
  [ComplaintCategory.FACILITIES]: "Facilities",
};

const prismaStatusByValue: Record<string, ComplaintStatus> = {
  Pending: ComplaintStatus.PENDING,
  "In Progress": ComplaintStatus.IN_PROGRESS,
  Resolved: ComplaintStatus.RESOLVED,
  Escalated: ComplaintStatus.ESCALATED,
};

const valueByPrismaStatus: Record<ComplaintStatus, string> = {
  [ComplaintStatus.PENDING]: "Pending",
  [ComplaintStatus.IN_PROGRESS]: "In Progress",
  [ComplaintStatus.RESOLVED]: "Resolved",
  [ComplaintStatus.ESCALATED]: "Escalated",
};

const activeComplaintStatuses: ComplaintStatus[] = [
  ComplaintStatus.PENDING,
  ComplaintStatus.IN_PROGRESS,
];

function toPrismaCategory(value: string): ComplaintCategory {
  const mapped = prismaCategoryByValue[value];
  if (!mapped) {
    throw new Error(`Unsupported complaint category: ${value}`);
  }
  return mapped;
}

function toPrismaStatus(value: string): ComplaintStatus {
  const mapped = prismaStatusByValue[value];
  if (!mapped) {
    throw new Error(`Unsupported complaint status: ${value}`);
  }
  return mapped;
}

function isActiveComplaintStatus(status: ComplaintStatus) {
  return activeComplaintStatuses.includes(status);
}

function toComplaintRecord(record: ComplaintDelegateRecord): ComplaintRecord {
  const { statusHistory, ...complaint } = record;
  const resolvedReason = statusHistory?.find((entry) => entry.reason !== null)?.reason ?? null;

  return {
    ...complaint,
    category: valueByPrismaCategory[record.category],
    status: valueByPrismaStatus[record.status],
    outcome: resolvedReason,
  };
}

type ResolvedOutcomeInclude = {
  statusHistory: {
    where: { newStatus: ComplaintStatus; reason: { not: null } };
    orderBy: { changedAt: "desc" };
    take: number;
  };
};

const resolvedOutcomeInclude: ResolvedOutcomeInclude = {
  statusHistory: {
    where: {
      newStatus: ComplaintStatus.RESOLVED,
      reason: { not: null },
    },
    orderBy: { changedAt: "desc" },
    take: 1,
  },
};

type ComplaintCreateArgs = {
  data: Omit<ComplaintWrite, "category"> & {
    category: ComplaintCategory;
    status: ComplaintStatus;
  };
};

type ComplaintFindManyArgs = {
  where: ComplaintWhereInput;
  orderBy: Array<{ submittedAt: "desc" } | { id: "desc" }>;
  take: number;
  cursor?: { id: string };
  skip?: number;
  include?: ResolvedOutcomeInclude;
};

type ComplaintFindFirstArgs = {
  where: ComplaintWhereInput;
  include?: ResolvedOutcomeInclude;
};

type ComplaintUpdateManyArgs = {
  where: ComplaintWhereInput;
  data: ComplaintUpdateData;
};

type ComplaintDelegate = {
  create(args: ComplaintCreateArgs): Promise<ComplaintDelegateRecord>;
  findMany(args: ComplaintFindManyArgs): Promise<ComplaintDelegateRecord[]>;
  findFirst(args: ComplaintFindFirstArgs): Promise<ComplaintDelegateRecord | null>;
  updateMany(args: ComplaintUpdateManyArgs): Promise<{ count: number }>;
};

type HistoryCreateArgs = {
  data: {
    complaintId: string;
    oldStatus: ComplaintStatus | null;
    newStatus: ComplaintStatus;
    changedBy: string | null;
    reason: string | null;
    changedAt: Date;
  };
};

type ComplaintStatusHistoryDelegate = {
  create(args: HistoryCreateArgs): Promise<unknown>;
};

export type ComplaintPrismaClient = {
  complaint: ComplaintDelegate;
  complaintStatusHistory: ComplaintStatusHistoryDelegate;
  $transaction<T>(operation: (client: ComplaintPrismaClient) => Promise<T>): Promise<T>;
};

export class ComplaintRepository {
  private readonly client: ComplaintPrismaClient;

  constructor(client: ComplaintPrismaClient = prisma as unknown as ComplaintPrismaClient) {
    this.client = client;
  }

  private async updateWithHistory(
    id: string,
    where: ComplaintWhereInput,
    data: ComplaintUpdateData,
    history: Omit<HistoryCreateArgs["data"], "complaintId">,
  ): Promise<ComplaintRecord | null> {
    return this.client.$transaction(async (transactionClient) => {
      const result = await transactionClient.complaint.updateMany({ where, data });
      if (result.count === 0) {
        return null;
      }

      await transactionClient.complaintStatusHistory.create({
        data: { complaintId: id, ...history },
      });

      const record = await transactionClient.complaint.findFirst({
        where: { id },
        include: resolvedOutcomeInclude,
      });

      return record ? toComplaintRecord(record) : null;
    });
  }

  createWithInitialHistory(write: ComplaintWrite): Promise<ComplaintRecord> {
    return this.client.$transaction(async (transactionClient) => {
      const complaint = await transactionClient.complaint.create({
        data: {
          ...write,
          category: toPrismaCategory(write.category),
          status: ComplaintStatus.PENDING,
        },
      });

      await transactionClient.complaintStatusHistory.create({
        data: {
          complaintId: complaint.id,
          oldStatus: null,
          newStatus: ComplaintStatus.PENDING,
          changedBy: null,
          reason: null,
          changedAt: write.submittedAt,
        },
      });

      return toComplaintRecord(complaint);
    });
  }

  async listForOwner(
    submittedBy: string,
    query: ComplaintListQuery,
  ): Promise<ComplaintListPage> {
    return this.listPage({ submittedBy }, query);
  }

  async listForWarden(query: WardenComplaintQueueQuery, scope: ComplaintScope): Promise<ComplaintListPage> {
    const where: ComplaintWhereInput = {
      ...(query.queue === "intake" && scope.intake
        ? { submittedHouseId: null }
        : scopedComplaints(query.queue ? { ...scope, intake: false } : scope)),
      ...(query.status ? { status: toPrismaStatus(query.status) } : {}),
      ...(query.urgencyFlag !== undefined ? { urgencyFlag: query.urgencyFlag } : {}),
    };
    if (query.queue === "intake" && !scope.intake) return { complaints: [] };
    if (query.cursor && !(await this.find({ ...where, id: query.cursor }))) return { complaints: [] };

    return this.listPage(where, query);
  }

  private async listPage(
    where: ComplaintWhereInput,
    query: ComplaintListQuery,
  ): Promise<ComplaintListPage> {
    const records = (
      await this.client.complaint.findMany({
        where,
        orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
        take: query.limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        include: resolvedOutcomeInclude,
      })
    ).map(toComplaintRecord);

    const hasNextPage = records.length > query.limit;
    const complaints = hasNextPage ? records.slice(0, query.limit) : records;

    return {
      complaints,
      nextCursor: hasNextPage ? complaints.at(-1)?.id : undefined,
    };
  }

  async findOwned(submittedBy: string, id: string): Promise<ComplaintRecord | null> {
    return this.find({ id, submittedBy });
  }

  async findForWarden(id: string, scope: ComplaintScope): Promise<ComplaintRecord | null> {
    return this.find({ id, ...scopedComplaints(scope) });
  }

  private async find(where: ComplaintWhereInput): Promise<ComplaintRecord | null> {
    const record = await this.client.complaint.findFirst({
      where,
      include: resolvedOutcomeInclude,
    });

    return record ? toComplaintRecord(record) : null;
  }

  transitionToInProgress(
    id: string,
    actorUserId: string,
    changedAt: Date,
    scope: ComplaintScope,
  ): Promise<ComplaintRecord | null> {
    return this.updateWithHistory(
      id,
      { id, status: ComplaintStatus.PENDING, ...scopedComplaints(scope) },
      { status: ComplaintStatus.IN_PROGRESS, manualEscalationEligibleAt: null },
      {
        oldStatus: ComplaintStatus.PENDING,
        newStatus: ComplaintStatus.IN_PROGRESS,
        changedBy: actorUserId,
        reason: null,
        changedAt,
      },
    );
  }

  resolveComplaint(
    id: string,
    actorUserId: string,
    outcome: string,
    changedAt: Date,
    scope: ComplaintScope,
  ): Promise<ComplaintRecord | null> {
    return this.updateWithHistory(
      id,
      { id, status: ComplaintStatus.IN_PROGRESS, ...scopedComplaints(scope) },
      { status: ComplaintStatus.RESOLVED, manualEscalationEligibleAt: null },
      {
        oldStatus: ComplaintStatus.IN_PROGRESS,
        newStatus: ComplaintStatus.RESOLVED,
        changedBy: actorUserId,
        reason: outcome,
        changedAt,
      },
    );
  }

  correctUrgency(
    id: string,
    actorUserId: string,
    urgencyFlag: boolean,
    reason: string,
    changedAt: Date,
    scope: ComplaintScope,
  ): Promise<ComplaintRecord | null> {
    return this.client.$transaction(async (transactionClient) => {
      const current = await transactionClient.complaint.findFirst({ where: { id, ...scopedComplaints(scope) } });

      if (
        !current ||
        !isActiveComplaintStatus(current.status) ||
        current.urgencyFlag === urgencyFlag
      ) {
        return null;
      }

      const result = await transactionClient.complaint.updateMany({
        where: {
          id,
          status: current.status,
          urgencyFlag: { not: urgencyFlag },
          ...scopedComplaints(scope),
        },
        data: { urgencyFlag, manualEscalationEligibleAt: null },
      });

      if (result.count === 0) {
        return null;
      }

      await transactionClient.complaintStatusHistory.create({
        data: {
          complaintId: id,
          oldStatus: current.status,
          newStatus: current.status,
          changedBy: actorUserId,
          reason: JSON.stringify({
            change: "urgency",
            from: current.urgencyFlag,
            to: urgencyFlag,
            note: reason,
          }),
          changedAt,
        },
      });

      const record = await transactionClient.complaint.findFirst({
        where: { id },
        include: resolvedOutcomeInclude,
      });

      return record ? toComplaintRecord(record) : null;
    });
  }
}
