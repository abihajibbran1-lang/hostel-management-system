import { z } from "zod";

import { NotificationService } from "../../../../../business/notifications/notification-service.ts";
import { toNotificationResponse } from "../../../../../business/notifications/notification-response.ts";
import {
  apiAuthenticationFailed,
  apiForbidden,
  apiInternalError,
  apiSuccess,
  apiValidationError,
} from "../../../../../shared/api/response.ts";
import { getVerifiedAuthenticatedUserId } from "../../../../../shared/auth/authenticated-request.ts";
import { validateRequestOrigin } from "../../../../../shared/security/origin-validation.ts";

const notificationIdSchema = z.string().uuid();

type MarkReadPort = Pick<NotificationService, "markRecipientNotificationRead">;

export function createMarkNotificationReadHandler(notificationService?: MarkReadPort) {
  return async function markRead(request: Request, context: { params: Promise<{ id: string }> }) {
    if (validateRequestOrigin(request) !== "same-origin") {
      return apiForbidden();
    }

    const userId = getVerifiedAuthenticatedUserId(request);

    if (!userId) {
      return apiAuthenticationFailed();
    }

    const params = await context.params;
    const notificationId = notificationIdSchema.safeParse(params.id);

    if (!notificationId.success) {
      return apiValidationError(notificationId.error);
    }

    try {
      const notification = await (
        notificationService ?? new NotificationService()
      ).markRecipientNotificationRead(userId, notificationId.data);

      if (!notification) {
        return apiForbidden();
      }

      return apiSuccess({ notification: toNotificationResponse(notification) });
    } catch {
      return apiInternalError();
    }
  };
}
