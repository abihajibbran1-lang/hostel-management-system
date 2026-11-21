import { createElement, type ReactNode } from "react";

import { formatKarachiDateTime } from "../../business/modules/schedules/personal-schedule-time.ts";

export type PersonalScheduleViewItem = {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
};

export type PersonalScheduleViewState =
  | "loading"
  | "ready"
  | "validation-error"
  | "network-error";

type PersonalScheduleViewProps = {
  schedules: PersonalScheduleViewItem[];
  state: PersonalScheduleViewState;
  onEdit: (schedule: PersonalScheduleViewItem) => void;
  onRetry: () => void;
};

function renderStatus(
  state: PersonalScheduleViewState,
  onRetry: () => void,
): ReactNode | undefined {
  if (state === "loading") {
    return createElement("p", { role: "status" }, "Loading your schedule…");
  }

  if (state === "validation-error") {
    return createElement("p", { role: "alert" }, "The schedule request is invalid.");
  }

  if (state === "network-error") {
    return createElement("div", { role: "alert" }, [
      createElement("p", { key: "message" }, "Your schedule could not be loaded."),
      createElement("button", { type: "button", onClick: onRetry, key: "retry" }, "Try again"),
    ]);
  }
}

export function PersonalScheduleView({
  schedules,
  state,
  onEdit,
  onRetry,
}: PersonalScheduleViewProps) {
  const status = renderStatus(state, onRetry);

  if (status) {
    return createElement("div", { "aria-live": "polite" }, status);
  }

  if (schedules.length === 0) {
    return createElement("p", null, "No activities are scheduled for this day.");
  }

  return createElement(
    "ol",
    { className: "mt-4 space-y-3", "aria-label": "Your activities" },
    schedules.map((schedule) =>
      createElement("li", { key: schedule.id, className: "rounded-lg border border-slate-200 bg-white p-4" }, [
        createElement("div", { key: "content", className: "flex flex-wrap items-start justify-between gap-3" }, [
          createElement("div", { key: "details" }, [
            createElement("h2", { key: "title", className: "font-semibold" }, schedule.title),
            schedule.description
              ? createElement("p", { key: "description", className: "mt-1 text-sm text-slate-600" }, schedule.description)
              : null,
            createElement(
              "p",
              { key: "time", className: "mt-2 text-sm text-slate-700" },
              `${formatKarachiDateTime(schedule.startAt)} – ${formatKarachiDateTime(schedule.endAt)}`,
            ),
          ]),
          createElement(
            "button",
            {
              type: "button",
              key: "edit",
              className: "rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50",
              onClick: () => onEdit(schedule),
            },
            "Edit",
          ),
        ]),
      ]),
    ),
  );
}
