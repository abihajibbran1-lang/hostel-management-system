"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";

type Room = { id: string; roomNumber: string };
type House = {
  id: string;
  name: string;
  rooms: Room[];
  primaryWardenId: string | null;
  wardens: { userId: string }[];
};
type Membership = {
  id: string;
  userId: string;
  verifiedAt: string | null;
  room: Room & { houseId: string };
};
type Directory = { role: "MANAGER" | "WARDEN"; houses: House[]; memberships: Membership[] };

const inputStyle = "block w-full rounded border border-slate-300 bg-white p-2";
const buttonStyle = "rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-60";

export function RoomManagement() {
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/room-management", { cache: "no-store" });
      if (!response.ok) {
        setDirectory(null);
        setError(response.status === 401 || response.status === 403
          ? "Sign in with an authorized staff account."
          : "Room records could not be loaded.");
        return;
      }
      const result = await response.json() as { data: Directory };
      setDirectory(result.data);
    } catch {
      setError("Room records could not be loaded.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save(command: Record<string, unknown>, form?: HTMLFormElement) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const response = await fetch("/api/room-management", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(command),
      });
      if (!response.ok) {
        const result = await response.json() as { error?: { details?: { message: string }[] } };
        setError(result.error?.details?.[0]?.message ?? "The room change could not be saved.");
        return;
      }
      form?.reset();
      setNotice("Room records updated.");
      await load();
    } catch {
      setError("The room change could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  function submit(action: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    const command: Record<string, unknown> = { ...fields, action };
    if (action === "createRoom") command.capacity = Number(fields.capacity);
    if (action === "assignWarden") command.primary = fields.primary === "on";
    void save(command, form);
  }

  function form(title: string, action: string, fields: ReactNode) {
    return (
      <form method="post" className="space-y-2 rounded border border-slate-200 bg-white p-4"
        onSubmit={(event) => submit(action, event)}>
        <h2 className="font-semibold">{title}</h2>
        {fields}
        <button disabled={busy} className={buttonStyle}>Save</button>
      </form>
    );
  }

  if (!directory) {
    return error
      ? <p role="alert">{error} <Link href="/login" className="underline">Sign in</Link></p>
      : <p role="status">Loading room records…</p>;
  }

  const { role, houses, memberships } = directory;
  const houseSelect = (
    <label className="block">House
      <select name="houseId" required className={inputStyle}>
        <option value="">Select a house</option>
        {houses.map((house) => <option key={house.id} value={house.id}>{house.name}</option>)}
      </select>
    </label>
  );
  return (
    <div className="mt-4 space-y-6">
      {error && <p role="alert" className="text-red-800">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {role === "MANAGER" && (
          <>
            {form("Add a house", "createHouse", <label className="block">House name
              <input name="name" required maxLength={120} className={inputStyle} />
            </label>)}
            {form("Add a room", "createRoom", <>
              {houseSelect}
              <label className="block">Room number
                <input name="roomNumber" required maxLength={120} className={inputStyle} />
              </label>
              <label className="block">Capacity
                <input name="capacity" type="number" min={1} required className={inputStyle} />
              </label>
            </>)}
            {form("Assign a Warden", "assignWarden", <>
              {houseSelect}
              <label className="block">Warden account ID
                <input name="userId" required className={inputStyle} />
              </label>
              <label className="block"><input name="primary" type="checkbox" /> Designate as primary Warden</label>
            </>)}
          </>
        )}
        {form("Place or transfer a student", "placeStudent", <>
          <label className="block">Student account ID
            <input name="userId" required className={inputStyle} />
          </label>
          <label className="block">Room
            <select name="roomId" required className={inputStyle}>
              <option value="">Select a room</option>
              {houses.map((house) => (
                <optgroup key={house.id} label={house.name}>
                  {house.rooms.map((room) => (
                    <option key={room.id} value={room.id}>{room.roomNumber}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </>)}
      </div>
      {role === "MANAGER" && houses.some((house) => house.wardens.length > 0) && (
        <section>
          <h2 className="font-semibold">Warden assignments</h2>
          <ul className="mt-2 space-y-2">
            {houses.flatMap((house) => house.wardens.map(({ userId }) => (
              <li key={`${house.id}:${userId}`} className="break-words">
                {house.name} · {userId} {userId === house.primaryWardenId && "(primary)"}{" "}
                <button type="button" disabled={busy} className="underline"
                  onClick={() => void save({ action: "removeWarden", houseId: house.id, userId })}>
                  Remove
                </button>
              </li>
            )))}
          </ul>
        </section>
      )}
      <section>
        <h2 className="font-semibold">Current room assignments</h2>
        {!memberships.length && <p>No current assignments.</p>}
        <ul className="mt-2 space-y-2">
          {memberships.map((membership) => (
            <li key={membership.id} className="break-words">
              Room {membership.room.roomNumber} · {membership.userId} ·{" "}
              {membership.verifiedAt ? "Verified" : "Awaiting verification"}{" "}
              {role === "WARDEN" && !membership.verifiedAt && (
                <button type="button" disabled={busy} className="underline"
                  onClick={() => void save({ action: "verifyMembership",
                    userId: membership.userId, membershipId: membership.id })}>
                  Verify assignment
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
