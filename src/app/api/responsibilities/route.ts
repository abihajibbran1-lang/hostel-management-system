import { listResponsibilities, postResponsibility } from "./handlers.ts";

export function GET(request: Request) {
  return listResponsibilities(request);
}

export const POST = postResponsibility;
