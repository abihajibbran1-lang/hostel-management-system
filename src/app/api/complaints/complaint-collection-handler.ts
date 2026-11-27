import {
  createComplaintSchema,
  complaintCursorQuerySchema,
  encodeComplaintCursor,
} from "../../../business/modules/complaints/complaint-contract.ts";
import { toStudentComplaintResponse } from "../../../business/modules/complaints/complaint-response.ts";
import { ComplaintService } from "../../../business/modules/complaints/complaint-service.ts";
import {
  apiForbidden,
  apiInternalError,
  apiSuccess,
  apiValidationError,
} from "../../../shared/api/response.ts";
import { validateRequestOrigin } from "../../../shared/security/origin-validation.ts";
import { parseJsonBody } from "../../../shared/validation/parse-request.ts";
import { getStudentComplaintIdentity } from "./complaint-request-auth.ts";

type ComplaintCollectionPort = Pick<ComplaintService, "create" | "listForOwner">;

function getListQuery(request: Request) {
  const searchParams = new URL(request.url).searchParams;

  return complaintCursorQuerySchema.safeParse({
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  });
}

export function createComplaintListHandler(complaintService?: ComplaintCollectionPort) {
  return async function listComplaints(request: Request) {
    const identity = getStudentComplaintIdentity(request);

    if (!identity.ok) {
      return identity.response;
    }

    const query = getListQuery(request);
    if (!query.success) {
      return apiValidationError(query.error);
    }

    try {
      const page = await (complaintService ?? new ComplaintService()).listForOwner(
        identity.userId,
        query.data,
      );

      return apiSuccess({
        complaints: page.complaints.map(toStudentComplaintResponse),
        nextCursor: page.nextCursor ? encodeComplaintCursor(page.nextCursor) : null,
      });
    } catch {
      return apiInternalError();
    }
  };
}

export function createComplaintCreateHandler(complaintService?: ComplaintCollectionPort) {
  return async function createComplaint(request: Request) {
    if (validateRequestOrigin(request) !== "same-origin") {
      return apiForbidden();
    }

    const identity = getStudentComplaintIdentity(request);

    if (!identity.ok) {
      return identity.response;
    }

    const body = await parseJsonBody(request, createComplaintSchema);
    if (!body.success) {
      return apiValidationError(body.error);
    }

    try {
      const complaint = await (complaintService ?? new ComplaintService()).create(
        identity.userId,
        body.data,
      );

      return apiSuccess(
        {
          complaint: toStudentComplaintResponse(complaint),
          trackingReference: complaint.id,
        },
        201,
      );
    } catch {
      return apiInternalError();
    }
  };
}
