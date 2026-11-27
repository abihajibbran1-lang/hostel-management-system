import { z } from "zod";
import { getVerifiedAuthenticatedUserId } from "../../../shared/auth/authenticated-request.ts";
import { validateRequestOrigin } from "../../../shared/security/origin-validation.ts";
import { parseJsonBody } from "../../../shared/validation/parse-request.ts";
import { apiAuthenticationFailed, apiForbidden, apiInternalError, apiNotFound, apiSuccess, apiValidationError } from "../../../shared/api/response.ts";
import { createMenuSchema, editMenuSchema, menuDateSchema, menuIdSchema, menuWeekSchema } from "../../../business/modules/meals/menu-contract.ts";
import { createDraftMenu, getKitchenMenu, getPublishedMenu, MenuError, publishMenu, saveMenu } from "../../../business/modules/meals/menu-service.ts";
import { NextResponse } from "next/server.js";

function errorResponse(error: unknown) {
  if (!(error instanceof MenuError)) return apiInternalError();
  if (error.status === 404) return apiNotFound();
  if (error.status === 409) {
    return NextResponse.json({ error: { code: "CONFLICT", message: error.message } }, { status: 409 });
  }
  return apiValidationError(new z.ZodError([{ code: "custom", path: [], message: error.message }]));
}

function authorize(request: Request, role: "STUDENT" | "KITCHEN_STAFF") {
  const userId = getVerifiedAuthenticatedUserId(request);
  if (!userId) return { allowed: false, response: apiAuthenticationFailed() } as const;
  if (request.headers.get("x-auth-role") !== role) return { allowed: false, response: apiForbidden() } as const;
  return { allowed: true, userId } as const;
}

export async function studentMenu(request: Request) {
  const actor = authorize(request, "STUDENT");
  if (!actor.allowed) return actor.response;
  const date = menuDateSchema.safeParse(new URL(request.url).searchParams.get("date"));
  if (!date.success) return apiValidationError(date.error);
  try {
    return apiSuccess(await getPublishedMenu(date.data));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function kitchenMenu(request: Request) {
  const write = request.method === "POST";
  if (write && validateRequestOrigin(request) !== "same-origin") return apiForbidden();
  const actor = authorize(request, "KITCHEN_STAFF");
  if (!actor.allowed) return actor.response;
  try {
    if (write) {
      const body = await parseJsonBody(request, createMenuSchema);
      if (!body.success) return apiValidationError(body.error);
      return apiSuccess({ menu: await createDraftMenu(body.data.weekStart, actor.userId) }, 201);
    }
    const week = menuWeekSchema.safeParse(new URL(request.url).searchParams.get("weekStart"));
    if (!week.success) return apiValidationError(week.error);
    return apiSuccess({ menu: await getKitchenMenu(week.data) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function mutateMenu(request: Request, id: string, action: "edit" | "publish") {
  if (validateRequestOrigin(request) !== "same-origin") return apiForbidden();
  const actor = authorize(request, "KITCHEN_STAFF");
  if (!actor.allowed) return actor.response;
  const parsedId = menuIdSchema.safeParse(id);
  if (!parsedId.success) return apiValidationError(parsedId.error);
  try {
    if (action === "publish") return apiSuccess({ menu: await publishMenu(parsedId.data) });
    const body = await parseJsonBody(request, editMenuSchema);
    if (!body.success) return apiValidationError(body.error);
    return apiSuccess({ menu: await saveMenu(parsedId.data, body.data) });
  } catch (error) {
    return errorResponse(error);
  }
}
