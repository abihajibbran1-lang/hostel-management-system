import { z } from "zod";

import {
  complaintCursorQuerySchema,
  complaintStatusSchema,
} from "./complaint-contract.ts";

export { complaintIdSchema } from "./complaint-contract.ts";

const queryBooleanSchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

export const wardenComplaintQueueQuerySchema = complaintCursorQuerySchema.extend({
  status: complaintStatusSchema.optional(),
  urgencyFlag: queryBooleanSchema.optional(),
  queue: z.enum(["house", "intake"]).optional(),
});

export const resolveComplaintSchema = z
  .object({
    outcome: z.string().trim().min(1),
  })
  .strict();

export const updateUrgencySchema = z
  .object({
    urgencyFlag: z.boolean(),
    reason: z.string().trim().min(1),
  })
  .strict();

export type WardenComplaintQueueQuery = z.infer<typeof wardenComplaintQueueQuerySchema>;
export type ResolveComplaintInput = z.infer<typeof resolveComplaintSchema>;
export type UpdateUrgencyInput = z.infer<typeof updateUrgencySchema>;
