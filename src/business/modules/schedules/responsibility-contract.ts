import { z } from "zod";

export const responsibilityId = z.string().uuid();
const title = z.string().trim().min(1).max(200);
const description = z.string().trim().min(1).max(2000);
const timestamp = z.string().datetime({ offset: true });
const distribution = {
  assignees: z.array(responsibilityId).min(1).max(50).refine(
    (ids) => new Set(ids).size === ids.length, "Choose each student only once.",
  ),
  acceptanceDeadline: timestamp,
};

export const responsibilityCreate = z.discriminatedUnion("action", [
  z.object({ action: z.literal("propose"), title, description, dueAt: timestamp }).strict(),
  z.object({ action: z.literal("create"), roomId: responsibilityId, title, description, dueAt: timestamp, ...distribution }).strict(),
]);

export const responsibilityCommand = z.discriminatedUnion("action", [
  z.object({ action: z.literal("distribute"), title, description, dueAt: timestamp, ...distribution }).strict(),
  z.object({ action: z.literal("copyEdit"), title, description }).strict(),
  z.object({ action: z.literal("accept") }).strict(),
  z.object({ action: z.literal("reject") }).strict(),
  z.object({ action: z.literal("complete") }).strict(),
  z.object({ action: z.literal("assistance") }).strict(),
  z.object({ action: z.literal("cancel") }).strict(),
  z.object({ action: z.literal("reportIncomplete") }).strict(),
  z.object({ action: z.literal("requestReview"), kind: z.enum(["fairness", "withdraw", "reopen", "cancel"]), note: description }).strict(),
  z.object({ action: z.literal("review"), reviewId: responsibilityId, approve: z.boolean() }).strict(),
]);

export type ResponsibilityCreate = z.infer<typeof responsibilityCreate>;
export type ResponsibilityCommand = z.infer<typeof responsibilityCommand>;
