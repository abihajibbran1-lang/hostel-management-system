import type { PrismaClient } from "@prisma/client";

import { prisma } from "../../database/prisma.ts";

type AuthPrismaClient = Pick<PrismaClient, "user">;

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

  async isActive(id: string) {
    const user = await this.client.user.findUnique({
      where: { id },
      select: { isActive: true },
    });

    return user?.isActive ?? false;
  }
}
