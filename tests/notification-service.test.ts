import assert from "node:assert/strict";
import test from "node:test";
import type { Notification } from "@prisma/client";

import {
  NOTIFICATION_MESSAGE_MAX_LENGTH,
  NOTIFICATION_TITLE_MAX_LENGTH,
} from "../src/business/notifications/notification-contract.ts";
import { NotificationService } from "../src/business/notifications/notification-service.ts";

const userId = "2f8855bb-05bb-4f8e-aee1-7c6cab541748";

function createNotification(): Notification {
  return {
    id: "a4d1490a-bfe8-4a5f-bb5e-6a8fc9b8e0a1",
    userId,
    type: "schedule_activity",
    title: "Study session",
    message: "Your activity begins soon.",
    relatedModule: "schedules-responsibilities",
    relatedEntityId: "b77f17bf-3d96-4c12-a81e-3bbf5a75f6f3",
    isRead: false,
    createdAt: new Date("2026-11-18T00:00:00.000Z"),
    readAt: null,
    deduplicationKey: "schedule:example",
  };
}

test("validates and dispatches an approved notification request", async () => {
  const notification = createNotification();
  let receivedRequest: unknown;
  const service = new NotificationService({
    createOrReturnExisting: async (request) => {
      receivedRequest = request;
      return notification;
    },
    listForRecipient: async () => ({ notifications: [] }),
    markReadForRecipient: async () => null,
  });

  const result = await service.dispatch({
    recipientUserId: userId,
    type: "schedule_activity",
    title: notification.title,
    message: notification.message,
    relatedModule: notification.relatedModule,
    relatedEntityId: notification.relatedEntityId,
    deduplicationKey: notification.deduplicationKey,
  });

  assert.equal(result, notification);
  assert.deepEqual(receivedRequest, {
    recipientUserId: userId,
    type: "schedule_activity",
    title: notification.title,
    message: notification.message,
    relatedModule: notification.relatedModule,
    relatedEntityId: notification.relatedEntityId,
    deduplicationKey: notification.deduplicationKey,
  });
});

test("rejects unsupported notification types before persistence", async () => {
  let persisted = false;
  const service = new NotificationService({
    createOrReturnExisting: async () => {
      persisted = true;
      return createNotification();
    },
    listForRecipient: async () => ({ notifications: [] }),
    markReadForRecipient: async () => null,
  });

  assert.throws(
    () =>
      service.dispatch({
        recipientUserId: userId,
        type: "unsupported",
        title: "Title",
        message: "Message",
        relatedModule: "module",
        relatedEntityId: "entity",
        deduplicationKey: "key",
      }),
  );
  assert.equal(persisted, false);
});

test("rejects title and message values beyond the approved content limits before persistence", () => {
  let persisted = false;
  const service = new NotificationService({
    createOrReturnExisting: async () => {
      persisted = true;
      return createNotification();
    },
    listForRecipient: async () => ({ notifications: [] }),
    markReadForRecipient: async () => null,
  });

  const request = {
    recipientUserId: userId,
    type: "schedule_activity",
    title: "T".repeat(NOTIFICATION_TITLE_MAX_LENGTH + 1),
    message: "M".repeat(NOTIFICATION_MESSAGE_MAX_LENGTH + 1),
    relatedModule: "module",
    relatedEntityId: "entity",
    deduplicationKey: "key",
  };

  assert.throws(() => service.dispatch(request));
  assert.equal(persisted, false);
});
