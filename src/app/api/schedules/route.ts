import {
  createPersonalScheduleCreateHandler,
  createPersonalScheduleListHandler,
} from "./schedule-collection-handler.ts";

export async function GET(request: Request) {
  return createPersonalScheduleListHandler()(request);
}

export async function POST(request: Request) {
  return createPersonalScheduleCreateHandler()(request);
}
