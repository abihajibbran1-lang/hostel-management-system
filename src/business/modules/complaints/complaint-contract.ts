import { z } from "zod";

export const COMPLAINT_CATEGORIES = [
  "Water",
  "Hygiene",
  "Pests",
  "Electricity",
  "Facilities",
] as const;

export const COMPLAINT_STATUSES = [
  "Pending",
  "In Progress",
  "Resolved",
  "Escalated",
] as const;

export const complaintCategorySchema = z.enum(COMPLAINT_CATEGORIES);
export const complaintStatusSchema = z.enum(COMPLAINT_STATUSES);

const roomNumberSchema = z
  .string()
  .trim()
  .min(1)
  .max(30)
  .regex(/^[A-Za-z0-9 \-]+$/, "Use only letters, numbers, spaces and hyphens.");

const descriptionSchema = z.string().trim().min(1);

export const createComplaintSchema = z
  .object({
    category: complaintCategorySchema,
    roomNumber: roomNumberSchema,
    description: descriptionSchema,
    urgencyFlag: z.boolean(),
  })
  .strict();

export const complaintIdSchema = z.string().uuid();

export const complaintListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).optional(),
});

const complaintCursorPayloadSchema = z.object({ id: z.string().uuid() });

export function encodeComplaintCursor(complaintId: string) {
  return Buffer.from(JSON.stringify({ id: complaintId })).toString("base64url");
}

export function decodeComplaintCursor(cursor: string) {
  try {
    const parsed = complaintCursorPayloadSchema.parse(
      JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")),
    );
    return parsed.id;
  } catch {
    return undefined;
  }
}

export const complaintCursorQuerySchema = complaintListQuerySchema.extend({
  cursor: z
    .string()
    .min(1)
    .transform((cursor, context) => {
      const decoded = decodeComplaintCursor(cursor);
      if (!decoded) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid cursor." });
        return z.NEVER;
      }
      return decoded;
    })
    .optional(),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type ComplaintListQuery = { limit: number; cursor?: string };
