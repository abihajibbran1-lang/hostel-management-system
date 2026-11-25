import { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma.ts";

const include = {
  assignments: { orderBy: { createdAt: "asc" } },
  assistanceRequests: { where: { status: "ACTIVE" }, take: 1 },
  requests: { orderBy: { requestedAt: "desc" } },
} satisfies Prisma.ResponsibilityInclude;

export type Duty = Prisma.ResponsibilityGetPayload<{ include: typeof include }>;

export function listDuties(where: Prisma.ResponsibilityWhereInput) {
  return prisma.responsibility.findMany({
    where, include, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
}

export async function withDutyTransaction<T>(operation: (client: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(operation, { isolationLevel: "Serializable" });
    } catch (error) {
      if (attempt >= 3 || !(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034") throw error;
    }
  }
}

export async function lockDuty(client: Prisma.TransactionClient, id: string) {
  await client.$queryRaw`SELECT id FROM responsibilities WHERE id = ${id}::uuid FOR UPDATE`;
  return client.responsibility.findUnique({ where: { id }, include });
}

export function findReminderCandidates(now: Date) {
  return prisma.responsibilityAssignment.findMany({
    where: {
      status: "ACCEPTED",
      reminderEligibleAt: { not: null },
      responsibility: {
        status: { in: ["ACTIVE", "ASSISTANCE_REQUESTED"] },
        dueAt: { gt: now, lte: new Date(now.getTime() + 24 * 3_600_000) },
      },
    },
    select: {
      id: true, reminderVersion: true, reminderEligibleAt: true,
      responsibility: { select: { dueAt: true } },
    },
  });
}

export function findAssignmentDutyId(client: Prisma.TransactionClient, id: string) {
  return client.responsibilityAssignment.findUnique({ where: { id }, select: { responsibilityId: true } });
}

export function findIncompleteTimeoutCandidates(now: Date, graceMs: number) {
  return prisma.responsibilityAssignment.findMany({
    where: {
      status: "ACCEPTED", lastReminderAt: { not: null },
      incompleteConfirmedAt: null,
      responsibility: {
        dueAt: { lte: new Date(now.getTime() - graceMs) },
        status: { in: ["ACTIVE", "ASSISTANCE_REQUESTED"] },
        needsRedistribution: false,
      },
    },
    select: { id: true, reminderVersion: true, responsibility: { select: { dueAt: true } } },
  });
}

export function findUnfinishedTransferDuties(client: Prisma.TransactionClient, studentUserId: string, roomId: string) {
  return client.responsibility.findMany({
    where: {
      roomId, status: { notIn: ["COMPLETED", "CANCELLED"] },
      assignments: { some: { studentUserId, status: { notIn: ["WITHDRAWN", "COMPLETED"] } } },
    },
    select: { id: true },
    orderBy: { id: "asc" },
  });
}
