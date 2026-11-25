import { Prisma, type Notification, type PrismaClient } from "@prisma/client";

import { prisma } from "../../database/prisma.ts";
import type {
  NotificationDispatchRequest,
  NotificationInboxQuery,
} from "../../../business/notifications/notification-contract.ts";

type NotificationPrismaClient = Pick<PrismaClient, "notification">;

export type NotificationInboxPage = {
  notifications: Notification[];
  nextCursor?: string;
};

function isDeduplicationConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export class NotificationRepository {
  private readonly client: NotificationPrismaClient;

  constructor(client: NotificationPrismaClient = prisma) {
    this.client = client;
  }

  async createOrReturnExisting(request: NotificationDispatchRequest) {
    try {
      return await this.client.notification.create({
        data: {
          userId: request.recipientUserId,
          type: request.type,
          title: request.title,
          message: request.message,
          relatedModule: request.relatedModule,
          relatedEntityId: request.relatedEntityId,
          deduplicationKey: request.deduplicationKey,
        },
      });
    } catch (error) {
      if (!isDeduplicationConflict(error)) {
        throw error;
      }

      const existing = await this.client.notification.findUnique({
        where: { deduplicationKey: request.deduplicationKey },
      });

      if (!existing) {
        throw error;
      }

      return existing;
    }
  }

  async listForRecipient(userId: string, query: NotificationInboxQuery): Promise<NotificationInboxPage> {
    const records = await this.client.notification.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      ...(query.cursor
        ? {
            cursor: { id: query.cursor },
            skip: 1,
          }
        : {}),
    });
    const hasNextPage = records.length > query.limit;
    const notifications = hasNextPage ? records.slice(0, query.limit) : records;

    return {
      notifications,
      nextCursor: hasNextPage ? notifications.at(-1)?.id : undefined,
    };
  }

  async markReadForRecipient(userId: string, notificationId: string) {
    await this.client.notification.updateMany({
      where: { id: notificationId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return this.client.notification.findFirst({
      where: { id: notificationId, userId },
    });
  }
}

// A duplicate must not abort a caller's PostgreSQL transaction. Unlike catching
// a unique-constraint violation, skipDuplicates leaves the transaction usable.
export async function createNotificationInTransaction(
  client: NotificationPrismaClient,
  request: NotificationDispatchRequest,
) {
  const { recipientUserId: userId, ...notification } = request;
  await client.notification.createMany({
    data: { userId, ...notification },
    skipDuplicates: true,
  });
  const existing = await client.notification.findUniqueOrThrow({
    where: { deduplicationKey: request.deduplicationKey },
  });
  if (existing.userId !== userId || existing.type !== request.type ||
      existing.relatedModule !== request.relatedModule ||
      existing.relatedEntityId !== request.relatedEntityId) {
    throw new Error("Notification deduplication key belongs to a different event.");
  }
  return existing;
}
