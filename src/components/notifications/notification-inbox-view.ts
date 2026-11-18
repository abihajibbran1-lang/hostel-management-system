import { createElement, type ReactNode } from "react";

export type InboxNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
};

export type NotificationInboxState = "loading" | "ready" | "validation-error" | "network-error";

type NotificationInboxViewProps = {
  notifications: InboxNotification[];
  state: NotificationInboxState;
  canLoadMore: boolean;
  onLoadMore: () => void;
  onMarkRead: (notificationId: string) => void;
};

function renderStatus(state: NotificationInboxState): ReactNode | undefined {
  if (state === "loading") {
    return createElement("p", { role: "status" }, "Loading notifications…");
  }

  if (state === "validation-error") {
    return createElement("p", { role: "alert" }, "The notification request is invalid.");
  }

  if (state === "network-error") {
    return createElement("p", { role: "alert" }, "Notifications could not be loaded. Please try again.");
  }
}

export function NotificationInboxView({
  notifications,
  state,
  canLoadMore,
  onLoadMore,
  onMarkRead,
}: NotificationInboxViewProps) {
  const status = renderStatus(state);

  if (status) {
    return createElement("section", { "aria-labelledby": "notifications-heading" }, [
      createElement("h1", { id: "notifications-heading", key: "heading" }, "Notifications"),
      createElement("div", { key: "status" }, status),
    ]);
  }

  if (notifications.length === 0) {
    return createElement("section", { "aria-labelledby": "notifications-heading" }, [
      createElement("h1", { id: "notifications-heading", key: "heading" }, "Notifications"),
      createElement("p", { key: "empty" }, "You have no notifications."),
    ]);
  }

  return createElement("section", { "aria-labelledby": "notifications-heading" }, [
    createElement("h1", { id: "notifications-heading", key: "heading" }, "Notifications"),
    createElement(
      "ul",
      { key: "list" },
      notifications.map((notification) =>
        createElement("li", { key: notification.id }, [
          createElement("h2", { key: "title" }, notification.title),
          createElement("p", { key: "message" }, notification.message),
          createElement(
            "time",
            { dateTime: notification.createdAt, key: "timestamp" },
            new Date(notification.createdAt).toLocaleString(),
          ),
          createElement(
            "p",
            { key: "read-state" },
            notification.isRead ? "Read" : "Unread",
          ),
          !notification.isRead
            ? createElement(
                "button",
                {
                  type: "button",
                  key: "mark-read",
                  onClick: () => onMarkRead(notification.id),
                },
                "Mark as read",
              )
            : null,
        ]),
      ),
    ),
    canLoadMore
      ? createElement(
          "button",
          { type: "button", key: "load-more", onClick: onLoadMore },
          "Load more",
        )
      : null,
  ]);
}
