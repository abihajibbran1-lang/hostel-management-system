import { z } from "zod";

const authenticatedUserIdSchema = z.string().uuid();

// S01 middleware overwrites this header after JWT verification. Route handlers
// must not accept a user ID from request bodies, query parameters, or UI state.
export function getVerifiedAuthenticatedUserId(request: Request) {
  const userId = request.headers.get("x-auth-user-id");
  const parsedUserId = authenticatedUserIdSchema.safeParse(userId);

  return parsedUserId.success ? parsedUserId.data : null;
}
