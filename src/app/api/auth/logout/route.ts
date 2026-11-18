import { clearAuthenticationCookie } from "../../../../business/modules/auth/auth-cookie.ts";
import { apiForbidden, apiSuccess } from "../../../../shared/api/response.ts";
import { validateRequestOrigin } from "../../../../shared/security/origin-validation.ts";

export function createLogoutHandler() {
  return async function logout(request: Request) {
    if (validateRequestOrigin(request) !== "same-origin") {
      return apiForbidden();
    }

    const response = apiSuccess({});
    clearAuthenticationCookie(response);
    return response;
  };
}

export async function POST(request: Request) {
  return createLogoutHandler()(request);
}
