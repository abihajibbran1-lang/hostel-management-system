import { NextResponse, type NextRequest } from "next/server.js";

import { AUTH_COOKIE_NAME } from "./business/modules/auth/auth-cookie.ts";
import type { AuthenticatedIdentity } from "./business/modules/auth/jwt-service.ts";
import { JwtService } from "./business/modules/auth/jwt-service.ts";
import { AuthUserRepository } from "./data/repositories/auth/auth-user-repository.ts";
import { apiAuthenticationFailed, apiInternalError } from "./shared/api/response.ts";

const PUBLIC_API_PATHS = new Set(["/api/auth/login", "/api/auth/logout"]);
const AUTHENTICATED_USER_ID_HEADER = "x-auth-user-id";
const AUTHENTICATED_ROLE_HEADER = "x-auth-role";

type JwtVerifier = {
  verify(token: string): Promise<AuthenticatedIdentity | null>;
};

type ActiveUserLookup = {
  isActive(id: string): Promise<boolean>;
};

type AuthMiddlewareDependencies = {
  jwtService: JwtVerifier;
  userRepository: ActiveUserLookup;
};

function getAuthenticatedRequestHeaders(request: NextRequest, identity: AuthenticatedIdentity) {
  const headers = new Headers(request.headers);

  headers.set(AUTHENTICATED_USER_ID_HEADER, identity.userId);
  headers.set(AUTHENTICATED_ROLE_HEADER, identity.role);

  return headers;
}

export function createAuthMiddleware(dependencies?: AuthMiddlewareDependencies) {
  return async function authenticate(request: NextRequest) {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return apiAuthenticationFailed();
    }

    try {
      const jwtService = dependencies?.jwtService ?? new JwtService();
      const userRepository = dependencies?.userRepository ?? new AuthUserRepository();
      const identity = await jwtService.verify(token);

      if (!identity || !(await userRepository.isActive(identity.userId))) {
        return apiAuthenticationFailed();
      }

      return NextResponse.next({
        request: {
          headers: getAuthenticatedRequestHeaders(request, identity),
        },
      });
    } catch {
      return apiInternalError();
    }
  };
}

export async function middleware(request: NextRequest) {
  if (PUBLIC_API_PATHS.has(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  return createAuthMiddleware()(request);
}

export const config = {
  matcher: ["/api/:path*"],
  runtime: "nodejs",
};
