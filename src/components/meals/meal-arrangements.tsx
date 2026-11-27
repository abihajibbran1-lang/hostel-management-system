"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MEAL_LABELS, MEAL_TYPES } from "../../business/modules/meals/menu-contract.ts";

type Meal = keyof typeof MEAL_LABELS;
type Window = { mealType: Meal; opensAt: string; closesAt: string };
type Ticket = { id: string; mealType: Meal; studentId?: string; status: string; items: { name: string; portionCount: number }[] };
type Notice = { id: string; mealType: Meal; studentId?: string; explanation: string; reservationId: string | null };
type Arrangements = { tickets: Ticket[]; notices: Notice[]; windows: Window[] };
const input = "block rounded border border-slate-400 bg-white p-2";
const button = "rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { cache: "no-store", ...options });
  const body = await response.json() as { data: T; error?: { message: string; details?: { message: string }[] } };
  if (!response.ok) throw new Error(body.error?.details?.[0]?.message ?? body.error?.message ?? "Request failed.");
  return body.data;
}

function send<T>(path: string, body: unknown, method = "POST") {
  return request<T>(path, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

const pathByRole = {
  student: "/api/meals/reservations/mine",
  kitchen: "/api/kitchen/meal-arrangements",
  warden: "/api/warden/meal-arrangements",
};

function karachiToday() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts();
  const value = (name: string) => parts.find(({ type }) => type === name)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function MealArrangements({ role }: { role: keyof typeof pathByRole }) {
  const [date, setDate] = useState(karachiToday);
  const [mealType, setMealType] = useState<Meal>("BREAKFAST");
  const [data, setData] = useState<Arrangements | null>(null);
  const [items, setItems] = useState<{ mealType: Meal; name: string }[]>([]);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const noticeRequest = useRef<{ body: string; id: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setItems([]);
    setError("");
    if (!date) return;

    const query = `?date=${encodeURIComponent(date)}`;
    request<Arrangements>(pathByRole[role] + query, { signal: controller.signal })
      .then((value) => { if (!controller.signal.aborted) setData(value); })
      .catch((cause: Error) => { if (!controller.signal.aborted) setError(cause.message); });
    if (role === "student") {
      request<{ items: typeof items }>("/api/meals/menu" + query, { signal: controller.signal })
        .then((value) => { if (!controller.signal.aborted) setItems(value.items); })
        .catch((cause: Error) => { if (!controller.signal.aborted) setError(cause.message); });
    }
    return () => controller.abort();
  }, [role, date, refresh]);

  async function action(event: FormEvent<HTMLFormElement>, kind: "approval" | "reservation" | "notice") {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const slot = { date, mealType };
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      if (kind === "approval") {
        if (!fields.get("verified")) throw new Error("Confirm that you verified the university commitment.");
        await send("/api/warden/meal-approvals", { ...slot, studentId: fields.get("studentId") });
        setFeedback("Commitment approval recorded.");
      } else if (kind === "reservation") {
        const { ticket } = await send<{ ticket: Ticket }>("/api/meals/reservations", slot);
        setFeedback(`Reservation confirmed. Ticket ${ticket.id}.`);
      } else {
        const linked = fields.get("reservationId");
        const notice = { ...slot, explanation: fields.get("explanation"), ...(linked ? { reservationId: linked } : {}) };
        const body = JSON.stringify(notice);
        if (noticeRequest.current?.body !== body) noticeRequest.current = { body, id: crypto.randomUUID() };
        await send("/api/meals/collection-notices", { ...notice, requestId: noticeRequest.current.id });
        noticeRequest.current = null;
        setFeedback("Collection notice sent to Kitchen Staff.");
      }
      form.reset();
      setRefresh((value) => value + 1);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const slot = items.find((item) => item.mealType === mealType);
  const ticket = data?.tickets.find((item) => item.mealType === mealType);
  return (
    <main className="mx-auto max-w-4xl space-y-5 p-6">
      <h1 className="text-2xl font-semibold">{role === "student" ? "My meal arrangements" : "Meal arrangements"}</h1>
      <label className="block">Meal date<input className={input} type="date" value={date} disabled={busy} onChange={(event) => {
        setFeedback(""); setDate(event.currentTarget.value);
      }} /></label>
      {feedback && <p role="status">{feedback}</p>}
      {error && <p role="alert">{error}</p>}
      {date && !data && !error && <p role="status">Loading meal arrangements…</p>}
      {data && role !== "kitchen" && (
        <label className="block">Meal<select className={input} value={mealType} disabled={busy} onChange={(event) => setMealType(event.currentTarget.value as Meal)}>
          {MEAL_TYPES.map((meal) => <option key={meal} value={meal}>{MEAL_LABELS[meal]}</option>)}
        </select></label>
      )}
      {role === "student" && data && (
        <div className="space-y-4">
          {slot ? <p>{MEAL_LABELS[mealType]}: {slot.name}</p> : <p>No published menu entry for this meal.</p>}
          <p>Reservations close at 9 p.m. Karachi time the previous day and require Warden approval.</p>
          {slot && !ticket && <form method="post" onSubmit={(event) => void action(event, "reservation")}>
            <button className={button} disabled={busy}>Reserve this meal</button>
          </form>}
          {slot && <form method="post" className="space-y-2 rounded border p-3" onSubmit={(event) => void action(event, "notice")}>
            <h2 className="font-semibold">Advance collection notice</h2>
            <p>Send at least one hour before the collection window opens.</p>
            <label className="block">Explanation<textarea className={input} name="explanation" required maxLength={500} /></label>
            {ticket && <label className="block">Reservation<select className={input} name="reservationId">
              <option value="">No reservation reference</option><option value={ticket.id}>Link the reservation for this meal</option>
            </select></label>}
            <button className={button} disabled={busy}>Send collection notice</button>
          </form>}
        </div>
      )}
      {role === "warden" && data && (
        <form method="post" className="space-y-2 rounded border p-3" onSubmit={(event) => void action(event, "approval")}>
          <h2 className="font-semibold">Approve a meal commitment</h2>
          <label className="block">Student account UUID<input className={input} name="studentId" required /></label>
          <label className="block"><input type="checkbox" name="verified" required /> I verified the university commitment.</label>
          <button className={button} disabled={busy}>Record approval for selected meal</button>
        </form>
      )}
      {data && (
        <>
          <p>Collection in Karachi: {data.windows.map(({ mealType, opensAt, closesAt }) => `${MEAL_LABELS[mealType]} ${opensAt}–${closesAt}`).join(" · ")}</p>
          <section>
            <h2 className="font-semibold">{role === "warden" ? "Reservation audit copies" : "Reservation tickets"}</h2>
            {!data.tickets.length && <p>No tickets for this date.</p>}
            <ul className="space-y-2">{data.tickets.map((item) => <li key={item.id} className="rounded border p-3">
              <p>{MEAL_LABELS[item.mealType]} · {item.status}</p>
              <p>Ticket {item.id}</p>
              {item.studentId && <p>Student {item.studentId}</p>}
              {item.items.map(({ name, portionCount }, index) => <p key={index}>{name} · {portionCount} portion(s)</p>)}
            </li>)}</ul>
          </section>
          <section>
            <h2 className="font-semibold">Collection notices</h2>
            {!data.notices.length && <p>No notices for this date.</p>}
            <ul className="space-y-2">{data.notices.map((notice) => <li key={notice.id} className="rounded border p-3">
              <p>{MEAL_LABELS[notice.mealType]} · {notice.explanation}</p>
              {notice.studentId && <p>Student {notice.studentId}</p>}
              {notice.reservationId && <p>Ticket {notice.reservationId}</p>}
            </li>)}</ul>
          </section>
        </>
      )}
    </main>
  );
}

export function MealCollectionSettings() {
  const [windows, setWindows] = useState<Window[]>([]);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const path = "/api/manager/meal-collection-windows";

  useEffect(() => {
    const controller = new AbortController();
    request<{ windows: Window[] }>(path, { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setWindows(result.windows); })
      .catch((cause: Error) => { if (!controller.signal.aborted) setError(cause.message); });
    return () => controller.abort();
  }, []);

  async function save(event: FormEvent<HTMLFormElement>, mealType: Meal) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      const { window } = await send<{ window: Window }>(path, {
        mealType, opensAt: fields.get("opensAt"), closesAt: fields.get("closesAt"),
      }, "PATCH");
      setWindows((current) => current.map((item) => item.mealType === mealType ? window : item));
      setFeedback(`${MEAL_LABELS[mealType]} collection hours saved.`);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Meal collection hours</h1>
      <p>Times are in Asia/Karachi. Changes apply to new notices, including for dates already on the menu.</p>
      {error && <p role="alert">{error}</p>}
      {feedback && <p role="status">{feedback}</p>}
      {!windows.length && !error && <p role="status">Loading collection hours…</p>}
      {windows.map((window) => <form method="post" key={window.mealType} className="flex flex-wrap items-end gap-3 rounded border p-3"
        onSubmit={(event) => void save(event, window.mealType)}>
        <h2 className="w-full font-semibold">{MEAL_LABELS[window.mealType]}</h2>
        <label>Opens<input className={input} type="time" name="opensAt" defaultValue={window.opensAt} required disabled={busy} /></label>
        <label>Closes<input className={input} type="time" name="closesAt" defaultValue={window.closesAt} required disabled={busy} /></label>
        <button className={button} disabled={busy}>Save {MEAL_LABELS[window.mealType].toLowerCase()} hours</button>
      </form>)}
    </main>
  );
}
