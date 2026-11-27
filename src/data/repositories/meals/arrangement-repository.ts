import type { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma.ts";

export const ticketInclude = { snapshots: { orderBy: { id: "asc" } } } satisfies Prisma.MealReservationInclude;
export type Ticket = Prisma.MealReservationGetPayload<{ include: typeof ticketInclude }>;

export function withMealTransaction<T>(run: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(run);
}

export class MealArrangementRepository {
  private readonly tx: Prisma.TransactionClient;
  constructor(tx: Prisma.TransactionClient = prisma) { this.tx = tx; }

  async lockRequest(studentId: string, requestKey: string) {
    // Serialize retry handling. The database unique indexes also enforce identity.
    await this.tx.$queryRaw`SELECT 1::int AS locked FROM pg_advisory_xact_lock(hashtextextended(${`${studentId}:${requestKey}`}, 0))`;
  }

  findTicket(userId: string, mealDate: Date, mealType: Prisma.MealReservationCreateManyInput["mealType"]) {
    return this.tx.mealReservation.findUnique({
      where: { userId_mealDate_mealType: { userId, mealDate, mealType } }, include: ticketInclude,
    });
  }

  createTicket(data: Prisma.MealReservationUncheckedCreateInput) {
    return this.tx.mealReservation.create({ data, include: ticketInclude });
  }

  findApproval(studentId: string, mealDate: Date, mealType: Prisma.MealApprovalCreateManyInput["mealType"]) {
    return this.tx.mealApproval.findUnique({ where: { studentId_mealDate_mealType: { studentId, mealDate, mealType } } });
  }

  approve(data: Prisma.MealApprovalUncheckedCreateInput) {
    const { studentId, mealDate, mealType } = data;
    return this.tx.mealApproval.upsert({
      where: { studentId_mealDate_mealType: { studentId, mealDate, mealType } }, create: data, update: {},
    });
  }

  findNotice(userId: string, requestId: string) {
    return this.tx.mealCollectionNotice.findUnique({ where: { userId_requestId: { userId, requestId } } });
  }

  createNotice(data: Prisma.MealCollectionNoticeUncheckedCreateInput) {
    return this.tx.mealCollectionNotice.create({ data });
  }

  findWindow(mealType: Prisma.MealCollectionWindowCreateInput["mealType"]) {
    return this.tx.mealCollectionWindow.findUnique({ where: { mealType } });
  }

  listWindows() {
    return this.tx.mealCollectionWindow.findMany({ orderBy: { mealType: "asc" } });
  }

  updateWindow(data: Prisma.MealCollectionWindowCreateInput) {
    const { mealType, opensAt, closesAt } = data;
    return this.tx.mealCollectionWindow.upsert({
      where: { mealType }, create: data, update: { opensAt, closesAt },
    });
  }

  async list(where: { userId?: string; houseIds?: string[]; intake?: boolean }, mealDate: Date) {
    const scope = where.houseIds ? {
      OR: [{ submittedHouseId: { in: where.houseIds } }, ...(where.intake ? [{ submittedHouseId: null }] : [])],
    } : { userId: where.userId };
    const tickets = await this.tx.mealReservation.findMany({
      where: { ...scope, mealDate }, include: ticketInclude, orderBy: { reservedAt: "desc" },
    });
    const notices = await this.tx.mealCollectionNotice.findMany({
      where: { ...scope, mealDate }, orderBy: { submittedAt: "desc" },
    });
    return { tickets, notices };
  }
}
