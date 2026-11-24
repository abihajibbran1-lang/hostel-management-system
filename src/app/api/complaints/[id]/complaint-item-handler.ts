import { complaintIdSchema } from "../../../../business/modules/complaints/complaint-contract.ts";
import { toComplaintResponse } from "../../../../business/modules/complaints/complaint-response.ts";
import { ComplaintService } from "../../../../business/modules/complaints/complaint-service.ts";
import {
  apiInternalError,
  apiNotFound,
  apiSuccess,
  apiValidationError,
} from "../../../../shared/api/response.ts";
import { getStudentComplaintIdentity } from "../complaint-request-auth.ts";

type ComplaintItemPort = Pick<ComplaintService, "getOwned">;
type ItemContext = { params: Promise<{ id: string }> };

async function parseComplaintId(context: ItemContext) {
  const params = await context.params;
  return complaintIdSchema.safeParse(params.id);
}

export function createComplaintGetHandler(complaintService?: ComplaintItemPort) {
  return async function getComplaint(request: Request, context: ItemContext) {
    const identity = getStudentComplaintIdentity(request);

    if (!identity.ok) {
      return identity.response;
    }

    const complaintId = await parseComplaintId(context);
    if (!complaintId.success) {
      return apiValidationError(complaintId.error);
    }

    try {
      const complaint = await (complaintService ?? new ComplaintService()).getOwned(
        identity.userId,
        complaintId.data,
      );

      return complaint
        ? apiSuccess({ complaint: toComplaintResponse(complaint) })
        : apiNotFound();
    } catch {
      return apiInternalError();
    }
  };
}
