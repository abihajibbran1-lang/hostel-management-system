import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PersonalScheduleView } from "../src/components/schedules/personal-schedule-view.ts";

const emptyHandlers = { onEdit: () => {}, onRetry: () => {} };

test("renders loading, validation, network failure, and empty schedule states", () => {
  const loading = renderToStaticMarkup(
    createElement(PersonalScheduleView, { schedules: [], state: "loading", ...emptyHandlers }),
  );
  const invalid = renderToStaticMarkup(
    createElement(PersonalScheduleView, { schedules: [], state: "validation-error", ...emptyHandlers }),
  );
  const network = renderToStaticMarkup(
    createElement(PersonalScheduleView, { schedules: [], state: "network-error", ...emptyHandlers }),
  );
  const empty = renderToStaticMarkup(
    createElement(PersonalScheduleView, { schedules: [], state: "ready", ...emptyHandlers }),
  );

  assert.match(loading, /Loading your schedule/);
  assert.match(invalid, /schedule request is invalid/);
  assert.match(network, /could not be loaded/);
  assert.match(network, /Try again/);
  assert.match(empty, /No activities are scheduled/);
});

test("renders an owned activity's details and edit action", () => {
  const markup = renderToStaticMarkup(
    createElement(PersonalScheduleView, {
      state: "ready",
      ...emptyHandlers,
      schedules: [
        {
          id: "a4d1490a-bfe8-4a5f-bb5e-6a8fc9b8e0a1",
          title: "Study session",
          description: "Review notes",
          startAt: "2026-02-01T04:00:00.000Z",
          endAt: "2026-02-01T05:00:00.000Z",
        },
      ],
    }),
  );

  assert.match(markup, /Study session/);
  assert.match(markup, /Review notes/);
  assert.match(markup, /Edit/);
});
