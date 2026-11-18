import { createNotificationInboxHandler } from "./notification-inbox-handler.ts";

export async function GET(request: Request) {
  return createNotificationInboxHandler()(request);
}
