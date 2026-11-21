import type { PersonalSchedule } from "@prisma/client";
import { z } from "zod";

import {
  personalScheduleIntervalSchema,
  type CreatePersonalScheduleInput,
  type UpdatePersonalScheduleInput,
} from "./personal-schedule-contract.ts";
import { getKarachiDayBounds, karachiLocalDateSchema } from "./personal-schedule-time.ts";
import {
  PersonalScheduleRepository,
  type PersonalScheduleUpdate,
  type PersonalScheduleWrite,
} from "../../../data/repositories/schedules/personal-schedule-repository.ts";

type PersonalScheduleStore = {
  create(userId: string, schedule: PersonalScheduleWrite): Promise<PersonalSchedule>;
  listIntersectingDay(userId: string, startAt: Date, endAt: Date): Promise<PersonalSchedule[]>;
  findOwned(userId: string, scheduleId: string): Promise<PersonalSchedule | null>;
  updateOwned(
    userId: string,
    scheduleId: string,
    schedule: PersonalScheduleUpdate,
  ): Promise<PersonalSchedule | null>;
};

export class PersonalScheduleService {
  private readonly schedules: PersonalScheduleStore;

  constructor(schedules: PersonalScheduleStore = new PersonalScheduleRepository()) {
    this.schedules = schedules;
  }

  async create(userId: string, input: CreatePersonalScheduleInput): Promise<PersonalSchedule> {
    const startAt = new Date(input.startAt);
    const endAt = new Date(input.endAt);
    personalScheduleIntervalSchema.parse({ startAt, endAt });

    const schedule: PersonalScheduleWrite = {
      title: input.title,
      description: input.description,
      startAt,
      endAt,
    };

    return this.schedules.create(userId, schedule);
  }

  listForDate(userId: string, date: string): Promise<PersonalSchedule[]> {
    const selectedDate = karachiLocalDateSchema.parse(date);
    const bounds = getKarachiDayBounds(selectedDate);

    return this.schedules.listIntersectingDay(userId, bounds.startAt, bounds.endAt);
  }

  getOwned(userId: string, scheduleId: string): Promise<PersonalSchedule | null> {
    return this.schedules.findOwned(userId, scheduleId);
  }

  async updateOwned(
    userId: string,
    scheduleId: string,
    input: UpdatePersonalScheduleInput,
  ): Promise<PersonalSchedule | null> {
    const existing = await this.schedules.findOwned(userId, scheduleId);

    if (!existing) {
      return null;
    }

    const startAt = input.startAt === undefined ? existing.startAt : new Date(input.startAt);
    const endAt = input.endAt === undefined ? existing.endAt : new Date(input.endAt);
    personalScheduleIntervalSchema.parse({ startAt, endAt });

    const update: PersonalScheduleUpdate = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.startAt !== undefined ? { startAt } : {}),
      ...(input.endAt !== undefined ? { endAt } : {}),
    };

    const updated = await this.schedules.updateOwned(userId, scheduleId, update);
    if (updated) {
      return updated;
    }

    const current = await this.schedules.findOwned(userId, scheduleId);
    if (!current) {
      return null;
    }

    const latestStartAt = input.startAt === undefined ? current.startAt : new Date(input.startAt);
    const latestEndAt = input.endAt === undefined ? current.endAt : new Date(input.endAt);
    personalScheduleIntervalSchema.parse({ startAt: latestStartAt, endAt: latestEndAt });
    throw new z.ZodError([
      {
        code: "custom",
        message: "The schedule changed during this update. Reload and try again.",
        path: [],
      },
    ]);
  }
}

export function isScheduleValidationError(error: unknown): error is z.ZodError {
  return error instanceof z.ZodError;
}
