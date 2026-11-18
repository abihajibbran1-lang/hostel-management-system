import assert from "node:assert/strict";
import test from "node:test";
import { UserRole } from "@prisma/client";
import { SignJWT } from "jose";
import { NextRequest } from "next/server.js";

import {
  APPROVED_USER_ROLES,
  isRoleAuthorized,
  requireAuthorizedRole,
} from "../src/business/modules/auth/auth-authorization.ts";
import { AUTH_COOKIE_NAME } from "../src/business/modules/auth/auth-cookie.ts";
import { JwtService } from "../src/business/modules/auth/jwt-service.ts";
import { config, createAuthMiddleware, middleware } from "../src/middleware.ts";

const secret = new TextEncoder().encode("synthetic-middleware-test-secret-at-least-32-bytes");
const userId = "2f8855bb-05bb-4f8e-aee1-7c6cab541748";

function protectedRequest(token?: string) {
  return new NextRequest("https://hostel.example.test/api/protected", {
    headers: token ? { cookie: `${AUTH_COOKIE_NAME}=${token}` } : undefined,
  });
}

function createMiddleware(isActive: (id: string) => Promise<boolean>) {
  return createAuthMiddleware({
    jwtService: new JwtService(secret),
    userRepository: { isActive },
  });
}

async function issueToken(role = UserRole.STUDENT) {
  return new JwtService(secret).issue({ userId, role });
}

async function signExpiredToken() {
  return new SignJWT({ role: UserRole.STUDENT })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 1)
    .sign(secret);
}

test("allows a valid active user and forwards verified identity headers", async () => {
  let checkedUserId: string | undefined;
  const request = protectedRequest(await issueToken());

  request.headers.set("x-auth-user-id", "attacker-user-id");
  request.headers.set("x-auth-role", UserRole.MANAGER);

  const response = await createMiddleware(async (id) => {
    checkedUserId = id;
    return true;
  })(request);

  assert.equal(response.status, 200);
  assert.equal(checkedUserId, userId);
  assert.equal(response.headers.get("x-middleware-request-x-auth-user-id"), userId);
  assert.equal(response.headers.get("x-middleware-request-x-auth-role"), UserRole.STUDENT);
});

test("rejects missing, malformed, tampered, and expired tokens as unauthenticated", async () => {
  const validToken = await issueToken();
  const [header, payload, signature] = validToken.split(".");
  const tamperedSignature = `${signature?.[0] === "a" ? "b" : "a"}${signature?.slice(1)}`;
  const tamperedToken = `${header}.${payload}.${tamperedSignature}`;
  const tokens = [undefined, "not-a-jwt", tamperedToken, await signExpiredToken()];

  for (const token of tokens) {
    const response = await createMiddleware(async () => true)(protectedRequest(token));
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.deepEqual(body, {
      error: {
        code: "AUTHENTICATION_FAILED",
        message: "Authentication failed.",
      },
    });
  }
});

test("denies an inactive user and rechecks active status on every request", async () => {
  let checks = 0;
  const handler = createMiddleware(async () => {
    checks += 1;
    return checks === 1;
  });
  const token = await issueToken();

  const activeResponse = await handler(protectedRequest(token));
  const deactivatedResponse = await handler(protectedRequest(token));

  assert.equal(activeResponse.status, 200);
  assert.equal(deactivatedResponse.status, 401);
  assert.equal(checks, 2);
});

test("central role guards recognize each approved role and reject unauthorized roles", async () => {
  for (const role of APPROVED_USER_ROLES) {
    const identity = { userId, role };

    assert.equal(isRoleAuthorized(identity, [role]), true);
    assert.equal(requireAuthorizedRole(identity, [role]), undefined);
  }

  const response = requireAuthorizedRole(
    { userId, role: UserRole.STUDENT },
    [UserRole.WARDEN],
  );

  assert.equal(response?.status, 403);
  assert.deepEqual(await response?.json(), {
    error: {
      code: "FORBIDDEN",
      message: "Request is not allowed.",
    },
  });
});

test("keeps public login/logout and framework assets outside protected middleware handling", async () => {
  const loginResponse = await middleware(
    new NextRequest("https://hostel.example.test/api/auth/login"),
  );
  const logoutWithoutCookieResponse = await middleware(
    new NextRequest("https://hostel.example.test/api/auth/logout"),
  );
  const logoutWithInvalidCookieResponse = await middleware(
    new NextRequest("https://hostel.example.test/api/auth/logout", {
      headers: { cookie: `${AUTH_COOKIE_NAME}=not-a-jwt` },
    }),
  );
  const logoutWithExpiredCookieResponse = await middleware(
    new NextRequest("https://hostel.example.test/api/auth/logout", {
      headers: { cookie: `${AUTH_COOKIE_NAME}=${await signExpiredToken()}` },
    }),
  );

  assert.equal(loginResponse.status, 200);
  assert.equal(logoutWithoutCookieResponse.status, 200);
  assert.equal(logoutWithInvalidCookieResponse.status, 200);
  assert.equal(logoutWithExpiredCookieResponse.status, 200);
  assert.deepEqual(config.matcher, ["/api/:path*"]);
});
