"use client";

import { useCallback, useEffect, useState } from "react";

import {
  NotificationInboxView,
  type InboxNotification,
  type NotificationInboxState,
} from "./notification-inbox-view.ts";

type InboxResponse = {
  data?: {
    notifications?: InboxNotification[];
    nextCursor?: string | null;
  };
  error?: { code?: string };
};

function getErrorState(body: InboxResponse): NotificationInboxState {
  return body.error?.code === "VALIDATION_ERROR" ? "validation-error" : "network-error";
}

export function NotificationInbox() {
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [state, setState] = useState<NotificationInboxState>("loading");

  const loadNotifications = useCallback(async (cursor?: string) => {
    setState("loading");

    try {
      const search = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
      const response = await fetch(`/api/notifications${search}`);
      const body = (await response.json()) as InboxResponse;

      if (!response.ok || !body.data?.notifications) {
        setState(getErrorState(body));
        return;
      }

      setNotifications((existing) => (cursor ? [...existing, ...body.data!.notifications!] : body.data!.notifications!));
      setNextCursor(body.data.nextCursor ?? null);
      setState("ready");
    } catch {
      setState("network-error");
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const markRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, { method: "PATCH" });
      const body = (await response.json()) as InboxResponse & {
        data?: { notification?: InboxNotification };
      };

      if (!response.ok || !body.data?.notification) {
        setState(getErrorState(body));
        return;
      }

      setNotifications((existing) =>
        existing.map((notification) =>
          notification.id === notificationId ? body.data!.notification! : notification,
        ),
      );
      setState("ready");
    } catch {
      setState("network-error");
    }
  }, []);

  return (
    <NotificationInboxView
      notifications={notifications}
      state={state}
      canLoadMore={state === "ready" && nextCursor !== null}
      onLoadMore={() => {
        if (nextCursor) {
          void loadNotifications(nextCursor);
        }
      }}
      onMarkRead={(notificationId) => {
        void markRead(notificationId);
      }}
    />
  );
}
