import { mealArrangement } from "../../meals/arrangement-handlers.ts";

export function GET(request: Request) {
  return mealArrangement(request, "WARDEN");
}
