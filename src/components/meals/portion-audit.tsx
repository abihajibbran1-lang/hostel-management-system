"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MEAL_LABELS } from "../../business/modules/meals/menu-contract.ts";

type Meal = keyof typeof MEAL_LABELS;
type Audit = { recordedBy: string; recordedAt: string; expectedPortions: number; observedPortions: number; description: string | null; passed: boolean; discrepancyId: string | null };
type Log = { id: string; name: string; mealType: Meal; portionCount: number; loggedBy: string; loggedAt: string; audit: Audit | null };
type PageData = { logs: Log[]; items?: { mealType: Meal; name: string }[] };
const input = "block rounded border border-slate-400 bg-white p-2";
const button = "rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50";

function today() {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts();
  return ["year", "month", "day"].map((field) => parts.find(({ type }) => type === field)?.value).join("-");
}

function localTime(value: string) {
  return new Date(value).toLocaleString("en-PK", { timeZone: "Asia/Karachi" });
}

async function send<T>(path: string, options?: RequestInit) {
  const response = await fetch(path, { cache: "no-store", ...options });
  const body = await response.json() as { data: T; error?: { message?: string; details?: { message: string }[] } };
  if (!response.ok) throw new Error(body.error?.details?.[0]?.message ?? body.error?.message ?? "Request failed.");
  return body.data;
}

export function PortionAuditPage({ kitchen }: { kitchen: boolean }) {
  const path = kitchen ? "/api/kitchen/portion-logs" : "/api/warden/portion-logs";
  const [date, setDate] = useState(today);
  const [data, setData] = useState<PageData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const retry = useRef<{ body: string; id: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    if (!date) return;
    send<PageData>(`${path}?date=${encodeURIComponent(date)}`, { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((cause: Error) => { if (!controller.signal.aborted) setError(cause.message); });
    return () => controller.abort();
  }, [date, path, refresh]);

  async function save(event: FormEvent<HTMLFormElement>, id?: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      let payload: object;
      if (id) {
        payload = { observedPortions: Number(fields.get("observedPortions")), description: fields.get("description") };
      } else {
        const allocation = { date, mealType: fields.get("mealType"), portionCount: Number(fields.get("portionCount")) };
        const body = JSON.stringify(allocation);
        if (retry.current?.body !== body) retry.current = { body, id: crypto.randomUUID() };
        payload = { ...allocation, requestId: retry.current.id };
      }
      const { log } = await send<{ log: Log }>(id ? `${path}/${id}/audit` : path, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!id) retry.current = null;
      setNotice(id ? (log.audit?.passed ? "Audit passed." : "Audit failed. Discrepancy recorded.") : "Portion allocation logged.");
      form.reset();
      setRefresh((value) => value + 1);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">{kitchen ? "Meal portion logs" : "Meal portion audits"}</h1>
      <label className="block">Meal date<input className={input} type="date" value={date} disabled={busy} onChange={(event) => {
        setNotice(""); setDate(event.currentTarget.value);
      }} /></label>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      {date && !data && !error && <p role="status">Loading portion logs…</p>}
      {kitchen && data && (data.items?.length ? (
        <form method="post" className="space-y-2 rounded border p-3" onSubmit={(event) => void save(event)}>
          <h2 className="font-semibold">Log an allocation</h2>
          <label className="block">Published meal<select className={input} name="mealType" required>
            {data.items.map(({ mealType, name }) => <option key={mealType} value={mealType}>{MEAL_LABELS[mealType]} · {name}</option>)}
          </select></label>
          <label className="block">Planned portions<input className={input} type="number" name="portionCount" min={1} max={2147483647} required /></label>
          <button className={button} disabled={busy}>Log allocation</button>
        </form>
      ) : <p>No published meals for this date.</p>)}
      {data && (
        <section className="space-y-2">
          <h2 className="font-semibold">Recorded allocations</h2>
          {!data.logs.length && <p>No portion logs for this date.</p>}
          {data.logs.map((log) => (
            <article key={log.id} className="space-y-1 rounded border p-3">
              <h3 className="font-semibold">{MEAL_LABELS[log.mealType]} · {log.name}</h3>
              <p>Log {log.id}</p>
              <p>{log.portionCount} planned portions</p>
              <p>Logged by {log.loggedBy} · {localTime(log.loggedAt)}</p>
              {log.audit ? (
                <div className="space-y-1">
                  <p>{log.audit.passed ? "Passed" : "Failed"} · {log.audit.expectedPortions} expected · {log.audit.observedPortions} observed</p>
                  <p>Audited by {log.audit.recordedBy} · {localTime(log.audit.recordedAt)}</p>
                  {log.audit.description && <p>{log.audit.description}</p>}
                  {log.audit.discrepancyId && <p>Discrepancy {log.audit.discrepancyId}</p>}
                </div>
              ) : kitchen ? <p>Awaiting Warden audit.</p> : (
                <form method="post" className="space-y-2" onSubmit={(event) => void save(event, log.id)}>
                  <label className="block">Observed portions<input className={input} type="number" name="observedPortions" min={0} max={2147483647} required /></label>
                  <label className="block">Audit note (optional)<textarea className={input} name="description" maxLength={2000} /></label>
                  <button className={button} disabled={busy}>Record final audit</button>
                </form>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
