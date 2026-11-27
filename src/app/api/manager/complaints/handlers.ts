import { apiAuthenticationFailed, apiForbidden, apiInternalError, apiNotFound, apiSuccess, apiValidationError } from "../../../../shared/api/response.ts";
import { getVerifiedAuthenticatedUserId } from "../../../../shared/auth/authenticated-request.ts";
import { complaintCursorQuerySchema, complaintIdSchema } from "../../../../business/modules/complaints/complaint-contract.ts";
import { managerComplaintDetail, managerComplaintQueue } from "../../../../business/modules/complaints/manager-complaint-service.ts";

export async function managerComplaints(request: Request, id?: string) {
  const userId = getVerifiedAuthenticatedUserId(request);
  if (!userId) return apiAuthenticationFailed();
  if (request.headers.get("x-auth-role") !== "MANAGER") return apiForbidden();
  try {
    if (id !== undefined) {
      const parsed = complaintIdSchema.safeParse(id);
      if (!parsed.success) return apiValidationError(parsed.error);
      const complaint = await managerComplaintDetail(userId, parsed.data);
      return complaint ? apiSuccess({ complaint }) : apiNotFound();
    }
    const query = complaintCursorQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!query.success) return apiValidationError(query.error);
    return apiSuccess(await managerComplaintQueue(userId, query.data));
  } catch {
    return apiInternalError();
  }
}
