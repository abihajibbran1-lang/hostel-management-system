import { NextResponse } from "next/server.js";
import { z } from "zod";
import { portionAuditSchema, portionLogSchema } from "../../../business/modules/meals/portion-contract.ts";
import { getPortionLogs, getPortionMenu, logPortions, PortionError, verifyPortions } from "../../../business/modules/meals/portion-service.ts";
import { menuDateSchema, menuIdSchema } from "../../../business/modules/meals/menu-contract.ts";
import { apiAuthenticationFailed, apiForbidden, apiInternalError, apiNotFound, apiSuccess, apiValidationError } from "../../../shared/api/response.ts";
import { getVerifiedAuthenticatedUserId } from "../../../shared/auth/authenticated-request.ts";
import { validateRequestOrigin } from "../../../shared/security/origin-validation.ts";
import { parseJsonBody } from "../../../shared/validation/parse-request.ts";

type Operation = "kitchen-list" | "log" | "warden-list" | "audit";

export async function portionRequest(request: Request, operation: Operation, id?: string) {
  const userId = getVerifiedAuthenticatedUserId(request);
  if (!userId) return apiAuthenticationFailed();
  const role = operation === "log" || operation === "kitchen-list" ? "KITCHEN_STAFF" : "WARDEN";
  if (request.headers.get("x-auth-role") !== role) return apiForbidden();
  if (request.method !== "GET" && validateRequestOrigin(request) !== "same-origin") return apiForbidden();

  try {
    if (operation === "log") {
      const result = await parseJsonBody(request, portionLogSchema);
      return result.success ? apiSuccess({ log: await logPortions(userId, result.data) }) : apiValidationError(result.error);
    }
    if (operation === "audit") {
      const parsedId = menuIdSchema.safeParse(id);
      if (!parsedId.success) return apiValidationError(parsedId.error);
      const result = await parseJsonBody(request, portionAuditSchema);
      return result.success ? apiSuccess({ log: await verifyPortions(userId, parsedId.data, result.data) }) : apiValidationError(result.error);
    }
    const result = menuDateSchema.safeParse(new URL(request.url).searchParams.get("date"));
    if (!result.success) return apiValidationError(result.error);
    const logs = await getPortionLogs(result.data);
    return apiSuccess({ logs, ...(operation === "kitchen-list" ? { items: await getPortionMenu(result.data) } : {}) });
  } catch (error) {
    if (!(error instanceof PortionError)) return apiInternalError();
    if (error.status === 404) return apiNotFound();
    if (error.status === 409) {
      return NextResponse.json({ error: { code: "CONFLICT", message: error.message } }, { status: 409 });
    }
    return apiValidationError(new z.ZodError([{ code: "custom", path: [], message: error.message }]));
  }
}
