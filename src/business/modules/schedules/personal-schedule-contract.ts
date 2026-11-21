import { z } from "zod";

import { karachiLocalDateSchema } from "./personal-schedule-time.ts";

const timestampSchema = z.string().datetime({ offset: true });
const descriptionSchema = z.string().trim().nullable().optional();

function hasValidInterval(startAt: string, endAt: string) {
  return Date.parse(endAt) > Date.parse(startAt);
}

export const createPersonalScheduleSchema = z
  .object({
    title: z.string().trim().min(1),
    description: descriptionSchema,
    startAt: timestampSchema,
    endAt: timestampSchema,
  })
  .strict()
  .refine((schedule) => hasValidInterval(schedule.startAt, schedule.endAt), {
    message: "End time must be later than start time.",
    path: ["endAt"],
  });

export const updatePersonalScheduleSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: descriptionSchema,
    startAt: timestampSchema.optional(),
    endAt: timestampSchema.optional(),
  })
  .strict()
  .refine((schedule) => Object.values(schedule).some((value) => value !== undefined), {
    message: "Provide at least one field to update.",
  });

export const personalScheduleIntervalSchema = z
  .object({ startAt: z.date(), endAt: z.date() })
  .refine((schedule) => schedule.endAt.getTime() > schedule.startAt.getTime(), {
    message: "End time must be later than start time.",
    path: ["endAt"],
  });

export const personalScheduleIdSchema = z.string().uuid();

export const listPersonalSchedulesQuerySchema = z
  .object({ date: karachiLocalDateSchema })
  .strict();

export type CreatePersonalScheduleInput = z.infer<typeof createPersonalScheduleSchema>;
export type UpdatePersonalScheduleInput = z.infer<typeof updatePersonalScheduleSchema>;
