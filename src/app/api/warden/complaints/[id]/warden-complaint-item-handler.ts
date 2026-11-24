import { NextResponse } from "next/server.js";

import { complaintIdSchema } from "../../../../../business/modules/complaints/warden-complaint-contract.ts";
import { toComplaintResponse } from "../../../../../business/modules/complaints/complaint-response.ts";
import { WardenComplaintService } from "../../../../../business/modules/complaints/warden-complaint-service.ts";
import {
  apiInternalError,
  apiSuccess,
  apiValidationError,
} from "../../../../../shared/api/response.ts";
import { getVerifiedWardenIdentity } from "../warden-complaint-request-auth.ts";

type WardenDetailPort = Pick<WardenComplaintService, "get">;
type ItemContext = { params: Promise<{ id: string }> };

function isApiResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

export function createWardenComplaintGetHandler(service?: WardenDetailPort) {
  return async function getWardenComplaint(request: Request, context: ItemContext) {
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
      const complaint = await (service ?? new WardenComplaintService()).get(
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
