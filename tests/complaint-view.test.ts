import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  ComplaintTrackingView,
  type ComplaintViewItem,
} from "../src/components/complaints/complaint-view.ts";

const noHandlers = { onLoadMore: () => {} };

const complaint: ComplaintViewItem = {
  id: "a4d1490a-bfe8-4a5f-bb5e-6a8fc9b8e0a1",
  category: "Water",
  roomNumber: "A-12",
  description: "Leaking tap",
  urgencyFlag: true,
  status: "Pending",
  outcome: null,
  submittedAt: "2026-11-24T10:00:00.000Z",
};

test("renders loading, validation and network error states", () => {
  const loading = renderToStaticMarkup(
    createElement(ComplaintTrackingView, {
      complaints: [],
      state: "loading",
      canLoadMore: false,
      confirmation: null,
      ...noHandlers,
    }),
  );
  const validationError = renderToStaticMarkup(
    createElement(ComplaintTrackingView, {
      complaints: [],
      state: "validation-error",
      canLoadMore: false,
      confirmation: null,
      ...noHandlers,
    }),
  );
  const networkError = renderToStaticMarkup(
    createElement(ComplaintTrackingView, {
      complaints: [],
      state: "network-error",
      canLoadMore: false,
      confirmation: null,
      ...noHandlers,
    }),
  );

  assert.match(loading, /Loading complaints/);
  assert.match(validationError, /complaint request is invalid/);
  assert.match(networkError, /could not be loaded/);
});

test("renders an empty tracking list and submission confirmation", () => {
  const empty = renderToStaticMarkup(
    createElement(ComplaintTrackingView, {
      complaints: [],
      state: "ready",
      canLoadMore: false,
      confirmation: null,
      ...noHandlers,
    }),
  );
  const confirmed = renderToStaticMarkup(
    createElement(ComplaintTrackingView, {
      complaints: [],
      state: "ready",
      canLoadMore: false,
      confirmation: `Complaint submitted. Tracking reference: ${complaint.id}`,
      ...noHandlers,
    }),
  );

  assert.match(empty, /You have no complaints/);
  assert.match(confirmed, new RegExp(complaint.id));
});

test("renders status, tracking reference, urgency, outcome and load-more", () => {
  const markup = renderToStaticMarkup(
    createElement(ComplaintTrackingView, {
      complaints: [
        complaint,
        { ...complaint, id: "id-2", status: "Resolved", outcome: "Tap repaired", urgencyFlag: false },
      ],
      state: "ready",
      canLoadMore: true,
      confirmation: null,
      ...noHandlers,
    }),
  );

  assert.match(markup, /Status: Pending/);
  assert.match(markup, /Status: Resolved/);
  assert.match(markup, new RegExp(complaint.id));
  assert.match(markup, /Marked urgent/);
  assert.match(markup, /Outcome: Tap repaired/);
  assert.match(markup, /Load more/);
});
