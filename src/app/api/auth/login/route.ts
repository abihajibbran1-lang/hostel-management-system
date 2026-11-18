import { createLoginHandler } from "./login-handler.ts";

export async function POST(request: Request) {
  return createLoginHandler()(request);
}
