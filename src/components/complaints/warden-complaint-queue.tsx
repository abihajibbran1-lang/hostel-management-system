"use client";

import { useCallback, useEffect, useState } from "react";

import type { ComplaintViewItem } from "./complaint-view.ts";
import {
  WardenComplaintView,
  type WardenViewState,
} from "./warden-complaint-view.ts";

type ComplaintResponse = {
  data?: {
    complaint?: ComplaintViewItem;
    complaints?: ComplaintViewItem[];
    nextCursor?: string | null;
  };
  error?: { code?: string };
};

function getViewState(body: ComplaintResponse): WardenViewState {
  return body.error?.code === "VALIDATION_ERROR" ? "validation-error" : "network-error";
}

function getActionError(body: ComplaintResponse, fallback: string) {
  switch (body.error?.code) {
    case "VALIDATION_ERROR":
      return "Check the submitted details and try again.";
    case "FORBIDDEN":
      return "You are not allowed to change this complaint.";
    case "NOT_FOUND":
      return "This complaint is no longer available.";
    default:
      return fallback;
  }
}

export function WardenComplaintQueue({ queue = "house" }: { queue?: "house" | "intake" }) {
  const [complaints, setComplaints] = useState<ComplaintViewItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [state, setState] = useState<WardenViewState>("loading");
  const [statusFilter, setStatusFilter] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [selected, setSelected] = useState<ComplaintViewItem | null>(null);
  const [detailState, setDetailState] = useState<WardenViewState>("idle");
  const [outcomeDraft, setOutcomeDraft] = useState("");
  const [reasonDraft, setReasonDraft] = useState("");
  const [urgencyTarget, setUrgencyTarget] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadComplaints = useCallback(
    async (cursor?: string) => {
      setState("loading");

      try {
        const params = new URLSearchParams();
        params.set("queue", queue);
        if (statusFilter) {
          params.set("status", statusFilter);
        }
        if (urgencyFilter) {
          params.set("urgencyFlag", urgencyFilter);
        }
        if (cursor) {
          params.set("cursor", cursor);
        }
        const search = params.toString();

        const response = await fetch(`/api/warden/complaints${search ? `?${search}` : ""}`);
        const body = (await response.json()) as ComplaintResponse;

        if (!response.ok || !body.data?.complaints) {
          setState(getViewState(body));
          return;
        }

        setComplaints((existing) =>
          cursor ? [...existing, ...body.data!.complaints!] : body.data!.complaints!,
        );
        setNextCursor(body.data.nextCursor ?? null);
        setState("ready");
      } catch {
        setState("network-error");
      }
    },
    [queue, statusFilter, urgencyFilter],
  );

  useEffect(() => {
    void loadComplaints();
  }, [loadComplaints]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailState("loading");

    try {
      const response = await fetch(`/api/warden/complaints/${encodeURIComponent(id)}`);
      const body = (await response.json()) as ComplaintResponse;

      if (!response.ok || !body.data?.complaint) {
        setDetailState(getViewState(body));
        return;
      }

      const complaint = body.data.complaint;
      setSelected(complaint);
      setOutcomeDraft("");
      setReasonDraft("");
      setUrgencyTarget(!complaint.urgencyFlag);
      setDetailState("ready");
    } catch {
      setDetailState("network-error");
    }
  }, []);

  function selectComplaint(id: string) {
    setSelected(null);
    setDetailState("loading");
    setOutcomeDraft("");
    setReasonDraft("");
    setUrgencyTarget(false);
    setActionMessage(null);
    setActionError(null);
    void loadDetail(id);
  }

  function applyUpdatedComplaint(complaint: ComplaintViewItem, message: string) {
    setSelected(complaint);
    setOutcomeDraft("");
    setReasonDraft("");
    setUrgencyTarget(!complaint.urgencyFlag);
    setDetailState("ready");
    setActionMessage(message);
    setActionError(null);
    void loadComplaints();
  }

  async function runAction(
    url: string,
    method: "POST" | "PATCH",
    body: unknown,
    fallbackError: string,
    successMessage: string,
  ) {
    setBusy(true);
    setActionMessage(null);
    setActionError(null);

    try {
      const response = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const parsed = (await response.json()) as ComplaintResponse;

      if (!response.ok || !parsed.data?.complaint) {
        setActionError(getActionError(parsed, fallbackError));
        return;
      }

      applyUpdatedComplaint(parsed.data.complaint, successMessage);
    } catch {
      setActionError(fallbackError);
    } finally {
      setBusy(false);
    }
  }

  function startComplaint() {
    if (!selected) {
      return;
    }
    void runAction(
      `/api/warden/complaints/${selected.id}/start`,
      "POST",
      {},
      "The complaint could not be started. Please try again.",
      "Complaint started.",
    );
  }

  function resolveComplaint() {
    if (!selected) {
      return;
    }
    const outcome = outcomeDraft.trim();
    if (!outcome) {
      setActionError("Enter a resolution outcome.");
      return;
    }
    void runAction(
      `/api/warden/complaints/${selected.id}/resolve`,
      "POST",
      { outcome },
      "The complaint could not be resolved. Please try again.",
      "Complaint resolved.",
    );
  }

  function correctUrgency() {
    if (!selected) {
      return;
    }
    const reason = reasonDraft.trim();
    if (!reason) {
      setActionError("Enter a reason for the urgency change.");
      return;
    }
    void runAction(
      `/api/warden/complaints/${selected.id}/urgency`,
      "PATCH",
      { urgencyFlag: urgencyTarget, reason },
      "The urgency could not be corrected. Please try again.",
      "Urgency corrected.",
    );
  }

  return (
    <WardenComplaintView
      complaints={complaints}
      state={state}
      canLoadMore={state === "ready" && nextCursor !== null}
      statusFilter={statusFilter}
      urgencyFilter={urgencyFilter}
      onStatusFilterChange={setStatusFilter}
      onUrgencyFilterChange={setUrgencyFilter}
      onSelect={selectComplaint}
      onLoadMore={() => {
        if (nextCursor) {
          void loadComplaints(nextCursor);
        }
      }}
      selected={selected}
      detailState={detailState}
      outcomeDraft={outcomeDraft}
      reasonDraft={reasonDraft}
      urgencyTarget={urgencyTarget}
      actionMessage={actionMessage}
      actionError={actionError}
      busy={busy}
      onOutcomeChange={setOutcomeDraft}
      onReasonChange={setReasonDraft}
      onUrgencyTargetChange={setUrgencyTarget}
      onStart={startComplaint}
      onResolve={resolveComplaint}
      onCorrectUrgency={correctUrgency}
    />
  );
}
