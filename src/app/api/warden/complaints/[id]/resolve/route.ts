import { createResolveComplaintHandler } from "./resolve-complaint-handler.ts";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  return createResolveComplaintHandler()(request, context);
}
