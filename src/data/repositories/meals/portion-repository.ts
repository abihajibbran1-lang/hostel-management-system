import type { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma.ts";

const include = { audit: true, discrepancy: true } as const;
export type PortionRecord = Prisma.MealPortionLogGetPayload<{ include: typeof include }>;

export function inPortionTransaction<T>(run: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(run);
}

export function listPortionRecords(mealDate: Date) {
  return prisma.mealPortionLog.findMany({
    where: { mealDate }, include, orderBy: [{ loggedAt: "desc" }, { id: "desc" }],
  });
}

export async function storePortionLog(tx: Prisma.TransactionClient, data: Prisma.MealPortionLogCreateManyInput) {
  await tx.mealPortionLog.createMany({ data, skipDuplicates: true });
  return tx.mealPortionLog.findUniqueOrThrow({
    where: { loggedBy_requestId: { loggedBy: data.loggedBy, requestId: data.requestId } }, include,
  });
}

export function findPortionLogByRequest(tx: Prisma.TransactionClient, loggedBy: string, requestId: string) {
  return tx.mealPortionLog.findUnique({ where: { loggedBy_requestId: { loggedBy, requestId } }, include });
}

export async function lockPortionLog(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM meal_portion_logs WHERE id = ${id}::uuid FOR UPDATE`;
  return tx.mealPortionLog.findUnique({ where: { id }, include });
}

export async function storePortionAudit(tx: Prisma.TransactionClient, data: Prisma.MealPortionAuditUncheckedCreateInput) {
  await tx.mealPortionAudit.create({ data });
  if (data.expectedPortions !== data.observedPortions) {
    await tx.mealPortionDiscrepancy.create({ data: { ...data, recordedAt: data.recordedAt ?? new Date() } });
  }
  return tx.mealPortionLog.findUniqueOrThrow({ where: { id: data.portionLogId }, include });
}
