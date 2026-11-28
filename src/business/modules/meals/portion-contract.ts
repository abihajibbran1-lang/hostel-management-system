import { z } from "zod";
import { mealSlotSchema } from "./arrangement-contract.ts";

const count = z.number().int().max(2_147_483_647);
export const portionLogSchema = mealSlotSchema.extend({
  portionCount: count.positive(),
  requestId: z.string().uuid(),
});
export const portionAuditSchema = z.object({
  observedPortions: count.nonnegative(),
  description: z.string().trim().max(2000).optional(),
}).strict();

export type PortionLogInput = z.infer<typeof portionLogSchema>;
export type PortionAuditInput = z.infer<typeof portionAuditSchema>;
