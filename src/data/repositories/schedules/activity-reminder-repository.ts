import type { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma.ts";

export function findUpcomingReminderTargets(now: Date, horizon: Date) {
  return prisma.personalSchedule.findMany({
    where: { startAt: { gt: now, lte: horizon } },
    select: { id: true, startAt: true },
  });
}

export async function lockActivityForReminder(client: Prisma.TransactionClient, id: string) {
  await client.$queryRaw`SELECT id FROM personal_schedules WHERE id = ${id}::uuid FOR UPDATE`;
  return client.personalSchedule.findUnique({
    where: { id },
    select: { id: true, userId: true, startAt: true },
  });
}
