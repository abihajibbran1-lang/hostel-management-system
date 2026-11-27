import { z } from "zod";
import { karachiDateTimeToUtc } from "../schedules/personal-schedule-time.ts";
import { MEAL_TYPES, menuDateSchema, menuDateString, toMenuDate } from "./menu-contract.ts";

export const mealSlotSchema = z.object({ date: menuDateSchema, mealType: z.enum(MEAL_TYPES) }).strict();
export const mealApprovalSchema = mealSlotSchema.extend({ studentId: z.string().uuid() });
export const mealNoticeSchema = mealSlotSchema.extend({
  explanation: z.string().trim().min(1).max(500),
  reservationId: z.string().uuid().optional(),
  requestId: z.string().uuid(),
});
export type MealSlot = z.infer<typeof mealSlotSchema>;
export type MealApprovalInput = z.infer<typeof mealApprovalSchema>;
export type MealNoticeInput = z.infer<typeof mealNoticeSchema>;
const localTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a 24-hour time in HH:mm format.");
export const mealWindowSchema = z.object({
  mealType: z.enum(MEAL_TYPES), opensAt: localTime, closesAt: localTime,
}).strict().refine(({ opensAt, closesAt }) => opensAt < closesAt, {
  message: "Closing time must be later than opening time on the same day.", path: ["closesAt"],
});

export function reservationDeadline(date: string) {
  const previous = menuDateString(new Date(toMenuDate(date).getTime() - 86_400_000));
  return karachiDateTimeToUtc(`${previous}T21:00`);
}

export function noticeDeadline(date: string, opening?: string) {
  if (!opening || !/^([01]\d|2[0-3]):[0-5]\d$/.test(opening)) return null;
  const time = karachiDateTimeToUtc(`${date}T${opening}`);
  return time ? new Date(time.getTime() - 3_600_000) : null;
}
