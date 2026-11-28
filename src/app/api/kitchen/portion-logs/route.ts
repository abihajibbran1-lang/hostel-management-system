import { portionRequest } from "../../meals/portion-handlers.ts";

export function GET(request: Request) {
  return portionRequest(request, "kitchen-list");
}

export function POST(request: Request) {
  return portionRequest(request, "log");
}
