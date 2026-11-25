"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { karachiDateTimeToUtc, utcToKarachiDateTime } from "../../business/modules/schedules/personal-schedule-time.ts";

type Room = { id: string; label: string; residents: { userId: string; student: { fullName: string } }[] };
type Duty = {
  id: string; roomId: string; title: string; description: string; dueAt: string;
  acceptanceDeadline: string | null; status: string; writable: boolean; distributed: boolean; isCreator: boolean;
  needsRedistribution: boolean;
  assignments: { id: string; studentUserId: string; status: string; lastReminderAt: string | null }[];
  reviews: { id: string; kind: string; note: string; reviewedAt: string | null }[];
  assistance: { id: string; createdAt: string }[];
  assistanceRecipientId?: string | null;
};
type Directory = { role: string; rooms: Room[]; duties: Duty[] };
type Command = Record<string, unknown>;

const buttonClass = "rounded border border-slate-400 bg-white px-3 py-1.5 disabled:opacity-50";
const fieldClass = "mt-1 block w-full rounded border border-slate-400 p-2";
const stateName = (state: string) => state.toLowerCase().replaceAll("_", " ");

function DutyForm({ duty, room, onSubmit, busy }: {
  duty?: Duty; room?: Room; onSubmit: (command: Command) => void; busy: boolean;
}) {
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const dueAt = karachiDateTimeToUtc(String(data.get("dueAt")));
    const deadline = room ? karachiDateTimeToUtc(String(data.get("acceptanceDeadline"))) : null;
    if (!dueAt || (room && !deadline)) {
      setError("Enter valid dates and times in Karachi time.");
      return;
    }
    setError("");
    onSubmit({
      action: duty ? "distribute" : room ? "create" : "propose",
      title: data.get("title"), description: data.get("description"), dueAt: dueAt.toISOString(),
      ...(room ? {
        ...(!duty ? { roomId: room.id } : {}),
        acceptanceDeadline: deadline?.toISOString(), assignees: data.getAll("assignees"),
      } : {}),
    });
  }
  return (
    <form method="post" onSubmit={submit} className="space-y-2">
      <label className="block">Duty name<input className={fieldClass} name="title" defaultValue={duty?.title} maxLength={200} required /></label>
      <label className="block">Description<textarea className={fieldClass} name="description" defaultValue={duty?.description} maxLength={2000} required /></label>
      <label className="block">Due (Karachi time)<input className={fieldClass} type="datetime-local" name="dueAt" defaultValue={duty ? utcToKarachiDateTime(duty.dueAt) : undefined} required /></label>
      {room && (
        <>
          <label className="block">Acceptance deadline (Karachi time)<input className={fieldClass} type="datetime-local" name="acceptanceDeadline" defaultValue={duty?.acceptanceDeadline ? utcToKarachiDateTime(duty.acceptanceDeadline) : undefined} required /></label>
          <fieldset><legend>Assigned residents</legend>
            {room.residents.map(({ userId, student }) => (
              <label className="block" key={userId}>
                <input type="checkbox" name="assignees" value={userId} defaultChecked={duty?.assignments.some((part) => part.studentUserId === userId && part.status !== "WITHDRAWN")} />{" "}{student.fullName}
              </label>
            ))}
            {!room.residents.length && <p>No verified residents yet.</p>}
          </fieldset>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <button className={buttonClass} disabled={busy || Boolean(room && !room.residents.length)}>{room ? "Save distribution" : "Propose duty"}</button>
    </form>
  );
}

export function SharedResponsibilities({ assistanceOnly = false }: { assistanceOnly?: boolean }) {
  const [data, setData] = useState<Directory | null>(null);
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try {
      const res = await fetch(assistanceOnly ? "/api/warden/responsibility-assistance" : "/api/responsibilities");
      if (!res.ok) {
        setData(null);
        setError(res.status === 401 || res.status === 403 ? "Sign in with an authorized account." : "Could not load shared duties.");
        return;
      }
      setData((await res.json()).data as Directory);
    } catch {
      setError("Could not load shared duties.");
    }
  }, [assistanceOnly]);
  useEffect(() => { void load(); }, [load]);

  async function save(command: Command, id?: string) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const res = await fetch(id ? `/api/responsibilities/${id}` : "/api/responsibilities", {
        method: id ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(command),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: { details?: { message: string }[] } };
        setError(body.error?.details?.[0]?.message ?? "Could not save this change.");
        return;
      }
      setNotice("Saved.");
      await load();
    } catch {
      setError("Could not save this change.");
    } finally {
      setBusy(false);
    }
  }
  const action = (label: string, command: Command, id: string) =>
    <button type="button" className={buttonClass} disabled={busy} onClick={() => void save(command, id)}>{label}</button>;

  const room = data?.rooms.find((item) => item.id === roomId);
  return (
    <main className="mx-auto max-w-4xl space-y-5 p-6">
      <h1 className="text-2xl font-semibold">{assistanceOnly ? "Warden assistance" : "Shared responsibilities"}</h1>
      {error && <p role="alert" className="text-red-800">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!data && !error && <p role="status">Loading shared duties…</p>}
      {data?.role === "STUDENT" && (
        <details className="rounded border bg-white p-4"><summary>Propose a shared duty</summary>
          <DutyForm busy={busy} onSubmit={(command) => void save(command)} />
        </details>
      )}
      {data?.role === "WARDEN" && !assistanceOnly && (
        <details className="rounded border bg-white p-4"><summary>Create a shared duty</summary>
          <label className="block">Room<select className={fieldClass} value={roomId} onChange={(event) => setRoomId(event.target.value)}>
            <option value="">Choose a room</option>
            {data.rooms.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select></label>
          {room && <DutyForm key={room.id} room={room} busy={busy} onSubmit={(command) => void save(command)} />}
        </details>
      )}
      {data && !data.duties.length && <p>{assistanceOnly ? "No active assistance requests." : "No shared duties yet."}</p>}
      {data?.duties.map((duty) => {
        const wardensRoom = data.rooms.find((item) => item.id === duty.roomId);
        const part = duty.assignments.find((item) => item.status !== "WITHDRAWN");
        const closed = duty.status === "COMPLETED" || duty.status === "CANCELLED";
        const reviewKinds = [
          ...(part && !closed ? [["fairness", "Request fairness review"]] : []),
          ...(part?.status === "ACCEPTED" && !closed ? [["withdraw", "Request withdrawal"]] : []),
          ...(part?.status === "COMPLETED" && duty.status === "COMPLETED" ? [["reopen", "Request reopening"]] : []),
          ...(!closed && (part || duty.isCreator) ? [["cancel", "Request cancellation"]] : []),
        ];
        return (
          <article key={duty.id} className="space-y-3 rounded border bg-white p-4">
            <h2 className="text-lg font-semibold">{duty.title}</h2>
            <p>{duty.description}</p>
            <p className="capitalize">{!duty.distributed ? "Awaiting distribution" : stateName(duty.status)}</p>
            {duty.needsRedistribution && <p>Waiting for Warden redistribution.</p>}
            <p>Due {utcToKarachiDateTime(duty.dueAt).replace("T", " ")} Karachi time</p>
            {duty.assistance.length > 0 && <p>Warden assistance requested.</p>}
            {duty.assistance.length > 0 && duty.assistanceRecipientId === null && <p>Manager attention needed. This house has no active primary Warden.</p>}
            {part && data.role === "STUDENT" && <p>Your assignment is {stateName(part.status)}.</p>}
            {wardensRoom && (
              <ul>{duty.assignments.map((item) => (
                <li key={item.id}>{wardensRoom.residents.find((resident) => resident.userId === item.studentUserId)?.student.fullName ??
                  "Former or unverified resident"} · {stateName(item.status)}</li>
              ))}</ul>
            )}
            {duty.writable && data.role === "STUDENT" && (
              <>
                <div className="flex flex-wrap gap-2">
                  {part?.status === "PENDING" && !closed && <>
                    {action("Accept", { action: "accept" }, duty.id)}{action("Decline", { action: "reject" }, duty.id)}
                  </>}
                  {part?.status === "ACCEPTED" && !duty.needsRedistribution && (duty.status === "ACTIVE" || duty.status === "ASSISTANCE_REQUESTED") &&
                    action("Mark my part complete", { action: "complete" }, duty.id)}
                  {part?.status === "ACCEPTED" && part.lastReminderAt && !closed &&
                    action("Report my part incomplete", { action: "reportIncomplete" }, duty.id)}
                  {part && !closed && !duty.assistance.length && action("Request Warden assistance", { action: "assistance" }, duty.id)}
                </div>
                {reviewKinds.length > 0 && (
                  <form method="post" className="space-y-2" onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    void save({ action: "requestReview", kind: form.get("kind"), note: form.get("note") }, duty.id);
                  }}>
                    <label className="block">Review type<select className={fieldClass} name="kind">{reviewKinds.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
                    <label className="block">Reason<input className={fieldClass} name="note" maxLength={2000} required /></label>
                    <button className={buttonClass} disabled={busy}>Send request</button>
                  </form>
                )}
              </>
            )}
            {duty.writable && data.role === "WARDEN" && (
              <>
                {!closed && wardensRoom && (
                  <details><summary>Edit or redistribute</summary>
                    <DutyForm key={`${duty.id}:${duty.acceptanceDeadline ?? ""}`} duty={duty} room={wardensRoom} onSubmit={(command) => void save(command, duty.id)} busy={busy} />
                    <form method="post" className="mt-4 space-y-2" onSubmit={(event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      void save({ action: "copyEdit", title: form.get("title"), description: form.get("description") }, duty.id);
                    }}>
                      <label className="block">Correct duty name<input className={fieldClass} name="title" defaultValue={duty.title} required /></label>
                      <label className="block">Correct spelling or formatting<textarea className={fieldClass} name="description" defaultValue={duty.description} required /></label>
                      <button className={buttonClass} disabled={busy}>Save wording only</button>
                    </form>
                  </details>
                )}
                {!closed && action("Cancel duty", { action: "cancel" }, duty.id)}
                {duty.reviews.filter((review) => !review.reviewedAt).map((review) => (
                  <div key={review.id} className="space-y-1 border-t pt-2">
                    <p className="capitalize">{review.kind} request</p><p>{review.note}</p>
                    <div className="flex gap-2">{action(review.kind === "fairness" ? "Mark reviewed" : "Approve", { action: "review", reviewId: review.id, approve: true }, duty.id)}
                      {action("Decline", { action: "review", reviewId: review.id, approve: false }, duty.id)}</div>
                  </div>
                ))}
              </>
            )}
          </article>
        );
      })}
    </main>
  );
}
