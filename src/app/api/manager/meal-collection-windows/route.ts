import { mealArrangement } from "../../meals/arrangement-handlers.ts";

export function GET(request: Request) {
  return mealArrangement(request, "MANAGER");
}

export function PATCH(request: Request) {
  return mealArrangement(request, "window");
}
