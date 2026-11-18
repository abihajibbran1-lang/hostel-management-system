import { createLogoutHandler } from "./logout-handler.ts";

export async function POST(request: Request) {
  return createLogoutHandler()(request);
}
