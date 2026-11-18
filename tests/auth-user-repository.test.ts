import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient, User } from "@prisma/client";

import { AuthUserRepository } from "../src/data/repositories/auth/auth-user-repository.ts";

const activeUser: User = {
  id: "2f8855bb-05bb-4f8e-aee1-7c6cab541748",
  fullName: "Test Student",
  email: "student@example.test",
  passwordHash: "$2b$12$synthetic-hash",
  role: "STUDENT",
  isActive: true,
  createdAt: new Date("2026-11-18T00:00:00.000Z"),
  updatedAt: new Date("2026-11-18T00:00:00.000Z"),
};

function createRepository(
  findUnique: (args: { where: { email?: string; id?: string } }) => Promise<User | null>,
) {
  const client = {
    user: { findUnique },
  } as unknown as Pick<PrismaClient, "user">;

  return new AuthUserRepository(client);
}

test("findByEmail looks up a user through the unique email field", async () => {
  let receivedEmail: string | undefined;
  const repository = createRepository(async ({ where }) => {
    receivedEmail = where.email;
    return activeUser;
  });

  const user = await repository.findByEmail(activeUser.email);

  assert.equal(receivedEmail, activeUser.email);
  assert.deepEqual(user, activeUser);
});

test("findById looks up a user through the UUID field", async () => {
  let receivedId: string | undefined;
  const repository = createRepository(async ({ where }) => {
    receivedId = where.id;
    return activeUser;
  });

  const user = await repository.findById(activeUser.id);

  assert.equal(receivedId, activeUser.id);
  assert.deepEqual(user, activeUser);
});

test("isActive returns false when the user is missing or inactive", async () => {
  const missingRepository = createRepository(async () => null);
  const inactiveRepository = createRepository(async () => ({
    ...activeUser,
    isActive: false,
  }));

  assert.equal(await missingRepository.isActive(activeUser.id), false);
  assert.equal(await inactiveRepository.isActive(activeUser.id), false);
});

test("isActive returns true for an active user", async () => {
  const repository = createRepository(async () => activeUser);

  assert.equal(await repository.isActive(activeUser.id), true);
});
