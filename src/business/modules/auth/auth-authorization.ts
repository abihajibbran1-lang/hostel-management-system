import type { NextResponse } from "next/server.js";
import { UserRole } from "@prisma/client";

import { apiForbidden } from "../../../shared/api/response.ts";
import type { AuthenticatedIdentity } from "./jwt-service.ts";

export const APPROVED_USER_ROLES = [
  UserRole.STUDENT,
  UserRole.WARDEN,
  UserRole.KITCHEN_STAFF,
  UserRole.MANAGER,
] as const;

export function isRoleAuthorized(
  identity: AuthenticatedIdentity,
  allowedRoles: readonly UserRole[],
) {
  return allowedRoles.includes(identity.role);
}

export function requireAuthorizedRole(
  identity: AuthenticatedIdentity,
  allowedRoles: readonly UserRole[],
): NextResponse | undefined {
  return isRoleAuthorized(identity, allowedRoles) ? undefined : apiForbidden();
}
