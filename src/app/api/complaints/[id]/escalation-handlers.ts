import { z } from "zod";
import { ComplaintService } from "../../../../business/modules/complaints/complaint-service.ts";
import { complaintIdSchema } from "../../../../business/modules/complaints/complaint-contract.ts";
import { toStudentComplaintResponse } from "../../../../business/modules/complaints/complaint-response.ts";
import { createComplaintFollowUp, followUpSchema, requestComplaintEscalation } from "../../../../business/modules/complaints/escalation-service.ts";
import { apiForbidden, apiInternalError, apiNotFound, apiSuccess, apiValidationError } from "../../../../shared/api/response.ts";
import { validateRequestOrigin } from "../../../../shared/security/origin-validation.ts";
import { parseJsonBody } from "../../../../shared/validation/parse-request.ts";
import { getStudentComplaintIdentity } from "../complaint-request-auth.ts";

export type ComplaintContext = { params: Promise<{ id: string }> };
const invalid = (message: string) => apiValidationError(new z.ZodError([{ code: "custom", path: [], message }]));

export async function studentEscalation(request: Request, context: ComplaintContext) {
  const write = request.method === "POST";
  if (write && validateRequestOrigin(request) !== "same-origin") return apiForbidden();
  const actor = getStudentComplaintIdentity(request);
  if (!actor.ok) return actor.response;
  const id = complaintIdSchema.safeParse((await context.params).id);
  if (!id.success) return apiValidationError(id.error);
  try {
    if (!write) {
      const complaint = await new ComplaintService().getOwned(actor.userId, id.data);
      if (!complaint) return apiNotFound();
      return apiSuccess({ canEscalate: toStudentComplaintResponse(complaint).canEscalate ?? false });
    }
    const result = await requestComplaintEscalation(actor.userId, id.data);
    if (result === "missing") return apiNotFound();
    if (result === "ineligible") return invalid("This complaint is not currently eligible for escalation.");
    if (result === "unavailable") return invalid("Escalation is temporarily unavailable. Try again later.");
    return apiSuccess({ status: "Escalated" });
  } catch {
    return apiInternalError();
  }
}

export async function postFollowUp(request: Request, context: ComplaintContext) {
  if (validateRequestOrigin(request) !== "same-origin") return apiForbidden();
  const actor = getStudentComplaintIdentity(request);
  if (!actor.ok) return actor.response;
  const id = complaintIdSchema.safeParse((await context.params).id);
  if (!id.success) return apiValidationError(id.error);
  const body = await parseJsonBody(request, followUpSchema);
  if (!body.success) return apiValidationError(body.error);
  try {
    const created = await createComplaintFollowUp(actor.userId, id.data, body.data);
    if (created.result === "missing") return apiNotFound();
    if (created.result === "ineligible") return invalid("Follow-ups require a resolved original complaint.");
    return apiSuccess({ complaint: toStudentComplaintResponse(created.complaint), trackingReference: created.complaint.id }, 201);
  } catch {
    return apiInternalError();
  }
}
