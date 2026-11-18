import { createMarkNotificationReadHandler } from "./mark-read-handler.ts";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return createMarkNotificationReadHandler()(request, context);
}
