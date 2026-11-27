"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  ComplaintTrackingView,
  type ComplaintTrackingState,
  type ComplaintViewItem,
} from "./complaint-view.ts";

type ComplaintResponse = {
  data?: {
    complaint?: ComplaintViewItem;
    complaints?: ComplaintViewItem[];
    nextCursor?: string | null;
    trackingReference?: string;
  };
  error?: { code?: string };
};

type ComplaintForm = {
  category: string;
  roomNumber: string;
  description: string;
  urgencyFlag: boolean;
};

const emptyForm: ComplaintForm = {
  category: "",
  roomNumber: "",
  description: "",
  urgencyFlag: false,
};

const categories = ["Water", "Hygiene", "Pests", "Electricity", "Facilities"] as const;

function getErrorState(body: ComplaintResponse): ComplaintTrackingState {
  return body.error?.code === "VALIDATION_ERROR" ? "validation-error" : "network-error";
}

export function ComplaintSubmission() {
  const [complaints, setComplaints] = useState<ComplaintViewItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [state, setState] = useState<ComplaintTrackingState>("loading");
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [form, setForm] = useState<ComplaintForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [followUp, setFollowUp] = useState<{ id: string; kind: "recurrence" | "disagreement" } | null>(null);
  const [reason, setReason] = useState("");
  const [trackingError, setTrackingError] = useState("");

  const loadComplaints = useCallback(async (cursor?: string) => {
    setState("loading");

    try {
      const search = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
      const response = await fetch(`/api/complaints${search}`);
      const body = (await response.json()) as ComplaintResponse;

      if (!response.ok || !body.data?.complaints) {
        setState(getErrorState(body));
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
  }, []);

  useEffect(() => {
    void loadComplaints();
  }, [loadComplaints]);

  async function submitComplaint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (
      !form.category ||
      form.roomNumber.trim().length < 1 ||
      form.roomNumber.length > 30 ||
      form.description.trim().length < 1
    ) {
      setFormError("Complete all required fields before submitting.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(followUp ? `/api/complaints/${followUp.id}/follow-ups` : "/api/complaints", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category: form.category,
          roomNumber: form.roomNumber,
          description: form.description,
          urgencyFlag: form.urgencyFlag,
          ...(followUp ? { kind: followUp.kind, ...(followUp.kind === "disagreement" ? { reason } : {}) } : {}),
        }),
      });
      const body = (await response.json()) as ComplaintResponse;

      if (!response.ok || !body.data?.complaint) {
        setFormError(
          body.error?.code === "VALIDATION_ERROR"
            ? "Check the complaint details and try again."
            : "Your complaint could not be submitted. Please try again.",
        );
        return;
      }

      setConfirmation(`Complaint submitted. Tracking reference: ${body.data.complaint.id}`);
      setForm(emptyForm);
      setFollowUp(null);
      setReason("");
      await loadComplaints();
    } catch {
      setFormError("Your complaint could not be submitted. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function startFollowUp(complaint: ComplaintViewItem, kind: "recurrence" | "disagreement") {
    setFollowUp({ id: complaint.id, kind });
    setForm({ category: complaint.category, roomNumber: complaint.roomNumber, description: "", urgencyFlag: false });
    setReason("");
    setFormError(null);
    document.getElementById("complaint-category")?.focus();
  }

  async function escalate(complaint: ComplaintViewItem) {
    setTrackingError("");
    setSaving(true);
    try {
      const response = await fetch(`/api/complaints/${complaint.id}/escalate`, { method: "POST" });
      if (!response.ok) {
        const body = await response.json() as { error?: { details?: { message: string }[] } };
        setTrackingError(body.error?.details?.[0]?.message ?? "Could not escalate the complaint.");
        await loadComplaints();
        return;
      }
      setConfirmation("Complaint escalated to the Manager.");
      await loadComplaints();
    } catch {
      setTrackingError("Could not escalate the complaint. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="submit-complaint-heading">
      <h1 id="submit-complaint-heading">{followUp ? "Submit a linked complaint" : "Submit a Complaint"}</h1>
      <form method="post" onSubmit={submitComplaint}>
        {followUp && (
          <p>Original complaint: {followUp.id}{" "}
            <button type="button" disabled={saving} onClick={() => {
              setFollowUp(null); setForm(emptyForm); setReason(""); setFormError(null);
            }}>Cancel follow-up</button>
          </p>
        )}
        {followUp?.kind === "disagreement" && (
          <label>Why do you disagree with the outcome?
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} required />
          </label>
        )}
        <div>
          <label htmlFor="complaint-category">Category</label>
          <select
            id="complaint-category"
            value={form.category}
            onChange={(event) => setForm({ ...form, category: event.target.value })}
            required
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="complaint-room">Room number</label>
          <input
            id="complaint-room"
            type="text"
            maxLength={30}
            value={form.roomNumber}
            onChange={(event) => setForm({ ...form, roomNumber: event.target.value })}
            required
          />
        </div>
        <div>
          <label htmlFor="complaint-description">Description</label>
          <textarea
            id="complaint-description"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            required
          />
        </div>
        <div>
          <label htmlFor="complaint-urgency">
            <input
              id="complaint-urgency"
              type="checkbox"
              checked={form.urgencyFlag}
              onChange={(event) => setForm({ ...form, urgencyFlag: event.target.checked })}
            />
            Mark as urgent
          </label>
        </div>
        {formError ? <p role="alert">{formError}</p> : null}
        <button type="submit" disabled={saving}>
          Submit complaint
        </button>
      </form>
      {trackingError && <p role="alert">{trackingError}</p>}
      <button type="button" disabled={saving} onClick={() => void loadComplaints()}>Refresh complaint status</button>
      <ComplaintTrackingView
        complaints={complaints}
        state={state}
        canLoadMore={state === "ready" && nextCursor !== null}
        confirmation={confirmation}
        renderActions={(complaint) => (
          <div className="flex flex-wrap gap-3">
            {complaint.canEscalate && <button type="button" disabled={saving} onClick={() => void escalate(complaint)}>Escalate to Manager</button>}
            {complaint.status === "Resolved" && (
              <>
                <button type="button" disabled={saving} onClick={() => startFollowUp(complaint, "recurrence")}>Report recurrence</button>
                <button type="button" disabled={saving} onClick={() => startFollowUp(complaint, "disagreement")}>Disagree with outcome</button>
              </>
            )}
          </div>
        )}
        onLoadMore={() => {
          if (nextCursor) {
            void loadComplaints(nextCursor);
          }
        }}
      />
    </section>
  );
}
