import { createWardenComplaintGetHandler } from "./warden-complaint-item-handler.ts";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  return createWardenComplaintGetHandler()(request, context);
}
