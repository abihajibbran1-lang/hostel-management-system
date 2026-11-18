import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcrypt";
import type { User } from "@prisma/client";

import {
  AuthService,
  isPasswordInputWithinPolicy,
} from "../src/business/modules/auth/auth-service.ts";

const password = "correct-password";

function createUser(passwordHash: string, isActive = true): User {
  return {
    id: "2f8855bb-05bb-4f8e-aee1-7c6cab541748",
    fullName: "Test Student",
    email: "student@example.test",
    passwordHash,
    role: "STUDENT",
    isActive,
    createdAt: new Date("2026-11-18T00:00:00.000Z"),
    updatedAt: new Date("2026-11-18T00:00:00.000Z"),
  };
}

function createService(user: User | null) {
  return new AuthService({
    findByEmail: async () => user,
  });
}

test("verifies a correct password for an active provisioned user", async () => {
  const user = createUser(await bcrypt.hash(password, 10));
  const result = await createService(user).verifyProvisionedCredentials(user.email, password);

  assert.deepEqual(result, {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  });
  assert.equal("passwordHash" in (result ?? {}), false);
});

test("rejects an incorrect password with the generic failure result", async () => {
  const user = createUser(await bcrypt.hash(password, 10));
  const result = await createService(user).verifyProvisionedCredentials(user.email, "incorrect-password");

  assert.equal(result, null);
});

test("rejects a missing user with the generic failure result", async () => {
  const result = await createService(null).verifyProvisionedCredentials(
    "missing@example.test",
    password,
  );

  assert.equal(result, null);
});

test("rejects an inactive user with the generic failure result", async () => {
  const user = createUser(await bcrypt.hash(password, 10), false);
  const result = await createService(user).verifyProvisionedCredentials(user.email, password);

  assert.equal(result, null);
});

test("enforces the approved password character and UTF-8 byte boundaries", () => {
  assert.equal(isPasswordInputWithinPolicy("1234567"), false);
  assert.equal(isPasswordInputWithinPolicy("12345678"), true);
  assert.equal(isPasswordInputWithinPolicy("a".repeat(72)), true);
  assert.equal(isPasswordInputWithinPolicy("a".repeat(73)), false);
  assert.equal(isPasswordInputWithinPolicy("€".repeat(24)), true);
  assert.equal(isPasswordInputWithinPolicy("€".repeat(25)), false);
});

test("uses one generic failure result for missing, inactive, and incorrect credentials", async () => {
  const passwordHash = await bcrypt.hash(password, 10);
  const activeUser = createUser(passwordHash);
  const inactiveUser = createUser(passwordHash, false);

  const [missing, inactive, incorrect] = await Promise.all([
    createService(null).verifyProvisionedCredentials("missing@example.test", password),
    createService(inactiveUser).verifyProvisionedCredentials(inactiveUser.email, password),
    createService(activeUser).verifyProvisionedCredentials(activeUser.email, "incorrect-password"),
  ]);

  assert.deepEqual([missing, inactive, incorrect], [null, null, null]);
});
