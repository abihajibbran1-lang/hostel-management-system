import { managerComplaints } from "./handlers.ts";

export function GET(request: Request) {
  return managerComplaints(request);
}
