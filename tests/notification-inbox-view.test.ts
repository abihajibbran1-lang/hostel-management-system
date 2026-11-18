import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

import { NotificationInboxView } from "../src/components/notifications/notification-inbox-view.ts";

const emptyHandlers = { onLoadMore: () => {}, onMarkRead: () => {} };

test("renders loading, validation, and network error states for the inbox", () => {
  const loading = renderToStaticMarkup(
    createElement(NotificationInboxView, { notifications: [], state: "loading", canLoadMore: false, ...emptyHandlers }),
  );
  const validationError = renderToStaticMarkup(
    createElement(NotificationInboxView, { notifications: [], state: "validation-error", canLoadMore: false, ...emptyHandlers }),
  );
  const networkError = renderToStaticMarkup(
    createElement(NotificationInboxView, { notifications: [], state: "network-error", canLoadMore: false, ...emptyHandlers }),
  );

  assert.match(loading, /Loading notifications/);
  assert.match(validationError, /notification request is invalid/);
  assert.match(networkError, /could not be loaded/);
});

test("renders an empty inbox and an unread notification with its mark-as-read action", () => {
  const empty = renderToStaticMarkup(
    createElement(NotificationInboxView, { notifications: [], state: "ready", canLoadMore: false, ...emptyHandlers }),
  );
  const populated = renderToStaticMarkup(
    createElement(NotificationInboxView, {
      state: "ready",
      canLoadMore: true,
      ...emptyHandlers,
      notifications: [
        {
          id: "a4d1490a-bfe8-4a5f-bb5e-6a8fc9b8e0a1",
          type: "schedule_activity",
          title: "Study session",
          message: "Your activity begins soon.",
          isRead: false,
          createdAt: "2026-11-18T00:00:00.000Z",
          readAt: null,
        },
      ],
    }),
  );

  assert.match(empty, /You have no notifications/);
  assert.match(populated, /Study session/);
  assert.match(populated, /Your activity begins soon/);
  assert.match(populated, /Unread/);
  assert.match(populated, /Mark as read/);
  assert.match(populated, /Load more/);
});
