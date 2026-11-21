import type { PersonalSchedule } from "@prisma/client";

export function toPersonalScheduleResponse(schedule: PersonalSchedule) {
  return {
    id: schedule.id,
    title: schedule.title,
    description: schedule.description,
    startAt: schedule.startAt,
    endAt: schedule.endAt,
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt,
  };
}
