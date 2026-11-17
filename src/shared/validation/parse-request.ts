import { type ZodType, z } from "zod";

export async function parseJsonBody<T>(request: Request, schema: ZodType<T>) {
  const body: unknown = await request.json();
  return schema.safeParse(body);
}

export const emptyObjectSchema = z.object({}).strict();
