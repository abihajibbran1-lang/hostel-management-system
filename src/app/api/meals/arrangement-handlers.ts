import { z } from "zod";
import { NextResponse } from "next/server.js";
import { getVerifiedAuthenticatedUserId } from "../../../shared/auth/authenticated-request.ts";
import { validateRequestOrigin } from "../../../shared/security/origin-validation.ts";
import { parseJsonBody } from "../../../shared/validation/parse-request.ts";
import { apiAuthenticationFailed, apiForbidden, apiInternalError, apiSuccess, apiValidationError } from "../../../shared/api/response.ts";
import { mealApprovalSchema, mealNoticeSchema, mealSlotSchema, mealWindowSchema } from "../../../business/modules/meals/arrangement-contract.ts";
import { menuDateSchema } from "../../../business/modules/meals/menu-contract.ts";
import {
  approveMealCommitment, ArrangementError, getCollectionWindows, getMealArrangements,
  reserveMeal, submitCollectionNotice, updateCollectionWindow,
} from "../../../business/modules/meals/arrangement-service.ts";

type Operation = "STUDENT" | "KITCHEN_STAFF" | "WARDEN" | "MANAGER" | "approval" | "reservation" | "notice" | "window";
const roles = { approval: "WARDEN", reservation: "STUDENT", notice: "STUDENT", window: "MANAGER" } as const;

export async function mealArrangement(request: Request, operation: Operation) {
  const userId = getVerifiedAuthenticatedUserId(request);
  if (!userId) return apiAuthenticationFailed();
  const role = operation in roles ? roles[operation as keyof typeof roles] : operation;
  if (request.headers.get("x-auth-role") !== role) return apiForbidden();
  if (request.method !== "GET" && validateRequestOrigin(request) !== "same-origin") return apiForbidden();
  try {
    switch (operation) {
      case "approval": {
        const result = await parseJsonBody(request, mealApprovalSchema);
        return result.success ? apiSuccess({ approval: await approveMealCommitment(userId, result.data) }) : apiValidationError(result.error);
      }
      case "reservation": {
        const result = await parseJsonBody(request, mealSlotSchema);
        return result.success ? apiSuccess({ ticket: await reserveMeal(userId, result.data) }) : apiValidationError(result.error);
      }
      case "notice": {
        const result = await parseJsonBody(request, mealNoticeSchema);
        return result.success ? apiSuccess({ notice: await submitCollectionNotice(userId, result.data) }) : apiValidationError(result.error);
      }
      case "window": {
        const result = await parseJsonBody(request, mealWindowSchema);
        return result.success ? apiSuccess({ window: await updateCollectionWindow(result.data) }) : apiValidationError(result.error);
      }
      case "MANAGER":
        return apiSuccess({ windows: await getCollectionWindows() });
      default: {
        const result = menuDateSchema.safeParse(new URL(request.url).searchParams.get("date"));
        return result.success ? apiSuccess(await getMealArrangements({ userId, role: operation }, result.data)) : apiValidationError(result.error);
      }
    }
  } catch (error) {
    if (!(error instanceof ArrangementError)) return apiInternalError();
    if (error.status === 403) return apiForbidden();
    if (error.status === 400) {
      return apiValidationError(new z.ZodError([{ code: "custom", path: [], message: error.message }]));
    }
    return NextResponse.json({
      error: { code: error.status === 409 ? "CONFLICT" : "UNAVAILABLE", message: error.message },
    }, { status: error.status });
  }
}
