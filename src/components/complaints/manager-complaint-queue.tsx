"use client";

import { useCallback, useEffect, useState } from "react";

type Case = {
  id: string;
  category: string;
  roomNumber: string;
  description: string;
  urgencyFlag: boolean;
  submittedAt: string;
  originalComplaintId: string | null;
  disagreementReason: string | null;
  autoEscalatedAt: string | null;
  manualEscalationRequestedAt: string | null;
};

export function ManagerComplaintQueue() {
  const [cases, setCases] = useState<Case[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (next?: string) => {
    setLoading(true);
    setError("");
    try {
      const query = next ? `?cursor=${encodeURIComponent(next)}` : "";
      const response = await fetch(`/api/manager/complaints${query}`, { cache: "no-store" });
      if (!response.ok) {
        setError(response.status === 401 || response.status === 403
          ? "Sign in as a Manager to view this queue." : "Could not load escalated complaints.");
        return;
      }
      const { data } = await response.json() as { data: { complaints: Case[]; nextCursor: string | null } };
      setCases((previous) => next ? [...previous, ...data.complaints] : data.complaints);
      setCursor(data.nextCursor);
    } catch {
      setError("Could not load escalated complaints.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function open(id: string) {
    setError("");
    setSelected(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/manager/complaints/${id}`, { cache: "no-store" });
      if (!response.ok) {
        setError("This complaint could not be opened.");
        return;
      }
      const { data } = await response.json() as { data: { complaint: Case } };
      setSelected(data.complaint);
    } catch {
      setError("This complaint could not be opened.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Escalated complaints</h1>
      {loading && <p role="status">Loading…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && !cases.length && <p>No escalated complaints assigned to you.</p>}
      <ul className="space-y-2">
        {cases.map((item) => <li key={item.id}>
          <button type="button" disabled={loading} className="underline" onClick={() => void open(item.id)}>
            {item.category} · Room {item.roomNumber} · {item.id}
          </button>
        </li>)}
      </ul>
      {cursor && <button type="button" disabled={loading} className="underline" onClick={() => void load(cursor)}>Load more</button>}
      {selected && (
        <article className="space-y-2 rounded border bg-white p-4">
          <h2 className="text-lg font-semibold">{selected.category} · Room {selected.roomNumber}</h2>
          <p>{selected.description}</p>
          <p>{selected.urgencyFlag ? "Marked urgent" : "Standard urgency"}</p>
          <p>{selected.autoEscalatedAt ? "Escalated automatically" : "Escalated by student"}</p>
          <p>Submitted {new Date(selected.submittedAt).toLocaleString("en-PK", { timeZone: "Asia/Karachi" })}</p>
          {selected.originalComplaintId && <p>Original complaint: {selected.originalComplaintId}</p>}
          {selected.disagreementReason && <p>Reason for disagreement: {selected.disagreementReason}</p>}
        </article>
      )}
    </main>
  );
}
