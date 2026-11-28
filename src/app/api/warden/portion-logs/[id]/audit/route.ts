import { portionRequest } from "../../../../meals/portion-handlers.ts";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return portionRequest(request, "audit", (await context.params).id);
}
