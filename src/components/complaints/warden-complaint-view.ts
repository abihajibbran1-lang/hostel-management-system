import { createElement, type ReactNode } from "react";

import type { ComplaintViewItem } from "./complaint-view.ts";

export type WardenViewState = "idle" | "loading" | "ready" | "validation-error" | "network-error";

export type WardenComplaintViewProps = {
  complaints: ComplaintViewItem[];
  state: WardenViewState;
  canLoadMore: boolean;
  statusFilter: string;
  urgencyFilter: string;
  onStatusFilterChange: (value: string) => void;
  onUrgencyFilterChange: (value: string) => void;
  onSelect: (id: string) => void;
  onLoadMore: () => void;
  selected: ComplaintViewItem | null;
  detailState: WardenViewState;
  outcomeDraft: string;
  reasonDraft: string;
  urgencyTarget: boolean;
  actionMessage: string | null;
  actionError: string | null;
  busy: boolean;
  onOutcomeChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onUrgencyTargetChange: (value: boolean) => void;
  onStart: () => void;
  onResolve: () => void;
  onCorrectUrgency: () => void;
};

const statuses = ["Pending", "In Progress", "Resolved", "Escalated"];

function renderStatus(state: WardenViewState): ReactNode | undefined {
  if (state === "loading") {
    return createElement("p", { role: "status" }, "Loading complaints…");
  }
  if (state === "validation-error") {
    return createElement("p", { role: "alert" }, "The complaint request is invalid.");
  }
  if (state === "network-error") {
    return createElement("p", { role: "alert" }, "Complaints could not be loaded. Please try again.");
  }
  return undefined;
}

function renderDetailState(state: WardenViewState): ReactNode | undefined {
  if (state === "loading") {
    return createElement("p", { role: "status" }, "Loading complaint detail…");
  }
  if (state === "validation-error") {
    return createElement("p", { role: "alert" }, "The complaint detail request is invalid.");
  }
  if (state === "network-error") {
    return createElement("p", { role: "alert" }, "Complaint detail could not be loaded. Please try again.");
  }
  return undefined;
}

function selectOption(value: string, label: string) {
  return createElement("option", { key: value, value }, label);
}

export function WardenComplaintView({
  complaints,
  state,
  canLoadMore,
  statusFilter,
  urgencyFilter,
  onStatusFilterChange,
  onUrgencyFilterChange,
  onSelect,
  onLoadMore,
  selected,
  detailState,
  outcomeDraft,
  reasonDraft,
  urgencyTarget,
  actionMessage,
  actionError,
  busy,
  onOutcomeChange,
  onReasonChange,
  onUrgencyTargetChange,
  onStart,
  onResolve,
  onCorrectUrgency,
}: WardenComplaintViewProps) {
  const status = renderStatus(state);

  const filters = createElement("div", { key: "filters" }, [
    createElement("label", { key: "status-label", htmlFor: "warden-status-filter" }, "Status"),
    createElement(
      "select",
      {
        id: "warden-status-filter",
        key: "status-select",
        value: statusFilter,
        onChange: (event: { target: { value: string } }) => onStatusFilterChange(event.target.value),
      },
      [
        selectOption("", "All statuses"),
        ...statuses.map((item) => selectOption(item, item)),
      ],
    ),
    createElement("label", { key: "urgency-label", htmlFor: "warden-urgency-filter" }, "Urgency"),
    createElement(
      "select",
      {
        id: "warden-urgency-filter",
        key: "urgency-select",
        value: urgencyFilter,
        onChange: (event: { target: { value: string } }) => onUrgencyFilterChange(event.target.value),
      },
      [
        selectOption("", "All urgency values"),
        selectOption("true", "Urgent"),
        selectOption("false", "Not urgent"),
      ],
    ),
  ]);

  const list = status
    ? createElement("div", { key: "status" }, status)
    : complaints.length === 0
      ? createElement("p", { key: "empty" }, "No complaints match these filters.")
      : createElement(
          "ul",
          { key: "list" },
          complaints.map((complaint) =>
            createElement("li", { key: complaint.id }, [
              createElement("h3", { key: "category" }, `${complaint.category} complaint`),
              createElement("p", { key: "status" }, `Status: ${complaint.status}`),
              createElement("p", { key: "room" }, `Room: ${complaint.roomNumber}`),
              complaint.urgencyFlag
                ? createElement("p", { key: "urgency" }, "Urgent")
                : null,
              createElement(
                "button",
                { type: "button", key: "select", onClick: () => onSelect(complaint.id) },
                "View details",
              ),
            ]),
          ),
        );

  const detailStatus = renderDetailState(detailState);
  let detail: ReactNode;

  if (detailStatus) {
    detail = createElement("div", { key: "detail-status" }, detailStatus);
  } else if (!selected) {
    detail = createElement("p", { key: "detail-empty" }, "Select a complaint to view details.");
  } else {
    const canStart = selected.status === "Pending";
    const canResolve = selected.status === "In Progress";
    const canCorrectUrgency = canStart || canResolve;

    detail = createElement("div", { key: "detail" }, [
      createElement("h2", { key: "heading" }, `${selected.category} complaint`),
      createElement("p", { key: "reference" }, `Tracking reference: ${selected.id}`),
      createElement("p", { key: "status" }, `Status: ${selected.status}`),
      createElement("p", { key: "room" }, `Room: ${selected.roomNumber}`),
      createElement("p", { key: "description" }, selected.description),
      createElement(
        "p",
        { key: "urgency" },
        `Urgency: ${selected.urgencyFlag ? "Urgent" : "Not urgent"}`,
      ),
      selected.outcome
        ? createElement("p", { key: "outcome" }, `Outcome: ${selected.outcome}`)
        : null,
      createElement(
        "time",
        { dateTime: selected.submittedAt, key: "submitted" },
        new Date(selected.submittedAt).toLocaleString(),
      ),
      actionMessage ? createElement("p", { role: "status", key: "action-message" }, actionMessage) : null,
      actionError ? createElement("p", { role: "alert", key: "action-error" }, actionError) : null,
      canStart
        ? createElement(
            "button",
            { type: "button", key: "start", disabled: busy, onClick: onStart },
            "Start complaint",
          )
        : null,
      canResolve
        ? createElement("div", { key: "resolve" }, [
            createElement("label", { key: "label", htmlFor: "warden-outcome" }, "Resolution outcome"),
            createElement("textarea", {
              id: "warden-outcome",
              key: "input",
              value: outcomeDraft,
              onChange: (event: { target: { value: string } }) => onOutcomeChange(event.target.value),
            }),
            createElement(
              "button",
              { type: "button", key: "button", disabled: busy, onClick: onResolve },
              "Resolve complaint",
            ),
          ])
        : null,
      canCorrectUrgency
        ? createElement("div", { key: "urgency" }, [
            createElement("label", { key: "label", htmlFor: "warden-urgency-target" }, "Corrected urgency"),
            createElement(
              "select",
              {
                id: "warden-urgency-target",
                key: "select",
                value: urgencyTarget ? "true" : "false",
                onChange: (event: { target: { value: string } }) =>
                  onUrgencyTargetChange(event.target.value === "true"),
              },
              [selectOption("true", "Urgent"), selectOption("false", "Not urgent")],
            ),
            createElement("label", { key: "reason-label", htmlFor: "warden-urgency-reason" }, "Reason"),
            createElement("textarea", {
              id: "warden-urgency-reason",
              key: "reason",
              value: reasonDraft,
              onChange: (event: { target: { value: string } }) => onReasonChange(event.target.value),
            }),
            createElement(
              "button",
              { type: "button", key: "button", disabled: busy, onClick: onCorrectUrgency },
              "Correct urgency",
            ),
          ])
        : null,
    ]);
  }

  return createElement("section", { "aria-labelledby": "warden-complaints-heading" }, [
    createElement("h1", { id: "warden-complaints-heading", key: "heading" }, "Warden Complaints"),
    filters,
    list,
    canLoadMore && !status
      ? createElement(
          "button",
          { type: "button", key: "load-more", onClick: onLoadMore },
          "Load more",
        )
      : null,
    detail,
  ]);
}
