import { mutateMenu } from "../../menu-handlers.ts";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return mutateMenu(request, (await context.params).id, "edit");
}
