import { UserRole } from "@prisma/client";
import type { NextResponse } from "next/server.js";

import type { AuthenticatedIdentity } from "../../../../business/modules/auth/jwt-service.ts";
import {
  apiAuthenticationFailed,
  apiForbidden,
} from "../../../../shared/api/response.ts";
import { getVerifiedAuthenticatedUserId } from "../../../../shared/auth/authenticated-request.ts";

export type VerifiedWardenIdentityResult =
  | { ok: true; identity: AuthenticatedIdentity }
  | { ok: false; response: NextResponse };

export function getVerifiedWardenIdentity(request: Request): VerifiedWardenIdentityResult {
  const userId = getVerifiedAuthenticatedUserId(request);

  if (!userId) {
    return { ok: false, response: apiAuthenticationFailed() };
  }

  const role = request.headers.get("x-auth-role");
  if (!role || !Object.values(UserRole).includes(role as UserRole)) {
    return { ok: false, response: apiForbidden() };
  }

  const identity: AuthenticatedIdentity = { userId, role: role as UserRole };
  if (identity.role !== UserRole.WARDEN) {
    return { ok: false, response: apiForbidden() };
  }

  return { ok: true, identity };
}
