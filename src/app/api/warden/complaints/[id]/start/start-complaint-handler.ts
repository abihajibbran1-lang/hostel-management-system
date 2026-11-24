import { NextResponse } from "next/server.js";

import { complaintIdSchema } from "../../../../../../business/modules/complaints/warden-complaint-contract.ts";
import { toComplaintResponse } from "../../../../../../business/modules/complaints/complaint-response.ts";
import { WardenComplaintService } from "../../../../../../business/modules/complaints/warden-complaint-service.ts";
import {
  apiForbidden,
  apiInternalError,
  apiSuccess,
  apiValidationError,
} from "../../../../../../shared/api/response.ts";
import { validateRequestOrigin } from "../../../../../../shared/security/origin-validation.ts";
import { getVerifiedWardenIdentity } from "../../warden-complaint-request-auth.ts";

type WardenStartPort = Pick<WardenComplaintService, "start">;
type ItemContext = { params: Promise<{ id: string }> };

function isApiResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

export function createStartComplaintHandler(service?: WardenStartPort) {
  return async function startComplaint(request: Request, context: ItemContext) {
    if (validateRequestOrigin(request) !== "same-origin") {
      return apiForbidden();
    }

    const identity = getVerifiedWardenIdentity(request);
    if (!identity.ok) {
      return identity.response;
    }

    const params = await context.params;
    const complaintId = complaintIdSchema.safeParse(params.id);
    if (!complaintId.success) {
      return apiValidationError(complaintId.error);
    }

    try {
      const complaint = await (service ?? new WardenComplaintService()).start(
        identity.identity,
        complaintId.data,
      );

      if (isApiResponse(complaint)) {
        return complaint;
      }

      return apiSuccess({ complaint: toComplaintResponse(complaint) });
    } catch {
      return apiInternalError();
    }
  };
}
