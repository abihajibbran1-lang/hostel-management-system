import bcrypt from "bcrypt";
import type { User, UserRole } from "@prisma/client";

import { AuthUserRepository } from "../../../data/repositories/auth/auth-user-repository.ts";

const MIN_PASSWORD_CHARACTERS = 8;
const MAX_PASSWORD_UTF8_BYTES = 72;
const DUMMY_PASSWORD_HASH =
  "$2b$12$D35lmQbdzLGmWnKm7d8aZ..KIoJFdbJ5v8RhIWIKNqvpAqwR6WKaO";

type UserLookup = {
  findByEmail(email: string): Promise<User | null>;
  getAccountStatus(userId: string): Promise<AccountStatus | null>;
};
type PasswordComparator = (password: string, passwordHash: string) => Promise<boolean>;

export type AuthenticatedUser = Pick<User, "id" | "fullName" | "email" | "role">;
export type AccountStatus = {
  userId: string;
  role: UserRole;
  isActive: boolean;
};

export function isPasswordInputWithinPolicy(password: string) {
  return (
    [...password].length >= MIN_PASSWORD_CHARACTERS &&
    Buffer.byteLength(password, "utf8") <= MAX_PASSWORD_UTF8_BYTES
  );
}

export class AuthService {
  private readonly users: UserLookup;
  private readonly comparePassword: PasswordComparator;

  constructor(
    users: UserLookup = new AuthUserRepository(),
    comparePassword: PasswordComparator = bcrypt.compare,
  ) {
    this.users = users;
    this.comparePassword = comparePassword;
  }

  async getAccountStatus(userId: string): Promise<AccountStatus | null> {
    return this.users.getAccountStatus(userId);
  }

  async verifyProvisionedCredentials(email: string, password: string) {
    if (!isPasswordInputWithinPolicy(password)) {
      return null;
    }

    const user = await this.users.findByEmail(email);
    const passwordHash = user?.isActive ? user.passwordHash : DUMMY_PASSWORD_HASH;
    const passwordMatches = await this.comparePassword(password, passwordHash);

    if (!user || !user.isActive || !passwordMatches) {
      return null;
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    } satisfies AuthenticatedUser;
  }
}
