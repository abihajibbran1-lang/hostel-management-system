import { Prisma, UserRole } from "@prisma/client";
import { z } from "zod";
import {
  RoomManagementError, RoomService, roomCommandSchema, roomManagementQuerySchema,
} from "../../../business/modules/schedules/room-service.ts";
import {
  apiAuthenticationFailed, apiForbidden, apiInternalError, apiNotFound, apiSuccess, apiValidationError,
} from "../../../shared/api/response.ts";
import { getVerifiedAuthenticatedUserId } from "../../../shared/auth/authenticated-request.ts";
import { validateRequestOrigin } from "../../../shared/security/origin-validation.ts";
import { parseJsonBody } from "../../../shared/validation/parse-request.ts";

function requireStaff(request: Request) {
  const userId = getVerifiedAuthenticatedUserId(request);
  const role = request.headers.get("x-auth-role");
  if (!userId) return { error: apiAuthenticationFailed() };
  if (role !== UserRole.MANAGER && role !== UserRole.WARDEN) return { error: apiForbidden() };
  return { identity: { userId, role } };
}

function roomError(error: unknown) {
  if (error instanceof RoomManagementError) {
    if (error.kind === "forbidden") return apiForbidden();
    if (error.kind === "not-found") return apiNotFound();
    return invalidRoomRequest(error.message);
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return invalidRoomRequest("This record conflicts with an existing record.");
    if (error.code === "P2003" || error.code === "P2025") return apiNotFound();
  }
  return apiInternalError();
}

function invalidRoomRequest(message: string) {
  return apiValidationError(new z.ZodError([{ code: "custom", path: [], message }]));
}

export async function GET(request: Request) {
  const staff = requireStaff(request);
  if (!staff.identity) return staff.error;
  const query = roomManagementQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!query.success) return apiValidationError(query.error);
  try {
    return apiSuccess(await new RoomService().getDirectory(staff.identity, query.data.houseId));
  } catch (error) {
    return roomError(error);
  }
}

export async function POST(request: Request) {
  if (validateRequestOrigin(request) !== "same-origin") return apiForbidden();
  const staff = requireStaff(request);
  if (!staff.identity) return staff.error;
  const body = await parseJsonBody(request, roomCommandSchema);
  if (!body.success) return apiValidationError(body.error);
  try {
    return apiSuccess(await new RoomService().execute(staff.identity, body.data));
  } catch (error) {
    return roomError(error);
  }
}
