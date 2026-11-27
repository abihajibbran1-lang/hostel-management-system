import type { PrismaClient, UserRole } from "@prisma/client";

import { prisma } from "../../database/prisma.ts";

type AuthPrismaClient = Pick<PrismaClient, "user">;

export type AccountStatus = {
  userId: string;
  role: UserRole;
  isActive: boolean;
};

export class AuthUserRepository {
  private readonly client: AuthPrismaClient;

  constructor(client: AuthPrismaClient = prisma) {
    this.client = client;
  }

  findByEmail(email: string) {
    return this.client.user.findUnique({
      where: { email },
    });
  }

  findById(id: string) {
    return this.client.user.findUnique({
      where: { id },
    });
  }

  async listActiveManagerIds() {
    return this.listActiveUserIdsByRole("MANAGER");
  }

  async listActiveUserIdsByRole(role: UserRole) {
    const users = await this.client.user.findMany({
      where: { role, isActive: true }, select: { id: true },
    });
    return users.map(({ id }) => id);
  }

  async getAccountStatus(id: string): Promise<AccountStatus | null> {
    const user = await this.client.user.findUnique({
      where: { id },
      select: { id: true, role: true, isActive: true },
    });

    return user
      ? {
          userId: user.id,
          role: user.role,
          isActive: user.isActive,
        }
      : null;
  }

  async isActive(id: string) {
    return (await this.getAccountStatus(id))?.isActive ?? false;
  }
}
