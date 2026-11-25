import { z } from "zod";

export const NOTIFICATION_TITLE_MAX_LENGTH = 200;
export const NOTIFICATION_MESSAGE_MAX_LENGTH = 2_000;

export const NOTIFICATION_TYPES = [
  "schedule_activity",
  "responsibility_reminder",
  "responsibility_incomplete",
  "responsibility_assistance",
  "responsibility_update",
  "meal_reservation",
  "meal_collection_difficulty",
  "complaint_escalation",
] as const;

export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);

export const notificationDispatchRequestSchema = z.object({
  recipientUserId: z.string().uuid(),
  type: notificationTypeSchema,
  title: z.string().trim().min(1).max(NOTIFICATION_TITLE_MAX_LENGTH),
  message: z.string().trim().min(1).max(NOTIFICATION_MESSAGE_MAX_LENGTH),
  relatedModule: z.string().trim().min(1),
  relatedEntityId: z.string().trim().min(1),
  deduplicationKey: z.string().trim().min(1),
});

export type NotificationDispatchRequest = z.infer<typeof notificationDispatchRequestSchema>;

export type NotificationInboxQuery = {
  limit: number;
  cursor?: string;
};

const notificationCursorPayloadSchema = z.object({ id: z.string().uuid() });

export function encodeNotificationCursor(notificationId: string) {
  return Buffer.from(JSON.stringify({ id: notificationId })).toString("base64url");
}

export function decodeNotificationCursor(cursor: string) {
  try {
    return notificationCursorPayloadSchema.parse(
      JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")),
    ).id;
  } catch {
    return undefined;
  }
}

export const notificationInboxQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z
    .string()
    .min(1)
    .transform((cursor, context) => {
      const decodedCursor = decodeNotificationCursor(cursor);

      if (!decodedCursor) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid cursor." });
        return z.NEVER;
      }

      return decodedCursor;
    })
    .optional(),
});
