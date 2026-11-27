import { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma.ts";
import type { MenuEdit } from "../../../business/modules/meals/menu-contract.ts";
import { toMenuDate } from "../../../business/modules/meals/menu-contract.ts";

const include = { items: { orderBy: [{ mealDate: "asc" }, { mealType: "asc" }] } } satisfies Prisma.WeeklyMenuInclude;
export type MenuRecord = Prisma.WeeklyMenuGetPayload<{ include: typeof include }>;

export class MenuRepository {
  private readonly client: Prisma.TransactionClient;

  constructor(client: Prisma.TransactionClient = prisma) {
    this.client = client;
  }

  findWeek(weekStartDate: Date) {
    return this.client.weeklyMenu.findUnique({ where: { weekStartDate }, include });
  }

  findPublishedDay(weekStartDate: Date, mealDate: Date) {
    return this.client.weeklyMenu.findFirst({
      where: { weekStartDate, status: "PUBLISHED" },
      include: { items: { where: { mealDate }, orderBy: { mealType: "asc" } } },
    });
  }

  async createDraft(weekStartDate: Date, createdBy: string) {
    try {
      return await this.client.weeklyMenu.create({ data: { weekStartDate, createdBy }, include });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return null;
      throw error;
    }
  }
}

export async function withLockedMenu<T>(id: string, run: (menu: MenuRecord | null, tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    // Serialize draft saves and publish against the same menu row.
    await tx.$queryRaw`SELECT id FROM weekly_menus WHERE id = ${id}::uuid FOR UPDATE`;
    const menu = await tx.weeklyMenu.findUnique({ where: { id }, include });
    return run(menu, tx);
  });
}

export async function writeMenuItems(tx: Prisma.TransactionClient, id: string, items: MenuEdit["items"]) {
  for (const item of items) {
    const slot = { weeklyMenuId: id, mealDate: toMenuDate(item.date), mealType: item.mealType };
    const fields = { itemName: item.name, description: item.description ?? null };
    await tx.menuItem.upsert({
      where: { weeklyMenuId_mealDate_mealType: slot },
      create: { ...slot, ...fields },
      update: fields,
    });
  }
  return tx.weeklyMenu.update({ where: { id }, data: { updatedAt: new Date() }, include });
}

export function markMenuPublished(tx: Prisma.TransactionClient, id: string) {
  return tx.weeklyMenu.update({ where: { id }, data: { status: "PUBLISHED" }, include });
}
