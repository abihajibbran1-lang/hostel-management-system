import { z } from "zod";
import { responsibilityId, responsibilityCreate, responsibilityCommand } from "../../../business/modules/schedules/responsibility-contract.ts";
import { changeResponsibility, createResponsibility, DutyError, getResponsibilityDirectory } from "../../../business/modules/schedules/responsibility-service.ts";
import type { AuthenticatedIdentity } from "../../../business/modules/auth/jwt-service.ts";
import { apiAuthenticationFailed, apiForbidden, apiInternalError, apiNotFound, apiSuccess, apiValidationError } from "../../../shared/api/response.ts";
import { getVerifiedAuthenticatedUserId } from "../../../shared/auth/authenticated-request.ts";
import { validateRequestOrigin } from "../../../shared/security/origin-validation.ts";
import { parseJsonBody } from "../../../shared/validation/parse-request.ts";

function identity(request: Request): AuthenticatedIdentity | null {
  const userId = getVerifiedAuthenticatedUserId(request);
  const role = request.headers.get("x-auth-role");
  return userId && (role === "STUDENT" || role === "WARDEN" || role === "MANAGER" || role === "KITCHEN_STAFF")
    ? { userId, role } : null;
}

function failure(error: unknown) {
  if (!(error instanceof DutyError)) return apiInternalError();
  if (error.status === 403) return apiForbidden();
  if (error.status === 404) return apiNotFound();
  return apiValidationError(new z.ZodError([{ code: "custom", path: [], message: error.message }]));
}

export async function listResponsibilities(request: Request, assistanceOnly = false) {
  const actor = identity(request);
  if (!actor) return apiAuthenticationFailed();
  try {
    return apiSuccess(await getResponsibilityDirectory(actor, assistanceOnly));
  } catch (error) {
    return failure(error);
  }
}

export async function readResponsibility(request: Request, id: string) {
  const actor = identity(request);
  if (!actor) return apiAuthenticationFailed();
  if (!responsibilityId.safeParse(id).success) return apiNotFound();
  try {
    const { duties } = await getResponsibilityDirectory(actor, false, id);
    return duties.length ? apiSuccess({ duty: duties[0] }) : apiNotFound();
  } catch (error) {
    return failure(error);
  }
}

export async function postResponsibility(request: Request) {
  if (validateRequestOrigin(request) !== "same-origin") return apiForbidden();
  const actor = identity(request);
  if (!actor) return apiAuthenticationFailed();
  const body = await parseJsonBody(request, responsibilityCreate);
  if (!body.success) return apiValidationError(body.error);
  if ((actor.role !== "STUDENT" || body.data.action !== "propose") &&
      (actor.role !== "WARDEN" || body.data.action !== "create")) return apiForbidden();
  try {
    return apiSuccess(await createResponsibility(actor, body.data), 201);
  } catch (error) {
    return failure(error);
  }
}

export async function patchResponsibility(request: Request, id: string) {
  if (validateRequestOrigin(request) !== "same-origin") return apiForbidden();
  const actor = identity(request);
  if (!actor) return apiAuthenticationFailed();
  if (actor.role !== "STUDENT" && actor.role !== "WARDEN") return apiForbidden();
  const parsedId = responsibilityId.safeParse(id);
  if (!parsedId.success) return apiValidationError(parsedId.error);
  const body = await parseJsonBody(request, responsibilityCommand);
  if (!body.success) return apiValidationError(body.error);
  try {
    return apiSuccess(await changeResponsibility(actor, parsedId.data, body.data));
  } catch (error) {
    return failure(error);
  }
}
