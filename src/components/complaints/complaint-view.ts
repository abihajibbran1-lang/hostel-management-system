import { createElement, type ReactNode } from "react";

export type ComplaintViewItem = {
  id: string;
  category: string;
  roomNumber: string;
  description: string;
  urgencyFlag: boolean;
  status: string;
  outcome: string | null;
  submittedAt: string;
};

export type ComplaintTrackingState =
  | "loading"
  | "ready"
  | "validation-error"
  | "network-error";

type ComplaintTrackingViewProps = {
  complaints: ComplaintViewItem[];
  state: ComplaintTrackingState;
  canLoadMore: boolean;
  confirmation: string | null;
  onLoadMore: () => void;
};

function renderStatus(state: ComplaintTrackingState): ReactNode | undefined {
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

export function ComplaintTrackingView({
  complaints,
  state,
  canLoadMore,
  confirmation,
  onLoadMore,
}: ComplaintTrackingViewProps) {
  const heading = createElement(
    "h1",
    { id: "complaints-heading", key: "heading" },
    "My Complaints",
  );
  const status = renderStatus(state);

  if (status) {
    return createElement("section", { "aria-labelledby": "complaints-heading" }, [
      heading,
      createElement("div", { key: "status" }, status),
    ]);
  }

  const confirmationNode = confirmation
    ? createElement("p", { role: "status", key: "confirmation" }, confirmation)
    : null;

  if (complaints.length === 0) {
    return createElement("section", { "aria-labelledby": "complaints-heading" }, [
      heading,
      confirmationNode,
      createElement("p", { key: "empty" }, "You have no complaints."),
    ]);
  }

  return createElement("section", { "aria-labelledby": "complaints-heading" }, [
    heading,
    confirmationNode,
    createElement(
      "ul",
      { key: "list" },
      complaints.map((complaint) =>
        createElement("li", { key: complaint.id }, [
          createElement("h2", { key: "category" }, `${complaint.category} complaint`),
          createElement("p", { key: "status" }, `Status: ${complaint.status}`),
          createElement(
            "p",
            { key: "reference" },
            `Tracking reference: ${complaint.id}`,
          ),
          createElement("p", { key: "room" }, `Room: ${complaint.roomNumber}`),
          createElement("p", { key: "description" }, complaint.description),
          complaint.urgencyFlag
            ? createElement("p", { key: "urgency" }, "Marked urgent")
            : null,
          complaint.outcome
            ? createElement("p", { key: "outcome" }, `Outcome: ${complaint.outcome}`)
            : null,
          createElement(
            "time",
            { dateTime: complaint.submittedAt, key: "submitted" },
            new Date(complaint.submittedAt).toLocaleString(),
          ),
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
