import { NotificationService } from "../../../business/notifications/notification-service.ts";
import { toNotificationResponse } from "../../../business/notifications/notification-response.ts";
import {
  apiAuthenticationFailed,
  apiInternalError,
  apiSuccess,
  apiValidationError,
} from "../../../shared/api/response.ts";
import { getVerifiedAuthenticatedUserId } from "../../../shared/auth/authenticated-request.ts";
import {
  encodeNotificationCursor,
  notificationInboxQuerySchema,
} from "../../../business/notifications/notification-contract.ts";

type NotificationInboxPort = Pick<NotificationService, "listRecipientInbox">;

function getInboxQuery(request: Request) {
  const searchParams = new URL(request.url).searchParams;

  return notificationInboxQuerySchema.safeParse({
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  });
}

export function createNotificationInboxHandler(notificationService?: NotificationInboxPort) {
  return async function listInbox(request: Request) {
    const userId = getVerifiedAuthenticatedUserId(request);

    if (!userId) {
      return apiAuthenticationFailed();
    }

    const query = getInboxQuery(request);

    if (!query.success) {
      return apiValidationError(query.error);
    }

    try {
      const inbox = await (notificationService ?? new NotificationService()).listRecipientInbox(
        userId,
        query.data,
      );

      return apiSuccess({
        notifications: inbox.notifications.map(toNotificationResponse),
        nextCursor: inbox.nextCursor ? encodeNotificationCursor(inbox.nextCursor) : null,
      });
    } catch {
      return apiInternalError();
    }
  };
}
