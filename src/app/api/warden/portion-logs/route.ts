import { portionRequest } from "../../meals/portion-handlers.ts";

export function GET(request: Request) {
  return portionRequest(request, "warden-list");
}
