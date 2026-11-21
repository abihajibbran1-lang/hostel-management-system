import {
  createPersonalScheduleGetHandler,
  createPersonalScheduleUpdateHandler,
} from "./schedule-item-handler.ts";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  return createPersonalScheduleGetHandler()(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return createPersonalScheduleUpdateHandler()(request, context);
}
