import { mealArrangement } from "../../meals/arrangement-handlers.ts";

export function POST(request: Request) {
  return mealArrangement(request, "approval");
}
