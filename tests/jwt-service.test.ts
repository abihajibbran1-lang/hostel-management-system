import assert from "node:assert/strict";
import test from "node:test";
import { SignJWT, decodeJwt, decodeProtectedHeader } from "jose";

import { JwtService } from "../src/business/modules/auth/jwt-service.ts";

const secret = new TextEncoder().encode("synthetic-jwt-test-secret-at-least-32-bytes");
const identity = {
  userId: "2f8855bb-05bb-4f8e-aee1-7c6cab541748",
  role: "STUDENT" as const,
};

function createService() {
  return new JwtService(secret);
}

function withJwtSecretEnvironment(value: string | undefined, callback: () => void) {
  const previousValue = process.env.JWT_SECRET;

  try {
    if (value === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = value;
    }

    callback();
  } finally {
    if (previousValue === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousValue;
    }
  }
}

async function signToken(
  payload: Record<string, unknown>,
  subject = identity.userId,
  expirationTime: string | number = "8h",
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(subject)
    .setExpirationTime(expirationTime)
    .sign(secret);
}

test("issues and verifies an HS256 token with the minimum claim contract", async () => {
  const issuedAt = Math.floor(Date.now() / 1000);
  const token = await createService().issue(identity);
  const payload = decodeJwt(token);
  const protectedHeader = decodeProtectedHeader(token);

  assert.equal(protectedHeader.alg, "HS256");
  assert.equal(payload.sub, identity.userId);
  assert.equal(payload.role, identity.role);
  assert.equal(typeof payload.exp, "number");
  assert.ok((payload.exp ?? 0) >= issuedAt + 8 * 60 * 60 - 1);
  assert.ok((payload.exp ?? 0) <= issuedAt + 8 * 60 * 60 + 1);
  assert.deepEqual(await createService().verify(token), identity);
});

test("rejects a token with a tampered signature", async () => {
  const token = await createService().issue(identity);
  const [header, payload, signature] = token.split(".");
  const alteredSignature = `${signature?.[0] === "a" ? "b" : "a"}${signature?.slice(1)}`;

  assert.equal(await createService().verify(`${header}.${payload}.${alteredSignature}`), null);
});

test("rejects an expired token", async () => {
  const expiredToken = await signToken(
    { role: identity.role },
    identity.userId,
    Math.floor(Date.now() / 1000) - 1,
  );

  assert.equal(await createService().verify(expiredToken), null);
});

test("rejects a malformed token", async () => {
  assert.equal(await createService().verify("not-a-jwt"), null);
});

test("rejects tokens with missing or invalid required claims", async () => {
  const invalidRoleToken = await signToken({ role: "UNAPPROVED_ROLE" });
  const invalidSubjectToken = await signToken({ role: identity.role }, "not-a-uuid");
  const missingRoleToken = await signToken({});

  assert.equal(await createService().verify(invalidRoleToken), null);
  assert.equal(await createService().verify(invalidSubjectToken), null);
  assert.equal(await createService().verify(missingRoleToken), null);
});

test("rejects missing, empty, and weak configured JWT secrets", () => {
  withJwtSecretEnvironment(undefined, () => {
    assert.throws(() => new JwtService(), /JWT_SECRET must be configured/);
  });
  withJwtSecretEnvironment("", () => {
    assert.throws(() => new JwtService(), /JWT_SECRET must be configured/);
  });
  withJwtSecretEnvironment("too-short", () => {
    assert.throws(() => new JwtService(), /JWT_SECRET must be at least 32 UTF-8 bytes/);
  });
});

test("rejects a weak injected JWT secret", () => {
  const weakSecret = new TextEncoder().encode("too-short");

  assert.throws(
    () => new JwtService(weakSecret),
    /JWT_SECRET must be at least 32 UTF-8 bytes/,
  );
});

test("rejects invalid identity input before signing", async () => {
  await assert.rejects(
    () => createService().issue({ ...identity, userId: "not-a-uuid" }),
    /JWT identity userId must be a canonical UUID/,
  );
  await assert.rejects(
    () => createService().issue({ ...identity, role: "UNAPPROVED_ROLE" as never }),
    /JWT identity role must be an approved UserRole value/,
  );
});
