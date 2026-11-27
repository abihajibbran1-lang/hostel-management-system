import { mutateMenu } from "../../../menu-handlers.ts";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return mutateMenu(request, (await context.params).id, "publish");
}
