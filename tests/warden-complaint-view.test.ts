import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { ComplaintViewItem } from "../src/components/complaints/complaint-view.ts";
import {
  WardenComplaintView,
  type WardenComplaintViewProps,
} from "../src/components/complaints/warden-complaint-view.ts";

const complaintId = "a4d1490a-bfe8-4a5f-bb5e-6a8fc9b8e0a1";

function makeComplaint(overrides: Partial<ComplaintViewItem> = {}): ComplaintViewItem {
  return {
    id: complaintId,
    category: "Water",
    roomNumber: "A-12",
    description: "Leaking tap",
    urgencyFlag: true,
    status: "Pending",
    outcome: null,
    submittedAt: "2026-11-24T10:00:00.000Z",
    ...overrides,
  };
}

function makeProps(overrides: Partial<WardenComplaintViewProps> = {}): WardenComplaintViewProps {
  return {
    complaints: [],
    state: "ready",
    canLoadMore: false,
    statusFilter: "",
    urgencyFilter: "",
    onStatusFilterChange: () => {},
    onUrgencyFilterChange: () => {},
    onSelect: () => {},
    onLoadMore: () => {},
    selected: null,
    detailState: "idle",
    outcomeDraft: "",
    reasonDraft: "",
    urgencyTarget: false,
    actionMessage: null,
    actionError: null,
    busy: false,
    onOutcomeChange: () => {},
    onReasonChange: () => {},
    onUrgencyTargetChange: () => {},
    onStart: () => {},
    onResolve: () => {},
    onCorrectUrgency: () => {},
    ...overrides,
  };
}

function render(overrides: Partial<WardenComplaintViewProps> = {}) {
  return renderToStaticMarkup(createElement(WardenComplaintView, makeProps(overrides)));
}

test("renders queue loading, validation and network states", () => {
  assert.match(render({ state: "loading" }), /Loading complaints/);
  assert.match(render({ state: "validation-error" }), /complaint request is invalid/);
  assert.match(render({ state: "network-error" }), /Complaints could not be loaded/);
});

test("renders filters, empty queue and load-more control", () => {
  const empty = render();
  assert.match(empty, /No complaints match these filters/);
  assert.match(empty, /All statuses/);
  assert.match(empty, /All urgency values/);

  const populated = render({
    complaints: [makeComplaint()],
    canLoadMore: true,
  });
  assert.match(populated, /Water complaint/);
  assert.match(populated, /View details/);
  assert.match(populated, /Load more/);
});

test("renders detail loading state independently from queue state", () => {
  const markup = render({ detailState: "loading" });
  assert.match(markup, /Loading complaint detail/);
});

test("pending detail offers start and urgency correction but not resolve", () => {
  const markup = render({ selected: makeComplaint(), detailState: "ready" });
  assert.match(markup, /Tracking reference: a4d1490a/);
  assert.match(markup, /Start complaint/);
  assert.match(markup, /Correct urgency/);
  assert.doesNotMatch(markup, /Resolve complaint/);
});

test("in-progress detail offers resolve and urgency correction but not start", () => {
  const markup = render({
    selected: makeComplaint({ status: "In Progress" }),
    detailState: "ready",
  });
  assert.match(markup, /Resolve complaint/);
  assert.match(markup, /Correct urgency/);
  assert.doesNotMatch(markup, /Start complaint/);
});

test("resolved detail shows outcome and no mutation controls", () => {
  const markup = render({
    selected: makeComplaint({ status: "Resolved", outcome: "Tap repaired" }),
    detailState: "ready",
  });
  assert.match(markup, /Outcome: Tap repaired/);
  assert.doesNotMatch(markup, /Start complaint/);
  assert.doesNotMatch(markup, /Resolve complaint/);
  assert.doesNotMatch(markup, /Correct urgency/);
});

test("renders action feedback and disables controls while busy", () => {
  const markup = render({
    selected: makeComplaint(),
    detailState: "ready",
    actionMessage: "Complaint started.",
    actionError: "Check the submitted details and try again.",
    busy: true,
  });
  assert.match(markup, /Complaint started/);
  assert.match(markup, /Check the submitted details/);
  assert.match(markup, /disabled=""/);
});
