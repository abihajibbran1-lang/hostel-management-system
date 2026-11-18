import assert from "node:assert/strict";
import test from "node:test";
import { Prisma, type Notification, type PrismaClient } from "@prisma/client";

import { NotificationRepository } from "../src/data/repositories/notifications/notification-repository.ts";

const userId = "2f8855bb-05bb-4f8e-aee1-7c6cab541748";
const notificationId = "a4d1490a-bfe8-4a5f-bb5e-6a8fc9b8e0a1";

function createNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: notificationId,
    userId,
    type: "responsibility_assistance",
    title: "Assistance requested",
    message: "A roommate requested assistance.",
    relatedModule: "schedules-responsibilities",
    relatedEntityId: "b77f17bf-3d96-4c12-a81e-3bbf5a75f6f3",
    isRead: false,
    createdAt: new Date("2026-11-18T00:00:00.000Z"),
    readAt: null,
    deduplicationKey: "responsibility-assistance:example",
    ...overrides,
  };
}

function createRepository(notification: Record<string, unknown>) {
  return new NotificationRepository({ notification } as unknown as Pick<PrismaClient, "notification">);
}

test("creates a notification through the repository-owned Prisma client", async () => {
  let receivedData: unknown;
  const record = createNotification();
  const repository = createRepository({
    create: async ({ data }: { data: unknown }) => {
      receivedData = data;
      return record;
    },
  });

  const result = await repository.createOrReturnExisting({
    recipientUserId: userId,
    type: "responsibility_assistance",
    title: record.title,
    message: record.message,
    relatedModule: record.relatedModule,
    relatedEntityId: record.relatedEntityId,
    deduplicationKey: record.deduplicationKey,
  });

  assert.equal(result, record);
  assert.deepEqual(receivedData, {
    userId,
    type: record.type,
    title: record.title,
    message: record.message,
    relatedModule: record.relatedModule,
    relatedEntityId: record.relatedEntityId,
    deduplicationKey: record.deduplicationKey,
  });
});

test("returns the existing notification after a database unique-key conflict", async () => {
  const existing = createNotification();
  const repository = createRepository({
    create: async () => {
      throw new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "test",
      });
    },
    findUnique: async () => existing,
  });

  const result = await repository.createOrReturnExisting({
    recipientUserId: userId,
    type: "responsibility_assistance",
    title: existing.title,
    message: existing.message,
    relatedModule: existing.relatedModule,
    relatedEntityId: existing.relatedEntityId,
    deduplicationKey: existing.deduplicationKey,
  });

  assert.equal(result, existing);
});

test("lists only the requested recipient's newest notifications with a cursor", async () => {
  const newest = createNotification({ id: "a4d1490a-bfe8-4a5f-bb5e-6a8fc9b8e0a2" });
  const older = createNotification({ id: "a4d1490a-bfe8-4a5f-bb5e-6a8fc9b8e0a3" });
  const extra = createNotification({ id: "a4d1490a-bfe8-4a5f-bb5e-6a8fc9b8e0a4" });
  let receivedArgs: unknown;
  const repository = createRepository({
    findMany: async (args: unknown) => {
      receivedArgs = args;
      return [newest, older, extra];
    },
  });

  const page = await repository.listForRecipient(userId, { limit: 2, cursor: notificationId });

  assert.deepEqual(page.notifications, [newest, older]);
  assert.equal(page.nextCursor, older.id);
  assert.deepEqual(receivedArgs, {
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 3,
    cursor: { id: notificationId },
    skip: 1,
  });
});

test("marks an unread notification only within the recipient scope and preserves repeated reads", async () => {
  let receivedUpdate: unknown;
  let receivedLookup: unknown;
  const readNotification = createNotification({ isRead: true, readAt: new Date() });
  const repository = createRepository({
    updateMany: async (args: unknown) => {
      receivedUpdate = args;
      return { count: 1 };
    },
    findFirst: async (args: unknown) => {
      receivedLookup = args;
      return readNotification;
    },
  });

  const result = await repository.markReadForRecipient(userId, notificationId);

  assert.equal(result, readNotification);
  assert.deepEqual(receivedLookup, { where: { id: notificationId, userId } });
  const update = receivedUpdate as {
    where: { id: string; userId: string; isRead: boolean };
    data: { isRead: boolean; readAt: Date };
  };
  assert.deepEqual(update.where, { id: notificationId, userId, isRead: false });
  assert.equal(update.data.isRead, true);
  assert.ok(update.data.readAt instanceof Date);
});
