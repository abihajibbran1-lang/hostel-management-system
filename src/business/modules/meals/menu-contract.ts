import { z } from "zod";

export const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER"] as const;
export const MEAL_LABELS = { BREAKFAST: "Breakfast", LUNCH: "Lunch", DINNER: "Dinner" };
const DAYS = 7;
const DAY_MS = 86_400_000;

export function toMenuDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

export function menuDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function menuWeekStart(date: Date) {
  const weekday = (date.getUTCDay() + 6) % DAYS;
  return new Date(date.getTime() - weekday * DAY_MS);
}

export function menuWeekDates(weekStart: string) {
  const start = toMenuDate(weekStart).getTime();
  return Array.from({ length: DAYS }, (_, index) => menuDateString(new Date(start + index * DAY_MS)));
}

export const menuDateSchema = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = toMenuDate(value);
  return Number.isFinite(date.getTime()) && menuDateString(date) === value;
}, "Enter a valid calendar date.");

export const menuWeekSchema = menuDateSchema.refine((value) => toMenuDate(value).getUTCDay() === 1, "Choose a Monday.");
export const menuIdSchema = z.string().uuid();
export const createMenuSchema = z.object({ weekStart: menuWeekSchema }).strict();
export const editMenuSchema = z.object({
  items: z.array(z.object({
    date: menuDateSchema,
    mealType: z.enum(MEAL_TYPES),
    name: z.string().trim().min(1),
    description: z.string().trim().nullable().optional(),
  }).strict()).min(1).max(DAYS * MEAL_TYPES.length),
}).strict().refine(({ items }) => new Set(items.map(({ date, mealType }) => `${date}:${mealType}`)).size === items.length,
  { message: "Only one entry per date and meal type is allowed.", path: ["items"] });

export type MenuEdit = z.infer<typeof editMenuSchema>;
