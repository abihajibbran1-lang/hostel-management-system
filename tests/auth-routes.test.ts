import assert from "node:assert/strict";
import test from "node:test";
import { NextResponse } from "next/server.js";
import { UserRole } from "@prisma/client";

import {
  AUTH_COOKIE_MAX_AGE_SECONDS,
  clearAuthenticationCookie,
  getAuthenticationCookieOptions,
  setAuthenticationCookie,
} from "../src/business/modules/auth/auth-cookie.ts";
import { createLoginHandler } from "../src/app/api/auth/login/login-handler.ts";
import { createLogoutHandler } from "../src/app/api/auth/logout/logout-handler.ts";
import { validateRequestOrigin } from "../src/shared/security/origin-validation.ts";

const user = {
  id: "2f8855bb-05bb-4f8e-aee1-7c6cab541748",
  fullName: "Test Student",
  email: "student@example.test",
  role: UserRole.STUDENT,
};

function loginRequest(email = user.email, password = "correct-password") {
  return new Request("https://hostel.example.test/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://hostel.example.test",
    },
    body: JSON.stringify({ email, password }),
  });
}

function loginRequestWithOrigin(origin?: string, body: unknown = { email: user.email, password: "correct-password" }) {
  return new Request("https://hostel.example.test/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(origin ? { origin } : {}),
    },
    body: JSON.stringify(body),
  });
}

function logoutRequest(origin?: string) {
  return new Request("https://hostel.example.test/api/auth/logout", {
    method: "POST",
    headers: origin ? { origin } : undefined,
  });
}

function createLoginRoute(authenticatedUser: typeof user | null) {
  return createLoginHandler(
    { verifyProvisionedCredentials: async () => authenticatedUser },
    { issue: async () => "synthetic.jwt.token" },
  );
}

async function withJwtSecretEnvironment(value: string | undefined, callback: () => Promise<void>) {
  const previousValue = process.env.JWT_SECRET;

  try {
    if (value === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = value;
    }

    await callback();
  } finally {
    if (previousValue === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousValue;
    }
  }
}

test("successful login returns the standard response and an HttpOnly auth cookie", async () => {
  const response = await createLoginRoute(user)(loginRequest());
  const body = await response.json();
  const cookie = response.headers.get("set-cookie") ?? "";

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    data: {
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
      },
    },
  });
  assert.match(cookie, /auth_token=synthetic\.jwt\.token/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=lax/i);
  assert.match(cookie, new RegExp(`Max-Age=${AUTH_COOKIE_MAX_AGE_SECONDS}`));
  assert.match(cookie, /Path=\//);
  assert.doesNotMatch(cookie, /Secure/);
});

test("invalid and inactive credentials use the same generic failure response without a cookie", async () => {
  const invalidResponse = await createLoginRoute(null)(loginRequest());
  const inactiveResponse = await createLoginRoute(null)(loginRequest());

  assert.equal(invalidResponse.status, 401);
  assert.equal(inactiveResponse.status, 401);
  assert.deepEqual(await invalidResponse.json(), await inactiveResponse.json());
  assert.equal(invalidResponse.headers.get("set-cookie"), null);
  assert.equal(inactiveResponse.headers.get("set-cookie"), null);
});

test("login rejects cross-origin and missing-Origin requests without setting a cookie", async () => {
  const handler = createLoginRoute(user);
  const crossOriginResponse = await handler(loginRequestWithOrigin("https://attacker.example.test"));
  const missingOriginResponse = await handler(loginRequestWithOrigin());

  assert.equal(crossOriginResponse.status, 403);
  assert.equal(missingOriginResponse.status, 403);
  assert.equal(crossOriginResponse.headers.get("set-cookie"), null);
  assert.equal(missingOriginResponse.headers.get("set-cookie"), null);
});

test("unexpected AuthService and JWT issuance errors return the standard internal-error response", async () => {
  const authFailureHandler = createLoginHandler(
    { verifyProvisionedCredentials: async () => Promise.reject(new Error("synthetic auth failure")) },
    { issue: async () => "synthetic.jwt.token" },
  );
  const jwtFailureHandler = createLoginHandler(
    { verifyProvisionedCredentials: async () => user },
    { issue: async () => Promise.reject(new Error("synthetic JWT failure")) },
  );

  const [authFailureResponse, jwtFailureResponse] = await Promise.all([
    authFailureHandler(loginRequest()),
    jwtFailureHandler(loginRequest()),
  ]);

  for (const response of [authFailureResponse, jwtFailureResponse]) {
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
      },
    });
  }
});

test("JWT configuration errors return the standard internal-error response", async () => {
  const handler = createLoginHandler({ verifyProvisionedCredentials: async () => user });

  for (const configuredSecret of [undefined, "too-short"]) {
    await withJwtSecretEnvironment(configuredSecret, async () => {
      const response = await handler(loginRequest());

      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), {
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred.",
        },
      });
      assert.equal(response.headers.get("set-cookie"), null);
    });
  }
});

test("invalid login input uses the standard validation response", async () => {
  const response = await createLoginRoute(user)(
    loginRequestWithOrigin("https://hostel.example.test", { email: "invalid", password: 42 }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, "VALIDATION_ERROR");
  assert.equal(body.error.message, "Request validation failed.");
  assert.equal(response.headers.get("set-cookie"), null);
});

test("malformed login JSON uses the standard validation response", async () => {
  const response = await createLoginRoute(user)(
    new Request("https://hostel.example.test/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://hostel.example.test",
      },
      body: "{",
    }),
  );

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, "VALIDATION_ERROR");
  assert.equal(response.headers.get("set-cookie"), null);
});

test("cookie options use Secure only in production", () => {
  assert.equal(getAuthenticationCookieOptions(false).secure, false);
  assert.equal(getAuthenticationCookieOptions(true).secure, true);

  const productionResponse = NextResponse.json({});
  setAuthenticationCookie(productionResponse, "synthetic.jwt.token", true);

  assert.match(productionResponse.headers.get("set-cookie") ?? "", /Secure/);
});

test("logout clears the matching authentication cookie for a same-origin request", async () => {
  const response = await createLogoutHandler()(logoutRequest("https://hostel.example.test"));
  const cookie = response.headers.get("set-cookie") ?? "";

  assert.equal(response.status, 200);
  assert.match(cookie, /auth_token=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=lax/i);
  assert.match(cookie, /Path=\//);
  assert.match(cookie, /Max-Age=0/);
  assert.match(cookie, /Expires=Thu, 01 Jan 1970 00:00:00 GMT/);
});

test("Origin validation allows same-origin and rejects cross-origin state changes", async () => {
  const sameOriginRequest = logoutRequest("https://hostel.example.test");
  const crossOriginRequest = logoutRequest("https://attacker.example.test");

  assert.equal(validateRequestOrigin(sameOriginRequest), "same-origin");
  assert.equal(validateRequestOrigin(crossOriginRequest), "cross-origin");

  const response = await createLogoutHandler()(crossOriginRequest);

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    error: {
      code: "FORBIDDEN",
      message: "Request is not allowed.",
    },
  });
  assert.equal(response.headers.get("set-cookie"), null);
});

test("missing Origin is classified and currently rejected by the logout route", async () => {
  const request = logoutRequest();

  assert.equal(validateRequestOrigin(request), "missing-origin");

  const response = await createLogoutHandler()(request);

  assert.equal(response.status, 403);
  assert.equal(response.headers.get("set-cookie"), null);
});

test("cookie clearing keeps the production Secure attribute", () => {
  const response = NextResponse.json({});
  clearAuthenticationCookie(response, true);

  assert.match(response.headers.get("set-cookie") ?? "", /Secure/);
});
