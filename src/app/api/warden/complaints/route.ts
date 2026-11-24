import { createWardenComplaintListHandler } from "./warden-complaint-collection-handler.ts";

export async function GET(request: Request) {
  return createWardenComplaintListHandler()(request);
}
