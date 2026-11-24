import { ComplaintCategory, ComplaintStatus } from "@prisma/client";

import type { ComplaintListQuery } from "../../../business/modules/complaints/complaint-contract.ts";

import { prisma } from "../../database/prisma.ts";

export type ComplaintRecord = {
  id: string;
  submittedBy: string;
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
  where: { submittedBy: string };
  orderBy: Array<{ submittedAt: "desc" } | { id: "desc" }>;
  take: number;
  cursor?: { id: string };
  skip?: number;
  include?: ResolvedOutcomeInclude;
};

type ComplaintFindFirstArgs = {
  where: { id: string; submittedBy: string };
  include?: ResolvedOutcomeInclude;
};

type ComplaintDelegate = {
  create(args: ComplaintCreateArgs): Promise<ComplaintDelegateRecord>;
  findMany(args: ComplaintFindManyArgs): Promise<ComplaintDelegateRecord[]>;
  findFirst(args: ComplaintFindFirstArgs): Promise<ComplaintDelegateRecord | null>;
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
    const records = (
      await this.client.complaint.findMany({
        where: { submittedBy },
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
    const record = await this.client.complaint.findFirst({
      where: { id, submittedBy },
      include: resolvedOutcomeInclude,
    });

    return record ? toComplaintRecord(record) : null;
  }
}
