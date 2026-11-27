import { mealArrangement } from "../../arrangement-handlers.ts";

export function GET(request: Request) {
  return mealArrangement(request, "STUDENT");
}
