import {
  createComplaintCreateHandler,
  createComplaintListHandler,
} from "./complaint-collection-handler.ts";

export async function GET(request: Request) {
  return createComplaintListHandler()(request);
}

export async function POST(request: Request) {
  return createComplaintCreateHandler()(request);
}
