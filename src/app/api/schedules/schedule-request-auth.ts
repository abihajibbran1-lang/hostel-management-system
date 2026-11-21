import { UserRole } from "@prisma/client";
import type { NextResponse } from "next/server.js";

import { requireAuthorizedRole } from "../../../business/modules/auth/auth-authorization.ts";
import type { AuthenticatedIdentity } from "../../../business/modules/auth/jwt-service.ts";
import {
  apiAuthenticationFailed,
  apiForbidden,
} from "../../../shared/api/response.ts";
import { getVerifiedAuthenticatedUserId } from "../../../shared/auth/authenticated-request.ts";

type StudentScheduleIdentityResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

export function getStudentScheduleIdentity(request: Request): StudentScheduleIdentityResult {
  const userId = getVerifiedAuthenticatedUserId(request);

  if (!userId) {
    return { ok: false, response: apiAuthenticationFailed() };
  }

  const role = request.headers.get("x-auth-role");
  if (!role || !Object.values(UserRole).includes(role as UserRole)) {
    return { ok: false, response: apiForbidden() };
  }

  const identity: AuthenticatedIdentity = { userId, role: role as UserRole };
  const forbidden = requireAuthorizedRole(identity, [UserRole.STUDENT]);

  return forbidden ? { ok: false, response: forbidden } : { ok: true, userId };
}
