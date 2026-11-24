import { createCorrectUrgencyHandler } from "./urgency-complaint-handler.ts";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return createCorrectUrgencyHandler()(request, context);
}
