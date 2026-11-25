import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import { deliverActivityReminder } from "../src/business/modules/schedules/activity-reminder-service.ts";
import { NotificationService } from "../src/business/notifications/notification-service.ts";

const activity = {
  id: "10000000-0000-4000-8000-000000000001",
  userId: "10000000-0000-4000-8000-000000000002",
  startAt: new Date("2026-11-26T10:00:00Z"),
};
const job = {
  targetId: activity.id,
  scheduledFor: new Date("2026-11-26T09:30:00Z"),
  idempotencyKey: "schedule:activity:10am",
};

test("a due reminder dispatches only to the schedule owner in the existing transaction", async () => {
  const client = {} as Prisma.TransactionClient;
  const notices: unknown[] = [];
  const notifications = new NotificationService();
  const dispatch = test.mock.method(notifications, "dispatchInTransaction", async (transaction: Prisma.TransactionClient, request: unknown) => {
    assert.equal(transaction, client);
    notices.push(request);
    return {} as Awaited<ReturnType<NotificationService["dispatchInTransaction"]>>;
  });
  try {
    await deliverActivityReminder(client, job, job.scheduledFor, async (_transaction, id) => {
      assert.equal(id, activity.id);
      return activity;
    }, notifications);
    assert.deepEqual(notices, [{
      recipientUserId: activity.userId,
      type: "schedule_activity",
      title: "Upcoming activity",
      message: "An activity on your personal schedule starts soon.",
      relatedModule: "schedules",
      relatedEntityId: activity.id,
      deduplicationKey: job.idempotencyKey,
    }]);
  } finally {
    dispatch.mock.restore();
  }
});

test("a reminder is skipped before it is due, after its activity starts, or when the start time changes", async () => {
  const client = {} as Prisma.TransactionClient;
  const notifications = new NotificationService();
  const dispatch = test.mock.method(notifications, "dispatchInTransaction", async () => {
    throw new Error("Skipped reminders must not dispatch");
  });
  try {
    await deliverActivityReminder(client, job, new Date("2026-11-26T09:29:59Z"), async () => activity, notifications);
    await deliverActivityReminder(client, job, activity.startAt, async () => activity, notifications);
    await deliverActivityReminder(client, job, job.scheduledFor, async () => ({
      ...activity, startAt: new Date("2026-11-26T11:00:00Z"),
    }), notifications);
    assert.equal(dispatch.mock.callCount(), 0);
  } finally {
    dispatch.mock.restore();
  }
});
