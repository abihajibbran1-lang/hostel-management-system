import { NextResponse } from "next/server.js";

import { encodeComplaintCursor } from "../../../../business/modules/complaints/complaint-contract.ts";
import { toComplaintResponse } from "../../../../business/modules/complaints/complaint-response.ts";
import { wardenComplaintQueueQuerySchema } from "../../../../business/modules/complaints/warden-complaint-contract.ts";
import { WardenComplaintService } from "../../../../business/modules/complaints/warden-complaint-service.ts";
import {
  apiInternalError,
  apiSuccess,
  apiValidationError,
} from "../../../../shared/api/response.ts";
import { getVerifiedWardenIdentity } from "./warden-complaint-request-auth.ts";

type WardenListPort = Pick<WardenComplaintService, "list">;

function isApiResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

function getListQuery(request: Request) {
  const searchParams = new URL(request.url).searchParams;

  return {
    status: searchParams.get("status") ?? undefined,
    urgencyFlag: searchParams.get("urgencyFlag") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  };
}

export function createWardenComplaintListHandler(service?: WardenListPort) {
  return async function listWardenComplaints(request: Request) {
    const identity = getVerifiedWardenIdentity(request);
    if (!identity.ok) {
      return identity.response;
    }

    const query = wardenComplaintQueueQuerySchema.safeParse(getListQuery(request));
    if (!query.success) {
      return apiValidationError(query.error);
    }

    try {
      const page = await (service ?? new WardenComplaintService()).list(
        identity.identity,
        query.data,
      );

      if (isApiResponse(page)) {
        return page;
      }

      return apiSuccess({
        complaints: page.complaints.map(toComplaintResponse),
        nextCursor: page.nextCursor ? encodeComplaintCursor(page.nextCursor) : null,
      });
    } catch {
      return apiInternalError();
    }
  };
}
