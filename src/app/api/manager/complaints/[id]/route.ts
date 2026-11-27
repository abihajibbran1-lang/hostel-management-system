import { managerComplaints } from "../handlers.ts";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return managerComplaints(request, (await context.params).id);
}
