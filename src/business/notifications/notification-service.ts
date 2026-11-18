import type { Notification } from "@prisma/client";

import { NotificationRepository, type NotificationInboxPage } from "../../data/repositories/notifications/notification-repository.ts";
import {
  notificationDispatchRequestSchema,
  type NotificationDispatchRequest,
  type NotificationInboxQuery,
} from "./notification-contract.ts";

type NotificationStore = {
  createOrReturnExisting(request: NotificationDispatchRequest): Promise<Notification>;
  listForRecipient(userId: string, query: NotificationInboxQuery): Promise<NotificationInboxPage>;
  markReadForRecipient(userId: string, notificationId: string): Promise<Notification | null>;
};

export class NotificationService {
  private readonly notifications: NotificationStore;

  constructor(notifications: NotificationStore = new NotificationRepository()) {
    this.notifications = notifications;
  }

  dispatch(input: unknown) {
    return this.notifications.createOrReturnExisting(notificationDispatchRequestSchema.parse(input));
  }

  listRecipientInbox(userId: string, query: NotificationInboxQuery) {
    return this.notifications.listForRecipient(userId, query);
  }

  markRecipientNotificationRead(userId: string, notificationId: string) {
    return this.notifications.markReadForRecipient(userId, notificationId);
  }
}
