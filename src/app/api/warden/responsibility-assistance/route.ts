import { listResponsibilities } from "../../responsibilities/handlers.ts";

export function GET(request: Request) {
  return listResponsibilities(request, true);
}
