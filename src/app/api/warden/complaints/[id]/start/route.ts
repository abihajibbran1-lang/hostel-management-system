import { createStartComplaintHandler } from "./start-complaint-handler.ts";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  return createStartComplaintHandler()(request, context);
}
