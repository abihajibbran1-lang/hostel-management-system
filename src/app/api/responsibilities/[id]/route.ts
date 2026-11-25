import { patchResponsibility, readResponsibility } from "../handlers.ts";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return readResponsibility(request, (await context.params).id);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return patchResponsibility(request, (await context.params).id);
}
