import type { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma.ts";

const active = ["PENDING", "IN_PROGRESS"] as const;

export function inComplaintTransaction<T>(run: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(run);
}

export function escalationCandidates(cutoff: Date, manual: boolean) {
  return prisma.complaint.findMany({
    where: {
      status: { in: [...active] },
      submittedAt: { lte: cutoff },
      ...(manual ? {
        manualEscalationEligibleAt: null,
        disagreementReason: null,
        statusHistory: { none: { changedBy: { not: null }, changedAt: { gt: cutoff } } },
      } : {}),
    },
    select: {
      id: true, submittedAt: true,
      statusHistory: {
        where: { changedBy: { not: null } },
        orderBy: [{ changedAt: "desc" }, { id: "desc" }], take: 1,
        select: { id: true, changedAt: true },
      },
    },
  });
}

export async function lockEscalationTarget(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM complaints WHERE id = ${id}::uuid FOR UPDATE`;
  return tx.complaint.findUnique({
    where: { id },
    include: { statusHistory: {
      where: { changedBy: { not: null } },
      orderBy: [{ changedAt: "desc" }, { id: "desc" }], take: 1,
      select: { id: true, changedAt: true },
    } },
  });
}

export function unlockManualEscalation(tx: Prisma.TransactionClient, id: string, now: Date) {
  return tx.complaint.update({ where: { id }, data: { manualEscalationEligibleAt: now } });
}

export async function writeEscalation(
  tx: Prisma.TransactionClient, complaint: NonNullable<Awaited<ReturnType<typeof lockEscalationTarget>>>,
  managerId: string, actorId: string | null, now: Date,
) {
  await tx.complaint.update({ where: { id: complaint.id }, data: {
    status: "ESCALATED", assignedManagerId: managerId, manualEscalationEligibleAt: null,
    ...(actorId ? { manualEscalationRequestedAt: now } : { autoEscalatedAt: now }),
  } });
  await tx.complaintStatusHistory.create({ data: {
    complaintId: complaint.id, oldStatus: complaint.status, newStatus: "ESCALATED",
    changedBy: actorId, changedAt: now,
    reason: actorId ? "Student requested escalation." : "Unresolved for 24 hours.",
  } });
}

const managerFields = {
  id: true, category: true, roomNumber: true, description: true, urgencyFlag: true,
  submittedAt: true, originalComplaintId: true, disagreementReason: true,
  manualEscalationRequestedAt: true, autoEscalatedAt: true,
} satisfies Prisma.ComplaintSelect;

export function findAssignedEscalation(managerId: string, id: string) {
  return prisma.complaint.findFirst({
    where: { id, assignedManagerId: managerId, status: "ESCALATED" }, select: managerFields,
  });
}

export async function listAssignedEscalations(managerId: string, limit: number, cursor?: string) {
  if (cursor && !(await findAssignedEscalation(managerId, cursor))) return [];
  return prisma.complaint.findMany({
    where: { assignedManagerId: managerId, status: "ESCALATED" },
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }], take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), select: managerFields,
  });
}
