import assert from "node:assert/strict";
import test from "node:test";
import type { Notification } from "@prisma/client";

import { encodeNotificationCursor } from "../src/business/notifications/notification-contract.ts";
import { createNotificationInboxHandler } from "../src/app/api/notifications/notification-inbox-handler.ts";
import { createMarkNotificationReadHandler } from "../src/app/api/notifications/[id]/read/mark-read-handler.ts";

const userA = "2f8855bb-05bb-4f8e-aee1-7c6cab541748";
const userB = "9cf1f1b8-89a3-49d3-9e1d-e1e5c9b938f1";
const notificationId = "a4d1490a-bfe8-4a5f-bb5e-6a8fc9b8e0a1";

function createNotification(userId = userA): Notification {
  return {
    id: notificationId,
    userId,
    type: "schedule_activity",
    title: "Study session",
    message: "Your activity begins soon.",
    relatedModule: "schedules-responsibilities",
    relatedEntityId: "b77f17bf-3d96-4c12-a81e-3bbf5a75f6f3",
    isRead: false,
    createdAt: new Date("2026-11-18T00:00:00.000Z"),
    readAt: null,
    deduplicationKey: "private-key",
  };
}

function inboxRequest(userId?: string, search = "") {
  return new Request(`https://hostel.example.test/api/notifications${search}`, {
    headers: userId ? { "x-auth-user-id": userId } : undefined,
  });
}

function markReadRequest(userId?: string, origin = "https://hostel.example.test") {
  return new Request(`https://hostel.example.test/api/notifications/${notificationId}/read`, {
    method: "PATCH",
    headers: {
      ...(userId ? { "x-auth-user-id": userId } : {}),
      ...(origin ? { origin } : {}),
    },
  });
}

test("lists the verified recipient inbox without exposing persistence-only fields", async () => {
  let receivedUserId: string | undefined;
  const handler = createNotificationInboxHandler({
    listRecipientInbox: async (requestedUserId, query) => {
      receivedUserId = requestedUserId;
      assert.equal(query.limit, 20);
      assert.equal(query.cursor, undefined);
      return { notifications: [createNotification()] };
    },
  });

  const response = await handler(inboxRequest(userA));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(receivedUserId, userA);
  assert.deepEqual(body, {
    data: {
      notifications: [
        {
          id: notificationId,
          type: "schedule_activity",
          title: "Study session",
          message: "Your activity begins soon.",
          isRead: false,
          createdAt: "2026-11-18T00:00:00.000Z",
          readAt: null,
        },
      ],
      nextCursor: null,
    },
  });
  assert.equal("userId" in body.data.notifications[0], false);
  assert.equal("deduplicationKey" in body.data.notifications[0], false);
});

test("rejects unauthenticated and invalid inbox requests before calling the service", async () => {
  let calls = 0;
  const handler = createNotificationInboxHandler({
    listRecipientInbox: async () => {
      calls += 1;
      return { notifications: [] };
    },
  });

  const unauthenticated = await handler(inboxRequest());
  const invalidQuery = await handler(inboxRequest(userA, "?limit=101"));
  const invalidCursor = await handler(inboxRequest(userA, "?cursor=not-an-opaque-cursor"));

  assert.equal(unauthenticated.status, 401);
  assert.equal(invalidQuery.status, 400);
  assert.equal(invalidCursor.status, 400);
  assert.equal(calls, 0);
});

test("uses an opaque API cursor while passing its decoded value to the service", async () => {
  const cursorId = "a4d1490a-bfe8-4a5f-bb5e-6a8fc9b8e0a2";
  const handler = createNotificationInboxHandler({
    listRecipientInbox: async (_userId, query) => {
      assert.equal(query.cursor, cursorId);
      return { notifications: [], nextCursor: cursorId };
    },
  });

  const response = await handler(inboxRequest(userA, `?cursor=${encodeNotificationCursor(cursorId)}`));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.notEqual(body.data.nextCursor, cursorId);
  assert.equal(body.data.nextCursor, encodeNotificationCursor(cursorId));
});

test("scopes mark-as-read to the verified recipient and is safe for another user", async () => {
  let receivedUserId: string | undefined;
  const handler = createMarkNotificationReadHandler({
    markRecipientNotificationRead: async (requestedUserId, requestedNotificationId) => {
      receivedUserId = requestedUserId;
      assert.equal(requestedNotificationId, notificationId);
      return null;
    },
  });

  const response = await handler(markReadRequest(userB), {
    params: Promise.resolve({ id: notificationId }),
  });

  assert.equal(receivedUserId, userB);
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    error: { code: "FORBIDDEN", message: "Request is not allowed." },
  });
});

test("marks an owned notification read and rejects cross-origin or missing-Origin changes", async () => {
  let calls = 0;
  const notification = createNotification();
  const handler = createMarkNotificationReadHandler({
    markRecipientNotificationRead: async (requestedUserId) => {
      calls += 1;
      assert.equal(requestedUserId, userA);
      return { ...notification, isRead: true, readAt: new Date("2026-11-18T01:00:00.000Z") };
    },
  });

  const allowed = await handler(markReadRequest(userA), {
    params: Promise.resolve({ id: notificationId }),
  });
  const crossOrigin = await handler(markReadRequest(userA, "https://attacker.example.test"), {
    params: Promise.resolve({ id: notificationId }),
  });
  const missingOrigin = await handler(markReadRequest(userA, ""), {
    params: Promise.resolve({ id: notificationId }),
  });

  assert.equal(allowed.status, 200);
  assert.equal(crossOrigin.status, 403);
  assert.equal(missingOrigin.status, 403);
  assert.equal(calls, 1);
});
