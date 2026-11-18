import { z } from "zod";

import { AuthService, type AuthenticatedUser } from "../../../../business/modules/auth/auth-service.ts";
import { setAuthenticationCookie } from "../../../../business/modules/auth/auth-cookie.ts";
import {
  JwtService,
  type AuthenticatedIdentity,
} from "../../../../business/modules/auth/jwt-service.ts";
import {
  apiAuthenticationFailed,
  apiForbidden,
  apiInternalError,
  apiSuccess,
  apiValidationError,
} from "../../../../shared/api/response.ts";
import { validateRequestOrigin } from "../../../../shared/security/origin-validation.ts";
import { parseJsonBody } from "../../../../shared/validation/parse-request.ts";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

type AuthServicePort = {
  verifyProvisionedCredentials(email: string, password: string): Promise<AuthenticatedUser | null>;
};

type JwtServicePort = {
  issue(identity: AuthenticatedIdentity): Promise<string>;
};

export function createLoginHandler(
  authService?: AuthServicePort,
  jwtService?: JwtServicePort,
) {
  return async function login(request: Request) {
    if (validateRequestOrigin(request) !== "same-origin") {
      return apiForbidden();
    }

    const parsedBody = await parseJsonBody(request, loginSchema);

    if (!parsedBody.success) {
      return apiValidationError(parsedBody.error);
    }

    try {
      const user = await (authService ?? new AuthService()).verifyProvisionedCredentials(
        parsedBody.data.email,
        parsedBody.data.password,
      );

      if (!user) {
        return apiAuthenticationFailed();
      }

      const token = await (jwtService ?? new JwtService()).issue({
        userId: user.id,
        role: user.role,
      });
      const response = apiSuccess({
        user: {
          id: user.id,
          fullName: user.fullName,
          role: user.role,
        },
      });

      setAuthenticationCookie(response, token);
      return response;
    } catch {
      return apiInternalError();
    }
  };
}

export async function POST(request: Request) {
  return createLoginHandler()(request);
}
