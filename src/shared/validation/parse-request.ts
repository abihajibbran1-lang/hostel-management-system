import { type ZodType, z } from "zod";

export async function parseJsonBody<T>(request: Request, schema: ZodType<T>) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    body = undefined;
  }

  return schema.safeParse(body);
}

export const emptyObjectSchema = z.object({}).strict();
