import { mealArrangement } from "../arrangement-handlers.ts";

export function POST(request: Request) {
  return mealArrangement(request, "notice");
}
