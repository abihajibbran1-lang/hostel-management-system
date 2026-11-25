import type { Prisma } from "@prisma/client";
import { NotificationService } from "../../notifications/notification-service.ts";
import { findUpcomingReminderTargets, lockActivityForReminder } from "../../../data/repositories/schedules/activity-reminder-repository.ts";

const LEAD_MS = 30 * 60_000;
export const ACTIVITY_REMINDER_JOB = "schedule_activity";

export async function findDueActivityReminders(now: Date) {
  const activities = await findUpcomingReminderTargets(now, new Date(now.getTime() + LEAD_MS));
  return activities.map(({ id, startAt }) => ({
    jobType: ACTIVITY_REMINDER_JOB,
    targetType: "personal_schedule",
    targetId: id,
    idempotencyKey: `schedule:${id}:activity:${startAt.toISOString()}`,
    scheduledFor: new Date(startAt.getTime() - LEAD_MS),
  }));
}

export async function deliverActivityReminder(
  client: Prisma.TransactionClient,
  job: { targetId: string; scheduledFor: Date; idempotencyKey: string },
  now: Date,
  loadActivity = lockActivityForReminder,
  notifications = new NotificationService(),
) {
  const activity = await loadActivity(client, job.targetId);
  if (!activity ||
      job.scheduledFor > now ||
      activity.startAt <= now ||
      activity.startAt.getTime() - LEAD_MS !== job.scheduledFor.getTime()) {
    return;
  }

  await notifications.dispatchInTransaction(client, {
    recipientUserId: activity.userId,
    type: "schedule_activity",
    title: "Upcoming activity",
    message: "An activity on your personal schedule starts soon.",
    relatedModule: "schedules",
    relatedEntityId: activity.id,
    deduplicationKey: job.idempotencyKey,
  });
}
