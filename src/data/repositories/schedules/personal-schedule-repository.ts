import type { PersonalSchedule, Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "../../database/prisma.ts";

type PersonalSchedulePrismaClient = Pick<PrismaClient, "personalSchedule">;

export type PersonalScheduleWrite = {
  title: string;
  description?: string | null;
  startAt: Date;
  endAt: Date;
};

export type PersonalScheduleUpdate = Partial<PersonalScheduleWrite>;

export class PersonalScheduleRepository {
  private readonly client: PersonalSchedulePrismaClient;

  constructor(client: PersonalSchedulePrismaClient = prisma) {
    this.client = client;
  }

  create(userId: string, schedule: PersonalScheduleWrite): Promise<PersonalSchedule> {
    return this.client.personalSchedule.create({
      data: { ...schedule, userId },
    });
  }

  listIntersectingDay(userId: string, startAt: Date, endAt: Date) {
    return this.client.personalSchedule.findMany({
      where: {
        userId,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      orderBy: [{ startAt: "asc" }, { id: "asc" }],
    });
  }

  findOwned(userId: string, scheduleId: string) {
    return this.client.personalSchedule.findFirst({
      where: { id: scheduleId, userId },
    });
  }

  async updateOwned(userId: string, scheduleId: string, schedule: PersonalScheduleUpdate) {
    const where: Prisma.PersonalScheduleWhereInput = { id: scheduleId, userId };

    if (schedule.startAt !== undefined && schedule.endAt === undefined) {
      where.endAt = { gt: schedule.startAt };
    } else if (schedule.endAt !== undefined && schedule.startAt === undefined) {
      where.startAt = { lt: schedule.endAt };
    }

    const result = await this.client.personalSchedule.updateMany({
      where,
      data: schedule,
    });

    if (result.count === 0) {
      return null;
    }

    return this.findOwned(userId, scheduleId);
  }
}
